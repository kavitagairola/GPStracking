/**
 * markerAnimation.js
 *
 * Smooth GPS marker animation for Leaflet maps.
 *
 * Technique:
 *   - Cubic ease-in-out interpolation between REAL GPS positions only.
 *   - NO dead reckoning — vehicles only move when actual GPS data changes.
 *     (Dead reckoning caused stopped vehicles to drift randomly.)
 *   - Shortest-path angle lerp for smooth heading rotation.
 *
 * Usage:
 *   import { createAnimatedMarker, connectGpsStream } from "@/lib/markerAnimation";
 *
 *   const marker = createAnimatedMarker(L, [lat, lng], icon, map, onClick);
 *   marker.animateTo([newLat, newLng], newCourse);
 *   marker.setIcon(newIcon);
 *   marker.remove();
 */

// ─── Maths helpers ─────────────────────────────────────────────────────────────

/** Linear interpolate between two numbers */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Shortest-path angle lerp (handles 359° → 1° wrap correctly).
 * Returns angle in [0, 360).
 */
function lerpAngle(a, b, t) {
  const diff = ((b - a + 540) % 360) - 180; // always in [-180, 180]
  return (a + diff * t + 360) % 360;
}

// ─── AnimatedMarker factory ────────────────────────────────────────────────────

/**
 * Creates an animated Leaflet marker that slides smoothly between real GPS positions.
 *
 * @param {Object}   L       - Leaflet instance (from dynamic import)
 * @param {number[]} latLng  - Initial [lat, lng]
 * @param {Object}   icon    - Leaflet DivIcon
 * @param {Object}   map     - Leaflet map instance
 * @param {Function} onClick - Optional click handler
 * @returns {AnimatedMarker}
 */
export function createAnimatedMarker(L, latLng, icon, map, onClick) {
  // The actual Leaflet marker on the map
  const leafletMarker = L.marker(latLng, { icon, zIndexOffset: 100 }).addTo(map);
  if (onClick) leafletMarker.on("click", onClick);

  // Animation state
  let fromLat = latLng[0];
  let fromLng = latLng[1];
  let toLat   = latLng[0];
  let toLng   = latLng[1];

  let fromCourse   = 0;
  let toCourse     = 0;
  let currentCourse = 0;

  let animStart    = null;
  let animDuration = 1600; // ms (slightly less than 2s SSE interval for snappy feel)
  let animFrame    = null;

  // Cubic ease-in-out: slow start, fast middle, slow end
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function runAnimation(timestamp) {
    if (!animStart) animStart = timestamp;

    const elapsed = timestamp - animStart;
    const t       = Math.min(elapsed / animDuration, 1);
    const eased   = easeInOutCubic(t);

    // Interpolate position and heading
    const lat = lerp(fromLat, toLat, eased);
    const lng = lerp(fromLng, toLng, eased);
    currentCourse = lerpAngle(fromCourse, toCourse, eased);

    leafletMarker.setLatLng([lat, lng]);

    if (t < 1) {
      animFrame = requestAnimationFrame(runAnimation);
    } else {
      // Snap to exact final position, reset from
      fromLat    = toLat;
      fromLng    = toLng;
      fromCourse = toCourse;
      animFrame  = null;
      animStart  = null;
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  return {
    /**
     * Animate marker to a new real GPS position.
     * Only call this when actual GPS data has changed.
     *
     * @param {number[]} newLatLng   - [lat, lng] from GPS
     * @param {number}   newCourse   - Heading in degrees (0-360)
     * @param {number}   [duration]  - Animation duration in ms (default 1600)
     */
    animateTo(newLatLng, newCourse, duration = 1600) {
      // Skip animation if position has not changed at all (vehicle truly stationary)
      const distLat = Math.abs(newLatLng[0] - toLat);
      const distLng = Math.abs(newLatLng[1] - toLng);
      const posChanged = distLat > 0.000001 || distLng > 0.000001; // ~0.1m threshold

      if (!posChanged) {
        // Only update icon/heading if needed — don't restart animation
        fromCourse = currentCourse;
        toCourse   = newCourse ?? toCourse;
        return;
      }

      // Cancel any running animation — start fresh from current visual position
      if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }

      const currentLatLng = leafletMarker.getLatLng();
      fromLat    = currentLatLng.lat;
      fromLng    = currentLatLng.lng;
      fromCourse = currentCourse;

      toLat      = newLatLng[0];
      toLng      = newLatLng[1];
      toCourse   = newCourse ?? fromCourse;
      animDuration = duration;
      animStart  = null;

      animFrame = requestAnimationFrame(runAnimation);
    },

    /** Replace the icon (e.g. when selection state or status color changes) */
    setIcon(newIcon) {
      leafletMarker.setIcon(newIcon);
    },

    /** Current rendered LatLng */
    getLatLng() {
      return leafletMarker.getLatLng();
    },

    /** Current rendered heading (degrees) */
    getCourse() {
      return currentCourse;
    },

    /** Stop animation and remove from map */
    remove() {
      if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
      leafletMarker.remove();
    },

    leafletMarker,
  };
}

// ─── SSE EventSource connection helper ────────────────────────────────────────

/**
 * Opens a persistent SSE connection to /api/gps/stream.
 * Automatically reconnects on disconnect.
 *
 * @param {Function} onData  - Called with (objects[], isSimulated, timestamp) on each push
 * @param {Function} onError - Called when connection drops (optional)
 * @returns {Function} cleanup — call on component unmount
 */
export function connectGpsStream(onData, onError) {
  if (typeof window === "undefined") return () => {};

  let es             = null;
  let reconnectTimer = null;
  let alive          = true;

  function connect() {
    if (!alive) return;

    es = new EventSource("/api/gps/stream");

    es.addEventListener("gps", (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload?.data?.object) {
          onData(payload.data.object, payload.simulated ?? false, payload.ts ?? Date.now());
        }
      } catch {
        /* ignore JSON parse errors */
      }
    });

    es.onerror = () => {
      es.close();
      if (!alive) return;
      if (onError) onError();
      // Reconnect after 3 seconds
      reconnectTimer = setTimeout(connect, 3000);
    };
  }

  connect();

  return () => {
    alive = false;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (es) es.close();
  };
}
