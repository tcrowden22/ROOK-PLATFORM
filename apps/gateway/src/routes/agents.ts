import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../lib/db/index.js';
import { generateApiKey, hashApiKey } from '../lib/auth/api-keys.js';
import { agentAuthMiddleware, requireAgent } from '../middleware/auth.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../lib/errors.js';

// Validation schemas
const registerAgentSchema = z.object({
  agent_id: z.string().min(1).max(255), // Unique identifier (e.g., hostname-mac)
  registration_code: z.string().optional(), // Optional: registration code for automatic user linking
  owner_user_id: z.string().uuid().optional(), // Optional: link to user (ignored if registration_code provided)
  device_id: z.string().uuid().optional(), // Optional: link to existing device
  metadata: z.record(z.any()).optional(), // Additional metadata
});

const updateAgentSchema = z.object({
  device_id: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function agentRoutes(fastify: FastifyInstance) {
  /**
   * Register a new agent
   * POST /v1/agents/register
   */
  fastify.post('/v1/agents/register', async (request, reply) => {
    try {
      // Validate request body
      const body = registerAgentSchema.parse(request.body);

      // Check if agent_id already exists
      const existingAgent = await pool.query(
        `SELECT id FROM gateway.agents WHERE agent_id = $1`,
        [body.agent_id]
      );

      if (existingAgent.rows.length > 0) {
        return reply.code(409).send({
          error: {
            code: 'AGENT_EXISTS',
            message: 'Agent with this ID already exists',
            request_id: (request as any).requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Process registration code if provided
      let ownerUserId: string | null = null;
      
      if (body.registration_code) {
        // Validate registration code format
        const codePattern = /^RC-[A-F0-9]{8}-[A-F0-9]{8}$/;
        if (!codePattern.test(body.registration_code)) {
          throw new ValidationError('Invalid registration code format');
        }

        // Look up registration code
        const codeResult = await pool.query(
          `SELECT id, created_by_user_id, expires_at, used_at, status
           FROM gateway.registration_codes
           WHERE code = $1`,
          [body.registration_code]
        );

        if (codeResult.rows.length === 0) {
          throw new ValidationError('Registration code not found');
        }

        const code = codeResult.rows[0];
        const now = new Date();
        const expiresAt = new Date(code.expires_at);

        // Check if code is active
        if (code.status !== 'active') {
          throw new ValidationError(`Registration code is ${code.status}`);
        }

        // Check if code is expired
        if (expiresAt < now) {
          // Mark as expired
          await pool.query(
            `UPDATE gateway.registration_codes SET status = 'expired', updated_at = now() WHERE id = $1`,
            [code.id]
          );
          throw new ValidationError('Registration code has expired');
        }

        // Check if code is already used
        if (code.used_at) {
          throw new ValidationError('Registration code has already been used');
        }

        // Use the code's created_by_user_id as owner
        ownerUserId = code.created_by_user_id;
      } else if (body.owner_user_id) {
        // Fallback to explicit owner_user_id if no registration code
        const userCheck = await pool.query(
          `SELECT id FROM muninn.users WHERE id = $1`,
          [body.owner_user_id]
        );
        if (userCheck.rows.length === 0) {
          throw new ValidationError('Invalid owner_user_id');
        }
        ownerUserId = body.owner_user_id;
      }

      // Validate device_id if provided
      if (body.device_id) {
        const deviceCheck = await pool.query(
          `SELECT id FROM huginn.devices WHERE id = $1`,
          [body.device_id]
        );
        if (deviceCheck.rows.length === 0) {
          throw new ValidationError('Invalid device_id');
        }
      }

      // Generate API key
      const apiKey = generateApiKey();
      const apiKeyHash = await hashApiKey(apiKey);

      // Insert agent record
      const result = await pool.query(
        `INSERT INTO gateway.agents 
         (agent_id, owner_user_id, device_id, api_key_hash, metadata, status)
         VALUES ($1, $2, $3, $4, $5, 'active')
         RETURNING id, agent_id, owner_user_id, device_id, status, created_at`,
        [
          body.agent_id,
          ownerUserId,
          body.device_id || null,
          apiKeyHash,
          JSON.stringify(body.metadata || {}),
        ]
      );

      const agent = result.rows[0];

      // Mark registration code as used if it was provided
      if (body.registration_code) {
        await pool.query(
          `UPDATE gateway.registration_codes 
           SET status = 'used', used_at = now(), used_by_agent_id = $1, updated_at = now()
           WHERE code = $2`,
          [agent.id, body.registration_code]
        );
      }

      request.log.info({
        agentId: agent.agent_id,
        agentDbId: agent.id,
      }, 'Agent registered');

      // Return agent info with API key (only shown once!)
      return reply.code(201).send({
        agent: {
          id: agent.id,
          agent_id: agent.agent_id,
          owner_user_id: agent.owner_user_id,
          device_id: agent.device_id,
          status: agent.status,
          created_at: agent.created_at,
        },
        api_key: apiKey, // WARNING: Only shown once at registration
        message: 'Store this API key securely. It cannot be retrieved again.',
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
            request_id: (request as any).requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
      }

      if (error instanceof ValidationError) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            request_id: (request as any).requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
      }

      request.log.error(error, 'Failed to register agent');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to register agent',
          request_id: (request as any).requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  });

  /**
   * Get current agent info (requires authentication)
   * GET /v1/agents/me
   */
  fastify.get('/v1/agents/me', {
    preHandler: agentAuthMiddleware,
  }, async (request, reply) => {
    try {
      const agent = requireAgent(request, reply);

      const result = await pool.query(
        `SELECT id, agent_id, owner_user_id, device_id, status, metadata, 
                last_seen_at, created_at, updated_at
         FROM gateway.agents
         WHERE id = $1`,
        [agent.agentDbId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Agent not found');
      }

      const agentRecord = result.rows[0];

      return reply.send({
        agent: {
          id: agentRecord.id,
          agent_id: agentRecord.agent_id,
          owner_user_id: agentRecord.owner_user_id,
          device_id: agentRecord.device_id,
          status: agentRecord.status,
          metadata: agentRecord.metadata,
          last_seen_at: agentRecord.last_seen_at,
          created_at: agentRecord.created_at,
          updated_at: agentRecord.updated_at,
        },
      });
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
            request_id: (request as any).requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
      }

      request.log.error(error, 'Failed to get agent info');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get agent info',
          request_id: (request as any).requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  });

  /**
   * Update agent (requires authentication)
   * PUT /v1/agents/me
   */
  fastify.put('/v1/agents/me', {
    preHandler: agentAuthMiddleware,
  }, async (request, reply) => {
    try {
      const agent = requireAgent(request, reply);
      const body = updateAgentSchema.parse(request.body);

      // Validate device_id if provided
      if (body.device_id) {
        const deviceCheck = await pool.query(
          `SELECT id, owner_user_id FROM huginn.devices WHERE id = $1`,
          [body.device_id]
        );
        if (deviceCheck.rows.length === 0) {
          throw new ValidationError('Invalid device_id');
        }

        // Verify device belongs to same owner (if agent has owner)
        if (agent.ownerUserId && deviceCheck.rows[0].owner_user_id !== agent.ownerUserId) {
          throw new ForbiddenError('Device does not belong to agent owner');
        }
      }

      // Build update query
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (body.device_id !== undefined) {
        updates.push(`device_id = $${paramIndex++}`);
        params.push(body.device_id);
      }

      if (body.metadata !== undefined) {
        updates.push(`metadata = $${paramIndex++}`);
        params.push(JSON.stringify(body.metadata));
      }

      if (updates.length === 0) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No fields to update',
            request_id: (request as any).requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
      }

      updates.push(`updated_at = now()`);
      params.push(agent.agentDbId);

      const result = await pool.query(
        `UPDATE gateway.agents 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, agent_id, owner_user_id, device_id, status, metadata, updated_at`,
        params
      );

      return reply.send({
        agent: result.rows[0],
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
            request_id: (request as any).requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
      }

      if (error instanceof ValidationError || error instanceof ForbiddenError) {
        return reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            request_id: (request as any).requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
      }

      request.log.error(error, 'Failed to update agent');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update agent',
          request_id: (request as any).requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  });

  /**
   * Send heartbeat (requires authentication)
   * POST /v1/agents/heartbeat
   */
  fastify.post('/v1/agents/heartbeat', {
    preHandler: agentAuthMiddleware,
  }, async (request, reply) => {
    try {
      const agent = requireAgent(request, reply);

      // Update last_seen_at
      await pool.query(
        `UPDATE gateway.agents SET last_seen_at = now() WHERE id = $1`,
        [agent.agentDbId]
      );

      return reply.send({
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      request.log.error(error, 'Failed to process heartbeat');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process heartbeat',
          request_id: (request as any).requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
  });
}

