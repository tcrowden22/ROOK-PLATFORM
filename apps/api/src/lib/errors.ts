import { FastifyRequest, FastifyReply } from 'fastify';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: any) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

/**
 * Error handler
 */
export function handleError(error: Error, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({
      error: error.message,
      code: error.code,
    });
  }

  // Log unexpected errors
  if (request && (request as any).log) {
    (request as any).log.error(error, 'Unhandled error');
  } else {
    console.error('Unhandled error:', error);
  }

  // Return generic error (with details in dev mode)
  return reply.code(500).send({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
}

