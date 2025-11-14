/**
 * Keycloak Client Configuration
 * Handles OIDC authentication via Keycloak
 */
import Keycloak from 'keycloak-js';

const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'rook';
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'rook-app';

const keycloakConfig = {
  url: KEYCLOAK_URL,
  realm: KEYCLOAK_REALM,
  clientId: KEYCLOAK_CLIENT_ID,
};

const keycloak = new Keycloak(keycloakConfig);
let isInitialized = false;

// Initialize Keycloak
export async function initKeycloak(): Promise<boolean> {
  // Prevent double initialization (React StrictMode in dev)
  if (isInitialized) {
    return keycloak.authenticated || false;
  }

  try {
    const authenticated = await keycloak.init({
      onLoad: 'check-sso', // Silent check first, redirect to login if needed
      checkLoginIframe: false,
      pkceMethod: 'S256',
      enableLogging: import.meta.env.DEV,
    });
    isInitialized = true;
    return authenticated;
  } catch (error: any) {
    // If already initialized error, mark as initialized and return current state
    if (error.message && error.message.includes('can only be initialized once')) {
      isInitialized = true;
      return keycloak.authenticated || false;
    }
    console.error('Keycloak initialization failed:', error);
    return false;
  }
}

// Login with Keycloak (redirects to Keycloak login page)
export async function keycloakLogin(): Promise<void> {
  await keycloak.login({
    redirectUri: window.location.origin,
  });
}

// Get current token
export function getKeycloakToken(): string | null {
  return keycloak.token || null;
}

// Refresh token
export async function refreshKeycloakToken(): Promise<boolean> {
  try {
    return await keycloak.updateToken(5); // Refresh if expires in 5 seconds
  } catch (error) {
    console.error('Token refresh failed:', error);
    // Try to login again if refresh fails
    await keycloakLogin();
    return false;
  }
}

// Logout
export async function keycloakLogout(): Promise<void> {
  await keycloak.logout({
    redirectUri: window.location.origin,
  });
}

// Get user info from token
export function getKeycloakUserInfo() {
  return keycloak.tokenParsed;
}

// Check if user is authenticated
export function isKeycloakAuthenticated(): boolean {
  return keycloak.authenticated || false;
}

// Register token refresh callback
export function onKeycloakTokenExpired(callback: () => void) {
  keycloak.onTokenExpired = callback;
}

export default keycloak;

