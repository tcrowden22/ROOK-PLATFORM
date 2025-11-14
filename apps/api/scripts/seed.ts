#!/usr/bin/env tsx

/**
 * Database Seed Script
 * 
 * Seeds the database with demo data for development.
 * Safe to run multiple times (uses upsert logic).
 */

import { pool } from '../src/lib/db/index.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function seed() {
  console.log('Seeding database...');

  try {
    // Seed users using raw SQL to avoid schema issues
    console.log('Creating users...');
    const adminResult = await pool.query(`
      INSERT INTO muninn.users (email, password_hash, name, role, status)
      VALUES ('admin@rook.local', 'demo_password_hash', 'Admin User', 'admin', 'active')
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email
    `);
    
    const agentResult = await pool.query(`
      INSERT INTO muninn.users (email, password_hash, name, role, status)
      VALUES ('agent@rook.local', 'demo_password_hash', 'Agent User', 'agent', 'active')
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email
    `);
    
    const regularResult = await pool.query(`
      INSERT INTO muninn.users (email, password_hash, name, role, status)
      VALUES ('user@rook.local', 'demo_password_hash', 'Regular User', 'user', 'active')
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email
    `);

    const adminUser = adminResult.rows[0];
    const agentUser = agentResult.rows[0];
    const regularUser = regularResult.rows[0];

    console.log(`✓ Created ${(adminUser ? 1 : 0) + (agentUser ? 1 : 0) + (regularUser ? 1 : 0)} users`);

    // Seed groups
    console.log('Creating groups...');
    await pool.query(`
      INSERT INTO muninn.groups (name) VALUES ('IT')
      ON CONFLICT DO NOTHING
    `);
    await pool.query(`
      INSERT INTO muninn.groups (name) VALUES ('Sales')
      ON CONFLICT DO NOTHING
    `);
    console.log(`✓ Created groups`);

    // Seed devices
    console.log('Creating devices...');
    if (adminUser) {
      await pool.query(`
        INSERT INTO huginn.devices (hostname, os, owner_user_id, compliance)
        VALUES ('laptop-001', 'Windows 11', $1, true)
        ON CONFLICT DO NOTHING
      `, [adminUser.id]);
    }
    if (agentUser) {
      await pool.query(`
        INSERT INTO huginn.devices (hostname, os, owner_user_id, compliance)
        VALUES ('macbook-002', 'macOS 14', $1, true)
        ON CONFLICT DO NOTHING
      `, [agentUser.id]);
    }
    console.log(`✓ Created devices`);

    // Seed tickets
    console.log('Creating tickets...');
    if (regularUser && adminUser) {
      await pool.query(`
        INSERT INTO sigurd.tickets (type, status, priority, requester_user_id, assignee_user_id, title, description)
        VALUES ('incident', 'new', 'high', $1, $2, 'Sample Incident', 'This is a sample incident for testing')
        ON CONFLICT DO NOTHING
      `, [regularUser.id, adminUser.id]);
    }

    // Seed knowledge articles
    console.log('Creating knowledge articles...');
    await pool.query(`
      INSERT INTO sigurd.knowledge_articles (title, body, tags)
      VALUES ('Getting Started with Rook', 'Welcome to Rook Platform! This is a comprehensive IT operations platform.', ARRAY['getting-started', 'documentation'])
      ON CONFLICT DO NOTHING
    `);

    console.log('✓ Seeding completed successfully!');
  } catch (error) {
    console.error('✗ Seeding failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });
