import { authApi } from './auth-api';
import { User } from './types';

// Export authApi as auth for backward compatibility
export const auth = {
  async login(email: string, password: string): Promise<{ user: User; token: string } | { error: string }> {
    // Use new API-based auth
    return authApi.login(email, password);
  },

  async logout(): Promise<void> {
    return authApi.logout();
  },

  getToken(): string | null {
    return authApi.getToken();
  },

  getCurrentUser(): User | null {
    return authApi.getCurrentUser();
  },

  isAuthenticated(): boolean {
    return authApi.isAuthenticated();
  },

  async validateSession(): Promise<boolean> {
    return authApi.validateSession();
  },

  async updatePassword(userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { muninn } = await import('../sdk');
      await muninn.users.updatePassword(userId, newPassword);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to update password' };
    }
  },
};
