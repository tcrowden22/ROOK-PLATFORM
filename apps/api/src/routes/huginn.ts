import { FastifyInstance, FastifyReply } from 'fastify';
import { pool } from '../lib/db/index.js';
import { getUserFromRequest, requireRole, canAccessResource } from '../auth/rbac.js';
import { NotFoundError, ForbiddenError } from '../lib/errors.js';
import { organizationMiddleware } from '../middleware/organization.js';

interface DeviceListQuery {
  page?: string;
  limit?: string;
  search?: string;
  platform?: string;
  ownership?: string;
  status?: string;
  compliance?: string;
  tags?: string;
}

export async function huginnRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', organizationMiddleware);

  const requireOrganizationId = (request: any, reply: FastifyReply): string | null => {
    const organizationId = (request as any).userContext?.organizationId ?? null;
    if (!organizationId) {
      reply.code(400).send({ error: 'Organization context required' });
      return null;
    }
    return organizationId;
  };

  // List devices with server-side filtering and pagination
  fastify.get<{ Querystring: DeviceListQuery }>('/devices', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request)!;
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      const query = request.query;
      
      // Parse pagination
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
      const offset = (page - 1) * limit;

      const conditions: string[] = ['d.organization_id = $1'];
      const params: any[] = [organizationId];
      let paramIndex = 2;

      if (user.rookRole !== 'admin' && user.rookRole !== 'agent') {
        // Regular users see only their own devices
        conditions.push(`d.owner_user_id = $${paramIndex}`);
        params.push(user.userId);
        paramIndex++;
      }

      // Search filter (hostname, serial, user name)
      if (query.search) {
        conditions.push(`(
          d.hostname ILIKE $${paramIndex} OR 
          d.serial ILIKE $${paramIndex} OR
          EXISTS (
            SELECT 1 FROM muninn.users u 
            WHERE u.id = d.owner_user_id 
            AND u.name ILIKE $${paramIndex}
          )
        )`);
        params.push(`%${query.search}%`);
        paramIndex++;
      }

      // Platform filter
      if (query.platform) {
        conditions.push(`d.platform = $${paramIndex}`);
        params.push(query.platform);
        paramIndex++;
      }

      // Ownership filter
      if (query.ownership) {
        conditions.push(`d.ownership = $${paramIndex}`);
        params.push(query.ownership);
        paramIndex++;
      }

      // Status filter
      if (query.status) {
        conditions.push(`d.status = $${paramIndex}`);
        params.push(query.status);
        paramIndex++;
      }

      // Compliance filter
      if (query.compliance !== undefined) {
        if (query.compliance === 'true' || query.compliance === 'compliant') {
          conditions.push(`d.compliance = true`);
        } else if (query.compliance === 'false' || query.compliance === 'non-compliant') {
          conditions.push(`d.compliance = false`);
        }
      }

      // Tags filter (comma-separated)
      if (query.tags) {
        const tagArray = query.tags.split(',').map(t => t.trim()).filter(Boolean);
        if (tagArray.length > 0) {
          conditions.push(`d.tags ?| $${paramIndex}`);
          params.push(tagArray);
          paramIndex++;
        }
      }

      // Build where clause - add organization filter if present
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM huginn.devices d
        ${whereClause}
      `;
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total, 10);

      // Get devices with owner name
      // Note: devices table only has: id, hostname, os, owner_user_id, status, compliance, last_seen_at, enrolled_at
      const devicesQuery = `
        SELECT 
          d.id, 
          d.hostname, 
          d.os, 
          d.owner_user_id, 
          d.status, 
          d.compliance,
          d.last_seen_at, 
          d.enrolled_at,
          u.name as owner_name
        FROM huginn.devices d
        LEFT JOIN muninn.users u ON d.owner_user_id = u.id
        ${whereClause}
        ORDER BY d.last_seen_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      const devicesParams = [...params, limit, offset];
      const devicesResult = await pool.query(devicesQuery, devicesParams);

      const totalPages = Math.ceil(total / limit);

      return reply.send({
        devices: devicesResult.rows,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      });
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch devices');
      return reply.code(500).send({ error: 'Failed to fetch devices', details: error.message });
    }
  });

  // Bulk actions endpoint
  fastify.post<{ Body: { deviceIds: string[]; action: string; params?: any } }>('/devices/bulk', {
    preHandler: requireRole('agent'), // Only agents and admins can perform bulk actions
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request)!;
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      const { deviceIds, action, params } = request.body;

      if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
        return reply.code(400).send({ error: 'deviceIds must be a non-empty array' });
      }

      if (!action) {
        return reply.code(400).send({ error: 'action is required' });
      }

      const processed: string[] = [];
      const failed: Array<{ deviceId: string; error: string }> = [];

      // Validate permissions for destructive actions
      const destructiveActions = ['lock', 'wipe'];
      if (destructiveActions.includes(action) && user.rookRole !== 'admin') {
        return reply.code(403).send({ error: 'Admin role required for this action' });
      }

      // Process each device
      for (const deviceId of deviceIds) {
        try {
          // Verify device exists and user has access
          const deviceResult = await pool.query(
            `SELECT owner_user_id, organization_id FROM huginn.devices WHERE id = $1`,
            [deviceId]
          );

          if (deviceResult.rows.length === 0) {
            failed.push({ deviceId, error: 'Device not found' });
            continue;
          }

          const device = deviceResult.rows[0];
          if (device.organization_id !== organizationId) {
            failed.push({ deviceId, error: 'Access denied' });
            continue;
          }
          if (!canAccessResource(user, device.owner_user_id)) {
            failed.push({ deviceId, error: 'Access denied' });
            continue;
          }

          // Perform action based on type
          switch (action) {
            case 'assignUser':
              if (params?.userId) {
                await pool.query(
                  `UPDATE huginn.devices SET owner_user_id = $1, updated_at = now() WHERE id = $2 AND organization_id = $3`,
                  [params.userId, deviceId, organizationId]
                );
                processed.push(deviceId);
              } else {
                failed.push({ deviceId, error: 'userId required for assignUser' });
              }
              break;

            case 'pushPolicy':
              if (params?.policyId) {
                await pool.query(
                  `INSERT INTO huginn.device_policy_assignments (device_id, policy_id, organization_id, status)
                   VALUES ($1, $2, $3, 'pending')
                   ON CONFLICT DO NOTHING`,
                  [deviceId, params.policyId, organizationId]
                );
                processed.push(deviceId);
              } else {
                failed.push({ deviceId, error: 'policyId required for pushPolicy' });
              }
              break;

            case 'lock':
              await pool.query(
                `UPDATE huginn.devices SET status = 'retired', updated_at = now() WHERE id = $1 AND organization_id = $2`,
                [deviceId, organizationId]
              );
              // Log activity
              await pool.query(
                `INSERT INTO huginn.device_activity (device_id, organization_id, action, initiated_by, status)
                 VALUES ($1, $2, 'lock', $3, 'queued')`,
                [deviceId, organizationId, user.userId]
              );
              processed.push(deviceId);
              break;

            case 'wipe':
              // Log activity
              await pool.query(
                `INSERT INTO huginn.device_activity (device_id, organization_id, action, initiated_by, status)
                 VALUES ($1, $2, 'wipe', $3, 'queued')`,
                [deviceId, organizationId, user.userId]
              );
              processed.push(deviceId);
              break;

            case 'rename':
              if (params?.hostname) {
                await pool.query(
                  `UPDATE huginn.devices SET hostname = $1, updated_at = now() WHERE id = $2 AND organization_id = $3`,
                  [params.hostname, deviceId, organizationId]
                );
                processed.push(deviceId);
              } else {
                failed.push({ deviceId, error: 'hostname required for rename' });
              }
              break;

            case 'tag':
              if (params?.tags && Array.isArray(params.tags)) {
                await pool.query(
                  `UPDATE huginn.devices 
                   SET tags = $1::jsonb, updated_at = now() 
                   WHERE id = $2 AND organization_id = $3`,
                  [JSON.stringify(params.tags), deviceId, organizationId]
                );
                processed.push(deviceId);
              } else {
                failed.push({ deviceId, error: 'tags array required for tag action' });
              }
              break;

            default:
              failed.push({ deviceId, error: `Unknown action: ${action}` });
          }
        } catch (error: any) {
          failed.push({ deviceId, error: error.message });
        }
      }

      return reply.send({
        success: failed.length === 0,
        processed: processed.length,
        failed: failed.length,
        errors: failed.length > 0 ? failed : undefined,
      });
    } catch (error: any) {
      request.log.error(error, 'Failed to perform bulk action');
      return reply.code(500).send({ error: 'Failed to perform bulk action', details: error.message });
    }
  });

  // Get device by ID with comprehensive data
  fastify.get('/devices/:id', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request)!;
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      const { id } = request.params as { id: string };

      // Get device with owner info
      const deviceResult = await pool.query(`
        SELECT 
          d.*,
          u.name as owner_name,
          u.email as owner_email
        FROM huginn.devices d
        LEFT JOIN muninn.users u ON d.owner_user_id = u.id
        WHERE d.id = $1 AND d.organization_id = $2
        LIMIT 1
      `, [id, organizationId]);

      if (deviceResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Device not found' });
      }

      const device = deviceResult.rows[0];
      if (!canAccessResource(user, device.owner_user_id)) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      // Get telemetry (latest 100)
      const telemetryResult = await pool.query(`
        SELECT id, device_id, cpu, memory, disk, created_at
        FROM huginn.telemetry
        WHERE device_id = $1 AND organization_id = $2
        ORDER BY created_at DESC
        LIMIT 100
      `, [id, organizationId]);

      // Get deployment jobs
      const deploymentsResult = await pool.query(`
        SELECT 
          dj.id, dj.device_id, dj.package_id, dj.status, dj.created_at, dj.finished_at,
          sp.name as package_name, sp.version as package_version, sp.platform as package_platform
        FROM huginn.deployment_jobs dj
        LEFT JOIN huginn.software_packages sp ON dj.package_id = sp.id
        WHERE dj.device_id = $1 AND dj.organization_id = $2
        ORDER BY dj.created_at DESC
        LIMIT 50
      `, [id, organizationId]);

      // Get policy assignments
      const policiesResult = await pool.query(`
        SELECT 
          dpa.id, dpa.policy_id, dpa.status, dpa.assigned_at, dpa.applied_at,
          dp.name as policy_name, dp.description as policy_description
        FROM huginn.device_policy_assignments dpa
        LEFT JOIN huginn.device_policies dp ON dpa.policy_id = dp.id
        WHERE dpa.device_id = $1 AND dpa.organization_id = $2
        ORDER BY dpa.assigned_at DESC
      `, [id, organizationId]);

      // Get activity log
      const activityResult = await pool.query(`
        SELECT 
          da.id, da.action, da.status, da.metadata, da.created_at, da.completed_at,
          u.name as initiated_by_name
        FROM huginn.device_activity da
        LEFT JOIN muninn.users u ON da.initiated_by = u.id
        WHERE da.device_id = $1 AND da.organization_id = $2
        ORDER BY da.created_at DESC
        LIMIT 100
      `, [id, organizationId]);

      return reply.send({
        ...device,
        telemetry: telemetryResult.rows,
        deployments: deploymentsResult.rows,
        policies: policiesResult.rows,
        activity: activityResult.rows,
      });
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch device');
      return reply.code(500).send({ error: 'Failed to fetch device', details: error.message });
    }
  });

  // Device actions endpoint
  fastify.post<{ Params: { id: string }; Body: { action: string; params?: any } }>('/devices/:id/actions', {
    preHandler: requireRole('agent'), // Only agents and admins can perform actions
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request)!;
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      const { id } = request.params;
      const { action, params } = request.body;

      // Verify device exists and user has access
      const deviceResult = await pool.query(
        `SELECT owner_user_id, organization_id FROM huginn.devices WHERE id = $1`,
        [id]
      );

      if (deviceResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Device not found' });
      }

      const device = deviceResult.rows[0];
       if (device.organization_id !== organizationId) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
      if (!canAccessResource(user, device.owner_user_id)) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      // Validate permissions for destructive actions
      const destructiveActions = ['wipe', 'isolate'];
      if (destructiveActions.includes(action) && user.rookRole !== 'admin') {
        return reply.code(403).send({ error: 'Admin role required for this action' });
      }

      // Create activity record
      const activityResult = await pool.query(`
        INSERT INTO huginn.device_activity (device_id, organization_id, action, initiated_by, status, metadata)
        VALUES ($1, $2, $3, $4, 'queued', $5::jsonb)
        RETURNING id
      `, [id, organizationId, action, user.userId, JSON.stringify(params || {})]);

      const activityId = activityResult.rows[0].id;

      // For now, we'll just queue the action. In production, this would trigger
      // async job processing via a queue system
      // Update status to processing (simulated)
      setTimeout(async () => {
        try {
          await pool.query(
            `UPDATE huginn.device_activity SET status = 'processing' WHERE id = $1`,
            [activityId]
          );
          // Simulate completion after a delay
          setTimeout(async () => {
            await pool.query(
              `UPDATE huginn.device_activity SET status = 'completed', completed_at = now() WHERE id = $1`,
              [activityId]
            );
          }, 1000);
        } catch (error) {
          // Log error
        }
      }, 100);

      return reply.send({
        actionId: activityId,
        status: 'queued',
      });
    } catch (error: any) {
      request.log.error(error, 'Failed to execute device action');
      return reply.code(500).send({ error: 'Failed to execute device action', details: error.message });
    }
  });

  // Get device telemetry
  fastify.get('/devices/:id/telemetry', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request)!;
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      const { id } = request.params as { id: string };

      // Verify device access
      const deviceResult = await pool.query(`
        SELECT owner_user_id, organization_id
        FROM huginn.devices
        WHERE id = $1
        LIMIT 1
      `, [id]);

      if (deviceResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Device not found' });
      }

      const device = deviceResult.rows[0];
      if (device.organization_id !== organizationId) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
      if (!canAccessResource(user, device.owner_user_id)) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const telemetryResult = await pool.query(`
        SELECT id, device_id, cpu, memory, disk, created_at
        FROM huginn.telemetry
        WHERE device_id = $1 AND organization_id = $2
        ORDER BY created_at DESC
        LIMIT 100
      `, [id, organizationId]);

      return reply.send(telemetryResult.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch telemetry');
      return reply.code(500).send({ error: 'Failed to fetch telemetry', details: error.message });
    }
  });

  // List software packages
  fastify.get('/software', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      const result = await pool.query(`
        SELECT id, name, version, platform, created_at
        FROM huginn.software_packages
        WHERE organization_id = $1
        ORDER BY name
      `, [organizationId]);
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch software packages');
      return reply.code(500).send({ error: 'Failed to fetch software packages', details: error.message });
    }
  });

  // List deployment jobs for device
  fastify.get('/devices/:id/deployments', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request)!;
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      const { id } = request.params as { id: string };

      // Verify device access
      const deviceResult = await pool.query(`
        SELECT owner_user_id, organization_id
        FROM huginn.devices
        WHERE id = $1
        LIMIT 1
      `, [id]);

      if (deviceResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Device not found' });
      }

      const device = deviceResult.rows[0];
      if (device.organization_id !== organizationId) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
      if (!canAccessResource(user, device.owner_user_id)) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const jobsResult = await pool.query(`
        SELECT 
          dj.id, dj.device_id, dj.package_id, dj.status, dj.created_at, dj.finished_at,
          sp.name as package_name, sp.version as package_version
        FROM huginn.deployment_jobs dj
        LEFT JOIN huginn.software_packages sp ON dj.package_id = sp.id
        WHERE dj.device_id = $1 AND dj.organization_id = $2
        ORDER BY dj.created_at DESC
      `, [id, organizationId]);

      return reply.send(jobsResult.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch deployments');
      return reply.code(500).send({ error: 'Failed to fetch deployments', details: error.message });
    }
  });

  // List device policies
  fastify.get('/policies', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      const result = await pool.query(`
        SELECT id, name, description, platform, enabled, created_at, updated_at
        FROM huginn.device_policies
        WHERE enabled = true AND organization_id = $1
        ORDER BY name
      `, [organizationId]);
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch device policies');
      return reply.code(500).send({ error: 'Failed to fetch device policies', details: error.message });
    }
  });

  // Get aggregated deployments across all devices
  fastify.get('/deployments/aggregated', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      const { status, package_id, limit } = request.query as {
        status?: string;
        package_id?: string;
        limit?: string;
      };
      
      let query = `
        SELECT 
          dj.id, dj.device_id, dj.package_id, dj.status, dj.created_at, dj.finished_at,
          sp.name as package_name, sp.version as package_version, sp.platform as package_platform,
          d.hostname as device_hostname, d.platform as device_platform,
          u.name as device_owner_name
        FROM huginn.deployment_jobs dj
        LEFT JOIN huginn.software_packages sp ON dj.package_id = sp.id
        LEFT JOIN huginn.devices d ON dj.device_id = d.id
        LEFT JOIN muninn.users u ON d.owner_user_id = u.id
        WHERE dj.organization_id = $1
      `;
      const params: any[] = [organizationId];
      let paramIndex = 2;
      
      if (status) {
        query += ` AND dj.status = $${paramIndex++}`;
        params.push(status);
      }
      
      if (package_id) {
        query += ` AND dj.package_id = $${paramIndex++}`;
        params.push(package_id);
      }
      
      query += ` ORDER BY dj.created_at DESC LIMIT $${paramIndex}`;
      params.push(Math.min(parseInt(limit || '100', 10), 500));
      
      const result = await pool.query(query, params);
      
      // Get summary stats
      const statsResult = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'running') as running
        FROM huginn.deployment_jobs
        WHERE organization_id = $1
      `, [organizationId]);
      const statsRow = statsResult.rows[0] || {};
      
      return reply.send({
        deployments: result.rows,
        stats: {
          total: parseInt(statsRow.total) || 0,
          completed: parseInt(statsRow.completed) || 0,
          failed: parseInt(statsRow.failed) || 0,
          pending: parseInt(statsRow.pending) || 0,
          running: parseInt(statsRow.running) || 0,
        },
      });
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch aggregated deployments');
      return reply.code(500).send({ error: 'Failed to fetch aggregated deployments', details: error.message });
    }
  });
}
