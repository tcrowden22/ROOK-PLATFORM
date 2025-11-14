/**
 * Organization middleware
 * Validates organization access and sets organization context on requests
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { getUserFromRequest } from '../auth/rbac.js';
import {
  validateUserOrganizationAccess,
  getUserDefaultOrganization,
  getUserOrganizationIds,
  getOrganizationById,
  type Organization,
} from '../lib/organizations.js';

export interface OrganizationContext {
  organizationId: string;
  organization: Organization | null;
}

/**
 * Middleware to validate and set organization context
 * Extracts X-Organization-Id header, validates user access, and sets context
 */
export async function organizationMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = getUserFromRequest(request);
  if (!user) {
    // If no user, let auth middleware handle it
    return;
  }

  // Get organization ID from header
  const organizationId = (request.headers['x-organization-id'] as string) || null;

  // Get user's available organizations if not already cached
  // Skip if userId is not a valid UUID (e.g., 'dev-user-id' in demo mode without proper auth)
  let availableOrganizationIds: string[] = [];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isValidUserId = uuidRegex.test(user.userId);
  
  if (isValidUserId) {
    if (!(request as any).userContext?.availableOrganizationIds?.length) {
      try {
        availableOrganizationIds = await getUserOrganizationIds(user.userId);
      } catch (error: any) {
        request.log.warn({ error: error.message, userId: user.userId }, 'Failed to get user organizations');
        availableOrganizationIds = [];
      }
    } else {
      availableOrganizationIds = (request as any).userContext.availableOrganizationIds;
    }
  } else {
    request.log.debug({ userId: user.userId }, 'Skipping organization lookup for invalid UUID (likely unauthenticated request)');
    // Set empty context and return early - user is not properly authenticated
    (request as any).userContext = {
      ...user,
      organizationId: null,
      availableOrganizationIds: [],
    };
    (request as any).organizationContext = {
      organizationId: null,
      organization: null,
    };
    return;
  }

  // If no organization ID provided, try to get default
  let finalOrganizationId: string | null = organizationId;
  if (!finalOrganizationId && isValidUserId) {
    try {
      // First try to get default organization
      const defaultOrg = await getUserDefaultOrganization(user.userId);
      finalOrganizationId = defaultOrg?.id || null;

      // If no default but user has only one organization, use it
      if (!finalOrganizationId && availableOrganizationIds.length === 1) {
        finalOrganizationId = availableOrganizationIds[0];
        request.log.debug({ userId: user.userId, organizationId: finalOrganizationId }, 'Auto-selected single organization');
      }
      
      // If still no organization but user has any organizations, use the first one
      if (!finalOrganizationId && availableOrganizationIds.length > 0) {
        finalOrganizationId = availableOrganizationIds[0];
        request.log.debug({ userId: user.userId, organizationId: finalOrganizationId }, 'Auto-selected first available organization');
      }
    } catch (error: any) {
      request.log.warn({ error: error.message, userId: user.userId }, 'Failed to get default organization');
      // If error but we have organizations, use the first one
      if (availableOrganizationIds.length > 0) {
        finalOrganizationId = availableOrganizationIds[0];
        request.log.debug({ userId: user.userId, organizationId: finalOrganizationId }, 'Fallback: using first available organization after error');
      }
    }
  }

  // Validate organization access if organization ID is provided
  if (finalOrganizationId && isValidUserId) {
    try {
      const hasAccess = await validateUserOrganizationAccess(user.userId, finalOrganizationId);
      if (!hasAccess) {
        return reply.code(403).send({
          error: 'Forbidden: You do not have access to this organization',
          availableOrganizationIds,
        });
      }
    } catch (error: any) {
      request.log.warn({ error: error.message, userId: user.userId, organizationId: finalOrganizationId }, 'Failed to validate organization access');
      // Continue - let the route handler decide what to do
    }
  }

  // Update user context with organization information
  // Always update to ensure organizationId is set
  if (!(request as any).userContext) {
    (request as any).userContext = {
      ...user,
      organizationId: finalOrganizationId,
      availableOrganizationIds,
    };
  } else {
    (request as any).userContext.organizationId = finalOrganizationId;
    (request as any).userContext.availableOrganizationIds = availableOrganizationIds;
  }
  
  // Also set on user object for backward compatibility
  (user as any).organizationId = finalOrganizationId;

  // Set organization context on request
  let organization: Organization | null = null;
  if (finalOrganizationId) {
    organization = await getOrganizationById(finalOrganizationId);
  }
  
  (request as any).organizationContext = {
    organizationId: finalOrganizationId,
    organization,
  };
}

/**
 * Get organization context from request
 */
export function getOrganizationFromRequest(request: FastifyRequest): OrganizationContext | null {
  return (request as any).organizationContext || null;
}

/**
 * Require organization context middleware
 * Ensures an organization is selected before proceeding
 */
export function requireOrganization() {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await organizationMiddleware(request, reply);

    const orgContext = getOrganizationFromRequest(request);
    if (!orgContext || !orgContext.organizationId) {
      return reply.code(400).send({
        error: 'Organization context required',
        message: 'Please select an organization or ensure you are assigned to at least one organization',
      });
    }
  };
}

/**
 * Get organization ID from request (helper function)
 */
export function getOrganizationIdFromRequest(request: FastifyRequest): string | null {
  const orgContext = getOrganizationFromRequest(request);
  return orgContext?.organizationId || null;
}

