import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET all ambulances
export async function GET() {
  try {
    const result = await query(
      `SELECT * FROM ambulances ORDER BY ambulance_number ASC`
    );
    return NextResponse.json({ success: true, data: result.rows.map(rowToAmbulance) });
  } catch (err) {
    console.error("[Ambulances GET Error]", err.message);
    return NextResponse.json({ success: false, error: "Failed to load ambulances" }, { status: 500 });
  }
}

// POST — Add new ambulance
export async function POST(req) {
  try {
    const body = await req.json();
    const { ambulance_number, vehicle_name, registration, type_name, driver_name, driver_phone, status } = body;

    if (!ambulance_number) {
      return NextResponse.json({ success: false, error: "Ambulance number is required" }, { status: 400 });
    }

    // Check if already exists
    const existing = await query("SELECT id FROM ambulances WHERE ambulance_number = $1", [ambulance_number]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ success: false, error: "Ambulance number already exists" }, { status: 409 });
    }

    const num = Number(ambulance_number);
    const ambId = `AMB-${String(num).padStart(3, "0")}`;
    const defaultType = num % 3 === 0 ? "Tata Winger" : num % 3 === 1 ? "Force Traveller" : "Maruti Eeco";

    const result = await query(
      `INSERT INTO ambulances (id, ambulance_number, vehicle_name, registration, type_name, type_desc, driver_name, driver_phone, status)
       VALUES ($1, $2, $3, $4, $5, 'Rescue Van', $6, $7, $8)
       RETURNING *`,
      [
        ambId,
        num,
        vehicle_name || `Ambulance ${String(num).padStart(2, "0")}`,
        registration || `HR-55-${1000 + num}`,
        type_name || defaultType,
        driver_name || null,
        driver_phone || null,
        status || "Active",
      ]
    );

    return NextResponse.json({ success: true, data: rowToAmbulance(result.rows[0]) });
  } catch (err) {
    console.error("[Ambulances POST Error]", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PUT — Update ambulance
export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, vehicle_name, registration, type_name, driver_name, driver_phone, status } = body;

    if (!id) return NextResponse.json({ success: false, error: "Missing ambulance id" }, { status: 400 });

    const updates = [];
    const values = [];
    let paramIdx = 1;

    const fields = { vehicle_name, registration, type_name, driver_name, driver_phone, status };
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) {
        updates.push(`${key} = $${paramIdx++}`);
        values.push(val);
      }
    }

    if (updates.length === 0) return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 });

    values.push(id);
    const result = await query(
      `UPDATE ambulances SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${paramIdx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return NextResponse.json({ success: false, error: "Ambulance not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: rowToAmbulance(result.rows[0]) });
  } catch (err) {
    console.error("[Ambulances PUT Error]", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE — Remove ambulance
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
    await query("DELETE FROM ambulances WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Ambulances DELETE Error]", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

function rowToAmbulance(row) {
  return {
    id: row.id,
    ambulance_number: row.ambulance_number,
    vehicle_name: row.vehicle_name,
    registration: row.registration,
    type_name: row.type_name,
    type_desc: row.type_desc,
    driver_name: row.driver_name,
    driver_phone: row.driver_phone,
    status: row.status,
    gps_imei: row.gps_imei,
    created_at: row.created_at,
  };
}
