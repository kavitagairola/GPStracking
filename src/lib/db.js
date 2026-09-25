import { Pool } from "pg";

// Global pool singleton — reused across all API calls in Next.js
let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes("neon.tech") || process.env.DATABASE_URL?.includes("amazonaws")
        ? { rejectUnauthorized: false }
        : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on("error", (err) => {
      console.error("Unexpected PostgreSQL pool error:", err);
    });
  }
  return pool;
}

/**
 * Execute a parameterized SQL query.
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<import("pg").QueryResult>}
 */
export async function query(text, params) {
  const client = getPool();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (err) {
    console.error("Database query error:", err.message, "\nQuery:", text);
    throw err;
  }
}

export default getPool;
