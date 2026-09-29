const CACHE_KEY = Symbol.for("resqtrack.millitrack-gps-cache");
const CACHE_TTL_MS = 10000;
const ERROR_RETRY_MS = 15000;
const MAX_STALE_MS = 60000;
const REQUEST_TIMEOUT_MS = 10000;

function getCache() {
  if (!globalThis[CACHE_KEY]) {
    globalThis[CACHE_KEY] = {
      objects: null,
      fetchedAt: 0,
      retryAt: 0,
      lastError: null,
      pending: null,
    };
  }

  return globalThis[CACHE_KEY];
}

export async function fetchMillitrackGps() {
  const cache = getCache();
  const now = Date.now();

  if (cache.objects && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { objects: cache.objects, refreshed: false, stale: false };
  }

  if (cache.pending) {
    const result = await cache.pending;
    return { ...result, refreshed: false };
  }

  if (cache.retryAt > now) {
    if (cache.objects && now - cache.fetchedAt < MAX_STALE_MS) {
      return { objects: cache.objects, refreshed: false, stale: true };
    }

    throw cache.lastError || new Error("Millitrack API retry cooldown is active");
  }

  const pending = (async () => {
    try {
      const email = process.env.MILLITRACK_EMAIL || "gokulk01";
      const password = process.env.MILLITRACK_PASSWORD || "123456";
      const authHeader = "Basic " + Buffer.from(`${email}:${password}`).toString("base64");
      const headers = { Authorization: authHeader, Accept: "application/json" };
      const options = { headers, cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) };

      const [devicesResponse, positionsResponse] = await Promise.all([
        fetch("http://track2.millitrack.com/api/devices", options),
        fetch("http://track2.millitrack.com/api/positions", options),
      ]);

      if (!devicesResponse.ok || !positionsResponse.ok) {
        throw new Error(`HTTP Error: devices (${devicesResponse.status}) / positions (${positionsResponse.status})`);
      }

      const [devices, positions] = await Promise.all([
        devicesResponse.json(),
        positionsResponse.json(),
      ]);

      if (!Array.isArray(devices) || !Array.isArray(positions)) {
        throw new Error("Invalid array format from Millitrack API");
      }

      const positionsByDevice = new Map();
      positions.forEach(position => {
        if (position?.deviceId != null) positionsByDevice.set(position.deviceId, position);
      });

      const objects = devices.map(device => {
        const position = positionsByDevice.get(device.id) || {};
        return {
          id: device.id,
          name: device.name,
          deviceUniqueId: device.uniqueId,
          latitude: position.latitude ?? 0,
          longitude: position.longitude ?? 0,
          speed: position.speed ?? 0,
          course: position.course ?? 0,
          address: position.address || device.address || "",
          attributes: {
            ...(position.attributes || {}),
            ignition: position.attributes?.ignition ?? false,
            motion: position.attributes?.motion ?? false,
            charge: position.attributes?.charge ?? false,
            batteryLevel: position.attributes?.batteryLevel ?? null,
            totalDistance: position.attributes?.totalDistance ?? 0,
            todayDistance: position.attributes?.todayDistance ?? 0,
          },
          serverTime: position.serverTime || device.lastUpdate || new Date().toISOString(),
        };
      });

      if (objects.length === 0) throw new Error("Empty response array from Millitrack API");

      cache.objects = objects;
      cache.fetchedAt = Date.now();
      cache.retryAt = 0;
      cache.lastError = null;
      return { objects, refreshed: true, stale: false };
    } catch (error) {
      cache.lastError = error;
      cache.retryAt = Date.now() + ERROR_RETRY_MS;

      if (cache.objects && Date.now() - cache.fetchedAt < MAX_STALE_MS) {
        return { objects: cache.objects, refreshed: false, stale: true };
      }

      throw error;
    } finally {
      cache.pending = null;
    }
  })();

  cache.pending = pending;
  return pending;
}

export async function fetchMillitrackHistory(deviceId, from, to) {
  if (!deviceId) {
    throw new Error("deviceId is required");
  }

  if (!from || !to) {
    throw new Error("from and to are required");
  }

  const email = process.env.MILLITRACK_EMAIL || "gokulk01";
  const password = process.env.MILLITRACK_PASSWORD || "123456";

  const authHeader =
    "Basic " +
    Buffer.from(`${email}:${password}`).toString("base64");

  const headers = {
    Authorization: authHeader,
    Accept: "application/json",
  };

  const url =
    "http://track2.millitrack.com/api/positions" +
    `?deviceId=${encodeURIComponent(deviceId)}` +
    `&from=${encodeURIComponent(from)}` +
    `&to=${encodeURIComponent(to)}`;

  const response = await fetch(url, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(
      `Millitrack history API failed: HTTP ${response.status}`
    );
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Invalid history response from Millitrack");
  }

  return data;
}