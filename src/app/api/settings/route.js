import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import fs from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "src/lib/settings.json");

const defaultSettings = {
  orgName: "ResqTrack Animal Welfare Association",
  supportPhone: "9876543200",
  supportEmail: "ops@resqtrack.org",
  pollingRate: 4,
  offlineTimeout: 15,
  autoDispatch: "NEAREST",
  smsHighAlert: true,
  emailDailyDigest: false,
  enforcePhoto: true,
};

function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf8");
      return { ...defaultSettings, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error("Failed to read settings file:", err.message);
  }
  return defaultSettings;
}

function writeSettings(newSettings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(newSettings, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write settings file:", err.message);
  }
}

export async function GET() {
  try {
    // Try reading settings from DB if table exists, fallback to JSON
    try {
      const dbRes = await query("SELECT key, value FROM settings");
      if (dbRes.rows.length > 0) {
        const settingsFromDb = {};
        dbRes.rows.forEach(r => {
          try {
            settingsFromDb[r.key] = JSON.parse(r.value);
          } catch {
            settingsFromDb[r.key] = r.value;
          }
        });
        return NextResponse.json({ success: true, data: { ...defaultSettings, ...settingsFromDb } });
      }
    } catch {}

    const data = readSettings();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[Settings GET Error]", err);
    return NextResponse.json({ success: true, data: defaultSettings });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const current = readSettings();
    const updated = { ...current, ...body };

    writeSettings(updated);

    // Also attempt DB update if table exists
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS settings (
          key VARCHAR(100) PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      for (const [key, val] of Object.entries(updated)) {
        await query(
          `INSERT INTO settings (key, value) VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
          [key, JSON.stringify(val)]
        );
      }
    } catch (e) {
      console.warn("DB settings save warning (using file fallback):", e.message);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[Settings POST Error]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
