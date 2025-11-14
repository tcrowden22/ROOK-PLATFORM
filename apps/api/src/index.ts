import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { createLogger } from './middleware/logger.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { logRequest } from './middleware/logger.js';
import { initializeKeycloak } from './auth/oidc.js';
import { authMiddleware } from './middleware/auth.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { muninnRoutes } from './routes/muninn.js';
import { sigurdRoutes } from './routes/sigurd.js';
import { huginnRoutes } from './routes/huginn.js';
import { skuldRoutes } from './routes/skuld.js';
import { yggdrasilRoutes } from './routes/yggdrasil.js';
import { gatewayRoutes } from './routes/gateway.js';
import { handleError, AppError } from './lib/errors.js';
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
        // Parse comma-separated origins
        const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());
        
        // Allow requests with no origin (same-origin, mobile apps, etc.)
        if (!origin) {
          cb(null, true);
          return;
        }
        
        // Normalize origins - remove default ports and trailing slashes for comparison
        const normalizeOrigin = (url: string) => {
          try {
            const urlObj = new URL(url);
            // Remove default ports (80 for http, 443 for https)
            if ((urlObj.protocol === 'http:' && (urlObj.port === '80' || urlObj.port === '')) || 
                (urlObj.protocol === 'https:' && (urlObj.port === '443' || urlObj.port === ''))) {
              urlObj.port = '';
            }
            return urlObj.origin.replace(/\/$/, ''); // Just origin, no path
          } catch {
            return url.replace(/\/$/, '');
          }
        };
        
        // Expand allowed origins to include both with and without default ports
        const expandedOrigins: string[] = [];
        allowedOrigins.forEach(orig => {
          expandedOrigins.push(orig);
          expandedOrigins.push(normalizeOrigin(orig));
          // Add variations for localhost
          if (orig.includes('localhost')) {
            if (orig.includes(':8000')) {
              expandedOrigins.push('http://localhost:8000');
              expandedOrigins.push('http://localhost');
            }
            if (orig.includes(':5173')) {
              expandedOrigins.push('http://localhost:5173');
            }
            if (orig.includes(':3000')) {
              expandedOrigins.push('http://localhost:3000');
            }
            if (!orig.includes(':')) {
              expandedOrigins.push('http://localhost:80');
              expandedOrigins.push('http://localhost:8000');
            }
          }
        });
        
        const normalizedOrigin = normalizeOrigin(origin);
        const normalizedAllowedOrigins = expandedOrigins.map(normalizeOrigin);
        
        // Check if origin matches (exact match or normalized match)
        const isAllowed = expandedOrigins.includes(origin) ||
                         normalizedAllowedOrigins.includes(normalizedOrigin) ||
                         normalizedAllowedOrigins.includes('*') ||
                         allowedOrigins.includes('*');
        
        if (isAllowed) {
          cb(null, true);
        } else {
          // Log for debugging
          fastify.log.warn({ 
            origin, 
            normalizedOrigin,
            allowedOrigins,
            expandedOrigins: expandedOrigins.slice(0, 10), // Limit log size
            normalizedAllowedOrigins: normalizedAllowedOrigins.slice(0, 10)
          }, 'CORS blocked origin');
          // Allow the request anyway in development mode
          if (env.NODE_ENV === 'development') {
            fastify.log.warn({ origin }, 'Allowing blocked origin in development mode');
            cb(null, true);
          } else {
            cb(new Error('Not allowed by CORS'), false);
          }
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID', 'X-User-Email', 'X-Organization-Id'],
    });

    await fastify.register(helmet, {
      contentSecurityPolicy: false, // Adjust based on needs
    });

    await fastify.register(rateLimit, {
      max: 1000, // Increased limit to prevent rate limiting during development
      timeWindow: '1 minute',
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
        service_name: 'api',
      }, 'Request completed');
    });

    // Error handler
    fastify.setErrorHandler((error, request, reply) => {
      handleError(error, request, reply);
    });

    // Initialize Keycloak (optional - will fail gracefully if not configured)
    let keycloakInitialized = false;
    try {
      if (process.env.KEYCLOAK_URL) {
        await initializeKeycloak();
        keycloakInitialized = true;
      } else {
        console.log('⚠ Keycloak not configured. Auth will be disabled. Set KEYCLOAK_URL to enable.');
      }
    } catch (error) {
      console.error('⚠ Failed to initialize Keycloak. Auth will be disabled.');
      console.error('Set KEYCLOAK_URL and related env vars to enable authentication.');
    }

    // Register routes
    // Health routes are public (no auth required)
    fastify.register(healthRoutes);
    
    // Auth routes (login) - public
    fastify.register(authRoutes, { prefix: '/api/auth' });

    // Protected API routes (require authentication)
    // Register with auth middleware applied to each route group
    fastify.register(async function (fastify) {
      fastify.addHook('onRequest', authMiddleware);
      await fastify.register(muninnRoutes, { prefix: '/api/muninn' });
      await fastify.register(sigurdRoutes, { prefix: '/api/sigurd' });
      await fastify.register(huginnRoutes, { prefix: '/api/huginn' });
      await fastify.register(skuldRoutes, { prefix: '/api/skuld' });
      await fastify.register(yggdrasilRoutes, { prefix: '/api/yggdrasil' });
      await fastify.register(gatewayRoutes);
    });

    await fastify.listen({ 
      port: env.API_PORT, 
      host: env.API_HOST 
    });
    console.log(`✓ API server listening on http://${env.API_HOST}:${env.API_PORT}`);
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

// Register signal handlers (only once, in main application file)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

