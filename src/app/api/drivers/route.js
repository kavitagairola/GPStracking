import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET all drivers
export async function GET() {
  try {
    const result = await query(
      `SELECT * FROM drivers ORDER BY ambulance_number ASC`
    );
    return NextResponse.json({ success: true, data: result.rows.map(rowToDriver) });
  } catch (err) {
    console.error("[Drivers GET Error]", err.message);
    return NextResponse.json({ success: false, error: "Failed to load drivers" }, { status: 500 });
  }
}

// POST — Add new driver
export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, phone, license, ambulance_number, vehicle_name, plate, status } = body;

    if (!name || !phone || !ambulance_number) {
      return NextResponse.json({ success: false, error: "Name, phone and ambulance number are required" }, { status: 400 });
    }

    // Check if ambulance number already taken
    const existing = await query("SELECT id FROM drivers WHERE ambulance_number = $1", [ambulance_number]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ success: false, error: "Ambulance number already assigned to another driver" }, { status: 409 });
    }

    const driverId = `DRV-${String(ambulance_number).padStart(3, "0")}`;
    const result = await query(
      `INSERT INTO drivers (id, name, email, phone, license, ambulance_number, vehicle_name, plate, status, availability, total_rescues)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Available', 0)
       RETURNING *`,
      [
        driverId,
        name,
        email || `${name.toLowerCase().replace(/\s+/g, "")}@resqtrack.org`,
        phone,
        license || `DL-${ambulance_number}A-${1000 + Number(ambulance_number)}`,
        Number(ambulance_number),
        vehicle_name || `Ambulance ${String(ambulance_number).padStart(2, "0")}`,
        plate || `HR-55-${1000 + Number(ambulance_number)}`,
        status || "Active",
      ]
    );

    return NextResponse.json({ success: true, data: rowToDriver(result.rows[0]) });
  } catch (err) {
    console.error("[Drivers POST Error]", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PUT — Update driver
export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, name, email, phone, license, vehicle_name, plate, status, availability, total_rescues } = body;

    if (!id) return NextResponse.json({ success: false, error: "Missing driver id" }, { status: 400 });

    const updates = [];
    const values = [];
    let paramIdx = 1;

    const fields = { name, email, phone, license, vehicle_name, plate, status, availability, total_rescues };
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) {
        updates.push(`${key} = $${paramIdx++}`);
        values.push(val);
      }
    }

    if (updates.length === 0) return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 });

    values.push(id);
    const result = await query(
      `UPDATE drivers SET ${updates.join(", ")}, updated_at = NOW() WHERE (id = $${paramIdx} OR name = $${paramIdx}) RETURNING *`,
      values
    );

    if (result.rows.length === 0) return NextResponse.json({ success: false, error: "Driver not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: rowToDriver(result.rows[0]) });
  } catch (err) {
    console.error("[Drivers PUT Error]", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE — Remove driver
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
    await query("DELETE FROM drivers WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Drivers DELETE Error]", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

function rowToDriver(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    license: row.license,
    ambulance_number: row.ambulance_number,
    vehicle_name: row.vehicle_name,
    plate: row.plate,
    status: row.status,
    availability: row.availability,
    total_rescues: row.total_rescues,
    created_at: row.created_at,
  };
}
