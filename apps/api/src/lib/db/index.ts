import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
// Schemas not used - using raw SQL instead
// import * as muninnSchema from './schemas/muninn';
// import * as sigurdSchema from './schemas/sigurd';
// import * as huginnSchema from './schemas/huginn';
// import * as skuldSchema from './schemas/skuld';
// import * as yggdrasilSchema from './schemas/yggdrasil';

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

// Initialize Drizzle (without schemas - using raw SQL instead)
export const db = drizzle(pool);

// Export pool for raw queries if needed
export { pool };

// Graceful shutdown function - called from main application
export async function closeDatabase() {
  await pool.end();
}

