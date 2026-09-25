import { recordGpsPoints } from "@/lib/gpsHistoryStore";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// Millitrack fetch helper (same credentials as /api/gps)
// ─────────────────────────────────────────────────────────────────────────────
async function fetchAllDevicesAndPositions() {
  const email    = process.env.MILLITRACK_EMAIL    || "gokulk01";
  const password = process.env.MILLITRACK_PASSWORD || "123456";
  const authHeader = "Basic " + Buffer.from(`${email}:${password}`).toString("base64");

  const headers = { Authorization: authHeader, Accept: "application/json" };

  const [devRes, posRes] = await Promise.all([
    fetch("http://track2.millitrack.com/api/devices",   { headers, cache: "no-store" }),
    fetch("http://track2.millitrack.com/api/positions", { headers, cache: "no-store" }),
  ]);

  if (!devRes.ok || !posRes.ok) {
    throw new Error(`HTTP ${devRes.status}/${posRes.status}`);
  }

  const devices   = await devRes.json();
  const positions = await posRes.json();

  if (!Array.isArray(devices) || !Array.isArray(positions)) {
    throw new Error("Invalid array from Millitrack");
  }

  const posMap = new Map();
  positions.forEach(p => { if (p?.deviceId) posMap.set(p.deviceId, p); });

  return devices.map(d => {
    const pos = posMap.get(d.id) || {};
    return {
      id:             d.id,
      name:           d.name,
      deviceUniqueId: d.uniqueId,
      latitude:       pos.latitude  || 0,
      longitude:      pos.longitude || 0,
      speed:          pos.speed     || 0,
      course:         pos.course    || 0,
      address:        pos.address   || d.address || "",
      attributes: {
        ...(pos.attributes || {}),
        ignition:      pos.attributes?.ignition      ?? false,
        motion:        pos.attributes?.motion        ?? false,
        charge:        pos.attributes?.charge        ?? false,
        batteryLevel:  pos.attributes?.batteryLevel  ?? null,
        totalDistance: pos.attributes?.totalDistance ?? 0,
        todayDistance: pos.attributes?.todayDistance ?? 0,
      },
      serverTime: pos.serverTime || d.lastUpdate || new Date().toISOString(),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulated GPS fallback — vehicles move in real continuous paths
// Each vehicle has a persistent heading & position that accumulates over time.
// ─────────────────────────────────────────────────────────────────────────────

// Base positions spread around Haryana / Delhi NCR area
const SIM_BASES = [
  [28.67, 76.98], [28.72, 77.10], [28.55, 77.25], [28.88, 77.20], [28.45, 76.85],
  [29.01, 76.75], [28.63, 77.35], [28.40, 77.05], [28.95, 77.50], [28.30, 76.60],
  [28.78, 76.55], [28.52, 77.48], [28.85, 77.38], [28.35, 77.30], [29.10, 77.00],
  [28.60, 76.70], [28.70, 77.60], [28.48, 76.48], [29.05, 76.95], [28.42, 77.18],
  [28.90, 77.15], [28.58, 77.02], [28.75, 76.80], [28.38, 76.92], [29.15, 77.25],
  [28.65, 77.45], [28.50, 76.65], [28.80, 77.55], [28.35, 77.10], [28.95, 76.88],
  [28.68, 76.62], [28.44, 77.38], [28.82, 76.78], [28.55, 77.55], [29.08, 77.40],
  [28.62, 76.90], [28.72, 77.20], [28.46, 77.00], [28.88, 76.98], [28.40, 77.42],
];

// Per-vehicle state (persist across calls via module-level cache)
const _simState = {};

function _getSimState(idx, num) {
  if (!_simState[idx]) {
    const base = SIM_BASES[idx % SIM_BASES.length];
    // Each vehicle gets a unique heading (evenly spread 0–360)
    const heading = (num * 37 + idx * 53) % 360;
    _simState[idx] = {
      lat:     base[0],
      lng:     base[1],
      heading,
      // Individual speed in km/h (10–60)
      speedKmh: 15 + ((num * 7 + idx * 11) % 45),
      // Seconds since last turn change
      turnTimer: Math.floor(Math.random() * 20),
    };
  }
  return _simState[idx];
}

let _lastSimTick = null; // timestamp of last call

function generateSimulatedGps() {
  const now     = Date.now();
  const elapsed = _lastSimTick ? Math.min((now - _lastSimTick) / 1000, 5) : 2; // seconds elapsed, cap at 5s
  _lastSimTick  = now;

  // Haryana/NCR bounding box — if a vehicle exits, reflect it back
  const LAT_MIN = 27.8, LAT_MAX = 29.5;
  const LNG_MIN = 76.0, LNG_MAX = 78.0;

  return Array.from({ length: 40 }, (_, idx) => {
    const num   = idx + 1;
    const state = _getSimState(idx, num);

    const isIgnitionOn = num % 3 !== 0 && num % 7 !== 0; // most vehicles running
    const batteryLevel = 3800 + ((num * 15) % 400);

    if (isIgnitionOn) {
      // Occasionally change heading (random turn every ~15–40 seconds)
      state.turnTimer -= elapsed;
      if (state.turnTimer <= 0) {
        // Turn left or right by 30–90 degrees
        const turn = (30 + ((num * idx + Math.floor(now / 1000)) % 60)) * (Math.random() < 0.5 ? 1 : -1);
        state.heading = (state.heading + turn + 360) % 360;
        state.turnTimer = 15 + (num % 25); // reset timer
      }

      // Boundary bounce — reverse heading component when hitting edges
      if (state.lat < LAT_MIN || state.lat > LAT_MAX) {
        state.heading = (360 - state.heading) % 360; // flip N/S
      }
      if (state.lng < LNG_MIN || state.lng > LNG_MAX) {
        state.heading = (180 - state.heading + 360) % 360; // flip E/W
      }

      // Move vehicle forward in current heading direction
      const headingRad = (state.heading * Math.PI) / 180;
      const distKm     = (state.speedKmh * elapsed) / 3600; // km moved this tick
      const dLat       = (distKm / 111.0) * Math.cos(headingRad);
      const dLng       = (distKm / (111.0 * Math.cos((state.lat * Math.PI) / 180))) * Math.sin(headingRad);

      state.lat = Math.max(LAT_MIN, Math.min(LAT_MAX, state.lat + dLat));
      state.lng = Math.max(LNG_MIN, Math.min(LNG_MAX, state.lng + dLng));
    }

    const speedKnots = isIgnitionOn ? parseFloat((state.speedKmh / 1.852).toFixed(1)) : 0;

    return {
      name:           `HR-55-${1000 + num} (A-${num})`,
      deviceUniqueId: `356218600789${String(700 + num).padStart(3, "0")}`,
      latitude:  state.lat,
      longitude: state.lng,
      speed:     speedKnots,
      course:    state.heading,
      attributes: {
        batteryLevel,
        ignition:      isIgnitionOn,
        totalDistance: 12000000 + num * 450000 + Math.floor(elapsed * state.speedKmh / 3.6),
        todayDistance: isIgnitionOn ? 8000 + num * 1200 : 0,
        charge:        isIgnitionOn,
        motion:        speedKnots > 0,
      },
      serverTime: new Date().toISOString(),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SSE GET handler — persistent connection, pushes every 2 seconds
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  let intervalHandle = null;
  let controllerRef  = null;

  const stream = new ReadableStream({
    async start(controller) {
      controllerRef = controller;

      // Helper: encode & enqueue an SSE event
      const send = (eventName, payload) => {
        try {
          const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
        } catch {
          // client disconnected
        }
      };

      // Initial fetch right away
      const pushGps = async () => {
        try {
          const objects = await fetchAllDevicesAndPositions();
          if (Array.isArray(objects) && objects.length > 0) {
            recordGpsPoints(objects);
            send("gps", { success: true, data: { object: objects }, simulated: false, ts: Date.now() });
            return;
          }
          throw new Error("Empty response");
        } catch {
          send("gps", {
            success: true,
            data: { object: generateSimulatedGps() },
            simulated: true,
            ts: Date.now(),
          });
        }
      };

      await pushGps();                          // immediate first push
      intervalHandle = setInterval(pushGps, 2000); // push every 2 sec

      // Keep-alive ping every 15 seconds to prevent proxy timeouts
      setInterval(() => {
        try { controller.enqueue(new TextEncoder().encode(": ping\n\n")); } catch { /* disconnected */ }
      }, 15000);
    },

    cancel() {
      // Client disconnected — clean up
      if (intervalHandle) clearInterval(intervalHandle);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering if behind nginx
    },
  });
}
