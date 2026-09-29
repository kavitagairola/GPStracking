import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

let tableReady;

async function ensureAssignmentsTable() {
  if (!tableReady) {
    tableReady = query(`
      CREATE TABLE IF NOT EXISTS gps_driver_assignments (
        device_id VARCHAR(255) PRIMARY KEY,
        device_name VARCHAR(255) NOT NULL,
        driver_id VARCHAR(20) NOT NULL UNIQUE REFERENCES drivers(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).catch(error => {
      tableReady = null;
      throw error;
    });
  }

  await tableReady;
}

function invalidResponse(message, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function validateAssignment(body) {
  const deviceId = String(body.deviceUniqueId || "").trim();
  const deviceName = String(body.deviceName || "").trim();
  const driverId = String(body.driverId || "").trim();

  if (!deviceId || !deviceName || !driverId) {
    return { response: invalidResponse("GPS device and an existing driver are required") };
  }

  const driverResult = await query(
    "SELECT id FROM drivers WHERE id = $1",
    [driverId]
  );
  if (driverResult.rows.length === 0) {
    return { response: invalidResponse("Selected driver was not found", 404) };
  }

  return { deviceId, deviceName, driverId };
}

export async function GET() {
  try {
    await ensureAssignmentsTable();
    const result = await query(`
      SELECT assignment.device_id, assignment.device_name,
             driver.id AS driver_id, driver.name AS driver_name, driver.phone AS driver_phone
      FROM gps_driver_assignments assignment
      JOIN drivers driver ON driver.id = assignment.driver_id
      ORDER BY assignment.device_name ASC
    `);

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("[GPS Assignments GET Error]", error.message);
    return NextResponse.json({ success: false, error: "Failed to load GPS driver assignments" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureAssignmentsTable();
    const validated = await validateAssignment(await request.json());
    if (validated.response) return validated.response;

    const result = await query(`
      INSERT INTO gps_driver_assignments (device_id, device_name, driver_id)
      VALUES ($1, $2, $3)
      RETURNING device_id, device_name, driver_id
    `, [validated.deviceId, validated.deviceName, validated.driverId]);

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    if (error.code === "23505") return invalidResponse("GPS vehicle or driver is already assigned", 409);
    console.error("[GPS Assignments POST Error]", error.message);
    return NextResponse.json({ success: false, error: "Failed to assign driver to GPS vehicle" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await ensureAssignmentsTable();
    const validated = await validateAssignment(await request.json());
    if (validated.response) return validated.response;

    const result = await query(`
      INSERT INTO gps_driver_assignments (device_id, device_name, driver_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (device_id) DO UPDATE
        SET device_name = EXCLUDED.device_name,
            driver_id = EXCLUDED.driver_id,
            updated_at = NOW()
      RETURNING device_id, device_name, driver_id
    `, [validated.deviceId, validated.deviceName, validated.driverId]);

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") return invalidResponse("This driver is already assigned to another GPS vehicle", 409);
    console.error("[GPS Assignments PUT Error]", error.message);
    return NextResponse.json({ success: false, error: "Failed to update GPS driver assignment" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await ensureAssignmentsTable();
    const { searchParams } = new URL(request.url);
    const deviceId = String(searchParams.get("deviceUniqueId") || "").trim();
    if (!deviceId) return invalidResponse("deviceUniqueId is required");

    const result = await query(
      "DELETE FROM gps_driver_assignments WHERE device_id = $1",
      [deviceId]
    );
    if (result.rowCount === 0) return invalidResponse("GPS driver assignment not found", 404);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[GPS Assignments DELETE Error]", error.message);
    return NextResponse.json({ success: false, error: "Failed to remove GPS driver assignment" }, { status: 500 });
  }
}