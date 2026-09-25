import { NextResponse } from "next/server";
import { getRouteHistory } from "@/lib/gpsHistoryStore";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const deviceUniqueId = searchParams.get("deviceUniqueId");
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];

  if (!deviceUniqueId) {
    return NextResponse.json({ success: false, error: "deviceUniqueId is required" }, { status: 400 });
  }

  // Fetch current device state from Millitrack using same auth as main GPS routes
  const email    = process.env.MILLITRACK_EMAIL    || "gokulk01";
  const password = process.env.MILLITRACK_PASSWORD || "123456";
  const authHeader = "Basic " + Buffer.from(`${email}:${password}`).toString("base64");
  let currentDeviceState = null;

  try {
    const res = await fetch("http://track2.millitrack.com/api/positions", {
      headers: { Authorization: authHeader, Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const positions = await res.json();
      if (Array.isArray(positions)) {
        // Match by uniqueId — positions use deviceId, so we also fetch devices
        const devRes = await fetch("http://track2.millitrack.com/api/devices", {
          headers: { Authorization: authHeader, Accept: "application/json" },
          cache: "no-store",
        });
        if (devRes.ok) {
          const devices = await devRes.json();
          const dev = Array.isArray(devices) ? devices.find(d => d.uniqueId === deviceUniqueId) : null;
          if (dev) {
            const pos = positions.find(p => p.deviceId === dev.id);
            if (pos) currentDeviceState = { ...dev, ...pos, deviceUniqueId: dev.uniqueId };
          }
        }
      }
    }
  } catch (err) {
    console.warn("Failed to fetch live target state for history backfill:", err.message);
  }

  // Get historical route coordinates resolving directly to the actual current coordinates
  const points = await getRouteHistory(deviceUniqueId, dateStr, currentDeviceState);

  // Return the history points
  return NextResponse.json({
    success: true,
    data: points
  });
}
