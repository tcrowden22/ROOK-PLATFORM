import { FastifyInstance } from 'fastify';
import { pool } from '../lib/db/index.js';
import { getUserFromRequest, requireRole } from '../auth/rbac.js';
import { NotFoundError } from '../lib/errors.js';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { createKeycloakUser, assignKeycloakRole, assignKeycloakOrganization } from '../lib/keycloak-admin.js';
import { env } from '../config/env.js';
import { organizationMiddleware, requireOrganization } from '../middleware/organization.js';
import {
  getUserOrganizations,
  getOrganizationById,
  assignUserToOrganization,
  removeUserFromOrganization,
  type Organization,
} from '../lib/organizations.js';

export async function muninnRoutes(fastify: FastifyInstance) {
  // Users (read-only for all authenticated users, filtered by organization)
  fastify.get('/users', {
    preHandler: [requireRole('user'), organizationMiddleware],
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request)!;
      const organizationId = (user as any).organizationId || (request as any).userContext?.organizationId;
      
      if (!organizationId) {
        return reply.code(400).send({ 
          error: 'Organization context required',
          message: 'Please select an organization or ensure you are assigned to at least one organization'
        });
      }

      const { search } = request.query as { search?: string };
      
      let query = `
        SELECT id, email, name, status, role, 
               organization_id, created_at, updated_at
        FROM muninn.users
        WHERE organization_id = $1
      `;
      const params: any[] = [organizationId];
      
      if (search) {
        query += ` AND (
          LOWER(name) LIKE $2 OR 
          LOWER(email) LIKE $2 OR 
          LOWER(employee_id) LIKE $2
        )`;
        params.push(`%${search.toLowerCase()}%`);
      }
      
      query += ` ORDER BY created_at DESC LIMIT 100`;
      
      const result = await pool.query(query, params);
      
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch users');
      return reply.code(500).send({ error: 'Failed to fetch users', details: error.message });
    }
  });

  // Search users
  fastify.get('/users/search', {
    preHandler: [requireRole('user'), requireOrganization()],
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request)!;
      const organizationId = user.organizationId;
      
      if (!organizationId) {
        return reply.code(400).send({ error: 'Organization context required' });
      }

      const { q } = request.query as { q?: string };
      
      if (!q || q.trim().length === 0) {
        return reply.send([]);
      }
      
      const searchTerm = `%${q.toLowerCase()}%`;
      const result = await pool.query(`
        SELECT id, email, name, status, role, 
               mfa_enabled, department, employee_id, last_login, sync_source,
               organization_id, created_at, updated_at
        FROM muninn.users
        WHERE organization_id = $1
        AND (
          LOWER(name) LIKE $2 OR 
          LOWER(email) LIKE $2 OR 
          LOWER(COALESCE(employee_id, '')) LIKE $2
        )
        ORDER BY name
        LIMIT 50
      `, [organizationId, searchTerm]);
      
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to search users');
      return reply.code(500).send({ error: 'Failed to search users', details: error.message });
    }
  });

  // Get user by ID with full details
  fastify.get('/users/:id', {
    preHandler: [requireRole('user'), requireOrganization()],
  }, async (request, reply) => {
    try {
      const requestingUser = getUserFromRequest(request)!;
      const organizationId = requestingUser.organizationId;
      
      if (!organizationId) {
        return reply.code(400).send({ error: 'Organization context required' });
      }

      const { id } = request.params as { id: string };
      
      const userResult = await pool.query(`
        SELECT id, email, name, status, role, 
               mfa_enabled, department, employee_id, last_login, sync_source,
               organization_id, created_at, updated_at
        FROM muninn.users
        WHERE id = $1 AND organization_id = $2
      `, [id, organizationId]);
      
      if (userResult.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      const user = userResult.rows[0];
      
      // Get user groups
      const groupsResult = await pool.query(`
        SELECT g.id, g.name, g.created_at
        FROM muninn.groups g
        INNER JOIN muninn.user_groups ug ON g.id = ug.group_id
        WHERE ug.user_id = $1
      `, [id]);
      
      // Get user roles
      const rolesResult = await pool.query(`
        SELECT r.id, r.name, r.created_at
        FROM muninn.roles r
        INNER JOIN muninn.user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1
      `, [id]);
      
      return reply.send({
        ...user,
        groups: groupsResult.rows,
        roles: rolesResult.rows,
      });
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch user');
      return reply.code(500).send({ error: 'Failed to fetch user', details: error.message });
    }
  });

  // Get user by email (for login)
  fastify.get('/users/by-email/:email', async (request, reply) => {
    try {
      const { email } = request.params as { email: string };
      const decodedEmail = decodeURIComponent(email);
      
      // Use raw SQL
      const result = await pool.query(`
        SELECT id, email, name, password_hash, status, role, 
               mfa_enabled, mfa_secret, recovery_codes, temp_password,
               department, employee_id, last_login, sync_source,
               created_at, updated_at
        FROM muninn.users
        WHERE email = $1
        LIMIT 1
      `, [decodedEmail]);

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return reply.send(result.rows[0]);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch user by email');
      return reply.code(500).send({ error: 'Failed to fetch user', details: error.message });
    }
  });

  // Create user
  fastify.post('/users', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request);
      const { 
        email, 
        name, 
        firstName, 
        lastName, 
        username, 
        role, 
        department, 
        employee_id, 
        password,
        enabled = true,
        emailVerified = true,
      } = request.body as {
        email: string;
        name?: string;
        firstName?: string;
        lastName?: string;
        username?: string;
        role?: string;
        department?: string;
        employee_id?: string;
        password?: string;
        enabled?: boolean;
        emailVerified?: boolean;
      };
      
      if (!email) {
        return reply.code(400).send({ error: 'Email is required' });
      }
      
      if (!password) {
        return reply.code(400).send({ error: 'Password is required when creating a new user' });
      }
      
      if (password.length < 8) {
        return reply.code(400).send({ error: 'Password must be at least 8 characters' });
      }
      
      // Use provided firstName/lastName or derive from name if provided
      let finalFirstName = firstName || '';
      let finalLastName = lastName || '';
      
      if (!finalFirstName && !finalLastName && name) {
        // Split name into first/last for Keycloak
        const nameParts = name.trim().split(/\s+/);
        finalFirstName = nameParts[0] || '';
        finalLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      }
      
      // Use name for database if firstName/lastName not provided
      const dbName = name || `${finalFirstName} ${finalLastName}`.trim() || email;
      
      let keycloakUserId: string | null = null;
      
      // Create user in Keycloak first (if Keycloak is configured)
      if (env.KEYCLOAK_URL && env.KEYCLOAK_REALM) {
        try {
          keycloakUserId = await createKeycloakUser({
            email,
            username: username || email, // Use provided username or email as fallback
            firstName: finalFirstName,
            lastName: finalLastName,
            password,
            enabled: enabled !== false,
            emailVerified: emailVerified !== false,
          });
          
          // Assign role in Keycloak if provided
          if (role && keycloakUserId) {
            await assignKeycloakRole(keycloakUserId, role);
          }
          
          request.log.info({ email, keycloakUserId }, 'User created in Keycloak');
        } catch (keycloakError: any) {
          // If Keycloak creation fails but user already exists, continue
          if (keycloakError.message.includes('already exists')) {
            request.log.warn({ email }, 'User already exists in Keycloak, continuing with DB creation');
          } else {
            request.log.error({ error: keycloakError, email }, 'Failed to create user in Keycloak');
            // Continue with DB creation even if Keycloak fails
            // This allows the system to work if Keycloak is temporarily unavailable
          }
        }
      }
      
      // Hash password for database storage
      const scryptAsync = promisify(scrypt);
      const salt = randomBytes(16).toString('hex');
      const hash = await scryptAsync(password, salt, 64) as Buffer;
      const passwordHash = `${salt}:${hash.toString('hex')}`;
      
      // Validate organization_id is provided
      const { organization_id } = request.body as { organization_id?: string };
      if (!organization_id) {
        return reply.code(400).send({ error: 'organization_id is required when creating a new user' });
      }

      // Verify organization exists
      const org = await getOrganizationById(organization_id);
      if (!org) {
        return reply.code(404).send({ error: 'Organization not found' });
      }

      // Create user in database with organization_id
      const result = await pool.query(`
        INSERT INTO muninn.users (email, name, role, department, employee_id, password_hash, status, sync_source, organization_id)
        VALUES ($1, $2, $3, $4, $5, $6, 'active', 'local', $7)
        RETURNING id, email, name, status, role, mfa_enabled, department, employee_id, last_login, sync_source, organization_id, created_at, updated_at
      `, [email, dbName, role || 'user', department || null, employee_id || null, passwordHash, organization_id]);
      
      const newUserId = result.rows[0].id;

      // Assign user to organization in user_organizations table
      // Check if this is the user's first organization (make it default)
      const existingOrgs = await pool.query(`
        SELECT COUNT(*) as count
        FROM muninn.user_organizations
        WHERE user_id = $1
      `, [newUserId]);
      
      const isFirstOrg = parseInt(existingOrgs.rows[0].count, 10) === 0;
      await assignUserToOrganization(newUserId, organization_id, isFirstOrg);

      // Assign user to Keycloak organization group if Keycloak is configured
      if (keycloakUserId && env.KEYCLOAK_URL && env.KEYCLOAK_REALM) {
        try {
          await assignKeycloakOrganization(keycloakUserId, organization_id);
        } catch (keycloakError: any) {
          request.log.warn({ error: keycloakError, organization_id }, 'Failed to assign Keycloak organization group');
          // Continue - organization assignment in DB is more critical
        }
      }
      
      // Log audit event
      await pool.query(`
        INSERT INTO muninn.audit_logs (actor_user_id, action, target_type, target_id, target_name, metadata)
        VALUES ($1, 'user.created', 'user', $2, $3, $4)
      `, [
        user?.userId || null,
        newUserId,
        email,
        JSON.stringify({ 
          created_by: user?.email || 'system',
          keycloak_user_id: keycloakUserId || null,
          sync_source: 'local',
          organization_id: organization_id
        }),
      ]);
      
      return reply.code(201).send(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        return reply.code(409).send({ error: 'User with this email already exists' });
      }
      request.log.error(error, 'Failed to create user');
      return reply.code(500).send({ error: 'Failed to create user', details: error.message });
    }
  });

  // Update user (full update)
  fastify.patch('/users/:id', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request);
      const { id } = request.params as { id: string };
      const body = request.body as {
        name?: string;
        email?: string;
        role?: string;
        department?: string;
        employee_id?: string;
        status?: string;
        audit_note?: string;
      };
      
      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (body.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(body.name);
      }
      if (body.email !== undefined) {
        updates.push(`email = $${paramIndex++}`);
        values.push(body.email);
      }
      if (body.role !== undefined) {
        updates.push(`role = $${paramIndex++}`);
        values.push(body.role);
      }
      if (body.department !== undefined) {
        updates.push(`department = $${paramIndex++}`);
        values.push(body.department);
      }
      if (body.employee_id !== undefined) {
        updates.push(`employee_id = $${paramIndex++}`);
        values.push(body.employee_id);
      }
      if (body.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(body.status);
      }
      
      if (updates.length === 0) {
        return reply.code(400).send({ error: 'No fields to update' });
      }
      
      updates.push(`updated_at = NOW()`);
      values.push(id);
      
      const result = await pool.query(`
        UPDATE muninn.users
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, email, name, status, role, mfa_enabled, department, employee_id, last_login, sync_source, created_at, updated_at
      `, values);
      
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      // Log audit event if status changed or audit_note provided
      if (body.status || body.audit_note) {
        let action = 'user.updated';
        if (body.status === 'suspended') {
          action = 'user.suspended';
        } else if (body.status === 'locked') {
          action = 'user.locked';
        } else if (body.status === 'active' && body.status) {
          action = 'user.activated';
        }
        
        await pool.query(`
          INSERT INTO muninn.audit_logs (actor_user_id, action, target_type, target_id, target_name, metadata)
          VALUES ($1, $2, 'user', $3, $4, $5)
        `, [
          user?.userId || null,
          action,
          id,
          result.rows[0].email,
          JSON.stringify({ audit_note: body.audit_note || 'User updated' }),
        ]);
      }
      
      return reply.send(result.rows[0]);
    } catch (error: any) {
      request.log.error(error, 'Failed to update user');
      return reply.code(500).send({ error: 'Failed to update user', details: error.message });
    }
  });

  // Lock user (specific endpoint)
  fastify.post('/users/:id/lock', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request);
      const { id } = request.params as { id: string };
      const { audit_note } = request.body as { audit_note?: string };
      
      const result = await pool.query(`
        UPDATE muninn.users
        SET status = 'locked', updated_at = NOW()
        WHERE id = $1
        RETURNING id, email, name, status, role, mfa_enabled, department, employee_id, last_login, sync_source, created_at, updated_at
      `, [id]);
      
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      await pool.query(`
        INSERT INTO muninn.audit_logs (actor_user_id, action, target_type, target_id, target_name, metadata)
        VALUES ($1, 'user.locked', 'user', $2, $3, $4)
      `, [
        user?.userId || null,
        id,
        result.rows[0].email,
        JSON.stringify({ audit_note: audit_note || 'User locked by admin' }),
      ]);
      
      return reply.send(result.rows[0]);
    } catch (error: any) {
      request.log.error(error, 'Failed to lock user');
      return reply.code(500).send({ error: 'Failed to lock user', details: error.message });
    }
  });

  // Unlock user (specific endpoint)
  fastify.post('/users/:id/unlock', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request);
      const { id } = request.params as { id: string };
      const { audit_note } = request.body as { audit_note?: string };
      
      const result = await pool.query(`
        UPDATE muninn.users
        SET status = 'active', updated_at = NOW()
        WHERE id = $1
        RETURNING id, email, name, status, role, mfa_enabled, department, employee_id, last_login, sync_source, created_at, updated_at
      `, [id]);
      
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      await pool.query(`
        INSERT INTO muninn.audit_logs (actor_user_id, action, target_type, target_id, target_name, metadata)
        VALUES ($1, 'user.unlocked', 'user', $2, $3, $4)
      `, [
        user?.userId || null,
        id,
        result.rows[0].email,
        JSON.stringify({ audit_note: audit_note || 'User unlocked by admin' }),
      ]);
      
      return reply.send(result.rows[0]);
    } catch (error: any) {
      request.log.error(error, 'Failed to unlock user');
      return reply.code(500).send({ error: 'Failed to unlock user', details: error.message });
    }
  });

  // Suspend user (specific endpoint)
  fastify.post('/users/:id/suspend', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request);
      const { id } = request.params as { id: string };
      const { audit_note } = request.body as { audit_note?: string };
      
      const result = await pool.query(`
        UPDATE muninn.users
        SET status = 'suspended', updated_at = NOW()
        WHERE id = $1
        RETURNING id, email, name, status, role, mfa_enabled, department, employee_id, last_login, sync_source, created_at, updated_at
      `, [id]);
      
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      await pool.query(`
        INSERT INTO muninn.audit_logs (actor_user_id, action, target_type, target_id, target_name, metadata)
        VALUES ($1, 'user.suspended', 'user', $2, $3, $4)
      `, [
        user?.userId || null,
        id,
        result.rows[0].email,
        JSON.stringify({ audit_note: audit_note || 'User suspended by admin' }),
      ]);
      
      return reply.send(result.rows[0]);
    } catch (error: any) {
      request.log.error(error, 'Failed to suspend user');
      return reply.code(500).send({ error: 'Failed to suspend user', details: error.message });
    }
  });

  // Activate user (specific endpoint)
  fastify.post('/users/:id/activate', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request);
      const { id } = request.params as { id: string };
      const { audit_note } = request.body as { audit_note?: string };
      
      const result = await pool.query(`
        UPDATE muninn.users
        SET status = 'active', updated_at = NOW()
        WHERE id = $1
        RETURNING id, email, name, status, role, mfa_enabled, department, employee_id, last_login, sync_source, created_at, updated_at
      `, [id]);
      
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      await pool.query(`
        INSERT INTO muninn.audit_logs (actor_user_id, action, target_type, target_id, target_name, metadata)
        VALUES ($1, 'user.activated', 'user', $2, $3, $4)
      `, [
        user?.userId || null,
        id,
        result.rows[0].email,
        JSON.stringify({ audit_note: audit_note || 'User activated by admin' }),
      ]);
      
      return reply.send(result.rows[0]);
    } catch (error: any) {
      request.log.error(error, 'Failed to activate user');
      return reply.code(500).send({ error: 'Failed to activate user', details: error.message });
    }
  });

  // Update password
  fastify.post('/users/:id/password', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request);
      const { id } = request.params as { id: string };
      const { newPassword, audit_note } = request.body as { newPassword: string; audit_note?: string };
      
      if (!newPassword || newPassword.length < 8) {
        return reply.code(400).send({ error: 'Password must be at least 8 characters' });
      }
      
      // Hash password
      const scryptAsync = promisify(scrypt);
      const salt = randomBytes(16).toString('hex');
      const hash = await scryptAsync(newPassword, salt, 64) as Buffer;
      const passwordHash = `${salt}:${hash.toString('hex')}`;
      
      const result = await pool.query(`
        UPDATE muninn.users
        SET password_hash = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, email, name, status, role, mfa_enabled, department, employee_id, last_login, sync_source, created_at, updated_at
      `, [passwordHash, id]);
      
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      // Log audit event
      await pool.query(`
        INSERT INTO muninn.audit_logs (actor_user_id, action, target_type, target_id, target_name, metadata)
        VALUES ($1, 'user.password_changed', 'user', $2, $3, $4)
      `, [
        user?.userId || null,
        id,
        result.rows[0].email,
        JSON.stringify({ audit_note: audit_note || 'Password changed by admin' }),
      ]);
      
      return reply.send({ success: true });
    } catch (error: any) {
      request.log.error(error, 'Failed to update password');
      return reply.code(500).send({ error: 'Failed to update password', details: error.message });
    }
  });

  // Reset MFA
  fastify.post('/users/:id/reset-mfa', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request);
      const { id } = request.params as { id: string };
      const { audit_note } = request.body as { audit_note?: string };
      
      if (!audit_note || audit_note.trim().length === 0) {
        return reply.code(400).send({ error: 'Audit note is required' });
      }
      
      // Reset MFA
      const result = await pool.query(`
        UPDATE muninn.users
        SET mfa_enabled = false, mfa_secret = NULL, recovery_codes = NULL, updated_at = NOW()
        WHERE id = $1
        RETURNING id, email, name, status, role, mfa_enabled, department, employee_id, last_login, sync_source, created_at, updated_at
      `, [id]);
      
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      // Log audit event
      await pool.query(`
        INSERT INTO muninn.audit_logs (actor_user_id, action, target_type, target_id, target_name, metadata)
        VALUES ($1, 'user.mfa_reset', 'user', $2, $3, $4)
      `, [
        user?.userId || null,
        id,
        result.rows[0].email,
        JSON.stringify({ audit_note }),
      ]);
      
      return reply.send(result.rows[0]);
    } catch (error: any) {
      request.log.error(error, 'Failed to reset MFA');
      return reply.code(500).send({ error: 'Failed to reset MFA', details: error.message });
    }
  });

  // Get user devices
  fastify.get('/users/:id/devices', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      const result = await pool.query(`
        SELECT d.id, d.hostname, d.os, d.os_version, d.platform, d.serial,
               d.ownership, d.status, d.compliance, d.tags, d.last_seen_at, d.enrolled_at
        FROM huginn.devices d
        WHERE d.owner_user_id = $1
        ORDER BY d.last_seen_at DESC
      `, [id]);
      
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch user devices');
      return reply.code(500).send({ error: 'Failed to fetch devices', details: error.message });
    }
  });

  // Get user applications (SSO grants)
  fastify.get('/users/:id/applications', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      const result = await pool.query(`
        SELECT a.id, a.name, a.redirect_url, a.created_at, sg.created_at as granted_at
        FROM muninn.applications a
        INNER JOIN muninn.sso_grants sg ON a.id = sg.application_id
        WHERE sg.user_id = $1
        ORDER BY a.name
      `, [id]);
      
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch user applications');
      return reply.code(500).send({ error: 'Failed to fetch applications', details: error.message });
    }
  });

  // Get user activity
  fastify.get('/users/:id/activity', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      const result = await pool.query(`
        SELECT id, actor_user_id, action, target_type, target_id, target_name, 
               metadata, created_at
        FROM muninn.audit_logs
        WHERE target_id = $1 OR actor_user_id = $1
        ORDER BY created_at DESC
        LIMIT 100
      `, [id]);
      
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch user activity');
      return reply.code(500).send({ error: 'Failed to fetch activity', details: error.message });
    }
  });

  // Groups (filtered by organization via users)
  fastify.get('/groups', {
    preHandler: [requireRole('user'), requireOrganization()],
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request)!;
      const organizationId = user.organizationId;
      
      if (!organizationId) {
        return reply.code(400).send({ error: 'Organization context required' });
      }

      // Get groups that have members in this organization
      // Note: groups table only has: id, name, created_at
      const result = await pool.query(`
        SELECT DISTINCT g.id, g.name, g.created_at,
               COUNT(DISTINCT ug.user_id) as member_count
        FROM muninn.groups g
        INNER JOIN muninn.user_groups ug ON g.id = ug.group_id
        INNER JOIN muninn.users u ON ug.user_id = u.id
        WHERE u.organization_id = $1
        GROUP BY g.id, g.name, g.created_at
        ORDER BY g.name
      `, [organizationId]);
      
      return reply.send(result.rows.map(row => ({
        ...row,
        member_count: parseInt(row.member_count) || 0,
      })));
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch groups');
      return reply.code(500).send({ error: 'Failed to fetch groups', details: error.message });
    }
  });

  // Get group by ID
  fastify.get('/groups/:id', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      const result = await pool.query(`
        SELECT g.id, g.name, g.created_at,
               COUNT(ug.user_id) as member_count
        FROM muninn.groups g
        LEFT JOIN muninn.user_groups ug ON g.id = ug.group_id
        WHERE g.id = $1
        GROUP BY g.id, g.name, g.created_at
      `, [id]);
      
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Group not found' });
      }
      
      return reply.send({
        ...result.rows[0],
        member_count: parseInt(result.rows[0].member_count) || 0,
      });
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch group');
      return reply.code(500).send({ error: 'Failed to fetch group', details: error.message });
    }
  });

  // Get group policies
  fastify.get('/groups/:id/policies', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      // For now, return all enabled policies. In future, can add group-specific policy assignments
      const result = await pool.query(`
        SELECT id, name, type, value, enabled, created_at, updated_at
        FROM muninn.iam_policies
        WHERE enabled = true
        ORDER BY name
      `);
      
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch group policies');
      return reply.code(500).send({ error: 'Failed to fetch policies', details: error.message });
    }
  });

  // Roles
  fastify.get('/roles', async (request, reply) => {
    try {
      const result = await pool.query(`
        SELECT id, name, created_at
        FROM muninn.roles
        ORDER BY name
      `);
      
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch roles');
      return reply.code(500).send({ error: 'Failed to fetch roles', details: error.message });
    }
  });

  // Create role
  fastify.post('/roles', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    try {
      const { name } = request.body as { name: string };
      
      if (!name || name.trim().length === 0) {
        return reply.code(400).send({ error: 'Role name is required' });
      }
      
      const result = await pool.query(`
        INSERT INTO muninn.roles (name)
        VALUES ($1)
        RETURNING id, name, created_at
      `, [name.trim()]);
      
      return reply.code(201).send(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        return reply.code(409).send({ error: 'Role with this name already exists' });
      }
      request.log.error(error, 'Failed to create role');
      return reply.code(500).send({ error: 'Failed to create role', details: error.message });
    }
  });

  // Create group
  fastify.post('/groups', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    try {
      const { name } = request.body as { name: string; description?: string };
      // Note: groups table only has: id, name, created_at (no description column)
      const result = await pool.query(`
        INSERT INTO muninn.groups (name)
        VALUES ($1)
        RETURNING id, name, created_at
      `, [name]);
      
      return reply.code(201).send(result.rows[0]);
    } catch (error: any) {
      request.log.error(error, 'Failed to create group');
      return reply.code(500).send({ error: 'Failed to create group', details: error.message });
    }
  });

  // Get group members
  fastify.get('/groups/:groupId/members', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const { groupId } = request.params as { groupId: string };
      const result = await pool.query(`
        SELECT u.id, u.email, u.name, u.role, u.status, u.created_at, u.updated_at
        FROM muninn.users u
        INNER JOIN muninn.user_groups ug ON u.id = ug.user_id
        WHERE ug.group_id = $1
        ORDER BY u.name
      `, [groupId]);
      
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch group members');
      return reply.code(500).send({ error: 'Failed to fetch group members', details: error.message });
    }
  });

  // Add member to group
  fastify.post('/groups/:groupId/members', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    try {
      const { groupId } = request.params as { groupId: string };
      const { userId } = request.body as { userId: string };
      
      await pool.query(`
        INSERT INTO muninn.user_groups (group_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (group_id, user_id) DO NOTHING
      `, [groupId, userId]);
      
      return reply.code(201).send({ success: true });
    } catch (error: any) {
      request.log.error(error, 'Failed to add member to group');
      return reply.code(500).send({ error: 'Failed to add member', details: error.message });
    }
  });

  // Remove member from group
  fastify.delete('/groups/:groupId/members/:userId', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    try {
      const { groupId, userId } = request.params as { groupId: string; userId: string };
      
      await pool.query(`
        DELETE FROM muninn.user_groups
        WHERE group_id = $1 AND user_id = $2
      `, [groupId, userId]);
      
      return reply.send({ success: true });
    } catch (error: any) {
      request.log.error(error, 'Failed to remove member from group');
      return reply.code(500).send({ error: 'Failed to remove member', details: error.message });
    }
  });

  // IAM Policies (read-only for authenticated users)
  fastify.get('/policies', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const result = await pool.query(`
        SELECT id, name, type, value, enabled, created_at, updated_at
        FROM muninn.iam_policies
        WHERE enabled = true
        ORDER BY name
      `);
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch IAM policies');
      return reply.code(500).send({ error: 'Failed to fetch IAM policies', details: error.message });
    }
  });

  // Update password policy
  fastify.put('/policies/password', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    try {
      const policy = request.body as any;
      await pool.query(`
        UPDATE muninn.iam_policies
        SET value = $1, updated_at = NOW()
        WHERE name = 'password_policy'
      `, [JSON.stringify(policy)]);
      
      return reply.send({ success: true });
    } catch (error: any) {
      request.log.error(error, 'Failed to update password policy');
      return reply.code(500).send({ error: 'Failed to update policy', details: error.message });
    }
  });

  // Audit logs (read-only for authenticated users, but sensitive data filtered by role)
  fastify.get('/audit', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const { action } = request.query as { action?: string };
      let query = `
        SELECT id, actor_user_id, action, target_type, target_id, target_name, 
               metadata, created_at
        FROM muninn.audit_logs
      `;
      const params: any[] = [];
      
      if (action) {
        query += ` WHERE action = $1`;
        params.push(action);
      }
      
      query += ` ORDER BY created_at DESC LIMIT 100`;
      
      const result = await pool.query(query, params);
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch audit logs');
      return reply.code(500).send({ error: 'Failed to fetch audit logs', details: error.message });
    }
  });

  // Applications (SSO)
  fastify.get('/applications', async (request, reply) => {
    try {
      // Check if additional columns exist, otherwise use basic schema
      const result = await pool.query(`
        SELECT id, name, redirect_url, created_at
        FROM muninn.applications
        ORDER BY name
      `);
      
      // Map to expected format with optional fields
      const mapped = result.rows.map(row => ({
        ...row,
        description: null,
        logo_url: null,
        scopes: [],
      }));
      
      return reply.send(mapped);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch applications');
      return reply.code(500).send({ error: 'Failed to fetch applications', details: error.message });
    }
  });

  fastify.post('/applications', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    try {
      const { name, redirect_url } = request.body as {
        name: string;
        description?: string;
        logo_url?: string;
        redirect_url: string;
        scopes?: string[];
      };
      
      // Insert only columns that exist in the table
      const result = await pool.query(`
        INSERT INTO muninn.applications (name, redirect_url)
        VALUES ($1, $2)
        RETURNING id, name, redirect_url, created_at
      `, [name, redirect_url]);
      
      // Add optional fields to response
      const app = {
        ...result.rows[0],
        description: null,
        logo_url: null,
        scopes: [],
      };
      
      return reply.code(201).send(app);
    } catch (error: any) {
      request.log.error(error, 'Failed to create application');
      return reply.code(500).send({ error: 'Failed to create application', details: error.message });
    }
  });

  // Organizations
  // List user's accessible organizations
  // Note: Does NOT require organization context - this endpoint is used to GET the user's organizations
  fastify.get('/organizations', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      
      // Check if userId is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(user.userId)) {
        // Invalid UUID (e.g., 'dev-user-id' from unauthenticated request)
        // Return empty array instead of error
        request.log.debug({ userId: user.userId }, 'Invalid UUID in organizations request, returning empty array');
        return reply.send([]);
      }
      
      const organizations = await getUserOrganizations(user.userId);
      return reply.send(organizations);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch organizations');
      // If it's a UUID error, return empty array instead of 500
      if (error.message && error.message.includes('invalid input syntax for type uuid')) {
        request.log.warn({ error: error.message }, 'UUID error in organizations request, returning empty array');
        return reply.send([]);
      }
      return reply.code(500).send({ error: 'Failed to fetch organizations', details: error.message });
    }
  });

  // Get organization by ID
  fastify.get('/organizations/:id', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request)!;
      const { id } = request.params as { id: string };
      
      // Verify user has access to this organization
      const org = await getOrganizationById(id);
      if (!org) {
        return reply.code(404).send({ error: 'Organization not found' });
      }

      // Check access via user's organizations
      const userOrgs = await getUserOrganizations(user.userId);
      const hasAccess = userOrgs.some(o => o.id === id);
      
      if (!hasAccess) {
        return reply.code(403).send({ error: 'Forbidden: You do not have access to this organization' });
      }

      return reply.send(org);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch organization');
      return reply.code(500).send({ error: 'Failed to fetch organization', details: error.message });
    }
  });

  // Create organization (admin only)
  fastify.post('/organizations', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { name, domain, metadata } = request.body as {
        name: string;
        domain?: string;
        metadata?: Record<string, any>;
      };

      if (!name || name.trim().length === 0) {
        return reply.code(400).send({ error: 'Organization name is required' });
      }

      const result = await pool.query(`
        INSERT INTO muninn.organizations (name, domain, metadata, status)
        VALUES ($1, $2, $3, 'active')
        RETURNING id, name, domain, status, metadata, created_at, updated_at
      `, [name, domain || null, metadata ? JSON.stringify(metadata) : '{}']);

      const organizationId = result.rows[0].id;

      // Automatically assign the creator to the new organization
      // Check if this is the user's first organization (make it default)
      const existingOrgs = await pool.query(`
        SELECT COUNT(*) as count
        FROM muninn.user_organizations
        WHERE user_id = $1
      `, [user.userId]);
      
      const isFirstOrg = parseInt(existingOrgs.rows[0].count, 10) === 0;
      await assignUserToOrganization(user.userId, organizationId, isFirstOrg);

      // Also update the user's organization_id field if this is their first org
      if (isFirstOrg) {
        await pool.query(`
          UPDATE muninn.users
          SET organization_id = $1
          WHERE id = $2
        `, [organizationId, user.userId]);
      }

      return reply.code(201).send(result.rows[0]);
    } catch (error: any) {
      request.log.error(error, 'Failed to create organization');
      return reply.code(500).send({ error: 'Failed to create organization', details: error.message });
    }
  });

  // Update organization (admin only)
  fastify.put('/organizations/:id', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { name, domain, status, metadata } = request.body as {
        name?: string;
        domain?: string;
        status?: string;
        metadata?: Record<string, any>;
      };

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        params.push(name);
        paramIndex++;
      }

      if (domain !== undefined) {
        updates.push(`domain = $${paramIndex}`);
        params.push(domain || null);
        paramIndex++;
      }

      if (status !== undefined) {
        if (!['active', 'suspended', 'archived'].includes(status)) {
          return reply.code(400).send({ error: 'Invalid status. Must be active, suspended, or archived' });
        }
        updates.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (metadata !== undefined) {
        updates.push(`metadata = $${paramIndex}`);
        params.push(JSON.stringify(metadata));
        paramIndex++;
      }

      if (updates.length === 0) {
        return reply.code(400).send({ error: 'No fields to update' });
      }

      updates.push(`updated_at = NOW()`);
      params.push(id);

      const result = await pool.query(`
        UPDATE muninn.organizations
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, name, domain, status, metadata, created_at, updated_at
      `, params);

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Organization not found' });
      }

      return reply.send(result.rows[0]);
    } catch (error: any) {
      request.log.error(error, 'Failed to update organization');
      return reply.code(500).send({ error: 'Failed to update organization', details: error.message });
    }
  });

  // Assign user to organization
  fastify.post('/users/:id/organizations', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    try {
      const { id: userId } = request.params as { id: string };
      const { organization_id, is_default } = request.body as {
        organization_id: string;
        is_default?: boolean;
      };

      if (!organization_id) {
        return reply.code(400).send({ error: 'organization_id is required' });
      }

      // Verify organization exists
      const org = await getOrganizationById(organization_id);
      if (!org) {
        return reply.code(404).send({ error: 'Organization not found' });
      }

      await assignUserToOrganization(userId, organization_id, is_default || false);

      return reply.code(200).send({ success: true });
    } catch (error: any) {
      request.log.error(error, 'Failed to assign user to organization');
      return reply.code(500).send({ error: 'Failed to assign user to organization', details: error.message });
    }
  });

  // Remove user from organization
  fastify.delete('/users/:id/organizations/:orgId', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    try {
      const { id: userId, orgId } = request.params as { id: string; orgId: string };

      await removeUserFromOrganization(userId, orgId);

      return reply.code(200).send({ success: true });
    } catch (error: any) {
      request.log.error(error, 'Failed to remove user from organization');
      return reply.code(500).send({ error: 'Failed to remove user from organization', details: error.message });
    }
  });
}

