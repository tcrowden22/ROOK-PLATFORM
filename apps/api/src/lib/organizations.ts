/**
 * Organization helper functions
 * Provides utilities for managing organization access and user-organization relationships
 */
import { pool } from '../lib/db/index.js';

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  status: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface UserOrganization {
  userId: string;
  organizationId: string;
  isDefault: boolean;
  createdAt: string;
}

/**
 * Get all organizations a user has access to
 */
export async function getUserOrganizations(userId: string): Promise<Organization[]> {
  const result = await pool.query(`
    SELECT 
      o.id,
      o.name,
      o.domain,
      o.status,
      o.metadata,
      o.created_at as "createdAt",
      o.updated_at as "updatedAt"
    FROM muninn.organizations o
    INNER JOIN muninn.user_organizations uo ON o.id = uo.organization_id
    WHERE uo.user_id = $1
    AND o.status = 'active'
    ORDER BY uo.is_default DESC, o.name ASC
  `, [userId]);

  return result.rows;
}

/**
 * Get user's default organization
 */
export async function getUserDefaultOrganization(userId: string): Promise<Organization | null> {
  const result = await pool.query(`
    SELECT 
      o.id,
      o.name,
      o.domain,
      o.status,
      o.metadata,
      o.created_at as "createdAt",
      o.updated_at as "updatedAt"
    FROM muninn.organizations o
    INNER JOIN muninn.user_organizations uo ON o.id = uo.organization_id
    WHERE uo.user_id = $1
    AND uo.is_default = true
    AND o.status = 'active'
    LIMIT 1
  `, [userId]);

  return result.rows[0] || null;
}

/**
 * Validate that a user has access to a specific organization
 */
export async function validateUserOrganizationAccess(userId: string, organizationId: string): Promise<boolean> {
  const result = await pool.query(`
    SELECT 1
    FROM muninn.user_organizations uo
    INNER JOIN muninn.organizations o ON uo.organization_id = o.id
    WHERE uo.user_id = $1
    AND uo.organization_id = $2
    AND o.status = 'active'
    LIMIT 1
  `, [userId, organizationId]);

  return result.rows.length > 0;
}

/**
 * Get organization by ID
 */
export async function getOrganizationById(organizationId: string): Promise<Organization | null> {
  const result = await pool.query(`
    SELECT 
      id,
      name,
      domain,
      status,
      metadata,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM muninn.organizations
    WHERE id = $1
    AND status = 'active'
    LIMIT 1
  `, [organizationId]);

  return result.rows[0] || null;
}

/**
 * Assign user to organization
 */
export async function assignUserToOrganization(
  userId: string,
  organizationId: string,
  isDefault: boolean = false
): Promise<void> {
  // If setting as default, unset other defaults for this user
  if (isDefault) {
    await pool.query(`
      UPDATE muninn.user_organizations
      SET is_default = false
      WHERE user_id = $1
    `, [userId]);
  }

  // Insert or update user-organization relationship
  await pool.query(`
    INSERT INTO muninn.user_organizations (user_id, organization_id, is_default)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, organization_id)
    DO UPDATE SET is_default = EXCLUDED.is_default
  `, [userId, organizationId, isDefault]);
}

/**
 * Remove user from organization
 */
export async function removeUserFromOrganization(userId: string, organizationId: string): Promise<void> {
  await pool.query(`
    DELETE FROM muninn.user_organizations
    WHERE user_id = $1
    AND organization_id = $2
  `, [userId, organizationId]);
}

/**
 * Get organization IDs that a user has access to (as array of strings)
 */
export async function getUserOrganizationIds(userId: string): Promise<string[]> {
  const result = await pool.query(`
    SELECT organization_id
    FROM muninn.user_organizations uo
    INNER JOIN muninn.organizations o ON uo.organization_id = o.id
    WHERE uo.user_id = $1
    AND o.status = 'active'
  `, [userId]);

  return result.rows.map(row => row.organization_id);
}

