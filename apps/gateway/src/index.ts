import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { createLogger } from './middleware/logger.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { logRequest } from './middleware/logger.js';
import { healthRoutes } from './routes/health.js';
import { agentRoutes } from './routes/agents.js';
import { handleError } from './lib/errors.js';
import { closeDatabase } from './lib/db/index.js';

// Initialize Fastify
const fastify = Fastify({
  logger: createLogger(),
  disableRequestLogging: false,
});

// Start server
async function start() {
  try {
    // Register plugins
    await fastify.register(cors, {
      origin: (origin, cb) => {
        // Allow all origins for gateway (agents can come from anywhere)
        // In production, consider restricting based on known agent IPs
        const allowedOrigins = env.CORS_ORIGIN === '*' 
          ? ['*'] 
          : env.CORS_ORIGIN.split(',').map(o => o.trim());
        
        if (allowedOrigins.includes('*') || !origin) {
          cb(null, true);
        } else if (allowedOrigins.includes(origin)) {
          cb(null, true);
        } else {
          fastify.log.warn({ origin, allowedOrigins }, 'CORS blocked origin');
          cb(new Error('Not allowed by CORS'), false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Agent-ID', 'X-API-Key'],
    });

    await fastify.register(helmet, {
      contentSecurityPolicy: false, // Adjust based on needs
    });

    await fastify.register(rateLimit, {
      max: env.RATE_LIMIT_MAX,
      timeWindow: env.RATE_LIMIT_WINDOW,
      errorResponseBuilder: (request, context) => {
        return {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded',
            request_id: (request as any).requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        };
      },
    });

    // Global hooks
    fastify.addHook('onRequest', requestIdMiddleware);
    fastify.addHook('onRequest', logRequest);
    
    // Log response completion
    fastify.addHook('onResponse', async (request, reply) => {
      const startTime = (request as any).startTime || Date.now();
      const duration = Date.now() - startTime;
      const requestId = (request as any).requestId || 'unknown';
      const traceparent = (request as any).traceparent;
      request.log.info({
        requestId,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        duration,
        traceparent,
        service_name: 'gateway',
      }, 'Request completed');
    });

    // Error handler
    fastify.setErrorHandler((error, request, reply) => {
      handleError(error, request, reply);
    });

    // Register routes
    // Health routes are public (no auth required)
    fastify.register(healthRoutes);

    // Agent routes (Phase 2)
    fastify.register(agentRoutes);

    await fastify.listen({ 
      port: env.GATEWAY_PORT, 
      host: env.GATEWAY_HOST 
    });
    console.log(`✓ Gateway server listening on http://${env.GATEWAY_HOST}:${env.GATEWAY_PORT}`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

start();

/**
 * Graceful shutdown handler
 * Coordinates shutdown of Fastify server and database pool
 */
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received, starting graceful shutdown...`);
  
  try {
    // Step 1: Close Fastify server (stops accepting new requests, waits for ongoing requests)
    console.log('Closing Fastify server...');
    await fastify.close();
    console.log('✓ Fastify server closed');
    
    // Step 2: Close database pool (waits for active queries to complete)
    console.log('Closing database pool...');
    await closeDatabase();
    console.log('✓ Database pool closed');
    
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Register signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

