import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const { Pool } = pg;

// Create connection pool
// Use DATABASE_RUNTIME_URL if available, fallback to DATABASE_URL for backward compatibility
const connectionString = process.env.DATABASE_RUNTIME_URL || process.env.DATABASE_URL || 'postgresql://rook_runtime:changeme_runtime_password@localhost:5432/rook';

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize Drizzle
export const db = drizzle(pool);

// Export pool for raw queries
export { pool };

// Graceful shutdown function
export async function closeDatabase() {
  await pool.end();
}

