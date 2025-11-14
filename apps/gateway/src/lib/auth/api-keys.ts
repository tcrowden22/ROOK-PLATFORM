import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Generate a secure API key
 * Format: gk_<32 random bytes base64url encoded>
 */
export function generateApiKey(): string {
  const bytes = randomBytes(32);
  const key = bytes.toString('base64url');
  return `gk_${key}`;
}

/**
 * Hash an API key using scrypt
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scryptAsync(apiKey, salt, 64)) as Buffer;
  
  // Combine salt and hash for storage
  // Format: salt:hash (both base64url encoded)
  return `${salt.toString('base64url')}:${hash.toString('base64url')}`;
}

/**
 * Verify an API key against a hash
 */
export async function verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
  try {
    const [saltBase64, hashBase64] = hash.split(':');
    if (!saltBase64 || !hashBase64) {
      return false;
    }

    const salt = Buffer.from(saltBase64, 'base64url');
    const expectedHash = Buffer.from(hashBase64, 'base64url');
    
    const computedHash = (await scryptAsync(apiKey, salt, 64)) as Buffer;
    
    // Constant-time comparison
    if (expectedHash.length !== computedHash.length) {
      return false;
    }

    let isEqual = true;
    for (let i = 0; i < expectedHash.length; i++) {
      if (expectedHash[i] !== computedHash[i]) {
        isEqual = false;
      }
    }

    return isEqual;
  } catch (error) {
    return false;
  }
}

/**
 * Extract API key from header
 * Supports: X-API-Key header or Authorization: Bearer <key>
 */
export function extractApiKeyFromRequest(headers: Record<string, string | string[] | undefined>): string | null {
  // Try X-API-Key header first
  const apiKeyHeader = headers['x-api-key'];
  if (apiKeyHeader) {
    return Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
  }

  // Try Authorization: Bearer <key>
  const authHeader = headers['authorization'];
  if (authHeader) {
    const authValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    if (authValue.startsWith('Bearer ')) {
      return authValue.substring(7);
    }
  }

  return null;
}

