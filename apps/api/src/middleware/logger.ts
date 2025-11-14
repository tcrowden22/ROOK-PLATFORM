import { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/env.js';

/**
 * Structured JSON logging middleware
 */
export async function logRequest(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const startTime = Date.now();
  const requestId = (request as any).requestId || 'unknown';

  const traceparent = (request as any).traceparent || request.headers['traceparent'];
  
  request.log.info({
    requestId,
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    traceparent,
    service_name: 'api',
  }, 'Incoming request');

  // Log response completion in onResponse hook (set up in index.ts)
  // Store start time on request for later use
  (request as any).startTime = startTime;
}

/**
 * Create logger instance
 */
export function createLogger() {
  const isDev = env.NODE_ENV === 'development';
  const isPretty = env.LOG_FORMAT === 'pretty' || isDev;

  return {
    level: env.LOG_LEVEL,
    transport: isPretty ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    } : undefined,
  };
}

