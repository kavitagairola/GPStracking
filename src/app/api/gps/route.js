import { NextResponse } from "next/server";
import { recordGpsPoints } from "@/lib/gpsHistoryStore";

export const dynamic = "force-dynamic";

// Fetch devices and positions directly using HTTP Basic Auth (supported natively by Traccar/Millitrack)
async function fetchAllDevicesAndPositions() {
  const email = process.env.MILLITRACK_EMAIL || "gokulk01";
  const password = process.env.MILLITRACK_PASSWORD || "123456";
  const authHeader = "Basic " + Buffer.from(`${email}:${password}`).toString("base64");

  const headers = {
    "Authorization": authHeader,
    "Accept": "application/json",
  };

  const [devRes, posRes] = await Promise.all([
    fetch("http://track2.millitrack.com/api/devices", { headers, cache: "no-store", next: { revalidate: 0 } }),
    fetch("http://track2.millitrack.com/api/positions", { headers, cache: "no-store", next: { revalidate: 0 } })
  ]);

  if (!devRes.ok || !posRes.ok) {
    throw new Error(`HTTP Error: devices (${devRes.status}) / positions (${posRes.status})`);
  }

  const devices = await devRes.json();
  const positions = await posRes.json();

  if (!Array.isArray(devices) || !Array.isArray(positions)) {
    throw new Error("Invalid array format from Millitrack API");
  }

  // Create position lookup map by deviceId
  const posMap = new Map();
  positions.forEach(p => {
    if (p && p.deviceId) posMap.set(p.deviceId, p);
  });

  // Merge devices with position telemetry into unified object structure compatible with CRM
  const mergedObjects = devices.map(d => {
    const pos = posMap.get(d.id) || {};
    return {
      id: d.id,
      name: d.name,
      deviceUniqueId: d.uniqueId,
      latitude: pos.latitude || 0,
      longitude: pos.longitude || 0,
      speed: pos.speed || 0, // speed in knots
      course: pos.course || 0,
      address: pos.address || d.address || "",
      attributes: {
        ...(pos.attributes || {}),
        ignition: pos.attributes?.ignition ?? false,
        motion: pos.attributes?.motion ?? false,
        charge: pos.attributes?.charge ?? false,
        batteryLevel: pos.attributes?.batteryLevel ?? null,
        totalDistance: pos.attributes?.totalDistance ?? 0,
        todayDistance: pos.attributes?.todayDistance ?? 0,
      },
      serverTime: pos.serverTime || d.lastUpdate || new Date().toISOString()
    };
  });

  return mergedObjects;
}

// Physics-based GPS simulator — vehicles move continuously in their heading direction
const _gpsSimState = {};
let _gpsLastTick = null;

const generateSimulatedGps = () => {
  const GPS_BASES = [
    [28.67,76.98],[28.72,77.10],[28.55,77.25],[28.88,77.20],[28.45,76.85],
    [29.01,76.75],[28.63,77.35],[28.40,77.05],[28.95,77.50],[28.30,76.60],
    [28.78,76.55],[28.52,77.48],[28.85,77.38],[28.35,77.30],[29.10,77.00],
    [28.60,76.70],[28.70,77.60],[28.48,76.48],[29.05,76.95],[28.42,77.18],
    [28.90,77.15],[28.58,77.02],[28.75,76.80],[28.38,76.92],[29.15,77.25],
    [28.65,77.45],[28.50,76.65],[28.80,77.55],[28.35,77.10],[28.95,76.88],
    [28.68,76.62],[28.44,77.38],[28.82,76.78],[28.55,77.55],[29.08,77.40],
    [28.62,76.90],[28.72,77.20],[28.46,77.00],[28.88,76.98],[28.40,77.42],
  ];
  const now = Date.now();
  const elapsed = _gpsLastTick ? Math.min((now - _gpsLastTick) / 1000, 5) : 2;
  _gpsLastTick = now;
  const LAT_MIN=27.8, LAT_MAX=29.5, LNG_MIN=76.0, LNG_MAX=78.0;

  return Array.from({ length: 40 }, (_, idx) => {
    const num = idx + 1;
    if (!_gpsSimState[idx]) {
      const b = GPS_BASES[idx % GPS_BASES.length];
      _gpsSimState[idx] = { lat: b[0], lng: b[1], heading: (num*37+idx*53)%360, speedKmh: 15+((num*7+idx*11)%45), turnTimer: Math.floor(Math.random()*20) };
    }
    const s = _gpsSimState[idx];
    const isIgnitionOn = num % 3 !== 0 && num % 7 !== 0;
    if (isIgnitionOn) {
      s.turnTimer -= elapsed;
      if (s.turnTimer <= 0) {
        const turn = (30+((num*idx+Math.floor(now/1000))%60))*(Math.random()<0.5?1:-1);
        s.heading = (s.heading+turn+360)%360;
        s.turnTimer = 15+(num%25);
      }
      if (s.lat<LAT_MIN||s.lat>LAT_MAX) s.heading=(360-s.heading)%360;
      if (s.lng<LNG_MIN||s.lng>LNG_MAX) s.heading=(180-s.heading+360)%360;
      const hr = (s.heading*Math.PI)/180;
      const dk = (s.speedKmh*elapsed)/3600;
      s.lat = Math.max(LAT_MIN,Math.min(LAT_MAX, s.lat+(dk/111)*Math.cos(hr)));
      s.lng = Math.max(LNG_MIN,Math.min(LNG_MAX, s.lng+(dk/(111*Math.cos((s.lat*Math.PI)/180)))*Math.sin(hr)));
    }
    const speedKnots = isIgnitionOn ? parseFloat((s.speedKmh/1.852).toFixed(1)) : 0;
    return {
      name: `HR-55-${1000+num} (A-${num})`,
      deviceUniqueId: `356218600789${String(700+num).padStart(3,"0")}`,
      latitude: s.lat, longitude: s.lng, speed: speedKnots, course: s.heading,
      attributes: {
        batteryLevel: 3800+((num*15)%400), ignition: isIgnitionOn,
        totalDistance: 12000000+num*450000, todayDistance: isIgnitionOn?8000+num*1200:0,
        charge: isIgnitionOn, motion: speedKnots>0,
      },
      serverTime: new Date().toISOString(),
    };
  });
};

export async function GET() {
  try {
    const objects = await fetchAllDevicesAndPositions();

    if (Array.isArray(objects) && objects.length > 0) {
      // Record points to history database
      recordGpsPoints(objects);
      return NextResponse.json({
        success: true,
        data: {
          object: objects
        }
      });
    }
    
    throw new Error("Empty response array from remote GPS API.");
  } catch (error) {
    console.warn("GPS API Remote Fetch failed, serving simulated telemetry fallback:", error.message);
    
    return NextResponse.json({
      success: true,
      data: {
        object: generateSimulatedGps()
      },
      simulated: true
    });
  }
}
