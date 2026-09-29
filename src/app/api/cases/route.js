import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const result = await query("SELECT * FROM cases ORDER BY created_at DESC");
    return NextResponse.json({ success: true, data: result.rows.map(rowToCase) });
  } catch (err) {
    console.error("[Cases GET]", err.message);
    return NextResponse.json({ success: false, error: "Failed to load cases" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const countResult = await query("SELECT COUNT(*) FROM cases");
    const count = parseInt(countResult.rows[0].count, 10) + 1;
    const newId = `CASE-${new Date().toISOString().slice(2,10).replace(/-/g,"")}-${String(count).padStart(3,"0")}`;
    const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
   const result = await query(
  `INSERT INTO cases (id, caller, phone, animal, condition, priority, location, driver, status, photo, time)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Assigned',NULL,$9) RETURNING *`,
  [newId, body.caller, body.phone||"N/A", body.animal, body.condition||"", body.priority||"MEDIUM", body.location||"", body.driver||null, timeStr]
);
    return NextResponse.json({ success: true, data: rowToCase(result.rows[0]) });
  } catch (err) {
    console.error("[Cases POST]", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
const {
  id,
  status,
  photo,
  driver,
  missionStep,
  stageTimes,
  updatedAt,
} = body;

    if (!id) return NextResponse.json({ success: false, error: "Missing case id" }, { status: 400 });

    const updates = [], values = [];
    let p = 1;

    if (driver !== undefined) {
      updates.push(`driver = $${p++}`); values.push(driver);
      updates.push(`assigned_at = NOW()`);
    }

   if (status !== undefined) {
  updates.push(`status = $${p++}`);
  values.push(status);

  const now = new Date().toISOString();

  switch (status) {
    case "En Route":
      updates.push(`trip_started_at = $${p++}`);
      values.push(now);
      break;

    case "Reached Location":
      updates.push(`reached_at = $${p++}`);
      values.push(now);
      break;

    case "Animal Picked":
      updates.push(`pickup_confirmed_at = $${p++}`);
      values.push(now);
      break;

    case "Hospital Reached":
      updates.push(`hospital_reached_at = $${p++}`);
      values.push(now);

      updates.push(`unload_started_at = $${p++}`);
      values.push(now);
      break;

    case "Completed":
      updates.push(`unload_completed_at = $${p++}`);
      values.push(now);

      updates.push(`completed_at = $${p++}`);
      values.push(
        new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      break;
  }
}
    if (photo !== undefined) { updates.push(`photo = $${p++}`); values.push(photo); }
    if (updates.length === 0) return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 });

    values.push(id);
    const result = await query(`UPDATE cases SET ${updates.join(", ")} WHERE id = $${p} RETURNING *`, values);
    if (result.rows.length === 0) return NextResponse.json({ success: false, error: "Case not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: rowToCase(result.rows[0]) });
  } catch (err) {
    console.error("[Cases PUT]", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
    await query("DELETE FROM cases WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Cases DELETE]", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

function rowToCase(row) {
  const missionStep =
    row.status === "Completed"
      ? "completed"
      : row.hospital_reached_at
      ? "hospital"
      : row.pickup_confirmed_at
      ? "pickup"
      : row.reached_at
      ? "reached"
      : row.trip_started_at
      ? "route"
      : "assigned";

  return {
    id: row.id,
    caller: row.caller,
    phone: row.phone,
    animal: row.animal,
    condition: row.condition,
    priority: row.priority,
    location: row.location,
    driver: row.driver,
    status: row.status,
    photo: row.photo,
    time: row.time,

    completedAt: row.completed_at,
    createdAt: row.created_at,
    assignedAt: row.assigned_at,
    tripStartedAt: row.trip_started_at,
    reachedAt: row.reached_at,
    pickupConfirmedAt: row.pickup_confirmed_at,
    hospitalReachedAt: row.hospital_reached_at,
    unloadStartedAt: row.unload_started_at,
    unloadCompletedAt: row.unload_completed_at,

    missionStep,
  };
}