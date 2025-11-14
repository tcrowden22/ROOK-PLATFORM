import { FastifyRequest, FastifyReply } from 'fastify';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(404, 'NOT_FOUND', message, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: any) {
    super(401, 'UNAUTHORIZED', message, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', details?: any) {
    super(403, 'FORBIDDEN', message, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', details?: any) {
    super(429, 'RATE_LIMIT_EXCEEDED', message, details);
  }
}

/**
 * Global error handler
 */
export function handleError(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = (request as any).requestId || 'unknown';

  // Handle known application errors
  if (error instanceof AppError) {
    request.log.warn({
      requestId,
      error: error.code,
      message: error.message,
      details: error.details,
    });

    return reply.code(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        request_id: requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle validation errors (from Fastify)
  if ((error as any).validation) {
    request.log.warn({
      requestId,
      error: 'VALIDATION_ERROR',
      validation: (error as any).validation,
    });

    return reply.code(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: (error as any).validation,
        request_id: requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle unknown errors
  request.log.error({
    requestId,
    error: error.message,
    stack: error.stack,
  });

  return reply.code(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      request_id: requestId,
      timestamp: new Date().toISOString(),
    },
  });
}


