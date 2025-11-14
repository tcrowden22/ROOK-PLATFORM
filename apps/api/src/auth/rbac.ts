import { FastifyRequest } from 'fastify';
import { TokenPayload, getUserIdFromToken, getRolesFromToken, mapKeycloakRoleToRookRole } from './oidc.js';

export interface UserContext {
  userId: string;
  email?: string;
  roles: string[];
  rookRole: 'admin' | 'agent' | 'user';
  organizationId: string | null;
  availableOrganizationIds: string[];
}

/**
 * Extract user context from request
 * Note: organizationId and availableOrganizationIds should be set by organization middleware
 */
export function getUserFromRequest(request: FastifyRequest): UserContext | null {
  const user = (request as any).user as TokenPayload | undefined;
  if (!user) {
    return null;
  }

  const userId = getUserIdFromToken(user);
  const keycloakRoles = getRolesFromToken(user);
  const rookRole = mapKeycloakRoleToRookRole(keycloakRoles);

  // Get organization context from request (set by middleware)
  const userContext = (request as any).userContext as UserContext | undefined;

  return {
    userId,
    email: user.email || user.preferred_username,
    roles: keycloakRoles,
    rookRole,
    organizationId: userContext?.organizationId ?? null,
    availableOrganizationIds: userContext?.availableOrganizationIds ?? [],
  };
}

/**
 * Check if user has required role
 */
export function hasRole(user: UserContext | null, requiredRole: 'admin' | 'agent' | 'user'): boolean {
  if (!user) return false;

  const roleHierarchy: Record<'admin' | 'agent' | 'user', number> = {
    admin: 3,
    agent: 2,
    user: 1,
  };

  return roleHierarchy[user.rookRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if user can access resource (owns it or is admin/agent)
 */
export function canAccessResource(
  user: UserContext | null,
  resourceOwnerId: string | null | undefined
): boolean {
  if (!user) return false;
  if (!resourceOwnerId) return true; // Public resource
  if (user.rookRole === 'admin' || user.rookRole === 'agent') return true;
  return user.userId === resourceOwnerId;
}

/**
 * RBAC middleware factory
 */
export function requireRole(requiredRole: 'admin' | 'agent' | 'user') {
  return async (request: FastifyRequest, reply: any) => {
    const user = getUserFromRequest(request);
    
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    if (!hasRole(user, requiredRole)) {
      return reply.code(403).send({ error: 'Forbidden: Insufficient permissions' });
    }

    // Attach user to request for route handlers
    (request as any).userContext = user;
  };
}

/**
 * Optional auth middleware (doesn't fail if no auth)
 */
export async function optionalAuth(request: FastifyRequest, reply: any) {
  const user = getUserFromRequest(request);
  if (user) {
    (request as any).userContext = user;
  }
}

