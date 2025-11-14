import { FastifyInstance, FastifyReply } from 'fastify';
import { pool } from '../lib/db/index.js';
import { getUserFromRequest, requireRole, canAccessResource } from '../auth/rbac.js';
import { NotFoundError, ForbiddenError } from '../lib/errors.js';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation.js';
import { saveFile, getFile, deleteFile } from '../lib/file-upload.js';
import { organizationMiddleware } from '../middleware/organization.js';

// Validation schemas
const createTicketSchema = z.object({
  body: z.object({
    type: z.enum(['incident', 'request']),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    title: z.string().min(1),
    description: z.string().min(1),
    deviceId: z.string().uuid().optional(),
  }),
});

export async function sigurdRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', organizationMiddleware);

  const requireOrganizationId = (request: any, reply: FastifyReply): string | null => {
    const organizationId = (request as any).userContext?.organizationId ?? null;
    if (!organizationId) {
      reply.code(400).send({ error: 'Organization context required' });
      return null;
    }
    return organizationId;
  };

  // User context is already set by global auth middleware

  // List tickets
  fastify.get('/tickets', async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }

    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    
    try {
      let result;
      
      if (user.rookRole === 'admin' || user.rookRole === 'agent') {
        // Admin/agent can see all
        result = await pool.query(`
          SELECT id, type, status, priority, requester_user_id, assignee_user_id, 
                 device_id, title, description, breach_at, created_at, updated_at
          FROM sigurd.tickets
          WHERE organization_id = $1
          ORDER BY created_at DESC
          LIMIT 100
        `, [organizationId]);
      } else {
        // Users see only their own
        result = await pool.query(`
          SELECT id, type, status, priority, requester_user_id, assignee_user_id, 
                 device_id, title, description, breach_at, created_at, updated_at
          FROM sigurd.tickets
          WHERE requester_user_id = $1
          AND organization_id = $2
          ORDER BY created_at DESC
          LIMIT 100
        `, [user.userId, organizationId]);
      }

      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch tickets');
      return reply.code(500).send({ error: 'Failed to fetch tickets', details: error.message });
    }
  });

  // Get ticket by ID
  fastify.get('/tickets/:id', async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { id } = request.params as { id: string };

    try {
      const result = await pool.query(`
        SELECT id, type, status, priority, requester_user_id, assignee_user_id, 
               device_id, title, description, breach_at, created_at, updated_at
        FROM sigurd.tickets
        WHERE id = $1 AND organization_id = $2
        LIMIT 1
      `, [id, organizationId]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Ticket');
      }

      const ticket = result.rows[0];

      // Check access
      if (!canAccessResource(user, ticket.requester_user_id) && 
          !canAccessResource(user, ticket.assignee_user_id) &&
          user.rookRole !== 'admin' && user.rookRole !== 'agent') {
        throw new ForbiddenError();
      }

      return reply.send(ticket);
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      request.log.error(error, 'Failed to fetch ticket');
      return reply.code(500).send({ error: 'Failed to fetch ticket', details: error.message });
    }
  });

  // Create ticket
  fastify.post('/tickets', {
    preHandler: validateRequest(createTicketSchema),
  }, async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { body } = (request as any).validated;

    try {
      // Calculate breach time based on priority
      const breachAt = new Date();
      const hours = body.priority === 'high' ? 4 : body.priority === 'medium' ? 8 : 24;
      breachAt.setHours(breachAt.getHours() + hours);

      const result = await pool.query(`
        INSERT INTO sigurd.tickets (type, status, priority, requester_user_id, device_id, title, description, breach_at, organization_id)
        VALUES ($1, 'new', $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, type, status, priority, requester_user_id, assignee_user_id, 
                   device_id, title, description, breach_at, created_at, updated_at
      `, [
        body.type,
        body.priority,
        user.userId,
        body.deviceId || null,
        body.title,
        body.description,
        breachAt.toISOString(),
        organizationId,
      ]);

      return reply.code(201).send(result.rows[0]);
    } catch (error: any) {
      request.log.error(error, 'Failed to create ticket');
      return reply.code(500).send({ error: 'Failed to create ticket', details: error.message });
    }
  });

  // List incidents
  fastify.get('/incidents', async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    
    try {
      let result;
      
      if (user.rookRole === 'admin' || user.rookRole === 'agent') {
        result = await pool.query(`
          SELECT id, status, priority, requester_user_id, assignee_user_id,
                 device_id, title, description, impact, urgency,
                 breach_at, resolved_at, created_at, updated_at
          FROM sigurd.incidents
          WHERE organization_id = $1
          ORDER BY created_at DESC
          LIMIT 100
        `, [organizationId]);
      } else {
        result = await pool.query(`
          SELECT id, status, priority, requester_user_id, assignee_user_id,
                 device_id, title, description, impact, urgency,
                 breach_at, resolved_at, created_at, updated_at
          FROM sigurd.incidents
          WHERE requester_user_id = $1
          AND organization_id = $2
          ORDER BY created_at DESC
          LIMIT 100
        `, [user.userId, organizationId]);
      }

      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch incidents');
      return reply.code(500).send({ error: 'Failed to fetch incidents', details: error.message });
    }
  });

  // List service requests
  fastify.get('/service-requests', async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    
    try {
      let result;
      
      if (user.rookRole === 'admin' || user.rookRole === 'agent') {
        result = await pool.query(`
          SELECT id, status, priority, requester_user_id, assignee_user_id,
                 catalog_item_id, title, description, fulfillment_notes,
                 approved_by, approved_at, completed_at,
                 created_at, updated_at
          FROM sigurd.service_requests
          WHERE organization_id = $1
          ORDER BY created_at DESC
          LIMIT 100
        `, [organizationId]);
      } else {
        result = await pool.query(`
          SELECT id, status, priority, requester_user_id, assignee_user_id,
                 catalog_item_id, title, description, fulfillment_notes,
                 approved_by, approved_at, completed_at,
                 created_at, updated_at
          FROM sigurd.service_requests
          WHERE requester_user_id = $1
          AND organization_id = $2
          ORDER BY created_at DESC
          LIMIT 100
        `, [user.userId, organizationId]);
      }

      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch service requests');
      return reply.code(500).send({ error: 'Failed to fetch service requests', details: error.message });
    }
  });

  // Knowledge base articles
  fastify.get('/kb', async (request, reply) => {
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    try {
      const result = await pool.query(`
        SELECT id, title, body, tags, created_at, updated_at
        FROM sigurd.knowledge_articles
        WHERE organization_id = $1
        ORDER BY created_at DESC
        LIMIT 100
      `, [organizationId]);
      
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch knowledge articles');
      return reply.code(500).send({ error: 'Failed to fetch knowledge articles', details: error.message });
    }
  });

  // ============================================
  // INCIDENTS - Complete CRUD
  // ============================================

  // Get incident by ID
  fastify.get('/incidents/:id', async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { id } = request.params as { id: string };

    try {
      const result = await pool.query(`
        SELECT id, status, priority, requester_user_id, assignee_user_id, 
               device_id, title, description, impact, urgency, breach_at, 
               resolved_at, created_at, updated_at
        FROM sigurd.incidents
        WHERE id = $1 AND organization_id = $2
        LIMIT 1
      `, [id, organizationId]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Incident');
      }

      const incident = result.rows[0];

      // Check access
      if (!canAccessResource(user, incident.requester_user_id) && 
          !canAccessResource(user, incident.assignee_user_id) &&
          user.rookRole !== 'admin' && user.rookRole !== 'agent') {
        throw new ForbiddenError();
      }

      return reply.send(incident);
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      request.log.error(error, 'Failed to fetch incident');
      return reply.code(500).send({ error: 'Failed to fetch incident', details: error.message });
    }
  });

  // Create incident
  const createIncidentSchema = z.object({
    body: z.object({
      priority: z.enum(['low', 'medium', 'high', 'critical']),
      title: z.string().min(1),
      description: z.string().min(1),
      impact: z.string().optional(),
      urgency: z.string().optional(),
      deviceId: z.string().uuid().optional(),
      assigneeUserId: z.string().uuid().optional(),
    }),
  });

  fastify.post('/incidents', {
    preHandler: validateRequest(createIncidentSchema),
  }, async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { body } = (request as any).validated;

    try {
      // Calculate breach time based on priority
      const breachAt = new Date();
      const hours = body.priority === 'critical' ? 2 : body.priority === 'high' ? 4 : body.priority === 'medium' ? 8 : 24;
      breachAt.setHours(breachAt.getHours() + hours);

      const result = await pool.query(`
        INSERT INTO sigurd.incidents (status, priority, requester_user_id, assignee_user_id, device_id, title, description, impact, urgency, breach_at, organization_id)
        VALUES ('new', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, status, priority, requester_user_id, assignee_user_id, 
                   device_id, title, description, impact, urgency, breach_at, 
                   resolved_at, created_at, updated_at
      `, [
        body.priority,
        user.userId,
        body.assigneeUserId || null,
        body.deviceId || null,
        body.title,
        body.description,
        body.impact || null,
        body.urgency || null,
        breachAt.toISOString(),
        organizationId,
      ]);

      return reply.code(201).send(result.rows[0]);
    } catch (error: any) {
      request.log.error(error, 'Failed to create incident');
      return reply.code(500).send({ error: 'Failed to create incident', details: error.message });
    }
  });

  // Update incident
  const updateIncidentSchema = z.object({
    body: z.object({
      status: z.enum(['new', 'in_progress', 'waiting', 'resolved', 'closed']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      assigneeUserId: z.string().uuid().optional().nullable(),
      impact: z.string().optional().nullable(),
      urgency: z.string().optional().nullable(),
      resolvedAt: z.string().optional().nullable(),
    }),
  });

  fastify.patch('/incidents/:id', {
    preHandler: validateRequest(updateIncidentSchema),
  }, async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { id } = request.params as { id: string };
    const { body } = (request as any).validated;

    try {
      // Check if incident exists and user has access
      const checkResult = await pool.query(`
        SELECT requester_user_id, assignee_user_id, organization_id 
        FROM sigurd.incidents 
        WHERE id = $1
      `, [id]);

      if (checkResult.rows.length === 0) {
        throw new NotFoundError('Incident');
      }

      const incident = checkResult.rows[0];
      if (incident.organization_id !== organizationId) {
        throw new ForbiddenError();
      }

      if (!canAccessResource(user, incident.requester_user_id) && 
          !canAccessResource(user, incident.assignee_user_id) &&
          user.rookRole !== 'admin' && user.rookRole !== 'agent') {
        throw new ForbiddenError();
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (body.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(body.status);
        if (body.status === 'resolved' && !body.resolvedAt) {
          updates.push(`resolved_at = $${paramCount++}`);
          values.push(new Date().toISOString());
        }
      }
      if (body.priority !== undefined) {
        updates.push(`priority = $${paramCount++}`);
        values.push(body.priority);
      }
      if (body.assigneeUserId !== undefined) {
        updates.push(`assignee_user_id = $${paramCount++}`);
        values.push(body.assigneeUserId);
      }
      if (body.impact !== undefined) {
        updates.push(`impact = $${paramCount++}`);
        values.push(body.impact);
      }
      if (body.urgency !== undefined) {
        updates.push(`urgency = $${paramCount++}`);
        values.push(body.urgency);
      }
      if (body.resolvedAt !== undefined) {
        updates.push(`resolved_at = $${paramCount++}`);
        values.push(body.resolvedAt);
      }

      if (updates.length === 0) {
        return reply.code(400).send({ error: 'No fields to update' });
      }

      updates.push(`updated_at = now()`);
      values.push(id);
      values.push(organizationId);

      const result = await pool.query(`
        UPDATE sigurd.incidents
        SET ${updates.join(', ')}
        WHERE id = $${paramCount} AND organization_id = $${paramCount + 1}
        RETURNING id, status, priority, requester_user_id, assignee_user_id, 
                   device_id, title, description, impact, urgency, breach_at, 
                   resolved_at, created_at, updated_at
      `, values);

      return reply.send(result.rows[0]);
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      request.log.error(error, 'Failed to update incident');
      return reply.code(500).send({ error: 'Failed to update incident', details: error.message });
    }
  });

  // ============================================
  // SERVICE REQUESTS - Complete CRUD
  // ============================================

  // Get service request by ID
  fastify.get('/service-requests/:id', async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { id } = request.params as { id: string };

    try {
      const result = await pool.query(`
        SELECT id, status, priority, requester_user_id, assignee_user_id, 
               catalog_item_id, title, description, fulfillment_notes, 
               approved_by, approved_at, completed_at, created_at, updated_at
        FROM sigurd.service_requests
        WHERE id = $1 AND organization_id = $2
        LIMIT 1
      `, [id, organizationId]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Service Request');
      }

      const request_ = result.rows[0];

      // Check access
      if (!canAccessResource(user, request_.requester_user_id) && 
          !canAccessResource(user, request_.assignee_user_id) &&
          user.rookRole !== 'admin' && user.rookRole !== 'agent') {
        throw new ForbiddenError();
      }

      return reply.send(request_);
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      request.log.error(error, 'Failed to fetch service request');
      return reply.code(500).send({ error: 'Failed to fetch service request', details: error.message });
    }
  });

  // Create service request
  const createServiceRequestSchema = z.object({
    body: z.object({
      priority: z.enum(['low', 'medium', 'high', 'critical']),
      title: z.string().min(1),
      description: z.string().min(1),
      catalogItemId: z.string().uuid().optional(),
      assigneeUserId: z.string().uuid().optional(),
    }),
  });

  fastify.post('/service-requests', {
    preHandler: validateRequest(createServiceRequestSchema),
  }, async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { body } = (request as any).validated;

    try {
      const result = await pool.query(`
        INSERT INTO sigurd.service_requests (status, priority, requester_user_id, assignee_user_id, catalog_item_id, title, description, organization_id)
        VALUES ('new', $1, $2, $3, $4, $5, $6, $7)
        RETURNING id, status, priority, requester_user_id, assignee_user_id, 
                   catalog_item_id, title, description, fulfillment_notes, 
                   approved_by, approved_at, completed_at, created_at, updated_at
      `, [
        body.priority,
        user.userId,
        body.assigneeUserId || null,
        body.catalogItemId || null,
        body.title,
        body.description,
        organizationId,
      ]);

      return reply.code(201).send(result.rows[0]);
    } catch (error: any) {
      request.log.error(error, 'Failed to create service request');
      return reply.code(500).send({ error: 'Failed to create service request', details: error.message });
    }
  });

  // Update service request
  const updateServiceRequestSchema = z.object({
    body: z.object({
      status: z.enum(['new', 'in_progress', 'waiting', 'resolved', 'closed']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      assigneeUserId: z.string().uuid().optional().nullable(),
      fulfillmentNotes: z.string().optional().nullable(),
      completedAt: z.string().optional().nullable(),
    }),
  });

  fastify.patch('/service-requests/:id', {
    preHandler: validateRequest(updateServiceRequestSchema),
  }, async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { id } = request.params as { id: string };
    const { body } = (request as any).validated;

    try {
      // Check if service request exists and user has access
      const checkResult = await pool.query(`
        SELECT requester_user_id, assignee_user_id, organization_id 
        FROM sigurd.service_requests 
        WHERE id = $1
      `, [id]);

      if (checkResult.rows.length === 0) {
        throw new NotFoundError('Service Request');
      }

      const request_ = checkResult.rows[0];
      if (request_.organization_id !== organizationId) {
        throw new ForbiddenError();
      }
      if (!canAccessResource(user, request_.requester_user_id) && 
          !canAccessResource(user, request_.assignee_user_id) &&
          user.rookRole !== 'admin' && user.rookRole !== 'agent') {
        throw new ForbiddenError();
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (body.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(body.status);
      }
      if (body.priority !== undefined) {
        updates.push(`priority = $${paramCount++}`);
        values.push(body.priority);
      }
      if (body.assigneeUserId !== undefined) {
        updates.push(`assignee_user_id = $${paramCount++}`);
        values.push(body.assigneeUserId);
      }
      if (body.fulfillmentNotes !== undefined) {
        updates.push(`fulfillment_notes = $${paramCount++}`);
        values.push(body.fulfillmentNotes);
      }
      if (body.completedAt !== undefined) {
        updates.push(`completed_at = $${paramCount++}`);
        values.push(body.completedAt);
      }

      if (updates.length === 0) {
        return reply.code(400).send({ error: 'No fields to update' });
      }

      updates.push(`updated_at = now()`);
      values.push(id);
      values.push(organizationId);

      const result = await pool.query(`
        UPDATE sigurd.service_requests
        SET ${updates.join(', ')}
        WHERE id = $${paramCount} AND organization_id = $${paramCount + 1}
        RETURNING id, status, priority, requester_user_id, assignee_user_id, 
                   catalog_item_id, title, description, fulfillment_notes, 
                   approved_by, approved_at, completed_at, created_at, updated_at
      `, values);

      return reply.send(result.rows[0]);
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      request.log.error(error, 'Failed to update service request');
      return reply.code(500).send({ error: 'Failed to update service request', details: error.message });
    }
  });

  // Approve service request
  fastify.post('/service-requests/:id/approve', async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { id } = request.params as { id: string };

    // Only admin/agent can approve
    if (user.rookRole !== 'admin' && user.rookRole !== 'agent') {
      throw new ForbiddenError();
    }

    try {
      const result = await pool.query(`
        UPDATE sigurd.service_requests
        SET approved_by = $1, approved_at = now(), updated_at = now()
        WHERE id = $2 AND organization_id = $3
        RETURNING id, status, priority, requester_user_id, assignee_user_id, 
                   catalog_item_id, title, description, fulfillment_notes, 
                   approved_by, approved_at, completed_at, created_at, updated_at
      `, [user.userId, id, organizationId]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Service Request');
      }

      return reply.send(result.rows[0]);
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      request.log.error(error, 'Failed to approve service request');
      return reply.code(500).send({ error: 'Failed to approve service request', details: error.message });
    }
  });

  // ============================================
  // PROBLEMS - Complete CRUD
  // ============================================

  // List problems
  fastify.get('/problems', async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    
    try {
      let result;
      
      if (user.rookRole === 'admin' || user.rookRole === 'agent') {
        result = await pool.query(`
          SELECT id, status, priority, assigned_user_id, title, description, 
                 root_cause, workaround, resolution, related_incidents, 
                 created_at, updated_at
          FROM sigurd.problems
          WHERE organization_id = $1
          ORDER BY created_at DESC
          LIMIT 100
        `, [organizationId]);
      } else {
        // Users can see problems they're assigned to (if any)
        result = await pool.query(`
          SELECT id, status, priority, assigned_user_id, title, description, 
                 root_cause, workaround, resolution, related_incidents, 
                 created_at, updated_at
          FROM sigurd.problems
          WHERE assigned_user_id = $1
          AND organization_id = $2
          ORDER BY created_at DESC
          LIMIT 100
        `, [user.userId, organizationId]);
      }

      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch problems');
      return reply.code(500).send({ error: 'Failed to fetch problems', details: error.message });
    }
  });

  // Get problem by ID
  fastify.get('/problems/:id', async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { id } = request.params as { id: string };

    try {
      const result = await pool.query(`
        SELECT id, status, priority, assigned_user_id, title, description, 
               root_cause, workaround, resolution, related_incidents, 
               created_at, updated_at
        FROM sigurd.problems
        WHERE id = $1 AND organization_id = $2
        LIMIT 1
      `, [id, organizationId]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Problem');
      }

      const problem = result.rows[0];

      // Check access - admin/agent can see all, users can see assigned problems
      if (user.rookRole !== 'admin' && user.rookRole !== 'agent' && 
          problem.assigned_user_id !== user.userId) {
        throw new ForbiddenError();
      }

      return reply.send(problem);
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      request.log.error(error, 'Failed to fetch problem');
      return reply.code(500).send({ error: 'Failed to fetch problem', details: error.message });
    }
  });

  // Create problem
  const createProblemSchema = z.object({
    body: z.object({
      priority: z.enum(['low', 'medium', 'high', 'critical']),
      title: z.string().min(1),
      description: z.string().min(1),
      assignedUserId: z.string().uuid().optional(),
      relatedIncidents: z.array(z.string().uuid()).optional(),
    }),
  });

  fastify.post('/problems', {
    preHandler: validateRequest(createProblemSchema),
  }, async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { body } = (request as any).validated;

    try {
      const result = await pool.query(`
        INSERT INTO sigurd.problems (status, priority, assigned_user_id, title, description, related_incidents, organization_id)
        VALUES ('new', $1, $2, $3, $4, $5, $6)
        RETURNING id, status, priority, assigned_user_id, title, description, 
                   root_cause, workaround, resolution, related_incidents, 
                   created_at, updated_at
      `, [
        body.priority,
        body.assignedUserId || null,
        body.title,
        body.description,
        body.relatedIncidents || [],
        organizationId,
      ]);

      return reply.code(201).send(result.rows[0]);
    } catch (error: any) {
      request.log.error(error, 'Failed to create problem');
      return reply.code(500).send({ error: 'Failed to create problem', details: error.message });
    }
  });

  // Update problem
  const updateProblemSchema = z.object({
    body: z.object({
      status: z.enum(['new', 'in_progress', 'waiting', 'resolved', 'closed']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      assignedUserId: z.string().uuid().optional().nullable(),
      rootCause: z.string().optional().nullable(),
      workaround: z.string().optional().nullable(),
      resolution: z.string().optional().nullable(),
      relatedIncidents: z.array(z.string().uuid()).optional(),
    }),
  });

  fastify.patch('/problems/:id', {
    preHandler: validateRequest(updateProblemSchema),
  }, async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { id } = request.params as { id: string };
    const { body } = (request as any).validated;

    try {
      // Check if problem exists and user has access
      const checkResult = await pool.query(`
        SELECT assigned_user_id, organization_id 
        FROM sigurd.problems 
        WHERE id = $1
      `, [id]);

      if (checkResult.rows.length === 0) {
        throw new NotFoundError('Problem');
      }

      const problem = checkResult.rows[0];
      if (problem.organization_id !== organizationId) {
        throw new ForbiddenError();
      }
      if (user.rookRole !== 'admin' && user.rookRole !== 'agent' && 
          problem.assigned_user_id !== user.userId) {
        throw new ForbiddenError();
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (body.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(body.status);
      }
      if (body.priority !== undefined) {
        updates.push(`priority = $${paramCount++}`);
        values.push(body.priority);
      }
      if (body.assignedUserId !== undefined) {
        updates.push(`assigned_user_id = $${paramCount++}`);
        values.push(body.assignedUserId);
      }
      if (body.rootCause !== undefined) {
        updates.push(`root_cause = $${paramCount++}`);
        values.push(body.rootCause);
      }
      if (body.workaround !== undefined) {
        updates.push(`workaround = $${paramCount++}`);
        values.push(body.workaround);
      }
      if (body.resolution !== undefined) {
        updates.push(`resolution = $${paramCount++}`);
        values.push(body.resolution);
      }
      if (body.relatedIncidents !== undefined) {
        updates.push(`related_incidents = $${paramCount++}`);
        values.push(body.relatedIncidents);
      }

      if (updates.length === 0) {
        return reply.code(400).send({ error: 'No fields to update' });
      }

      updates.push(`updated_at = now()`);
      values.push(id);
      values.push(organizationId);

      const result = await pool.query(`
        UPDATE sigurd.problems
        SET ${updates.join(', ')}
        WHERE id = $${paramCount} AND organization_id = $${paramCount + 1}
        RETURNING id, status, priority, assigned_user_id, title, description, 
                   root_cause, workaround, resolution, related_incidents, 
                   created_at, updated_at
      `, values);

      return reply.send(result.rows[0]);
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      request.log.error(error, 'Failed to update problem');
      return reply.code(500).send({ error: 'Failed to update problem', details: error.message });
    }
  });

  // ============================================
  // CHANGES - Complete CRUD
  // ============================================

  // List changes
  fastify.get('/changes', async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    
    try {
      let result;
      
      if (user.rookRole === 'admin' || user.rookRole === 'agent') {
        result = await pool.query(`
          SELECT id, status, risk, requester_user_id, assigned_user_id, title, description, 
                 reason, impact_analysis, rollback_plan, approved_by, approved_at, 
                 scheduled_start, scheduled_end, completed_at, created_at, updated_at
          FROM sigurd.changes
          WHERE organization_id = $1
          ORDER BY created_at DESC
          LIMIT 100
        `, [organizationId]);
      } else {
        result = await pool.query(`
          SELECT id, status, risk, requester_user_id, assigned_user_id, title, description, 
                 reason, impact_analysis, rollback_plan, approved_by, approved_at, 
                 scheduled_start, scheduled_end, completed_at, created_at, updated_at
          FROM sigurd.changes
          WHERE organization_id = $2
          AND (requester_user_id = $1 OR assigned_user_id = $1)
          ORDER BY created_at DESC
          LIMIT 100
        `, [user.userId, organizationId]);
      }

      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch changes');
      return reply.code(500).send({ error: 'Failed to fetch changes', details: error.message });
    }
  });

  // Get change by ID
  fastify.get('/changes/:id', async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { id } = request.params as { id: string };

    try {
      const result = await pool.query(`
        SELECT id, status, risk, requester_user_id, assigned_user_id, title, description, 
               reason, impact_analysis, rollback_plan, approved_by, approved_at, 
               scheduled_start, scheduled_end, completed_at, created_at, updated_at
        FROM sigurd.changes
        WHERE id = $1 AND organization_id = $2
        LIMIT 1
      `, [id, organizationId]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Change');
      }

      const change = result.rows[0];

      // Check access
      if (!canAccessResource(user, change.requester_user_id) && 
          !canAccessResource(user, change.assigned_user_id) &&
          user.rookRole !== 'admin' && user.rookRole !== 'agent') {
        throw new ForbiddenError();
      }

      return reply.send(change);
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      request.log.error(error, 'Failed to fetch change');
      return reply.code(500).send({ error: 'Failed to fetch change', details: error.message });
    }
  });

  // Create change
  const createChangeSchema = z.object({
    body: z.object({
      risk: z.enum(['low', 'medium', 'high']),
      title: z.string().min(1),
      description: z.string().min(1),
      reason: z.string().min(1),
      impactAnalysis: z.string().optional(),
      rollbackPlan: z.string().optional(),
      assignedUserId: z.string().uuid().optional(),
      scheduledStart: z.string().optional(),
      scheduledEnd: z.string().optional(),
    }),
  });

  fastify.post('/changes', {
    preHandler: validateRequest(createChangeSchema),
  }, async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { body } = (request as any).validated;

    try {
      const result = await pool.query(`
        INSERT INTO sigurd.changes (status, risk, requester_user_id, assigned_user_id, title, description, reason, impact_analysis, rollback_plan, scheduled_start, scheduled_end, organization_id)
        VALUES ('draft', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, status, risk, requester_user_id, assigned_user_id, title, description, 
                   reason, impact_analysis, rollback_plan, approved_by, approved_at, 
                   scheduled_start, scheduled_end, completed_at, created_at, updated_at
      `, [
        body.risk,
        user.userId,
        body.assignedUserId || null,
        body.title,
        body.description,
        body.reason,
        body.impactAnalysis || null,
        body.rollbackPlan || null,
        body.scheduledStart || null,
        body.scheduledEnd || null,
        organizationId,
      ]);

      return reply.code(201).send(result.rows[0]);
    } catch (error: any) {
      request.log.error(error, 'Failed to create change');
      return reply.code(500).send({ error: 'Failed to create change', details: error.message });
    }
  });

  // Update change
  const updateChangeSchema = z.object({
    body: z.object({
      status: z.enum(['draft', 'pending_approval', 'approved', 'scheduled', 'in_progress', 'completed', 'failed', 'cancelled']).optional(),
      risk: z.enum(['low', 'medium', 'high']).optional(),
      assignedUserId: z.string().uuid().optional().nullable(),
      impactAnalysis: z.string().optional().nullable(),
      rollbackPlan: z.string().optional().nullable(),
      scheduledStart: z.string().optional().nullable(),
      scheduledEnd: z.string().optional().nullable(),
      completedAt: z.string().optional().nullable(),
    }),
  });

  fastify.patch('/changes/:id', {
    preHandler: validateRequest(updateChangeSchema),
  }, async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { id } = request.params as { id: string };
    const { body } = (request as any).validated;

    try {
      // Check if change exists and user has access
      const checkResult = await pool.query(`
        SELECT requester_user_id, assigned_user_id, status, organization_id 
        FROM sigurd.changes 
        WHERE id = $1
      `, [id]);

      if (checkResult.rows.length === 0) {
        throw new NotFoundError('Change');
      }

      const change = checkResult.rows[0];
      if (change.organization_id !== organizationId) {
        throw new ForbiddenError();
      }
      if (!canAccessResource(user, change.requester_user_id) && 
          !canAccessResource(user, change.assigned_user_id) &&
          user.rookRole !== 'admin' && user.rookRole !== 'agent') {
        throw new ForbiddenError();
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (body.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(body.status);
      }
      if (body.risk !== undefined) {
        updates.push(`risk = $${paramCount++}`);
        values.push(body.risk);
      }
      if (body.assignedUserId !== undefined) {
        updates.push(`assigned_user_id = $${paramCount++}`);
        values.push(body.assignedUserId);
      }
      if (body.impactAnalysis !== undefined) {
        updates.push(`impact_analysis = $${paramCount++}`);
        values.push(body.impactAnalysis);
      }
      if (body.rollbackPlan !== undefined) {
        updates.push(`rollback_plan = $${paramCount++}`);
        values.push(body.rollbackPlan);
      }
      if (body.scheduledStart !== undefined) {
        updates.push(`scheduled_start = $${paramCount++}`);
        values.push(body.scheduledStart);
      }
      if (body.scheduledEnd !== undefined) {
        updates.push(`scheduled_end = $${paramCount++}`);
        values.push(body.scheduledEnd);
      }
      if (body.completedAt !== undefined) {
        updates.push(`completed_at = $${paramCount++}`);
        values.push(body.completedAt);
      }

      if (updates.length === 0) {
        return reply.code(400).send({ error: 'No fields to update' });
      }

      updates.push(`updated_at = now()`);
      values.push(id);
      values.push(organizationId);

      const result = await pool.query(`
        UPDATE sigurd.changes
        SET ${updates.join(', ')}
        WHERE id = $${paramCount} AND organization_id = $${paramCount + 1}
        RETURNING id, status, risk, requester_user_id, assigned_user_id, title, description, 
                   reason, impact_analysis, rollback_plan, approved_by, approved_at, 
                   scheduled_start, scheduled_end, completed_at, created_at, updated_at
      `, values);

      return reply.send(result.rows[0]);
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      request.log.error(error, 'Failed to update change');
      return reply.code(500).send({ error: 'Failed to update change', details: error.message });
    }
  });

  // Approve change
  fastify.post('/changes/:id/approve', async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { id } = request.params as { id: string };

    // Only admin can approve changes
    if (user.rookRole !== 'admin') {
      throw new ForbiddenError();
    }

    try {
      const result = await pool.query(`
        UPDATE sigurd.changes
        SET approved_by = $1, approved_at = now(), status = CASE 
          WHEN scheduled_start IS NOT NULL THEN 'scheduled'
          ELSE 'approved'
        END, updated_at = now()
        WHERE id = $2 AND organization_id = $3
        RETURNING id, status, risk, requester_user_id, assigned_user_id, title, description, 
                   reason, impact_analysis, rollback_plan, approved_by, approved_at, 
                   scheduled_start, scheduled_end, completed_at, created_at, updated_at
      `, [user.userId, id, organizationId]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Change');
      }

      return reply.send(result.rows[0]);
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      request.log.error(error, 'Failed to approve change');
      return reply.code(500).send({ error: 'Failed to approve change', details: error.message });
    }
  });

  // ============================================
  // UNIFIED ENDPOINTS - Work for all ticket types
  // ============================================

  const fetchTicketComments = async (normalizedType: string, ticketId: string, organizationId: string) => {
    try {
      const result = await pool.query(`
        SELECT id, ticket_type, ticket_id, author_user_id, body, mentions, created_at
        FROM sigurd.ticket_comments
        WHERE ticket_type = $1 AND ticket_id = $2 AND organization_id = $3
        ORDER BY created_at ASC
      `, [normalizedType, ticketId, organizationId]);

      return result.rows;
    } catch (error: any) {
      if (error?.code === '42P01') {
        const legacyResult = await pool.query(`
          SELECT id, ticket_id, author_user_id, body, created_at
          FROM sigurd.comments
          WHERE ticket_id = $1 AND organization_id = $2
          ORDER BY created_at ASC
        `, [ticketId, organizationId]);

        return legacyResult.rows.map((row) => ({
          id: row.id,
          ticket_type: normalizedType,
          ticket_id: row.ticket_id,
          author_user_id: row.author_user_id,
          body: row.body,
          mentions: [],
          created_at: row.created_at,
        }));
      }

      if (error?.code === '42703') {
        const fallback = await pool.query(`
          SELECT id, ticket_type, ticket_id, author_user_id, body, created_at
          FROM sigurd.ticket_comments
          WHERE ticket_type = $1 AND ticket_id = $2 AND organization_id = $3
          ORDER BY created_at ASC
        `, [normalizedType, ticketId, organizationId]);

        return fallback.rows.map((row) => ({
          ...row,
          mentions: [],
        }));
      }

      throw error;
    }
  };

  const insertTicketComment = async (
    normalizedType: string,
    ticketId: string,
    organizationId: string,
    authorUserId: string,
    body: string,
    mentions: string[] | undefined,
  ) => {
    try {
      const result = await pool.query(`
        INSERT INTO sigurd.ticket_comments (ticket_type, ticket_id, organization_id, author_user_id, body, mentions)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, ticket_type, ticket_id, author_user_id, body, mentions, created_at
      `, [normalizedType, ticketId, organizationId, authorUserId, body, JSON.stringify(mentions || [])]);

      return result.rows[0];
    } catch (error: any) {
      if (error?.code === '42P01') {
        const legacyInsert = await pool.query(`
          INSERT INTO sigurd.comments (ticket_id, organization_id, author_user_id, body)
          VALUES ($1, $2, $3, $4)
          RETURNING id, ticket_id, author_user_id, body, created_at
        `, [ticketId, organizationId, authorUserId, body]);

        const row = legacyInsert.rows[0];
        return {
          id: row.id,
          ticket_type: normalizedType,
          ticket_id: row.ticket_id,
          author_user_id: row.author_user_id,
          body: row.body,
          mentions: [],
          created_at: row.created_at,
        };
      }

      if (error?.code === '42703') {
        const fallbackInsert = await pool.query(`
          INSERT INTO sigurd.ticket_comments (ticket_type, ticket_id, organization_id, author_user_id, body)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, ticket_type, ticket_id, author_user_id, body, created_at
        `, [normalizedType, ticketId, organizationId, authorUserId, body]);

        const row = fallbackInsert.rows[0];
        return {
          ...row,
          mentions: [],
        };
      }

      throw error;
    }
  };

  // List comments for any ticket type
  fastify.get('/:ticket_type/:id/comments', async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { ticket_type, id } = request.params as { ticket_type: string; id: string };

    // Validate ticket type
    const validTypes = ['incidents', 'service-requests', 'problems', 'changes'];
    const normalizedType = ticket_type === 'incidents' ? 'incident' :
                          ticket_type === 'service-requests' ? 'service_request' :
                          ticket_type === 'problems' ? 'problem' :
                          ticket_type === 'changes' ? 'change' : null;

    if (!normalizedType || !validTypes.includes(ticket_type)) {
      return reply.code(400).send({ error: 'Invalid ticket type' });
    }

    try {
      const comments = await fetchTicketComments(normalizedType, id, organizationId);

      return reply.send(comments);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch comments');
      return reply.code(500).send({ error: 'Failed to fetch comments', details: error.message });
    }
  });

  // Create comment with @mentions
  const createCommentSchema = z.object({
    body: z.object({
      body: z.string().min(1),
      mentions: z.array(z.string().uuid()).optional(),
    }),
  });

  fastify.post('/:ticket_type/:id/comments', {
    preHandler: validateRequest(createCommentSchema),
  }, async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { ticket_type, id } = request.params as { ticket_type: string; id: string };
    const { body } = (request as any).validated;

    // Validate ticket type
    const validTypes = ['incidents', 'service-requests', 'problems', 'changes'];
    const normalizedType = ticket_type === 'incidents' ? 'incident' :
                          ticket_type === 'service-requests' ? 'service_request' :
                          ticket_type === 'problems' ? 'problem' :
                          ticket_type === 'changes' ? 'change' : null;

    if (!normalizedType || !validTypes.includes(ticket_type)) {
      return reply.code(400).send({ error: 'Invalid ticket type' });
    }

    try {
      // Verify ticket exists (basic check)
      const ticketCheck = await pool.query(`
        SELECT id FROM sigurd.${normalizedType === 'service_request' ? 'service_requests' : normalizedType + 's'}
        WHERE id = $1 AND organization_id = $2
      `, [id, organizationId]);

      if (ticketCheck.rows.length === 0) {
        throw new NotFoundError(normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1));
      }

      const comment = await insertTicketComment(
        normalizedType,
        id,
        organizationId,
        user.userId,
        body.body,
        body.mentions,
      );

      return reply.code(201).send(comment);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      request.log.error(error, 'Failed to create comment');
      return reply.code(500).send({ error: 'Failed to create comment', details: error.message });
    }
  });

  // List attachments for any ticket type
  fastify.get('/:ticket_type/:id/attachments', async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { ticket_type, id } = request.params as { ticket_type: string; id: string };

    // Validate ticket type
    const validTypes = ['incidents', 'service-requests', 'problems', 'changes'];
    const normalizedType = ticket_type === 'incidents' ? 'incident' :
                          ticket_type === 'service-requests' ? 'service_request' :
                          ticket_type === 'problems' ? 'problem' :
                          ticket_type === 'changes' ? 'change' : null;

    if (!normalizedType || !validTypes.includes(ticket_type)) {
      return reply.code(400).send({ error: 'Invalid ticket type' });
    }

    try {
      const result = await pool.query(`
        SELECT id, ticket_type, ticket_id, file_name, file_path, file_size, mime_type, uploaded_by, created_at
        FROM sigurd.attachments
        WHERE ticket_type = $1 AND ticket_id = $2 AND organization_id = $3
        ORDER BY created_at DESC
      `, [normalizedType, id, organizationId]);

      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch attachments');
      return reply.code(500).send({ error: 'Failed to fetch attachments', details: error.message });
    }
  });

  // Upload attachment for any ticket type
  fastify.post('/:ticket_type/:id/attachments', async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { ticket_type, id } = request.params as { ticket_type: string; id: string };

    // Validate ticket type
    const validTypes = ['incidents', 'service-requests', 'problems', 'changes'];
    const normalizedType = ticket_type === 'incidents' ? 'incident' :
                          ticket_type === 'service-requests' ? 'service_request' :
                          ticket_type === 'problems' ? 'problem' :
                          ticket_type === 'changes' ? 'change' : null;

    if (!normalizedType || !validTypes.includes(ticket_type)) {
      return reply.code(400).send({ error: 'Invalid ticket type' });
    }

    try {
      // Verify ticket exists
      const ticketCheck = await pool.query(`
        SELECT id FROM sigurd.${normalizedType === 'service_request' ? 'service_requests' : normalizedType + 's'}
        WHERE id = $1 AND organization_id = $2
      `, [id, organizationId]);

      if (ticketCheck.rows.length === 0) {
        throw new NotFoundError(normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1));
      }

      // Handle file upload - expect multipart/form-data with 'file' field
      // For now, accept base64 or direct buffer in request body
      // In production, install @fastify/multipart for proper multipart handling
      const contentType = request.headers['content-type'] || '';
      
      if (!contentType.includes('multipart/form-data') && !contentType.includes('application/json')) {
        return reply.code(400).send({ error: 'Content-Type must be multipart/form-data or application/json' });
      }

      let fileBuffer: Buffer;
      let fileName: string;
      let mimeType: string;
      let fileSize: number;

      if (contentType.includes('application/json')) {
        // Handle JSON with base64 file
        const body = request.body as any;
        if (!body.file || !body.fileName) {
          return reply.code(400).send({ error: 'File data and fileName required in JSON body' });
        }
        
        fileBuffer = Buffer.from(body.file, 'base64');
        fileName = body.fileName;
        mimeType = body.mimeType || 'application/octet-stream';
        fileSize = fileBuffer.length;
      } else {
        // Handle multipart (simplified - in production use @fastify/multipart)
        return reply.code(501).send({ error: 'Multipart uploads require @fastify/multipart plugin. Please use JSON with base64 file data for now.' });
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileSize > maxSize) {
        return reply.code(400).send({ error: 'File too large. Maximum size is 10MB' });
      }
      
      // Save file
      const fileResult = await saveFile(
        fileBuffer,
        fileName,
        mimeType,
        id
      );

      // Store attachment metadata in database
      const result = await pool.query(`
        INSERT INTO sigurd.attachments (ticket_type, ticket_id, organization_id, file_name, file_path, file_size, mime_type, uploaded_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, ticket_type, ticket_id, file_name, file_path, file_size, mime_type, uploaded_by, created_at
      `, [
        normalizedType,
        id,
        organizationId,
        fileResult.fileName,
        fileResult.filePath,
        fileResult.fileSize.toString(),
        fileResult.mimeType,
        user.userId,
      ]);

      return reply.code(201).send(result.rows[0]);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      request.log.error(error, 'Failed to upload attachment');
      return reply.code(500).send({ error: 'Failed to upload attachment', details: error.message });
    }
  });

  // Download attachment
  fastify.get('/:ticket_type/:id/attachments/:attachmentId', async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { ticket_type, id, attachmentId } = request.params as { ticket_type: string; id: string; attachmentId: string };

    // Validate ticket type
    const validTypes = ['incidents', 'service-requests', 'problems', 'changes'];
    const normalizedType = ticket_type === 'incidents' ? 'incident' :
                          ticket_type === 'service-requests' ? 'service_request' :
                          ticket_type === 'problems' ? 'problem' :
                          ticket_type === 'changes' ? 'change' : null;

    if (!normalizedType || !validTypes.includes(ticket_type)) {
      return reply.code(400).send({ error: 'Invalid ticket type' });
    }

    try {
      // Get attachment metadata
      const result = await pool.query(`
        SELECT id, ticket_type, ticket_id, file_name, file_path, file_size, mime_type, uploaded_by
        FROM sigurd.attachments
        WHERE id = $1 AND ticket_type = $2 AND ticket_id = $3 AND organization_id = $4
        LIMIT 1
      `, [attachmentId, normalizedType, id, organizationId]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Attachment');
      }

      const attachment = result.rows[0];

      // Read file from disk
      const fileBuffer = await getFile(attachment.file_path);

      // Set headers for file download
      reply.header('Content-Type', attachment.mime_type);
      reply.header('Content-Disposition', `attachment; filename="${attachment.file_name}"`);
      reply.header('Content-Length', fileBuffer.length);

      return reply.send(fileBuffer);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      request.log.error(error, 'Failed to download attachment');
      return reply.code(500).send({ error: 'Failed to download attachment', details: error.message });
    }
  });

  // Get timeline/history for any ticket type
  fastify.get('/:ticket_type/:id/history', async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { ticket_type, id } = request.params as { ticket_type: string; id: string };

    // Validate ticket type
    const validTypes = ['incidents', 'service-requests', 'problems', 'changes'];
    const normalizedType = ticket_type === 'incidents' ? 'incident' :
                          ticket_type === 'service-requests' ? 'service_request' :
                          ticket_type === 'problems' ? 'problem' :
                          ticket_type === 'changes' ? 'change' : null;

    if (!normalizedType || !validTypes.includes(ticket_type)) {
      return reply.code(400).send({ error: 'Invalid ticket type' });
    }

    try {
      const result = await pool.query(`
        SELECT id, ticket_type, ticket_id, user_id, action, field_name, old_value, new_value, created_at
        FROM sigurd.sigurd_ticket_history
        WHERE ticket_type = $1 AND ticket_id = $2 AND organization_id = $3
        ORDER BY created_at ASC
      `, [normalizedType, id, organizationId]);

      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch ticket history');
      return reply.code(500).send({ error: 'Failed to fetch ticket history', details: error.message });
    }
  });

  // ============================================
  // CATALOG ENDPOINTS
  // ============================================

  // List catalog items
  fastify.get('/catalog', async (request, reply) => {
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    try {
      const result = await pool.query(`
        SELECT id, name, description, category, form_schema, created_at
        FROM sigurd.service_catalog_items
        WHERE organization_id = $1
        ORDER BY category, name
      `, [organizationId]);
      
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch catalog items');
      return reply.code(500).send({ error: 'Failed to fetch catalog items', details: error.message });
    }
  });

  // Get catalog item by ID
  fastify.get('/catalog/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }

    try {
      const result = await pool.query(`
        SELECT id, name, description, category, form_schema, created_at
        FROM sigurd.service_catalog_items
        WHERE id = $1 AND organization_id = $2
        LIMIT 1
      `, [id, organizationId]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Catalog Item');
      }

      return reply.send(result.rows[0]);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      request.log.error(error, 'Failed to fetch catalog item');
      return reply.code(500).send({ error: 'Failed to fetch catalog item', details: error.message });
    }
  });

  // Create service request from catalog item
  const createRequestFromCatalogSchema = z.object({
    body: z.object({
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      formData: z.record(z.any()).optional(),
    }),
  });

  fastify.post('/catalog/:id/request', {
    preHandler: validateRequest(createRequestFromCatalogSchema),
  }, async (request, reply) => {
    const user = getUserFromRequest(request)!;
    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) {
      return;
    }
    const { id } = request.params as { id: string };
    const { body } = (request as any).validated;

    try {
      // Get catalog item
      const catalogResult = await pool.query(`
        SELECT id, name, description, form_schema
        FROM sigurd.service_catalog_items
        WHERE id = $1 AND organization_id = $2
        LIMIT 1
      `, [id, organizationId]);

      if (catalogResult.rows.length === 0) {
        throw new NotFoundError('Catalog Item');
      }

      const catalogItem = catalogResult.rows[0];
      
      // Build description from form data if provided
      let description = catalogItem.description;
      if (body.formData && Object.keys(body.formData).length > 0) {
        const formDataStr = Object.entries(body.formData)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
        description = `${description}\n\nForm Data:\n${formDataStr}`;
      }

      // Create service request
      const result = await pool.query(`
        INSERT INTO sigurd.service_requests (status, priority, requester_user_id, catalog_item_id, title, description, organization_id)
        VALUES ('new', $1, $2, $3, $4, $5, $6)
        RETURNING id, status, priority, requester_user_id, assignee_user_id, 
                   catalog_item_id, title, description, fulfillment_notes, 
                   approved_by, approved_at, completed_at, created_at, updated_at
      `, [
        body.priority || 'medium',
        user.userId,
        catalogItem.id,
        catalogItem.name,
        description,
        organizationId,
      ]);

      return reply.code(201).send(result.rows[0]);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      request.log.error(error, 'Failed to create request from catalog');
      return reply.code(500).send({ error: 'Failed to create request from catalog', details: error.message });
    }
  });
}

