import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../lib/db/index.js';
import { getUserFromRequest, requireRole } from '../auth/rbac.js';
import { generateRegistrationCode, isValidCodeFormat, canUseCode, isCodeExpired } from '../lib/gateway/registration-codes.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../lib/errors.js';

// Validation schemas
const generateCodeSchema = z.object({
  expires_in_hours: z.coerce.number().int().min(1).max(168).optional().default(24), // 1 hour to 7 days
});

export async function gatewayRoutes(fastify: FastifyInstance) {
  /**
   * Generate a new registration code
   * POST /api/gateway/registration-codes
   * Requires: admin or agent role
   */
  fastify.post('/api/gateway/registration-codes', {
    preHandler: requireRole('agent'), // Admin and agent can access
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request)!;
      const body = generateCodeSchema.parse(request.body);

      // Generate unique code (retry if collision - unlikely but possible)
      let code: string;
      let attempts = 0;
      do {
        code = generateRegistrationCode();
        const existing = await pool.query(
          `SELECT id FROM gateway.registration_codes WHERE code = $1`,
          [code]
        );
        if (existing.rows.length === 0) {
          break;
        }
        attempts++;
        if (attempts > 10) {
          throw new Error('Failed to generate unique code after 10 attempts');
        }
      } while (true);

      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + body.expires_in_hours);

      // Insert code
      const result = await pool.query(
        `INSERT INTO gateway.registration_codes 
         (code, created_by_user_id, expires_at, status)
         VALUES ($1, $2, $3, 'active')
         RETURNING id, code, created_by_user_id, expires_at, status, created_at`,
        [code, user.userId, expiresAt.toISOString()]
      );

      const registrationCode = result.rows[0];

      request.log.info({
        codeId: registrationCode.id,
        code: code,
        createdBy: user.userId,
      }, 'Registration code generated');

      return reply.code(201).send({
        id: registrationCode.id,
        code: registrationCode.code,
        expires_at: registrationCode.expires_at,
        created_at: registrationCode.created_at,
        expires_in_hours: body.expires_in_hours,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        });
      }

      request.log.error(error, 'Failed to generate registration code');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate registration code',
        },
      });
    }
  });

  /**
   * List registration codes
   * GET /api/gateway/registration-codes
   * Requires: admin or agent role
   * - Admin sees all codes
   * - Agent sees only their own codes
   */
  fastify.get('/api/gateway/registration-codes', {
    preHandler: requireRole('agent'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request)!;

      let query = `
        SELECT 
          rc.id,
          rc.code,
          rc.created_by_user_id,
          rc.expires_at,
          rc.used_at,
          rc.used_by_agent_id,
          rc.status,
          rc.created_at,
          rc.updated_at,
          u.email as created_by_email,
          u.name as created_by_name,
          a.agent_id as used_by_agent_identifier
        FROM gateway.registration_codes rc
        LEFT JOIN muninn.users u ON rc.created_by_user_id = u.id
        LEFT JOIN gateway.agents a ON rc.used_by_agent_id = a.id
      `;

      const params: any[] = [];

      // Agents see only their own codes, admins see all
      if (user.rookRole !== 'admin') {
        query += ` WHERE rc.created_by_user_id = $1`;
        params.push(user.userId);
      }

      query += ` ORDER BY rc.created_at DESC`;

      const result = await pool.query(query, params);

      // Update status for expired codes
      const now = new Date();
      const codes = result.rows.map((row: any) => {
        if (row.status === 'active' && isCodeExpired(row.expires_at)) {
          row.status = 'expired';
        }
        return row;
      });

      return reply.send(codes);
    } catch (error: any) {
      request.log.error(error, 'Failed to list registration codes');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list registration codes',
        },
      });
    }
  });

  /**
   * Revoke a registration code
   * DELETE /api/gateway/registration-codes/:id
   * Requires: admin or agent role
   * - Agent can only revoke their own codes
   * - Admin can revoke any code
   */
  fastify.delete('/api/gateway/registration-codes/:id', {
    preHandler: requireRole('agent'),
  }, async (request, reply) => {
    try {
      const user = getUserFromRequest(request)!;
      const { id } = request.params as { id: string };

      // Check if code exists
      const codeResult = await pool.query(
        `SELECT id, created_by_user_id, status FROM gateway.registration_codes WHERE id = $1`,
        [id]
      );

      if (codeResult.rows.length === 0) {
        throw new NotFoundError('Registration code not found');
      }

      const code = codeResult.rows[0];

      // Check permissions: agent can only revoke their own codes
      if (user.rookRole !== 'admin' && code.created_by_user_id !== user.userId) {
        throw new ForbiddenError('You can only revoke your own registration codes');
      }

      // Check if code is already used or revoked
      if (code.status === 'used') {
        return reply.code(400).send({
          error: {
            code: 'CODE_ALREADY_USED',
            message: 'Cannot revoke a code that has already been used',
          },
        });
      }

      if (code.status === 'revoked') {
        return reply.code(400).send({
          error: {
            code: 'CODE_ALREADY_REVOKED',
            message: 'Code is already revoked',
          },
        });
      }

      // Revoke the code
      await pool.query(
        `UPDATE gateway.registration_codes 
         SET status = 'revoked', updated_at = now()
         WHERE id = $1`,
        [id]
      );

      request.log.info({
        codeId: id,
        revokedBy: user.userId,
      }, 'Registration code revoked');

      return reply.send({
        message: 'Registration code revoked successfully',
      });
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        return reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
          },
        });
      }

      request.log.error(error, 'Failed to revoke registration code');
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to revoke registration code',
        },
      });
    }
  });
}





