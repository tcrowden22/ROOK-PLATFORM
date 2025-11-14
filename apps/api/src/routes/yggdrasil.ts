import { FastifyInstance } from 'fastify';
import { pool } from '../lib/db/index.js';
import { getUserFromRequest, requireRole } from '../auth/rbac.js';
import { NotFoundError } from '../lib/errors.js';

export async function yggdrasilRoutes(fastify: FastifyInstance) {
  // List workflows
  fastify.get('/workflows', async (request, reply) => {
    try {
      const result = await pool.query(`
        SELECT id, name, description, enabled, created_at, updated_at
        FROM yggdrasil.workflows
        ORDER BY created_at DESC
        LIMIT 100
      `);
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch workflows');
      return reply.code(500).send({ error: 'Failed to fetch workflows', details: error.message });
    }
  });

  // Get workflow by ID
  fastify.get('/workflows/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const result = await pool.query(`
        SELECT id, name, description, enabled, created_at, updated_at
        FROM yggdrasil.workflows
        WHERE id = $1
        LIMIT 1
      `, [id]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Workflow');
      }

      return reply.send(result.rows[0]);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      request.log.error(error, 'Failed to fetch workflow');
      return reply.code(500).send({ error: 'Failed to fetch workflow', details: error.message });
    }
  });

  // List workflow triggers
  fastify.get('/workflows/:id/triggers', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const result = await pool.query(`
        SELECT id, workflow_id, trigger_type, config, enabled, created_at
        FROM yggdrasil.workflow_triggers
        WHERE workflow_id = $1
        ORDER BY created_at DESC
      `, [id]);
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch workflow triggers');
      return reply.code(500).send({ error: 'Failed to fetch workflow triggers', details: error.message });
    }
  });

  // List workflow integrations
  fastify.get('/integrations', {
    preHandler: requireRole('admin'),
  }, async (request, reply) => {
    try {
      const result = await pool.query(`
        SELECT id, name, type, config, enabled, created_at, updated_at
        FROM yggdrasil.workflow_integrations
        ORDER BY created_at DESC
      `);
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch workflow integrations');
      return reply.code(500).send({ error: 'Failed to fetch workflow integrations', details: error.message });
    }
  });

  // List workflow run logs
  fastify.get('/workflows/:id/logs', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const result = await pool.query(`
        SELECT id, workflow_id, status, started_at, completed_at, error_message
        FROM yggdrasil.workflow_run_logs
        WHERE workflow_id = $1
        ORDER BY started_at DESC
        LIMIT 50
      `, [id]);
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch workflow logs');
      return reply.code(500).send({ error: 'Failed to fetch workflow logs', details: error.message });
    }
  });

  // Get workflow stats
  fastify.get('/stats', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      // Get total workflows
      const workflowsResult = await pool.query(`
        SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE enabled = true) as enabled
        FROM yggdrasil.workflows
      `);
      
      // Get total runs
      const runsResult = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'success') as success,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          COUNT(*) FILTER (WHERE status = 'running') as running
        FROM yggdrasil.workflow_run_logs
      `);
      
      // Get recent run stats (last 7 days)
      const recentRunsResult = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'success') as success,
          COUNT(*) FILTER (WHERE status = 'failed') as failed
        FROM yggdrasil.workflow_run_logs
        WHERE started_at >= NOW() - INTERVAL '7 days'
      `);
      
      return reply.send({
        workflows: {
          total: parseInt(workflowsResult.rows[0].total) || 0,
          enabled: parseInt(workflowsResult.rows[0].enabled) || 0,
        },
        runs: {
          total: parseInt(runsResult.rows[0].total) || 0,
          success: parseInt(runsResult.rows[0].success) || 0,
          failed: parseInt(runsResult.rows[0].failed) || 0,
          running: parseInt(runsResult.rows[0].running) || 0,
        },
        recent: {
          total: parseInt(recentRunsResult.rows[0].total) || 0,
          success: parseInt(recentRunsResult.rows[0].success) || 0,
          failed: parseInt(recentRunsResult.rows[0].failed) || 0,
        },
      });
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch workflow stats');
      return reply.code(500).send({ error: 'Failed to fetch workflow stats', details: error.message });
    }
  });

  // List all run logs (across all workflows)
  fastify.get('/logs', {
    preHandler: requireRole('user'),
  }, async (request, reply) => {
    try {
      const { workflow_id, status, limit } = request.query as {
        workflow_id?: string;
        status?: string;
        limit?: string;
      };
      
      let query = `
        SELECT id, workflow_id, status, started_at, completed_at, error_message
        FROM yggdrasil.workflow_run_logs
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;
      
      if (workflow_id) {
        query += ` AND workflow_id = $${paramIndex++}`;
        params.push(workflow_id);
      }
      
      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      
      query += ` ORDER BY started_at DESC LIMIT $${paramIndex}`;
      params.push(Math.min(parseInt(limit || '100', 10), 1000));
      
      const result = await pool.query(query, params);
      return reply.send(result.rows);
    } catch (error: any) {
      request.log.error(error, 'Failed to fetch run logs');
      return reply.code(500).send({ error: 'Failed to fetch run logs', details: error.message });
    }
  });
}

