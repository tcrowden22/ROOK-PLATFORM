/**
 * Authentication routes
 * Handles login with Keycloak (embedded login - no redirect)
 */
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../config/env.js';
import { pool } from '../lib/db/index.js';
import { verifyToken, TokenPayload } from '../auth/oidc.js';

// Validation schema
const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

/**
 * Authenticate user with Keycloak using password grant (Direct Access Grants)
 * This allows login without redirecting to Keycloak
 */
async function authenticateWithKeycloak(email: string, password: string): Promise<{ token: string; userInfo: any }> {
  if (!env.KEYCLOAK_URL || !env.KEYCLOAK_REALM || !env.KEYCLOAK_CLIENT_ID) {
    console.error('Keycloak config check:', {
      KEYCLOAK_URL: env.KEYCLOAK_URL,
      KEYCLOAK_REALM: env.KEYCLOAK_REALM,
      KEYCLOAK_CLIENT_ID: env.KEYCLOAK_CLIENT_ID,
    });
    throw new Error('Keycloak not configured');
  }

  const tokenUrl = `${env.KEYCLOAK_URL}/realms/${env.KEYCLOAK_REALM}/protocol/openid-connect/token`;
  
  // Keycloak can accept either username or email in the username field
  // Try email first, then fallback to username if needed
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: env.KEYCLOAK_CLIENT_ID,
    username: email, // Keycloak accepts email in username field if configured
    password: password,
    scope: 'openid', // Request OpenID scope
  });
  
  console.log('Keycloak auth request:', {
    tokenUrl,
    clientId: env.KEYCLOAK_CLIENT_ID,
    realm: env.KEYCLOAK_REALM,
    username: email,
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const responseText = await response.text();
    let errorData: { error?: string; error_description?: string } = {};
    
    try {
      errorData = JSON.parse(responseText);
    } catch {
      // If response is not JSON, use the text as error
      errorData = { error_description: responseText || 'Authentication failed' };
    }
    
    let errorMessage = errorData.error_description || errorData.error || `Invalid credentials (${response.status})`;
    
    // Log full error details for debugging
    console.error('Keycloak auth error details:', {
      status: response.status,
      statusText: response.statusText,
      error: errorData.error,
      error_description: errorData.error_description,
      email,
      username: email,
      realm: env.KEYCLOAK_REALM,
      clientId: env.KEYCLOAK_CLIENT_ID,
      fullResponse: responseText,
    });
    
    // Try username if email fails (for cases where user was created with username != email)
    if (errorData.error === 'invalid_grant' || errorMessage.toLowerCase().includes('invalid user')) {
      const username = email.split('@')[0]; // Extract username part
      if (username !== email) {
        console.log(`Retrying authentication with username: ${username}`);
        const retryBody = new URLSearchParams({
          grant_type: 'password',
          client_id: env.KEYCLOAK_CLIENT_ID,
          username: username,
          password: password,
          scope: 'openid',
        });
        
        const retryResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: retryBody.toString(),
        });
        
        if (retryResponse.ok) {
          const retryData = await retryResponse.json() as { access_token: string };
          try {
            const tokenPayload = await verifyToken(retryData.access_token);
            return {
              token: retryData.access_token,
              userInfo: tokenPayload,
            };
          } catch (decodeError) {
            const parts = retryData.access_token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
              return {
                token: retryData.access_token,
                userInfo: payload,
              };
            }
          }
        }
      }
    }
    
    // Provide helpful error message for common issues
    if (errorMessage.toLowerCase().includes('account is not fully set up') || 
        errorMessage.toLowerCase().includes('temporary password') ||
        errorMessage.toLowerCase().includes('required actions')) {
      errorMessage = 'Account setup required: Please set a permanent password in Keycloak Admin Console and verify your email. Go to Users > Your User > Credentials tab and set Temporary to OFF.';
    } else if (errorData.error === 'invalid_grant') {
      errorMessage = `Invalid credentials. Check: 1) User exists in Keycloak, 2) Username format matches Keycloak (often requires firstname.lastname format), 3) Password is correct, 4) Direct Access Grants is enabled for client. Note: If your Keycloak username uses a specific format (e.g., firstname.lastname), use that instead of email. Original error: ${errorData.error_description || 'Unknown error'}`;
    }
    
    throw new Error(errorMessage);
  }

  const data = await response.json() as { access_token: string };
  
  // Decode token to get user info
  // Try to verify token if Keycloak is initialized, otherwise decode directly
  try {
    // Try to verify token if Keycloak is initialized
    const tokenPayload = await verifyToken(data.access_token);
    return {
      token: data.access_token,
      userInfo: tokenPayload,
    };
  } catch (verifyError: any) {
    // If verification fails (Keycloak not initialized or other issue), decode JWT payload directly
    // This is safe because we just got the token from Keycloak
    console.warn('Token verification failed, decoding directly:', verifyError.message);
    try {
      const parts = data.access_token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        return {
          token: data.access_token,
          userInfo: payload,
        };
      }
      throw new Error('Invalid token format');
    } catch (decodeError: any) {
      console.error('Failed to decode token:', decodeError.message);
      throw new Error('Failed to process authentication token');
    }
  }
}

export async function authRoutes(fastify: FastifyInstance) {
  // Login endpoint - authenticates with Keycloak and returns token
  fastify.post('/login', async (request, reply) => {
    try {
      // Validate request body
      const body = request.body as { email?: string; password?: string };
      if (!body.email || !body.password) {
        return reply.code(400).send({ error: 'Email and password are required' });
      }
      const { email, password } = body;

      // If Keycloak is configured, authenticate with Keycloak
      if (env.KEYCLOAK_URL) {
        try {
          const { token, userInfo } = await authenticateWithKeycloak(email, password);

          // Try to get user from our database
          let dbUser = null;
          try {
            const result = await pool.query(`
              SELECT id, email, name, status, role, created_at, updated_at
              FROM muninn.users
              WHERE email = $1
              LIMIT 1
            `, [email]);
            
            if (result.rows.length > 0) {
              dbUser = result.rows[0];
            }
          } catch (dbError) {
            // Database error - continue without DB user
            request.log.warn({ error: dbError }, 'Failed to fetch user from database');
          }

          // Return user info from DB or create from Keycloak token
          const user = dbUser || {
            id: userInfo.sub,
            email: userInfo.email || email,
            name: userInfo.preferred_username || email.split('@')[0],
            role: 'user', // Default role
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          return reply.send({
            user,
            token,
          });
        } catch (authError: any) {
          request.log.error({ 
            error: authError.message, 
            email,
            keycloakUrl: env.KEYCLOAK_URL,
            realm: env.KEYCLOAK_REALM,
            clientId: env.KEYCLOAK_CLIENT_ID,
          }, 'Keycloak authentication failed');
          return reply.code(401).send({ 
            error: authError.message || 'Invalid credentials',
            details: 'Check that the user exists in Keycloak and Direct Access Grants is enabled'
          });
        }
      } else {
        // Demo mode - no Keycloak, just check if user exists in DB
        const result = await pool.query(`
          SELECT id, email, name, status, role, created_at, updated_at
          FROM muninn.users
          WHERE email = $1
          LIMIT 1
        `, [email]);

        if (result.rows.length === 0) {
          return reply.code(401).send({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        // Create a simple token for demo mode
        const token = `demo-token-${Date.now()}`;

        return reply.send({
          user,
          token,
        });
      }
    } catch (error: any) {
      request.log.error(error, 'Login failed');
      return reply.code(500).send({ error: 'Login failed', details: error.message });
    }
  });
}

