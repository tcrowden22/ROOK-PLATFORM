import { FastifyInstance } from 'fastify';
import { pool } from '../lib/db/index.js';

export async function healthRoutes(fastify: FastifyInstance) {
  // Health check - basic liveness
  fastify.get('/healthz', async (request, reply) => {
    return reply.send({ 
      status: 'ok', 
      service: 'gateway',
      timestamp: new Date().toISOString() 
    });
  });

  // Readiness check - database connectivity
  fastify.get('/readyz', async (request, reply) => {
    try {
      // Simple query to check database connectivity
      await pool.query('SELECT 1');
      return reply.send({ 
        status: 'ready', 
        service: 'gateway',
        timestamp: new Date().toISOString() 
      });
    } catch (error: any) {
      request.log.error(error, 'Database health check failed');
      return reply.code(503).send({ 
        status: 'not ready', 
        service: 'gateway',
        error: 'Database connection failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Metrics endpoint (Prometheus format)
  fastify.get('/metrics', async (request, reply) => {
    try {
      // Get database connection stats
      const poolStats = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      };

      // Basic metrics - can be expanded with prom-client
      const metrics = [
        '# HELP http_requests_total Total number of HTTP requests',
        '# TYPE http_requests_total counter',
        'http_requests_total 0',
        '',
        '# HELP http_request_duration_seconds HTTP request duration in seconds',
        '# TYPE http_request_duration_seconds histogram',
        'http_request_duration_seconds 0',
        '',
        '# HELP database_connections_total Total database connections',
        `# TYPE database_connections_total gauge`,
        `database_connections_total{state="total"} ${poolStats.total}`,
        `database_connections_total{state="idle"} ${poolStats.idle}`,
        `database_connections_total{state="waiting"} ${poolStats.waiting}`,
      ].join('\n');

      return reply
        .header('Content-Type', 'text/plain; version=0.0.4')
        .send(metrics);
    } catch (error: any) {
      request.log.error(error, 'Metrics collection failed');
      return reply.code(500).send({ 
        error: 'Failed to collect metrics',
        details: error.message 
      });
    }
  });
}


