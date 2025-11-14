#!/usr/bin/env tsx

/**
 * Database Migration Script
 * 
 * This script runs Drizzle migrations against the database.
 * It can be run multiple times safely (idempotent).
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function runMigrations() {
  // Use DATABASE_MIGRATE_URL if available, fallback to DATABASE_URL for backward compatibility
  const connectionString = process.env.DATABASE_MIGRATE_URL || process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('Error: DATABASE_MIGRATE_URL or DATABASE_URL environment variable is not set');
    console.error('For migrations, use DATABASE_MIGRATE_URL with rook_migrate role');
    process.exit(1);
  }

  // Validate that we're using the migrate role (check connection string)
  if (connectionString.includes('rook_migrate') || connectionString.includes('rook_migrator')) {
    console.log('Using migration role for DDL operations');
  } else {
    console.warn('Warning: Not using rook_migrate or rook_migrator role. Migrations may fail.');
  }

  console.log('Connecting to database...');
  const pool = new Pool({
    connectionString,
    max: 1, // Use single connection for migrations
  });

  const db = drizzle(pool);

  try {
    // Verify connection and role
    const result = await pool.query('SELECT current_user, current_database()');
    console.log(`Connected as: ${result.rows[0].current_user} to database: ${result.rows[0].current_database}`);
    
    console.log('Running migrations...');
    await migrate(db, { migrationsFolder: './drizzle/migrations' });
    console.log('✓ Migrations completed successfully');
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();

