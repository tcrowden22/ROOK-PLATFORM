/**
 * Keycloak Admin API Helper
 * Provides functions to manage Keycloak users via Admin API
 */
import { env } from '../config/env.js';

let adminToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Get Keycloak admin access token
 * Uses admin-cli client to authenticate with master realm
 */
async function getAdminToken(): Promise<string> {
  // Return cached token if still valid (with 30s buffer)
  if (adminToken && Date.now() < tokenExpiresAt - 30000) {
    return adminToken;
  }

  if (!env.KEYCLOAK_URL) {
    throw new Error('Keycloak not configured');
  }

  const adminUser = process.env.KEYCLOAK_ADMIN || 'admin';
  const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';

  // Get token from master realm using admin-cli
  // Master realm token endpoint is at base URL (without /auth), but admin API needs /auth
  if (!env.KEYCLOAK_URL) {
    throw new Error('Keycloak not configured');
  }
  const baseUrl = env.KEYCLOAK_URL.includes('/auth') 
    ? env.KEYCLOAK_URL.replace('/auth', '') 
    : env.KEYCLOAK_URL;
  const tokenUrl = `${baseUrl}/realms/master/protocol/openid-connect/token`;
  
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: 'admin-cli',
    username: adminUser,
    password: adminPassword,
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get admin token: ${response.status} ${errorText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    adminToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in * 1000);
    
    return adminToken;
  } catch (error: any) {
    console.error('Keycloak admin token error:', error);
    throw new Error(`Failed to get Keycloak admin token: ${error.message}`);
  }
}

/**
 * Create user in Keycloak
 */
