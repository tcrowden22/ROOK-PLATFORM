export const crypto = {
  async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  },

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await this.hashPassword(password);
    return passwordHash === hash;
  },

  generateRandomToken(length: number = 32): string {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  generateRecoveryCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = this.generateRandomToken(4).toUpperCase().match(/.{1,4}/g)?.join('-') || '';
      codes.push(code);
    }
    return codes;
  },

  generateMFASecret(): string {
    return this.generateRandomToken(20);
  },

  validatePasswordComplexity(password: string, policy?: {
    min_length?: number;
    require_uppercase?: boolean;
    require_lowercase?: boolean;
    require_numbers?: boolean;
    require_special_chars?: boolean;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const p = policy || {
      min_length: 8,
      require_uppercase: true,
      require_lowercase: true,
      require_numbers: true,
      require_special_chars: false,
    };

    if (password.length < (p.min_length || 8)) {
      errors.push(`Password must be at least ${p.min_length} characters long`);
    }

    if (p.require_uppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (p.require_lowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (p.require_numbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (p.require_special_chars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};
