import { FastifyInstance, FastifyReply } from 'fastify';
import { pool } from '../lib/db/index.js';
import { getUserFromRequest, requireRole, canAccessResource } from '../auth/rbac.js';
import { NotFoundError, ForbiddenError } from '../lib/errors.js';
import { organizationMiddleware } from '../middleware/organization.js';

export async function skuldRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', organizationMiddleware);

  const requireOrganizationId = (request: any, reply: FastifyReply): string | null => {
    const organizationId = (request as any).userContext?.organizationId ?? null;
    if (!organizationId) {
      reply.code(400).send({ error: 'Organization context required' });
      return null;
    }
    return organizationId;
  };

  // List assets - Enhanced with JOINs and warranty calculations
  fastify.get('/assets', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request)!;
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      
      let query = `
        SELECT 
          a.id, a.tag, a.serial, a.model_id, a.status, a.owner_user_id, a.device_id,
          a.location_id, a.cost, a.purchase_date, a.warranty_end, a.vendor_id,
          a.po_number, a.notes, a.created_at, a.updated_at,
          m.name as model_name, m.category as model_category, m.manufacturer,
          u.name as owner_name, u.email as owner_email,
          l.name as location_name, l.code as location_code,
          v.name as vendor_name,
          CASE 
            WHEN a.warranty_end IS NULL THEN NULL
            WHEN a.warranty_end < CURRENT_DATE THEN -1
            ELSE EXTRACT(EPOCH FROM (a.warranty_end::timestamp - CURRENT_DATE::timestamp)) / 86400
          END as warranty_days_remaining
        FROM skuld.assets a
        LEFT JOIN skuld.asset_models m ON a.model_id = m.id
        LEFT JOIN muninn.users u ON a.owner_user_id = u.id
        LEFT JOIN skuld.locations l ON a.location_id = l.id
        LEFT JOIN skuld.vendors v ON a.vendor_id = v.id
      `;
      const params: any[] = [organizationId];
      let paramIndex = 2;
      const conditions: string[] = ['a.organization_id = $1'];

      if (user.rookRole !== 'admin' && user.rookRole !== 'agent') {
        conditions.push(`a.owner_user_id = $${paramIndex}`);
        params.push(user.userId);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` ORDER BY a.created_at DESC LIMIT 100`;
      
      const result = await pool.query(query, params);
      
      // Transform results to include nested objects
      const assets = result.rows.map((row: any) => ({
        id: row.id,
        tag: row.tag,
        serial: row.serial,
        model_id: row.model_id,
        model: row.model_id ? {
          id: row.model_id,
          name: row.model_name,
          category: row.model_category,
          manufacturer: row.manufacturer,
        } : null,
        status: row.status,
        owner_user_id: row.owner_user_id,
        owner: row.owner_user_id ? {
          id: row.owner_user_id,
          name: row.owner_name,
          email: row.owner_email,
        } : null,
        device_id: row.device_id,
        location_id: row.location_id,
        location: row.location_id ? {
          id: row.location_id,
          name: row.location_name,
          code: row.location_code,
        } : null,
        cost: row.cost ? parseFloat(row.cost) : null,
        purchase_date: row.purchase_date,
        warranty_end: row.warranty_end,
        warranty_days_remaining: row.warranty_days_remaining !== null ? Math.floor(row.warranty_days_remaining) : null,
        vendor_id: row.vendor_id,
        vendor: row.vendor_id ? {
          id: row.vendor_id,
          name: row.vendor_name,
        } : null,
        po_number: row.po_number,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
      
      return reply.send(assets);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch assets');
      return reply.code(500).send({ error: 'Failed to fetch assets', details: error.message });
    }
  });

  // Get asset by ID - Enhanced with full details and events
  fastify.get('/assets/:id', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request)!;
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      const { id } = request.params as { id: string };

      const assetResult = await pool.query(`
        SELECT 
          a.id, a.tag, a.serial, a.model_id, a.status, a.owner_user_id, a.device_id,
          a.location_id, a.cost, a.purchase_date, a.warranty_end, a.vendor_id,
          a.po_number, a.notes, a.created_at, a.updated_at,
          m.id as model_id_full, m.name as model_name, m.category as model_category, 
          m.manufacturer, m.specs as model_specs, m.lifecycle_policy_id,
          u.id as owner_id_full, u.name as owner_name, u.email as owner_email,
          l.id as location_id_full, l.name as location_name, l.code as location_code, l.address as location_address,
          v.id as vendor_id_full, v.name as vendor_name, v.external_id as vendor_external_id, v.contact as vendor_contact,
          CASE 
            WHEN a.warranty_end IS NULL THEN NULL
            WHEN a.warranty_end < CURRENT_DATE THEN -1
            ELSE EXTRACT(EPOCH FROM (a.warranty_end::timestamp - CURRENT_DATE::timestamp)) / 86400
          END as warranty_days_remaining
        FROM skuld.assets a
        LEFT JOIN skuld.asset_models m ON a.model_id = m.id
        LEFT JOIN muninn.users u ON a.owner_user_id = u.id
        LEFT JOIN skuld.locations l ON a.location_id = l.id
        LEFT JOIN skuld.vendors v ON a.vendor_id = v.id
        WHERE a.id = $1 AND a.organization_id = $2
        LIMIT 1
      `, [id, organizationId]);

      if (assetResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Asset not found' });
      }

      const row = assetResult.rows[0];
      if (!canAccessResource(user, row.owner_user_id)) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      // Fetch events
      const eventsResult = await pool.query(`
        SELECT 
          e.id, e.asset_id, e.type, e.from_status, e.to_status, e.actor_user_id,
          e.payload, e.created_at,
          u.name as actor_name
        FROM skuld.asset_events e
        LEFT JOIN muninn.users u ON e.actor_user_id = u.id
        WHERE e.asset_id = $1 AND e.organization_id = $2
        ORDER BY e.created_at DESC
        LIMIT 50
      `, [id, organizationId]);

      // Fetch assignments
      const assignmentsResult = await pool.query(`
        SELECT 
          aa.id, aa.asset_id, aa.assignee_user_id, aa.assignee_org_unit,
          aa.start_date, aa.end_date, aa.reason, aa.created_at, aa.updated_at,
          u.name as assignee_name, u.email as assignee_email
        FROM skuld.asset_assignments aa
        LEFT JOIN muninn.users u ON aa.assignee_user_id = u.id
        WHERE aa.asset_id = $1 AND aa.organization_id = $2
        ORDER BY aa.start_date DESC
      `, [id, organizationId]);

      const asset = {
        id: row.id,
        tag: row.tag,
        serial: row.serial,
        model_id: row.model_id,
        model: row.model_id ? {
          id: row.model_id_full,
          name: row.model_name,
          category: row.model_category,
          manufacturer: row.manufacturer,
          specs: row.model_specs,
          lifecycle_policy_id: row.lifecycle_policy_id,
        } : null,
        status: row.status,
        owner_user_id: row.owner_user_id,
        owner: row.owner_user_id ? {
          id: row.owner_id_full,
          name: row.owner_name,
          email: row.owner_email,
        } : null,
        device_id: row.device_id,
        location_id: row.location_id,
        location: row.location_id ? {
          id: row.location_id_full,
          name: row.location_name,
          code: row.location_code,
          address: row.location_address,
        } : null,
        cost: row.cost ? parseFloat(row.cost) : null,
        purchase_date: row.purchase_date,
        warranty_end: row.warranty_end,
        warranty_days_remaining: row.warranty_days_remaining !== null ? Math.floor(row.warranty_days_remaining) : null,
        vendor_id: row.vendor_id,
        vendor: row.vendor_id ? {
          id: row.vendor_id_full,
          name: row.vendor_name,
          external_id: row.vendor_external_id,
          contact: row.vendor_contact,
        } : null,
        po_number: row.po_number,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        events: eventsResult.rows.map((e: any) => ({
          id: e.id,
          asset_id: e.asset_id,
          type: e.type,
          from_status: e.from_status,
          to_status: e.to_status,
          actor_user_id: e.actor_user_id,
          actor: e.actor_user_id ? {
            id: e.actor_user_id,
            name: e.actor_name,
          } : null,
          payload: e.payload,
          created_at: e.created_at,
        })),
        assignments: assignmentsResult.rows.map((a: any) => ({
          id: a.id,
          asset_id: a.asset_id,
          assignee_user_id: a.assignee_user_id,
          assignee: a.assignee_user_id ? {
            id: a.assignee_user_id,
            name: a.assignee_name,
            email: a.assignee_email,
          } : null,
          assignee_org_unit: a.assignee_org_unit,
          start_date: a.start_date,
          end_date: a.end_date,
          reason: a.reason,
          created_at: a.created_at,
          updated_at: a.updated_at,
        })),
      };

      return reply.send(asset);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch asset');
      return reply.code(500).send({ error: 'Failed to fetch asset', details: error.message });
    }
  });

  // List asset models
  fastify.get('/models', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      const result = await pool.query(`
        SELECT id, name, category, manufacturer, specs, lifecycle_policy_id, 
               created_at, updated_at
        FROM skuld.asset_models
        WHERE organization_id = $1
        ORDER BY name
      `, [organizationId]);
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch asset models');
      return reply.code(500).send({ error: 'Failed to fetch asset models', details: error.message });
    }
  });

  // List vendors
  fastify.get('/vendors', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      const result = await pool.query(`
        SELECT id, name, external_id, contact, created_at, updated_at
        FROM skuld.vendors
        WHERE organization_id = $1
        ORDER BY name
      `, [organizationId]);
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch vendors');
      return reply.code(500).send({ error: 'Failed to fetch vendors', details: error.message });
    }
  });

  // List locations
  fastify.get('/locations', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      const result = await pool.query(`
        SELECT id, name, code, address, created_at, updated_at
        FROM skuld.locations
        WHERE organization_id = $1
        ORDER BY name
      `, [organizationId]);
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch locations');
      return reply.code(500).send({ error: 'Failed to fetch locations', details: error.message });
    }
  });

  // List asset assignments
  fastify.get('/assignments', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request)!;
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      
      let query = `
        SELECT id, asset_id, assignee_user_id, assignee_org_unit, start_date, 
               end_date, reason, created_at, updated_at
        FROM skuld.asset_assignments
      `;
      const params: any[] = [organizationId];
      const conditions: string[] = ['organization_id = $1'];
      let paramIndex = 2;

      if (user.rookRole !== 'admin' && user.rookRole !== 'agent') {
        conditions.push(`assignee_user_id = $${paramIndex}`);
        params.push(user.userId);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` ORDER BY created_at DESC LIMIT 100`;
      
      const result = await pool.query(query, params);
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch asset assignments');
      return reply.code(500).send({ error: 'Failed to fetch asset assignments', details: error.message });
    }
  });

  // Assign asset to user
  fastify.post('/assets/:id/assign', {
    preHandler: requireRole('agent'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request)!;
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      const { id } = request.params as { id: string };
      const { assignee_user_id, assignee_org_unit, reason } = request.body as {
        assignee_user_id?: string;
        assignee_org_unit?: string;
        reason?: string;
      };
      
      if (!assignee_user_id && !assignee_org_unit) {
        return reply.code(400).send({ error: 'Either assignee_user_id or assignee_org_unit is required' });
      }
      
      // Verify asset exists
      const assetResult = await pool.query(`
        SELECT id, owner_user_id, organization_id
        FROM skuld.assets
        WHERE id = $1 AND organization_id = $2
      `, [id, organizationId]);
      
      if (assetResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Asset not found' });
      }
      
      // Create assignment
      const result = await pool.query(`
        INSERT INTO skuld.asset_assignments (asset_id, assignee_user_id, assignee_org_unit, start_date, reason, organization_id)
        VALUES ($1, $2, $3, NOW(), $4, $5)
        RETURNING id, asset_id, assignee_user_id, assignee_org_unit, start_date, end_date, reason, created_at, updated_at
      `, [id, assignee_user_id || null, assignee_org_unit || null, reason || null, organizationId]);
      
      // Update asset owner if assigning to user
      if (assignee_user_id) {
        await pool.query(`
          UPDATE skuld.assets
          SET owner_user_id = $1, updated_at = NOW()
          WHERE id = $2 AND organization_id = $3
        `, [assignee_user_id, id, organizationId]);
      }
      
      return reply.code(201).send(result.rows[0]);
    } catch (error: any) {
      request.log.error(error, 'Failed to assign asset');
      return reply.code(500).send({ error: 'Failed to assign asset', details: error.message });
    }
  });

  // List lifecycle policies
  fastify.get('/lifecycle-policies', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      const result = await pool.query(`
        SELECT id, name, description, retirement_age_months, warning_threshold_days, 
               created_at, updated_at
        FROM skuld.lifecycle_policies
        WHERE organization_id = $1
        ORDER BY name
      `, [organizationId]);
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch lifecycle policies');
      return reply.code(500).send({ error: 'Failed to fetch lifecycle policies', details: error.message });
    }
  });

  // Create lifecycle policy
  fastify.post('/lifecycle-policies', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    try {
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      const { name, description, retirement_age_months, warning_threshold_days } = request.body as {
        name: string;
        description?: string;
        retirement_age_months?: number;
        warning_threshold_days?: number;
      };
      
      if (!name || name.trim().length === 0) {
        return reply.code(400).send({ error: 'Policy name is required' });
      }
      
      const result = await pool.query(`
        INSERT INTO skuld.lifecycle_policies (name, description, retirement_age_months, warning_threshold_days, organization_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, description, retirement_age_months, warning_threshold_days, created_at, updated_at
      `, [name.trim(), description || null, retirement_age_months || null, warning_threshold_days || null, organizationId]);
      
      return reply.code(201).send(result.rows[0]);
    } catch (error: any) {
      request.log.error(error, 'Failed to create lifecycle policy');
      return reply.code(500).send({ error: 'Failed to create lifecycle policy', details: error.message });
    }
  });

  // Change asset lifecycle status
  fastify.patch('/assets/:id/status', {
    preHandler: requireRole('agent'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request)!;
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      const { id } = request.params as { id: string };
      const { status: newStatus, reason, audit_note } = request.body as {
        status: string;
        reason: string;
        audit_note: string;
      };

      if (!newStatus || !reason || !audit_note) {
        return reply.code(400).send({ 
          error: 'Status, reason, and audit_note are required' 
        });
      }

      // Get current asset
      const assetResult = await pool.query(`
        SELECT id, status, owner_user_id, organization_id
        FROM skuld.assets
        WHERE id = $1 AND organization_id = $2
      `, [id, organizationId]);

      if (assetResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Asset not found' });
      }

      const currentAsset = assetResult.rows[0];
      const oldStatus = currentAsset.status;

      // Validate status transition
      const validStatuses = ['requested', 'ordered', 'received', 'in_stock', 'assigned', 'in_use', 'in_repair', 'lost', 'retired', 'disposed'];
      if (!validStatuses.includes(newStatus)) {
        return reply.code(400).send({ error: 'Invalid status' });
      }

      // Update asset status
      const updateResult = await pool.query(`
        UPDATE skuld.assets
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND organization_id = $3
        RETURNING id, tag, serial, model_id, status, owner_user_id, device_id,
                  location_id, cost, purchase_date, warranty_end, vendor_id,
                  po_number, notes, created_at, updated_at
      `, [newStatus, id, organizationId]);

      // Create asset event
      await pool.query(`
        INSERT INTO skuld.asset_events (asset_id, organization_id, type, from_status, to_status, actor_user_id, payload)
        VALUES ($1, $2, 'status_changed', $3, $4, $5, $6)
      `, [
        id,
        organizationId,
        oldStatus,
        newStatus,
        user.userId,
        JSON.stringify({ reason, audit_note }),
      ]);

      return reply.send(updateResult.rows[0]);
    } catch (error: any) {
      request.log.error(error, 'Failed to change asset status');
      return reply.code(500).send({ error: 'Failed to change asset status', details: error.message });
    }
  });

  // Get asset stats
  fastify.get('/assets/stats', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      const statsResult = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'in_stock') as ready_to_deploy,
          COUNT(*) FILTER (WHERE status = 'in_repair') as in_repair,
          COUNT(*) FILTER (WHERE status = 'assigned') as spare,
          COUNT(*) FILTER (WHERE status = 'in_use') as in_use,
          COUNT(*) FILTER (WHERE warranty_end IS NOT NULL AND warranty_end BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as warranty_expiring_30,
          COUNT(*) FILTER (WHERE warranty_end IS NOT NULL AND warranty_end BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days') as warranty_expiring_60,
          COUNT(*) FILTER (WHERE warranty_end IS NOT NULL AND warranty_end BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days') as warranty_expiring_90,
          SUM(COALESCE(cost, 0)) as total_value
        FROM skuld.assets
        WHERE organization_id = $1
      `, [organizationId]);

      const statusCounts = await pool.query(`
        SELECT status, COUNT(*) as count
        FROM skuld.assets
        WHERE organization_id = $1
        GROUP BY status
      `, [organizationId]);

      const categoryCounts = await pool.query(`
        SELECT m.category, COUNT(*) as count
        FROM skuld.assets a
        LEFT JOIN skuld.asset_models m ON a.model_id = m.id
        WHERE m.category IS NOT NULL AND a.organization_id = $1
        GROUP BY m.category
      `, [organizationId]);

      const row = statsResult.rows[0];
      const stats = {
        total: parseInt(row.total) || 0,
        by_status: statusCounts.rows.reduce((acc: any, r: any) => {
          acc[r.status] = parseInt(r.count) || 0;
          return acc;
        }, {}),
        by_category: categoryCounts.rows.reduce((acc: any, r: any) => {
          acc[r.category] = parseInt(r.count) || 0;
          return acc;
        }, {}),
        in_use: parseInt(row.in_use) || 0,
        in_stock: parseInt(row.ready_to_deploy) || 0,
        retiring_soon: 0, // TODO: Calculate based on lifecycle policies
        warranty_expiring: parseInt(row.warranty_expiring_30) || 0,
        open_repairs: parseInt(row.in_repair) || 0,
        total_value: parseFloat(row.total_value) || 0,
        ready_to_deploy: parseInt(row.ready_to_deploy) || 0,
        in_repair: parseInt(row.in_repair) || 0,
        spare: parseInt(row.spare) || 0,
        warranty_expiring_30: parseInt(row.warranty_expiring_30) || 0,
        warranty_expiring_60: parseInt(row.warranty_expiring_60) || 0,
        warranty_expiring_90: parseInt(row.warranty_expiring_90) || 0,
      };

      return reply.send(stats);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch asset stats');
      return reply.code(500).send({ error: 'Failed to fetch asset stats', details: error.message });
    }
  });

  // Get warranty expiring assets
  fastify.get('/assets/warranty-expiring', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      const { days = '30' } = request.query as { days?: string };
      const daysNum = parseInt(days) || 30;

      const result = await pool.query(`
        SELECT 
          a.id, a.tag, a.serial, a.status, a.warranty_end,
          m.name as model_name, m.category,
          u.name as owner_name,
          EXTRACT(EPOCH FROM (a.warranty_end::timestamp - CURRENT_DATE::timestamp)) / 86400 as days_remaining
        FROM skuld.assets a
        LEFT JOIN skuld.asset_models m ON a.model_id = m.id
        LEFT JOIN muninn.users u ON a.owner_user_id = u.id
        WHERE a.warranty_end IS NOT NULL
          AND a.warranty_end BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1::integer || ' days')::interval
          AND a.organization_id = $2
        ORDER BY a.warranty_end ASC
      `, [daysNum, organizationId]);

      const assets = result.rows.map((row: any) => ({
        id: row.id,
        tag: row.tag,
        serial: row.serial,
        status: row.status,
        warranty_end: row.warranty_end,
        days_remaining: Math.floor(row.days_remaining) || 0,
        model: row.model_name ? {
          name: row.model_name,
          category: row.category,
        } : null,
        owner: row.owner_name ? {
          name: row.owner_name,
        } : null,
      }));

      return reply.send(assets);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch warranty expiring assets');
      return reply.code(500).send({ error: 'Failed to fetch warranty expiring assets', details: error.message });
    }
  });

  // Get model stats
  fastify.get('/models/:id/stats', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }

      const statsResult = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'in_use') as in_use,
          COUNT(*) FILTER (WHERE status = 'in_stock') as in_stock,
          COUNT(*) FILTER (WHERE status = 'in_repair') as in_repair,
          SUM(COALESCE(cost, 0)) as total_value,
          AVG(COALESCE(cost, 0)) as avg_cost
        FROM skuld.assets
        WHERE model_id = $1 AND organization_id = $2
      `, [id, organizationId]);

      const statusCounts = await pool.query(`
        SELECT status, COUNT(*) as count
        FROM skuld.assets
        WHERE model_id = $1 AND organization_id = $2
        GROUP BY status
      `, [id, organizationId]);

      const row = statsResult.rows[0];
      const stats = {
        total: parseInt(row.total) || 0,
        by_status: statusCounts.rows.reduce((acc: any, r: any) => {
          acc[r.status] = parseInt(r.count) || 0;
          return acc;
        }, {}),
        in_use: parseInt(row.in_use) || 0,
        in_stock: parseInt(row.in_stock) || 0,
        in_repair: parseInt(row.in_repair) || 0,
        total_value: parseFloat(row.total_value) || 0,
        avg_cost: parseFloat(row.avg_cost) || 0,
      };

      return reply.send(stats);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch model stats');
      return reply.code(500).send({ error: 'Failed to fetch model stats', details: error.message });
    }
  });

  // Get vendor stats
  fastify.get('/vendors/:id/stats', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }

      const statsResult = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'in_use') as in_use,
          COUNT(*) FILTER (WHERE status = 'in_stock') as in_stock,
          SUM(COALESCE(cost, 0)) as total_value
        FROM skuld.assets
        WHERE vendor_id = $1 AND organization_id = $2
      `, [id, organizationId]);

      const statusCounts = await pool.query(`
        SELECT status, COUNT(*) as count
        FROM skuld.assets
        WHERE vendor_id = $1 AND organization_id = $2
        GROUP BY status
      `, [id, organizationId]);

      const purchaseVolume = await pool.query(`
        SELECT 
          DATE_TRUNC('month', purchase_date) as month,
          COUNT(*) as count,
          SUM(COALESCE(cost, 0)) as value
        FROM skuld.assets
        WHERE vendor_id = $1 AND organization_id = $2 AND purchase_date IS NOT NULL
        GROUP BY DATE_TRUNC('month', purchase_date)
        ORDER BY month DESC
        LIMIT 12
      `, [id, organizationId]);

      const row = statsResult.rows[0];
      const stats = {
        total: parseInt(row.total) || 0,
        by_status: statusCounts.rows.reduce((acc: any, r: any) => {
          acc[r.status] = parseInt(r.count) || 0;
          return acc;
        }, {}),
        total_value: parseFloat(row.total_value) || 0,
        in_use: parseInt(row.in_use) || 0,
        in_stock: parseInt(row.in_stock) || 0,
        purchase_volume: purchaseVolume.rows.map((r: any) => ({
          month: r.month,
          count: parseInt(r.count) || 0,
          value: parseFloat(r.value) || 0,
        })),
      };

      return reply.send(stats);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch vendor stats');
      return reply.code(500).send({ error: 'Failed to fetch vendor stats', details: error.message });
    }
  });

  // CSV Import Preview
  fastify.post('/imports/preview', {
    preHandler: requireRole('agent'),
  }, async (request, reply) => {
    try {
      const { csv_data } = request.body as { csv_data: string };

      if (!csv_data) {
        return reply.code(400).send({ error: 'csv_data is required' });
      }

      // Parse CSV
      const lines = csv_data.split('\n').filter((line: string) => line.trim());
      if (lines.length < 2) {
        return reply.code(400).send({ error: 'CSV must contain headers and at least one data row' });
      }

      const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
      const previewRows = lines.slice(1, 11).map((line: string) => {
        const values = line.split(',').map((v: string) => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      // Suggest field mappings
      const fieldSuggestions: Record<string, string[]> = {
        tag: ['tag', 'asset tag', 'asset_tag', 'id', 'asset id'],
        serial: ['serial', 'serial number', 'serial_number', 'sn'],
        model: ['model', 'model name', 'model_name', 'device model'],
        status: ['status', 'state', 'asset status'],
        cost: ['cost', 'price', 'purchase price', 'purchase_price'],
        purchase_date: ['purchase date', 'purchase_date', 'date purchased', 'purchased'],
        warranty_end: ['warranty end', 'warranty_end', 'warranty expires', 'warranty expiration'],
        vendor: ['vendor', 'supplier', 'manufacturer'],
        location: ['location', 'site', 'office'],
        owner: ['owner', 'user', 'assigned to', 'assigned_to'],
        notes: ['notes', 'note', 'description', 'comments'],
      };

      const suggestedMappings: Record<string, string> = {};
      headers.forEach((header) => {
        for (const [dbField, suggestions] of Object.entries(fieldSuggestions)) {
          if (suggestions.some((s) => header.includes(s) || s.includes(header))) {
            suggestedMappings[header] = dbField;
            break;
          }
        }
      });

      return reply.send({
        headers,
        preview: previewRows,
        total_rows: lines.length - 1,
        suggested_mappings: suggestedMappings,
      });
    } catch (error: any) {
      request.log.error(error, 'Failed to preview CSV import');
      return reply.code(500).send({ error: 'Failed to preview CSV import', details: error.message });
    }
  });

  // List asset imports
  fastify.get('/imports', {
    preHandler: requireRole('agent'),
  }, async (request, reply) => {
    try {
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      const result = await pool.query(`
        SELECT id, source, status, stats, error_text, created_by, created_at, completed_at
        FROM skuld.asset_imports
        WHERE organization_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `, [organizationId]);
      
      // Transform results to include stats fields
      const imports = result.rows.map((row: any) => ({
        id: row.id,
        source: row.source,
        status: row.status,
        stats: row.stats || {},
        record_count: row.stats?.total || 0,
        imported_count: row.stats?.created ? (row.stats.created + (row.stats.updated || 0)) : 0,
        error_count: row.stats?.failed || 0,
        error_text: row.error_text,
        created_by: row.created_by,
        created_at: row.created_at,
        completed_at: row.completed_at,
      }));
      
      return reply.send(imports);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch asset imports');
      return reply.code(500).send({ error: 'Failed to fetch asset imports', details: error.message });
    }
  });

  // Create asset import - Enhanced with field mapping and idempotent upsert
  fastify.post('/imports', {
    preHandler: requireRole('agent'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request)!;
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) {
        return;
      }
      const { source, assets, field_mapping } = request.body as {
        source: string;
        assets: Array<Record<string, any>>;
        field_mapping?: Record<string, string>;
      };
      
      if (!source || !assets || !Array.isArray(assets) || assets.length === 0) {
        return reply.code(400).send({ error: 'Source and assets array are required' });
      }
      
      // Create import record
      const importResult = await pool.query(`
        INSERT INTO skuld.asset_imports (source, status, created_by, stats, started_at, organization_id)
        VALUES ($1, 'processing', $2, '{}', NOW(), $3)
        RETURNING id
      `, [source, user.userId, organizationId]);
      
      const importId = importResult.rows[0].id;
      let createdCount = 0;
      let updatedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      
      // Import each asset with idempotent upsert
      for (let i = 0; i < assets.length; i++) {
        const rawAsset = assets[i];
        try {
          // Apply field mapping if provided
          let assetData: any = {};
          if (field_mapping) {
            for (const [csvField, dbField] of Object.entries(field_mapping)) {
              if (rawAsset[csvField] !== undefined && rawAsset[csvField] !== '') {
                assetData[dbField] = rawAsset[csvField];
              }
            }
          } else {
            assetData = rawAsset;
          }

          // Resolve model by name if needed
          let modelId = assetData.model_id;
          if (!modelId && assetData.model) {
            const modelResult = await pool.query(`
              SELECT id FROM skuld.asset_models WHERE LOWER(name) = LOWER($1) AND organization_id = $2 LIMIT 1
            `, [assetData.model, organizationId]);
            if (modelResult.rows.length > 0) {
              modelId = modelResult.rows[0].id;
            }
          }

          // Resolve vendor by name if needed
          let vendorId = assetData.vendor_id;
          if (!vendorId && assetData.vendor) {
            const vendorResult = await pool.query(`
              SELECT id FROM skuld.vendors WHERE LOWER(name) = LOWER($1) AND organization_id = $2 LIMIT 1
            `, [assetData.vendor, organizationId]);
            if (vendorResult.rows.length > 0) {
              vendorId = vendorResult.rows[0].id;
            }
          }

          // Resolve location by name if needed
          let locationId = assetData.location_id;
          if (!locationId && assetData.location) {
            const locationResult = await pool.query(`
              SELECT id FROM skuld.locations WHERE LOWER(name) = LOWER($1) AND organization_id = $2 LIMIT 1
            `, [assetData.location, organizationId]);
            if (locationResult.rows.length > 0) {
              locationId = locationResult.rows[0].id;
            }
          }

          // Check for existing asset by tag or serial (idempotent matching)
          let existingAsset = null;
          if (assetData.tag || assetData.serial) {
            const matchParams: any[] = [];
            const conditions: string[] = [];
            
            if (assetData.tag) {
              conditions.push(`tag = $${matchParams.length + 1}`);
              matchParams.push(assetData.tag);
            }
            if (assetData.serial) {
              conditions.push(`serial = $${matchParams.length + 1}`);
              matchParams.push(assetData.serial);
            }

            const existingResult = await pool.query(`
              SELECT id FROM skuld.assets 
              WHERE (${conditions.join(' OR ')})
              AND organization_id = $${matchParams.length + 1}
              LIMIT 1
            `, [...matchParams, organizationId]);
            if (existingResult.rows.length > 0) {
              existingAsset = existingResult.rows[0];
            }
          }

          // Prepare asset data
          const tag = assetData.tag || null;
          const serial = assetData.serial || null;
          const status = assetData.status || 'in_stock';
          const cost = assetData.cost ? parseFloat(assetData.cost) : null;
          const purchaseDate = assetData.purchase_date || null;
          const warrantyEnd = assetData.warranty_end || null;
          const poNumber = assetData.po_number || null;
          const notes = assetData.notes || null;

          if (existingAsset) {
            // Update existing asset
            await pool.query(`
              UPDATE skuld.assets
              SET model_id = COALESCE($1, model_id),
                  status = COALESCE($2, status),
                  cost = COALESCE($3, cost),
                  purchase_date = COALESCE($4, purchase_date),
                  warranty_end = COALESCE($5, warranty_end),
                  vendor_id = COALESCE($6, vendor_id),
                  location_id = COALESCE($7, location_id),
                  po_number = COALESCE($8, po_number),
                  notes = COALESCE($9, notes),
                  updated_at = NOW()
              WHERE id = $10 AND organization_id = $11
            `, [modelId, status, cost, purchaseDate, warrantyEnd, vendorId, locationId, poNumber, notes, existingAsset.id, organizationId]);
            updatedCount++;
          } else {
            // Create new asset
            await pool.query(`
              INSERT INTO skuld.assets (tag, serial, model_id, status, cost, purchase_date, warranty_end, vendor_id, location_id, po_number, notes, organization_id)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `, [tag, serial, modelId, status, cost, purchaseDate, warrantyEnd, vendorId, locationId, poNumber, notes, organizationId]);
            createdCount++;
          }
        } catch (error: any) {
          errorCount++;
          const errorMsg = `Row ${i + 1}: ${error.message}`;
          errors.push(errorMsg);
          request.log.warn({ error, row: i + 1, assetData: rawAsset }, 'Failed to import asset');
        }
      }
      
      // Update import record with stats
      await pool.query(`
        UPDATE skuld.asset_imports
        SET status = $1, 
            stats = $2,
            imported_count = $3,
            error_count = $4,
            error_text = $5,
            completed_at = NOW()
        WHERE id = $6 AND organization_id = $7
      `, [
        errorCount === assets.length ? 'failed' : 'completed',
        JSON.stringify({
          created: createdCount,
          updated: updatedCount,
          failed: errorCount,
          total: assets.length,
        }),
        createdCount + updatedCount,
        errorCount,
        errors.length > 0 ? errors.join('; ') : null,
        importId,
        organizationId,
      ]);
      
      return reply.code(201).send({
        id: importId,
        source,
        status: errorCount === assets.length ? 'failed' : 'completed',
        stats: {
          total: assets.length,
          created: createdCount,
          updated: updatedCount,
          failed: errorCount,
        },
        errors: errors.slice(0, 10), // Limit to first 10 errors
      });
    } catch (error: any) {
      request.log.error(error, 'Failed to import assets');
      return reply.code(500).send({ error: 'Failed to import assets', details: error.message });
    }
  });
}

