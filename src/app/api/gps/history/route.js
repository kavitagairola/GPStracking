import { NextResponse } from "next/server";
import { getRouteHistory } from "@/lib/gpsHistoryStore";
import { fetchMillitrackHistory } from "@/lib/millitrack";

export const dynamic = "force-dynamic";

function getDateRange(dateStr) {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);

  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

function normalizeHistoryPoint(position) {
  if (
    typeof position?.latitude !== "number" ||
    typeof position?.longitude !== "number"
  ) {
    return null;
  }

  const attributes = position.attributes || {};

  return {
    latitude: position.latitude,
    longitude: position.longitude,
    speed: Number(position.speed || 0) * 1.852,
    course: Number(position.course || 0),
    ignition: attributes.ignition === true,
    battery:
      attributes.batteryLevel ??
      attributes.battery ??
      null,
    timestamp:
      position.fixTime ||
      position.deviceTime ||
      position.serverTime ||
      null,
    address: position.address || "",
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const deviceUniqueId =
    searchParams.get("deviceUniqueId");

  const dateStr =
    searchParams.get("date") ||
    new Date().toISOString().split("T")[0];

  if (!deviceUniqueId) {
    return NextResponse.json(
      {
        success: false,
        error: "deviceUniqueId is required",
      },
      { status: 400 }
    );
  }

  try {
    /*
     * 1. Resolve selected device from current Millitrack data.
     *    deviceUniqueId is our app identifier, while the
     *    historical API requires the Millitrack/Traccar device id.
     */
    const { objects } = await import("@/lib/millitrack").then(
      ({ fetchMillitrackGps }) => fetchMillitrackGps()
    );

    const selectedDevice = objects.find(
      (device) =>
        device.deviceUniqueId === deviceUniqueId
    );

    if (!selectedDevice?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Selected GPS device was not found.",
        },
        { status: 404 }
      );
    }

    /*
     * 2. Build exact selected-date range.
     */
    const { from, to } = getDateRange(dateStr);

    /*
     * 3. Fetch REAL historical positions.
     */
    const historicalPositions =
      await fetchMillitrackHistory(
        selectedDevice.id,
        from,
        to
      );

    /*
     * 4. Normalize positions for the existing
     *    GPS History UI.
     */
    const realPoints = historicalPositions
      .map(normalizeHistoryPoint)
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(a.timestamp || 0) -
          new Date(b.timestamp || 0)
      );

    /*
     * 5. If Millitrack has real history, return it.
     */
    if (realPoints.length > 0) {
      return NextResponse.json({
        success: true,
        source: "millitrack-history",
        data: realPoints,
      });
    }

    /*
     * 6. If remote history is empty, use the locally
     *    recorded real GPS points as fallback.
     */
    const storedPoints = await getRouteHistory(
      deviceUniqueId,
      dateStr
    );

    if (storedPoints.length > 0) {
      return NextResponse.json({
        success: true,
        source: "database-history",
        data: storedPoints,
      });
    }

    /*
     * 7. No real history exists.
     *    NEVER generate fake coordinates.
     */
    return NextResponse.json({
      success: true,
      source: "empty",
      data: [],
      message:
        "No GPS history is available for the selected vehicle and date.",
    });
  } catch (error) {
    console.error(
      "GPS History API failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to fetch GPS history.",
      },
      { status: 502 }
    );
  }
}