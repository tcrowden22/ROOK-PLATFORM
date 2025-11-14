import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema, ZodError } from 'zod';

/**
 * Request validation middleware factory
 */
export function validateRequest<T>(schema: ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validated = schema.parse({
        body: request.body,
        query: request.query,
        params: request.params,
      });
      
      // Attach validated data to request
      (request as any).validated = validated;
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      throw error;
    }
  };
}

