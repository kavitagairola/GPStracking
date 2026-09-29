/**
 * ResqTrack Database Initialization Script
 * Run: node scripts/init-db.js
 *
 * - Creates 'resqtrack' database if not exists
 * - Creates all tables: users, cases, gps_history, drivers, ambulances, gps_driver_assignments
 * - Seeds default users (admin, telecaller, drivers)
 * - Seeds drivers registry (16 drivers)
 * - Seeds ambulances registry (40 ambulances)
 * - Migrates existing cases.json data to PostgreSQL
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

// Parse .env.local manually
const envPath = join(rootDir, ".env.local");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > -1) {
        const key = trimmed.substring(0, eqIdx).trim();
        const value = trimmed.substring(eqIdx + 1).trim();
        process.env[key] = value;
      }
    }
  });
  console.log("✅ .env.local loaded");
} else {
  console.error("❌ .env.local not found!");
  process.exit(1);
}

const pg = require("pg");
const bcrypt = require("bcryptjs");
const { Pool } = pg;

const DRIVERS_LIST = [
  { name: "Raj Kumar",          phone: "9876543210" },
  { name: "Manoj Yadav",        phone: "9876543211" },
  { name: "Pawan Singh",        phone: "9876543212" },
  { name: "Amit Verma",         phone: "9876543213" },
  { name: "Suresh Pal",         phone: "9876543214" },
  { name: "Deepak Tyagi",       phone: "9876543215" },
  { name: "Mohit Sharma",       phone: "9876543217" },
  { name: "Vikash Chaudhary",   phone: "9876543216" },
  { name: "Karan Singh",        phone: "9876543218" },
  { name: "Jatin Sharma",       phone: "9876543219" },
  { name: "Rohan Gupta",        phone: "9876543220" },
  { name: "Sanjay Dutta",       phone: "9876543221" },
  { name: "Aman Preet",         phone: "9876543222" },
  { name: "Vijay Kumar",        phone: "9876543223" },
  { name: "Rahul Verma",        phone: "9876543224" },
  { name: "Abhishek Pal",       phone: "9876543225" },
];

// Ensure resqtrack database exists
async function ensureDatabase() {
  const adminPool = new Pool({
    host: "localhost", port: 5432,
    user: "postgres", password: "Admin123",
    database: "postgres", ssl: false,
  });
  try {
    const res = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = 'resqtrack'");
    if (res.rows.length === 0) {
      await adminPool.query("CREATE DATABASE resqtrack");
      console.log("✅ Database 'resqtrack' created");
    } else {
      console.log("ℹ️  Database 'resqtrack' already exists");
    }
  } finally {
    await adminPool.end();
  }
}

// Create all tables
async function createTables(pool) {
  console.log("\n📋 Creating tables...");

  // Users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE,
      vehicle_name VARCHAR(100),
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'TELECALLER', 'DRIVER')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("  ✅ Table: users");

  // Cases table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cases (
      id VARCHAR(50) PRIMARY KEY,
      caller VARCHAR(255) NOT NULL,
      phone VARCHAR(50) DEFAULT 'N/A',
      animal VARCHAR(100) NOT NULL,
      condition TEXT,
      priority VARCHAR(20) DEFAULT 'MEDIUM',
      location TEXT NOT NULL,
      driver VARCHAR(255),
      status VARCHAR(100) DEFAULT 'Assigned',
      photo TEXT,
      time VARCHAR(50),
      completed_at VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("  ✅ Table: cases");

  // GPS History table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gps_history (
      id SERIAL PRIMARY KEY,
      device_id VARCHAR(255) NOT NULL,
      date_str DATE NOT NULL,
      points JSONB DEFAULT '[]',
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (device_id, date_str)
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_gps_history_device_date 
    ON gps_history(device_id, date_str)
  `);
  console.log("  ✅ Table: gps_history");

  // Drivers table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drivers (
      id VARCHAR(20) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(20) NOT NULL,
      license VARCHAR(50),
      ambulance_number INTEGER NOT NULL UNIQUE,
      vehicle_name VARCHAR(100),
      plate VARCHAR(50),
      status VARCHAR(50) DEFAULT 'Active',
      availability VARCHAR(50) DEFAULT 'Off Duty',
      total_rescues INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("  ✅ Table: drivers");

  // Ambulances table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ambulances (
      id VARCHAR(20) PRIMARY KEY,
      ambulance_number INTEGER NOT NULL UNIQUE,
      vehicle_name VARCHAR(100) NOT NULL,
      registration VARCHAR(50),
      type_name VARCHAR(100) DEFAULT 'Force Traveller',
      type_desc VARCHAR(100) DEFAULT 'Rescue Van',
      driver_name VARCHAR(255),
      driver_phone VARCHAR(20),
      status VARCHAR(50) DEFAULT 'Active',
      gps_imei VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("  ✅ Table: ambulances");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS gps_driver_assignments (
      device_id VARCHAR(255) PRIMARY KEY,
      device_name VARCHAR(255) NOT NULL,
      driver_id VARCHAR(20) NOT NULL UNIQUE REFERENCES drivers(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log("  ✅ Table: gps_driver_assignments");
}

// Seed auth users
async function seedUsers(pool) {
  console.log("\n👥 Seeding users (auth)...");
  const users = [
    { name: "Admin User",   email: "admin@resqtrack.org",   password: "admin123",   role: "ADMIN",      vehicle_name: null },
    { name: "Priya Sharma", email: "caller@resqtrack.org",  password: "caller123",  role: "TELECALLER", vehicle_name: null },
    ...DRIVERS_LIST.map((drv, idx) => ({
      name: drv.name, email: null, password: "driver123", role: "DRIVER",
      vehicle_name: `Ambulance ${String(idx + 1).padStart(2, "0")}`,
    })),
  ];

  let seeded = 0, skipped = 0;
  for (const user of users) {
    const existing = user.email
      ? await pool.query("SELECT id FROM users WHERE email = $1", [user.email])
      : await pool.query("SELECT id FROM users WHERE vehicle_name = $1", [user.vehicle_name]);
    if (existing.rows.length > 0) { skipped++; continue; }
    const hash = await bcrypt.hash(user.password, 10);
    await pool.query(
      "INSERT INTO users (name, email, vehicle_name, password_hash, role) VALUES ($1, $2, $3, $4, $5)",
      [user.name, user.email || null, user.vehicle_name || null, hash, user.role]
    );
    seeded++;
  }
  console.log(`  ✅ Users: ${seeded} new, ${skipped} skipped`);
}

// Seed drivers registry
async function seedDrivers(pool) {
  console.log("\n🚗 Seeding drivers registry...");
  let seeded = 0, skipped = 0;

  for (let idx = 0; idx < DRIVERS_LIST.length; idx++) {
    const drv = DRIVERS_LIST[idx];
    const num = idx + 1;
    const driverId = `DRV-${String(num).padStart(3, "0")}`;

    const existing = await pool.query("SELECT id FROM drivers WHERE id = $1", [driverId]);
    if (existing.rows.length > 0) { skipped++; continue; }

    await pool.query(
      `INSERT INTO drivers (id, name, email, phone, license, ambulance_number, vehicle_name, plate, status, availability, total_rescues)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Active', 'Off Duty', $9)`,
      [
        driverId,
        drv.name,
        `${drv.name.toLowerCase().replace(/\s+/g, "")}@resqtrack.org`,
        drv.phone,
        `DL-${num}A-${1000 + num}`,
        num,
        `Ambulance ${String(num).padStart(2, "0")}`,
        `HR-55-${1000 + num}`,
        10 + num * 5,
      ]
    );
    seeded++;
  }
  console.log(`  ✅ Drivers: ${seeded} new, ${skipped} skipped`);
}

// Seed ambulances registry (40 vehicles)
async function seedAmbulances(pool) {
  console.log("\n🚑 Seeding ambulances registry (40 vehicles)...");
  let seeded = 0, skipped = 0;

  for (let num = 1; num <= 40; num++) {
    const ambId = `AMB-${String(num).padStart(3, "0")}`;
    const existing = await pool.query("SELECT id FROM ambulances WHERE id = $1", [ambId]);
    if (existing.rows.length > 0) { skipped++; continue; }

    const driverEntry = DRIVERS_LIST[(num - 1) % DRIVERS_LIST.length];
    const typeName = num % 3 === 0 ? "Tata Winger" : num % 3 === 1 ? "Force Traveller" : "Maruti Eeco";

    await pool.query(
      `INSERT INTO ambulances (id, ambulance_number, vehicle_name, registration, type_name, type_desc, driver_name, driver_phone, status)
       VALUES ($1, $2, $3, $4, $5, 'Rescue Van', $6, $7, 'Active')`,
      [
        ambId,
        num,
        `Ambulance ${String(num).padStart(2, "0")}`,
        `HR-55-${1000 + num}`,
        typeName,
        driverEntry.name,
        driverEntry.phone,
      ]
    );
    seeded++;
  }
  console.log(`  ✅ Ambulances: ${seeded} new, ${skipped} skipped`);
}

// Migrate existing cases.json
async function migrateCases(pool) {
  console.log("\n📦 Migrating cases.json...");
  const casesPath = join(rootDir, "src", "lib", "cases.json");
  if (!existsSync(casesPath)) { console.log("  ⚠️  cases.json not found, skipping"); return; }

  const cases = JSON.parse(readFileSync(casesPath, "utf-8"));
  if (!Array.isArray(cases) || cases.length === 0) { console.log("  ⚠️  No cases in cases.json"); return; }

  let inserted = 0, skipped = 0;
  for (const c of cases) {
    const existing = await pool.query("SELECT id FROM cases WHERE id = $1", [c.id]);
    if (existing.rows.length > 0) { skipped++; continue; }
    await pool.query(
      `INSERT INTO cases (id, caller, phone, animal, condition, priority, location, driver, status, photo, time, completed_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, NOW())`,
      [c.id, c.caller||"Unknown", c.phone||"N/A", c.animal||"Unknown", c.condition||"", c.priority||"MEDIUM",
       c.location||"Unknown", c.driver||null, c.status||"Assigned", c.photo||null, c.time||null, c.completedAt||null]
    );
    inserted++;
  }
  console.log(`  ✅ Cases: ${inserted} new, ${skipped} skipped`);
}

// Main
async function main() {
  console.log("🚀 ResqTrack DB Initialization Starting...\n");

  await ensureDatabase();

  const pool = new Pool({
    host: "localhost", port: 5432,
    user: "postgres", password: "Admin123",
    database: "resqtrack", ssl: false,
  });

  try {
    await createTables(pool);
    await seedUsers(pool);
    await seedDrivers(pool);
    await seedAmbulances(pool);
    await migrateCases(pool);
    console.log("\n✅ All done! Database is ready.");
    console.log("   DATABASE_URL=postgresql://postgres:Admin123@localhost:5432/resqtrack");
  } catch (err) {
    console.error("\n❌ Error:", err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