export async function createKeycloakUser(data: {
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  password: string;
  enabled?: boolean;
  emailVerified?: boolean;
}): Promise<string> {
  if (!env.KEYCLOAK_URL || !env.KEYCLOAK_REALM) {
    throw new Error('Keycloak not configured');
  }

  const token = await getAdminToken();
  const realm = env.KEYCLOAK_REALM;
  if (!env.KEYCLOAK_URL) {
    throw new Error('Keycloak not configured');
  }
  const baseUrl = env.KEYCLOAK_URL.includes('/auth') 
    ? env.KEYCLOAK_URL.replace('/auth', '') 
    : env.KEYCLOAK_URL;

  // Admin API needs /auth prefix
  const adminBaseUrl = env.KEYCLOAK_URL.includes('/auth') 
    ? env.KEYCLOAK_URL 
    : `${env.KEYCLOAK_URL}/auth`;

  // Use email as username if not provided
  const username = data.username || data.email;

  // Use provided firstName/lastName or split from firstName if provided
  const firstName = data.firstName || '';
  const lastName = data.lastName || '';

  // Create user
  const createUserUrl = `${adminBaseUrl}/admin/realms/${realm}/users`;
  const userData = {
    username,
    email: data.email,
    firstName,
    lastName,
    enabled: data.enabled !== false,
    emailVerified: data.emailVerified !== false,
    requiredActions: [],
  };

  try {
    const createResponse = await fetch(createUserUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!createResponse.ok) {
      if (createResponse.status === 409) {
        // User already exists, try to find and return their ID
        const adminBaseUrl = env.KEYCLOAK_URL.includes('/auth') 
          ? env.KEYCLOAK_URL 
          : `${env.KEYCLOAK_URL}/auth`;
        const searchUrl = `${adminBaseUrl}/admin/realms/${realm}/users?username=${encodeURIComponent(username)}`;
        const searchResponse = await fetch(searchUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (searchResponse.ok) {
          const users = await searchResponse.json() as any[];
          if (users.length > 0) {
            return users[0].id;
          }
        }
        throw new Error('User already exists in Keycloak');
      }
      const errorText = await createResponse.text();
      throw new Error(`Failed to create Keycloak user: ${createResponse.status} ${errorText}`);
    }

    // Get the created user ID from Location header
    const location = createResponse.headers.get('Location');
    if (location) {
      const userId = location.split('/').pop();
      if (userId) {
        // Set password
        await setKeycloakUserPassword(userId, data.password, token, baseUrl, realm);
        return userId;
      }
    }

    // Fallback: search for the user we just created
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait a bit for Keycloak to process
    // Note: KEYCLOAK_URL is already validated at function start
    const adminBaseUrl = env.KEYCLOAK_URL!.includes('/auth') 
      ? env.KEYCLOAK_URL 
      : `${env.KEYCLOAK_URL}/auth`;
    const searchUrl = `${adminBaseUrl}/admin/realms/${realm}/users?username=${encodeURIComponent(username)}`;
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (searchResponse.ok) {
      const users = await searchResponse.json() as any[];
      if (users.length > 0) {
        const userId = users[0].id;
        await setKeycloakUserPassword(userId, data.password, token, baseUrl, realm);
        return userId;
      }
    }

    throw new Error('User created but could not retrieve user ID');
  } catch (error: any) {
    console.error('Keycloak user creation error:', error);
    throw error;
  }
}

/**
 * Set password for a Keycloak user
 */
async function setKeycloakUserPassword(
  userId: string,
  password: string,
  token: string,
  baseUrl: string,
  realm: string
): Promise<void> {
  // Admin API needs /auth prefix - use env directly since we need the full URL
  if (!env.KEYCLOAK_URL) {
    throw new Error('Keycloak not configured');
  }
  const adminBaseUrl = env.KEYCLOAK_URL.includes('/auth') 
    ? env.KEYCLOAK_URL 
    : `${env.KEYCLOAK_URL}/auth`;
  const passwordUrl = `${adminBaseUrl}/admin/realms/${realm}/users/${userId}/reset-password`;
  
  const passwordData = {
    type: 'password',
    value: password,
    temporary: false,
  };

  const response = await fetch(passwordUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(passwordData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to set Keycloak password: ${response.status} ${errorText}`);
  }
}

/**
 * Assign role to Keycloak user
 */
export async function assignKeycloakRole(userId: string, roleName: string): Promise<void> {
  if (!env.KEYCLOAK_URL || !env.KEYCLOAK_REALM) {
    throw new Error('Keycloak not configured');
  }

  const token = await getAdminToken();
  const realm = env.KEYCLOAK_REALM;
  // Note: KEYCLOAK_URL is already checked at function start (line 233)
  const adminBaseUrl = env.KEYCLOAK_URL.includes('/auth') 
    ? env.KEYCLOAK_URL 
    : `${env.KEYCLOAK_URL}/auth`;

  try {
    // Get role details
    const roleUrl = `${adminBaseUrl}/admin/realms/${realm}/roles/${encodeURIComponent(roleName)}`;
    const roleResponse = await fetch(roleUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!roleResponse.ok) {
      // Role doesn't exist, skip assignment
      console.warn(`Role ${roleName} does not exist in Keycloak, skipping role assignment`);
      return;
    }

    const role = await roleResponse.json() as { id: string; name: string };

    // Assign role to user
    const assignUrl = `${adminBaseUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`;
    const assignResponse = await fetch(assignUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([role]),
    });

    if (!assignResponse.ok) {
      const errorText = await assignResponse.text();
      console.warn(`Failed to assign role ${roleName} to user: ${assignResponse.status} ${errorText}`);
      // Don't throw - role assignment is optional
    }
  } catch (error: any) {
    console.warn(`Failed to assign Keycloak role: ${error.message}`);
    // Don't throw - role assignment is optional
  }
}

/**
 * Assign user to Keycloak organization group
 * Creates group if it doesn't exist, then assigns user to it
 */
export async function assignKeycloakOrganization(userId: string, organizationId: string): Promise<void> {
  if (!env.KEYCLOAK_URL || !env.KEYCLOAK_REALM) {
    throw new Error('Keycloak not configured');
  }

  const token = await getAdminToken();
  const realm = env.KEYCLOAK_REALM;
  const adminBaseUrl = env.KEYCLOAK_URL.includes('/auth') 
    ? env.KEYCLOAK_URL 
    : `${env.KEYCLOAK_URL}/auth`;

  const groupName = `org-${organizationId}`;

  try {
    // Check if group exists
    const searchUrl = `${adminBaseUrl}/admin/realms/${realm}/groups?search=${encodeURIComponent(groupName)}`;
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    let groupId: string | null = null;

    if (searchResponse.ok) {
      const groups = await searchResponse.json() as any[];
      const existingGroup = groups.find(g => g.name === groupName);
      if (existingGroup) {
        groupId = existingGroup.id;
      }
    }

    // Create group if it doesn't exist
    if (!groupId) {
      const createGroupUrl = `${adminBaseUrl}/admin/realms/${realm}/groups`;
      const createResponse = await fetch(createGroupUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: groupName,
          attributes: {
            organizationId: [organizationId],
          },
        }),
      });

      if (createResponse.ok) {
        const location = createResponse.headers.get('Location');
        if (location) {
          groupId = location.split('/').pop() || null;
        } else {
          // Fallback: search again
          const searchAgainResponse = await fetch(searchUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (searchAgainResponse.ok) {
            const groups = await searchAgainResponse.json() as any[];
            const newGroup = groups.find(g => g.name === groupName);
            if (newGroup) {
              groupId = newGroup.id;
            }
          }
        }
      }
    }

    if (!groupId) {
      console.warn(`Failed to create or find Keycloak group ${groupName}`);
      return;
    }

    // Assign user to group
    const assignUrl = `${adminBaseUrl}/admin/realms/${realm}/users/${userId}/groups/${groupId}`;
    const assignResponse = await fetch(assignUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!assignResponse.ok) {
      const errorText = await assignResponse.text();
      console.warn(`Failed to assign user to Keycloak group: ${assignResponse.status} ${errorText}`);
      // Don't throw - group assignment is optional
    }
  } catch (error: any) {
    console.warn(`Failed to assign Keycloak organization group: ${error.message}`);
    // Don't throw - group assignment is optional
  }
}

