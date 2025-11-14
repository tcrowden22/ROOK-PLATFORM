/**
 * Auth API - Uses Keycloak OIDC or falls back to demo mode
 */
import { User } from './types';
// Keycloak logout handled server-side, no redirect needed
// import { keycloakLogout } from './keycloak';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const SESSION_KEY = 'rook_session_token';
const USER_KEY = 'rook_user';
const KEYCLOAK_ENABLED = import.meta.env.VITE_KEYCLOAK_URL !== undefined;

export const authApi = {
  async login(email: string, password: string): Promise<{ user: User; token: string } | { error: string }> {
    // Use backend API for login (handles Keycloak authentication server-side)
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Login failed' }));
        return { error: error.error || 'Invalid credentials' };
      }

      const data = await response.json();
      const user: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        status: data.user.status,
        created_at: data.user.created_at || data.user.createdAt,
        updated_at: data.user.updated_at || data.user.updatedAt,
      };

      // Store token and user
      if (KEYCLOAK_ENABLED) {
        localStorage.setItem('keycloak_token', data.token);
      } else {
        localStorage.setItem(SESSION_KEY, data.token);
      }
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      return { user, token: data.token };
    } catch (error: any) {
      console.error('Login error:', error);
      return { error: error.message || 'Login failed' };
    }
  },

  async logout(): Promise<void> {
    // Clear all auth data
    localStorage.removeItem('keycloak_token');
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
    
    // Keycloak logout is handled server-side if needed
    // No need to redirect to Keycloak logout page
    // The token is invalidated when cleared from localStorage
  },

  getToken(): string | null {
    if (KEYCLOAK_ENABLED) {
      // Check for Keycloak token in localStorage (from embedded login)
      return localStorage.getItem('keycloak_token');
    }
    return localStorage.getItem(SESSION_KEY);
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getCurrentUser();
  },

  async validateSession(): Promise<boolean> {
    // Check if token exists and user is stored
    const token = this.getToken();
    const user = this.getCurrentUser();
    
    if (!token || !user) {
      return false;
    }
    
    // Try to validate token by making a lightweight API call
    // Use a simple endpoint that doesn't require organization context
    // If token is invalid, it will fail and we'll clear it
    try {
      const response = await fetch(`${API_URL}/api/muninn/organizations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.status === 401 || response.status === 403) {
        // Token is invalid or unauthorized, clear it
        this.logout();
        return false;
      }
      
      return response.ok;
    } catch (error) {
      // Network error or token invalid - clear session
      console.warn('Session validation failed:', error);
      this.logout();
      return false;
    }
  },
};

