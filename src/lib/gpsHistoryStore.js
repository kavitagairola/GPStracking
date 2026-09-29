import { query } from "@/lib/db";

/**
 * Record GPS points for a list of devices into the PostgreSQL gps_history table.
 * Uses UPSERT (INSERT ... ON CONFLICT) to update existing day records.
 */
export async function recordGpsPoints(devices) {
  try {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

    for (const device of devices) {
      const id = device.deviceUniqueId;
      if (!id) continue;

      // Fetch existing points for this device+date
      const existing = await query(
        "SELECT points FROM gps_history WHERE device_id = $1 AND date_str = $2",
        [id, dateStr]
      );

      let points = existing.rows.length > 0 ? existing.rows[0].points : [];
      const lastPoint = points[points.length - 1];

      // Only add point if coordinates, ignition, or speed changed significantly
      const hasChanged =
        !lastPoint ||
        Math.abs(lastPoint.latitude - device.latitude) > 0.00002 ||
        Math.abs(lastPoint.longitude - device.longitude) > 0.00002 ||
        Math.abs(lastPoint.speed - device.speed) > 2 ||
        lastPoint.ignition !== device.attributes?.ignition;

      if (hasChanged) {
        points.push({
          latitude: device.latitude,
          longitude: device.longitude,
          speed: device.speed,
          course: device.course || 0,
          ignition: device.attributes?.ignition === true,
          battery: device.attributes?.batteryLevel || null,
          timestamp: now.toISOString(),
        });

        // UPSERT: insert or update
        await query(
          `INSERT INTO gps_history (device_id, date_str, points, updated_at)
           VALUES ($1, $2, $3::jsonb, NOW())
           ON CONFLICT (device_id, date_str)
           DO UPDATE SET points = $3::jsonb, updated_at = NOW()`,
          [id, dateStr, JSON.stringify(points)]
        );
      }
    }
  } catch (err) {
    console.error("Failed to record GPS points to DB:", err.message);
  }
}

/**
 * Get route history for a device from PostgreSQL.
 *
 * IMPORTANT:
 * - Real recorded DB points are preferred.
 * - No simulated/fake GPS route is generated.
 * - If there is no real history, return an empty array.
 */
export async function getRouteHistory(
  deviceUniqueId,
  dateStr,
  currentDeviceState
) {
  try {
    const result = await query(
      "SELECT points FROM gps_history WHERE device_id = $1 AND date_str = $2",
      [deviceUniqueId, dateStr]
    );

    const recordedPoints =
      result.rows.length > 0 && Array.isArray(result.rows[0].points)
        ? result.rows[0].points
        : [];

    return recordedPoints;
  } catch (err) {
    console.error(
      "Failed to get route history from DB:",
      err.message
    );

    return [];
  }
}