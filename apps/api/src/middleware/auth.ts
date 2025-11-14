import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken, TokenPayload } from '../auth/oidc.js';

/**
 * Extract JWT token from Authorization header
 */
function extractToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Extract user identity from Kong OIDC plugin headers
 * Kong OIDC plugin injects headers after successful authentication
 */
function extractUserFromKongHeaders(request: FastifyRequest): TokenPayload | null {
  const userId = request.headers['x-user-id'] as string | undefined;
  const userEmail = request.headers['x-user-email'] as string | undefined;
  const userName = request.headers['x-user-name'] as string | undefined;
  const userRoles = request.headers['x-user-roles'] as string | undefined;

  if (!userId) {
    return null;
  }

  // Parse roles (can be JSON array string or comma-separated)
  let roles: string[] = [];
  if (userRoles) {
    try {
      roles = JSON.parse(userRoles);
    } catch {
      // If not JSON, try comma-separated
      roles = userRoles.split(',').map(r => r.trim()).filter(Boolean);
    }
  }

  // Construct TokenPayload from Kong headers
  return {
    sub: userId,
    email: userEmail,
    preferred_username: userName || userEmail,
    roles,
    realm_access: {
      roles,
    },
    resource_access: {},
  };
}

/**
 * Authentication middleware
 * Priority:
 * 1. Check for Kong OIDC headers (from Kong gateway)
 * 2. Fallback to JWT token validation (for backward compatibility)
 * 3. Development mode (no auth configured)
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Extract token first
  const token = extractToken(request);
  
  // Skip auth if Keycloak is not configured (development mode)
  if (!process.env.KEYCLOAK_URL) {
    // Demo mode: For demo tokens, we need to get user from database
    // Check if there's a user email in a header (frontend can send this)
    const userEmail = (request.headers['x-user-email'] as string) || null;
    
    if (token && token.startsWith('demo-token-') && userEmail) {
      // Look up user from database by email
      try {
        const { pool } = await import('../lib/db/index.js');
        const result = await pool.query(`
          SELECT id, email, name, status, role, organization_id
          FROM muninn.users
          WHERE email = $1
          LIMIT 1
        `, [userEmail]);
        
        if (result.rows.length > 0) {
          const dbUser = result.rows[0];
          // Create TokenPayload structure from database user
          (request as any).user = {
            sub: dbUser.id, // Use actual user ID from database
            email: dbUser.email,
            preferred_username: dbUser.name,
            roles: [dbUser.role],
            realm_access: {
              roles: [dbUser.role]
            },
            resource_access: {},
            email_verified: true,
            organizationId: dbUser.organization_id,
          };
          return;
        }
      } catch (error: any) {
        request.log.warn({ error: error.message }, 'Failed to lookup user in demo mode');
      }
    }
    
    // No token or no user found - create a mock user
    (request as any).user = {
      sub: 'dev-user-id',
      email: 'dev@rook.local',
      preferred_username: 'dev',
      roles: ['admin', 'user'],
      realm_access: {
        roles: ['admin', 'user']
      },
      resource_access: {},
      email_verified: true,
    };
    return;
  }

  // Priority 1: Check for Kong OIDC headers (Kong handles authentication)
  const kongUser = extractUserFromKongHeaders(request);
  if (kongUser) {
    request.log.debug({ userId: kongUser.sub }, 'Authenticated via Kong OIDC headers');
    (request as any).user = kongUser;
    return;
  }

  // Priority 2: Fallback to JWT token validation (backward compatibility)
  
  if (!token) {
    request.log.warn('Missing authorization token or Kong OIDC headers');
    return reply.code(401).send({ error: 'Missing authorization token' });
  }

  try {
    const payload = await verifyToken(token);
    (request as any).user = payload;
    request.log.debug({ userId: payload.sub }, 'Authenticated via JWT token');
  } catch (error: any) {
    // Log detailed error for debugging
    request.log.warn({ 
      error: error.message,
      errorType: error.constructor?.name,
      hasToken: !!token,
      tokenLength: token?.length,
      keycloakUrl: process.env.KEYCLOAK_URL,
    }, 'Token verification failed');
    
    // Provide more specific error message
    let errorMessage = 'Invalid or expired token';
    if (error.message.includes('not initialized')) {
      errorMessage = 'Authentication service not ready. Please try again.';
    } else if (error.message.includes('expired')) {
      errorMessage = 'Token expired. Please log in again.';
    } else if (error.message.includes('Invalid token')) {
      errorMessage = 'Invalid token format. Please log in again.';
    }
    
    return reply.code(401).send({ error: errorMessage });
  }
}

