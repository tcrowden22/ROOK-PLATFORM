import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../lib/db/index.js';
import { extractApiKeyFromRequest, verifyApiKey } from '../lib/auth/api-keys.js';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';

export interface AgentContext {
  agentId: string;
  agentDbId: string; // UUID from database
  ownerUserId: string | null;
  deviceId: string | null;
  status: 'active' | 'inactive' | 'revoked';
}

declare module 'fastify' {
  interface FastifyRequest {
    agent?: AgentContext;
  }
}

/**
 * API Key authentication middleware
 * Validates API key and attaches agent context to request
 */
export async function agentAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // Extract API key from request
    const apiKey = extractApiKeyFromRequest(request.headers);
    
    if (!apiKey) {
      request.log.warn('Missing API key in request');
      return reply.code(401).send({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'API key required. Provide X-API-Key header or Authorization: Bearer <key>',
          request_id: (request as any).requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate API key format
    if (!apiKey.startsWith('gk_')) {
      request.log.warn({ apiKeyPrefix: apiKey.substring(0, 10) }, 'Invalid API key format');
      return reply.code(401).send({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Invalid API key format',
          request_id: (request as any).requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Extract agent ID from header (if provided)
    const agentIdHeader = request.headers['x-agent-id'];
    const providedAgentId = agentIdHeader 
      ? (Array.isArray(agentIdHeader) ? agentIdHeader[0] : agentIdHeader)
      : null;

    // Look up agent by agent_id if provided (for efficiency)
    // Otherwise, we'll need to check all agents (less efficient but works)
    let query = `
      SELECT id, agent_id, owner_user_id, device_id, api_key_hash, status
      FROM gateway.agents
      WHERE status = 'active'
    `;
    
    const queryParams: any[] = [];
    
    if (providedAgentId) {
      query += ` AND agent_id = $1`;
      queryParams.push(providedAgentId);
    }

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      request.log.warn({ providedAgentId }, 'Agent not found');
      return reply.code(401).send({
        error: {
          code: 'AGENT_NOT_FOUND',
          message: 'Agent not found or inactive',
          request_id: (request as any).requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Verify API key against stored hash
    // If agent_id was provided, we only check that one agent
    // Otherwise, we check all active agents (less efficient)
    let agentFound = false;
    let agentRecord: any = null;

    for (const row of result.rows) {
      const isValid = await verifyApiKey(apiKey, row.api_key_hash);
      if (isValid) {
        agentFound = true;
        agentRecord = row;
        break;
      }
    }

    if (!agentFound || !agentRecord) {
      request.log.warn({ agentId: providedAgentId }, 'Invalid API key');
      return reply.code(401).send({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Invalid API key',
          request_id: (request as any).requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check if agent is active
    if (agentRecord.status !== 'active') {
      request.log.warn({ agentId: agentRecord.agent_id, status: agentRecord.status }, 'Agent not active');
      return reply.code(403).send({
        error: {
          code: 'AGENT_INACTIVE',
          message: `Agent is ${agentRecord.status}`,
          request_id: (request as any).requestId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Update last_seen_at
    await pool.query(
      `UPDATE gateway.agents SET last_seen_at = now() WHERE id = $1`,
      [agentRecord.id]
    );

    // Attach agent context to request
    request.agent = {
      agentId: agentRecord.agent_id,
      agentDbId: agentRecord.id,
      ownerUserId: agentRecord.owner_user_id,
      deviceId: agentRecord.device_id,
      status: agentRecord.status,
    };

    return;
  } catch (error: any) {
    request.log.error(error, 'Authentication error');
    return reply.code(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed',
        request_id: (request as any).requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Get agent context from request (after authentication)
 */
export function getAgentFromRequest(request: FastifyRequest): AgentContext | null {
  return request.agent || null;
}

/**
 * Require agent authentication
 */
export function requireAgent(request: FastifyRequest, reply: FastifyReply): AgentContext {
  const agent = getAgentFromRequest(request);
  if (!agent) {
    throw new UnauthorizedError('Agent authentication required');
  }
  return agent;
}

