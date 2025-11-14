import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/lib/db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  try {
    console.log('Running gateway database migrations...');

    // Read and execute migrations in order
    const migrations = [
      '0001_create_gateway_schema.sql',
      '0002_registration_codes.sql',
    ];

    for (const migrationFile of migrations) {
      const migrationPath = join(__dirname, '../drizzle/migrations', migrationFile);
      try {
        const migrationSQL = readFileSync(migrationPath, 'utf-8');
        await pool.query(migrationSQL);
        console.log(`✓ ${migrationFile} completed`);
      } catch (error: any) {
        // If file doesn't exist, skip it
        if (error.code === 'ENOENT') {
          console.log(`⚠ ${migrationFile} not found, skipping`);
          continue;
        }
        throw error;
      }
    }

    console.log('✓ All gateway migrations completed');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();

