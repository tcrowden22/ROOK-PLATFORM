/**
 * Frontend SDK - HTTP Client
 * 
 * Replaces Supabase client with API calls to backend
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ApiError {
  error: string;
  code?: string;
  details?: any;
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Get auth token (from Keycloak or localStorage for migration period)
 */
function getAuthToken(): string | null {
  // Check for Keycloak token first
  const keycloakToken = localStorage.getItem('keycloak_token');
  if (keycloakToken) {
    return keycloakToken;
  }
  
  // Fallback to dev token
  return localStorage.getItem('rook_session_token');
}

/**
 * Get current organization ID from localStorage
 */
function getOrganizationId(): string | null {
  const orgId = localStorage.getItem('rook_current_organization_id');
  return orgId;
}

/**
 * HTTP client with auth header injection
 */
async function request<T>(
  method: string,
  path: string,
  options: {
    body?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const url = `${API_URL}${path}`;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // In demo mode, send user email so backend can look up user
  if (token && token.startsWith('demo-token-')) {
    const userStr = localStorage.getItem('rook_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.email) {
          headers['X-User-Email'] = user.email;
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  // Add organization ID header if available
  const organizationId = getOrganizationId();
  if (organizationId) {
    headers['X-Organization-Id'] = organizationId;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // If token is invalid (401), clear it and throw a more helpful error
    if (response.status === 401) {
      // Clear invalid token
      localStorage.removeItem('keycloak_token');
      localStorage.removeItem('rook_session_token');
      localStorage.removeItem('rook_user');
      
      // If we're not already on login page, redirect
      if (!window.location.pathname.includes('login')) {
        window.location.href = '/';
      }
      
      throw new ApiClientError(
        response.status,
        'Session expired. Please log in again.',
        'UNAUTHORIZED',
        data.details
      );
    }
    
    throw new ApiClientError(
      response.status,
      data.error || 'Request failed',
      data.code,
      data.details
    );
  }

  return data as T;
}

/**
 * GET request
 */
export async function get<T>(path: string): Promise<T> {
  return request<T>('GET', path);
}

/**
 * POST request
 */
export async function post<T>(path: string, body?: any): Promise<T> {
  return request<T>('POST', path, { body });
}

/**
 * PATCH request
 */
export async function patch<T>(path: string, body?: any): Promise<T> {
  return request<T>('PATCH', path, { body });
}

/**
 * PUT request
 */
export async function put<T>(path: string, body?: any): Promise<T> {
  return request<T>('PUT', path, { body });
}

/**
 * DELETE request
 */
export async function del<T>(path: string): Promise<T> {
  return request<T>('DELETE', path);
}

