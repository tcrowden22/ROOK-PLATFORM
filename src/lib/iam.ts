// IAM operations using Muninn SDK
import { muninn } from '../sdk';

async function createAuditLog(
  action: string,
  targetType?: string,
  targetId?: string,
  targetName?: string
): Promise<void> {
  // Note: Audit logs are created automatically by API endpoints
  // This function is kept for backward compatibility but logs are handled server-side
  console.log('Audit log would be created:', { action, targetType, targetId, targetName });
}

export const iam = {
  async lockUser(userId: string, userName: string) {
    try {
      await muninn.users.lock(userId, `User locked via IAM: ${userName}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to lock user' };
    }
  },

  async unlockUser(userId: string, userName: string) {
    try {
      await muninn.users.unlock(userId, `User unlocked via IAM: ${userName}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to unlock user' };
    }
  },

  async suspendUser(userId: string, userName: string) {
    try {
      await muninn.users.suspend(userId, `User suspended via IAM: ${userName}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to suspend user' };
    }
  },

  async activateUser(userId: string, userName: string) {
    try {
      await muninn.users.activate(userId, `User activated via IAM: ${userName}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to activate user' };
    }
  },

  async resetMFA(userId: string, userName: string) {
    try {
      await muninn.users.resetMFA(userId, `MFA reset via IAM: ${userName}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to reset MFA' };
    }
  },

  async createUser(userData: any) {
    try {
      const user = await muninn.users.create({
        email: userData.email,
        name: userData.name,
        role: userData.role,
        department: userData.department,
        employee_id: userData.employee_id,
        password: userData.password,
      });
      return { success: true, data: user };
    } catch (error: any) {
      return { success: false, data: null, error: error.message || 'Failed to create user' };
    }
  },

  async updateUser(userId: string, userData: any, userName: string) {
    try {
      await muninn.users.update(userId, {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        department: userData.department,
        employee_id: userData.employee_id,
        audit_note: `User updated via IAM: ${userName}`,
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update user' };
    }
  },

  async updatePasswordPolicy(policy: any) {
    try {
      await muninn.policies.updatePasswordPolicy(policy);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update password policy' };
    }
  },

  async getAuditLogs(filters?: { actor?: string; action?: string }) {
    try {
      return await muninn.audit.list(filters);
    } catch (error: any) {
      console.error('Failed to fetch audit logs:', error);
      return [];
    }
  },
};
