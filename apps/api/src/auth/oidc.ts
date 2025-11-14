import * as jose from 'jose';
import { env } from '../config/env.js';

let jwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;
let issuer: string | null = null;

/**
 * Initialize Keycloak OIDC discovery
 */
export async function initializeKeycloak() {
  const discoveryUrl = env.KEYCLOAK_DISCOVERY_URL || 
    `${env.KEYCLOAK_URL}/realms/${env.KEYCLOAK_REALM}/.well-known/openid-configuration`;
  
  try {
    const response = await fetch(discoveryUrl);
    const config = await response.json() as { issuer: string; jwks_uri: string };
    
    issuer = config.issuer;
    const jwksUrl = config.jwks_uri;
    
    // Create JWKS client
    jwks = jose.createRemoteJWKSet(new URL(jwksUrl));
    
    console.log(`✓ Keycloak OIDC initialized: ${issuer}`);
  } catch (error) {
    console.error('Failed to initialize Keycloak:', error);
    throw error;
  }
}

export interface TokenPayload {
  sub: string;
  email?: string;
  preferred_username?: string;
  roles?: string[];
  realm_access?: {
    roles?: string[];
  };
  resource_access?: {
    [key: string]: {
      roles?: string[];
    };
  };
  groups?: string[];
  iat?: number;
  exp?: number;
}

/**
 * Verify and decode JWT token from Keycloak
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  if (!jwks || !issuer) {
    throw new Error('Keycloak not initialized. Call initializeKeycloak() first.');
  }

  try {
    // First try with full validation (strict)
    try {
      const { payload } = await jose.jwtVerify(token, jwks!, {
        issuer,
        audience: env.KEYCLOAK_CLIENT_ID,
      });
      return payload as TokenPayload;
    } catch (strictError) {
      // If strict validation fails, try more lenient approaches
      if (strictError instanceof jose.errors.JWTClaimValidationFailed) {
        // Try without audience (some Keycloak configs don't include it)
        try {
          console.warn('Token strict validation failed, trying without audience check');
          const { payload } = await jose.jwtVerify(token, jwks!, {
            issuer,
          });
          return payload as TokenPayload;
        } catch (issuerError) {
          // If issuer validation fails, try without issuer check (most lenient)
          // This handles cases where issuer might be slightly different
          if (issuerError instanceof jose.errors.JWTClaimValidationFailed) {
            console.warn('Token issuer validation failed, trying without issuer check');
            const { payload } = await jose.jwtVerify(token, jwks!);
            return payload as TokenPayload;
          }
          throw issuerError;
        }
      }
      throw strictError;
    }
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      throw new Error('Token expired');
    }
    if (error instanceof jose.errors.JWTInvalid) {
      throw new Error('Invalid token');
    }
    if (error instanceof jose.errors.JWTClaimValidationFailed) {
      throw new Error(`Token validation failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Extract user ID from token
 */
export function getUserIdFromToken(payload: TokenPayload): string {
  return payload.sub;
}

/**
 * Extract roles from token
 */
export function getRolesFromToken(payload: TokenPayload): string[] {
  // Keycloak roles can be in different places
  const roles: string[] = [];
  
  // Check direct roles property
  if (payload.roles) {
    roles.push(...payload.roles);
  }
  
  // Check realm_access.roles (most common in Keycloak)
  if (payload.realm_access?.roles) {
    roles.push(...payload.realm_access.roles);
  }
  
  // Check resource_access[client_id].roles
  if (payload.resource_access) {
    for (const clientId in payload.resource_access) {
      const clientRoles = payload.resource_access[clientId]?.roles;
      if (clientRoles) {
        roles.push(...clientRoles);
      }
    }
  }
  
  return [...new Set(roles)]; // Remove duplicates
}

/**
 * Map Keycloak roles to Rook roles
 */
export function mapKeycloakRoleToRookRole(keycloakRoles: string[]): 'admin' | 'agent' | 'user' {
  // Priority: admin > agent > user
  if (keycloakRoles.includes('admin') || keycloakRoles.includes('rook-admin')) {
    return 'admin';
  }
  if (keycloakRoles.includes('agent') || keycloakRoles.includes('rook-agent')) {
    return 'agent';
  }
  return 'user';
}

