import { randomBytes } from 'crypto';

/**
 * Generate a unique registration code
 * Format: RC-{8 hex chars}-{8 hex chars}
 * Example: RC-A1B2C3D4-E5F6G7H8
 */
export function generateRegistrationCode(): string {
  const part1 = randomBytes(4).toString('hex').toUpperCase();
  const part2 = randomBytes(4).toString('hex').toUpperCase();
  return `RC-${part1}-${part2}`;
}

/**
 * Validate registration code format
 */
export function isValidCodeFormat(code: string): boolean {
  const pattern = /^RC-[A-F0-9]{8}-[A-F0-9]{8}$/;
  return pattern.test(code);
}

/**
 * Check if code is expired
 */
export function isCodeExpired(expiresAt: Date | string): boolean {
  const expires = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return expires < new Date();
}

/**
 * Check if code can be used (not used, not expired, not revoked)
 */
export function canUseCode(
  status: string,
  expiresAt: Date | string,
  usedAt: Date | string | null
): boolean {
  if (status !== 'active') {
    return false;
  }
  
  if (usedAt !== null) {
    return false;
  }
  
  if (isCodeExpired(expiresAt)) {
    return false;
  }
  
  return true;
}





