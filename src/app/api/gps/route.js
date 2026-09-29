import { NextResponse } from "next/server";
import { recordGpsPoints } from "@/lib/gpsHistoryStore";
import { fetchMillitrackGps } from "@/lib/millitrack";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { objects, refreshed, stale } = await fetchMillitrackGps();

    if (Array.isArray(objects) && objects.length > 0) {
      // Record points to history database
      if (refreshed) recordGpsPoints(objects);
      return NextResponse.json({
        success: true,
        data: {
          object: objects
        },
        stale,
      });
    }
    
    throw new Error("Empty response array from remote GPS API.");
  } catch (error) {
    console.error("GPS API Remote Fetch failed:", error.message);
    return NextResponse.json(
      { success: false, error: "Live GPS data is currently unavailable." },
      { status: 503 }
    );
  }
}
