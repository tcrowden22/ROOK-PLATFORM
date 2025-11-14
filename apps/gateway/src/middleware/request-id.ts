import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';

/**
 * Request ID middleware
 * Adds a unique request ID to each request for tracing
 * Accepts X-Request-Id from Kong or generates a new one
 */
export async function requestIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Accept X-Request-Id from Kong (or upstream)
  const requestId = request.headers['x-request-id'] || randomUUID();
  (request as any).requestId = requestId;
  reply.header('X-Request-ID', requestId);
  
  // Also propagate traceparent if present (for OpenTelemetry)
  const traceparent = request.headers['traceparent'];
  if (traceparent) {
    (request as any).traceparent = traceparent;
    reply.header('traceparent', traceparent);
  }
}

