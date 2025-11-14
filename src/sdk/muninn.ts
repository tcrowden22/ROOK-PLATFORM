/**
 * Muninn (IAM) API Client
 */
import { get, post, patch, put, del } from './client.js';
import type { User, UserDetail, Group, Role, AuditLog, Device, Application, AuditNote } from './types.js';

export const muninn = {
  users: {
    list: (search?: string): Promise<User[]> => {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      return get(`/api/muninn/users${params}`);
    },
    search: (query: string): Promise<User[]> => {
      const params = `?q=${encodeURIComponent(query)}`;
      return get(`/api/muninn/users/search${params}`);
    },
    get: (id: string): Promise<UserDetail> => get(`/api/muninn/users/${id}`),
    create: (data: {
      email: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      username?: string;
      role?: string;
      department?: string;
      employee_id?: string;
      password?: string;
      enabled?: boolean;
      emailVerified?: boolean;
      organization_id: string;
    }): Promise<User> => 
      post('/api/muninn/users', data),
    update: (id: string, data: {
      name?: string;
      email?: string;
      role?: string;
      department?: string;
      employee_id?: string;
      status?: string;
      audit_note?: string;
    }): Promise<User> => 
      patch(`/api/muninn/users/${id}`, data),
    lock: (id: string, auditNote?: string): Promise<User> => 
      post(`/api/muninn/users/${id}/lock`, { audit_note: auditNote }),
    unlock: (id: string, auditNote?: string): Promise<User> => 
      post(`/api/muninn/users/${id}/unlock`, { audit_note: auditNote }),
    suspend: (id: string, auditNote?: string): Promise<User> => 
      post(`/api/muninn/users/${id}/suspend`, { audit_note: auditNote }),
    activate: (id: string, auditNote?: string): Promise<User> => 
      post(`/api/muninn/users/${id}/activate`, { audit_note: auditNote }),
    updatePassword: (id: string, newPassword: string, auditNote?: string): Promise<{ success: boolean }> => 
      post(`/api/muninn/users/${id}/password`, { newPassword, audit_note: auditNote }),
    resetMFA: (id: string, auditNote?: string): Promise<User> => 
      post(`/api/muninn/users/${id}/reset-mfa`, { audit_note: auditNote }),
    getDevices: (id: string): Promise<Device[]> => 
      get(`/api/muninn/users/${id}/devices`),
    getApplications: (id: string): Promise<Application[]> => 
      get(`/api/muninn/users/${id}/applications`),
    getActivity: (id: string): Promise<AuditLog[]> => 
      get(`/api/muninn/users/${id}/activity`),
  },

  groups: {
    list: (): Promise<Group[]> => get('/api/muninn/groups'),
    get: (id: string): Promise<Group> => get(`/api/muninn/groups/${id}`),
    create: (name: string, description?: string): Promise<Group> => 
      post('/api/muninn/groups', { name, description }),
    getMembers: (groupId: string): Promise<User[]> => 
      get(`/api/muninn/groups/${groupId}/members`),
    getPolicies: (groupId: string): Promise<any[]> => 
      get(`/api/muninn/groups/${groupId}/policies`),
    addMember: (groupId: string, userId: string): Promise<void> =>
      post(`/api/muninn/groups/${groupId}/members`, { userId }).then(() => undefined),
    removeMember: (groupId: string, userId: string): Promise<void> =>
      del(`/api/muninn/groups/${groupId}/members/${userId}`).then(() => undefined),
  },

  roles: {
    list: (): Promise<Role[]> => get('/api/muninn/roles'),
    create: (name: string): Promise<Role> => 
      post('/api/muninn/roles', { name }),
  },

  audit: {
    list: (filters?: { action?: string }): Promise<AuditLog[]> => {
      const params = filters?.action ? `?action=${encodeURIComponent(filters.action)}` : '';
      return get(`/api/muninn/audit${params}`);
    },
  },

  policies: {
    list: (): Promise<any[]> => get('/api/muninn/policies'),
    updatePasswordPolicy: (policy: any): Promise<void> =>
      put('/api/muninn/policies/password', policy).then(() => undefined),
  },

  applications: {
    list: (): Promise<Application[]> => get('/api/muninn/applications'),
    create: (app: { name: string; description?: string; logo_url?: string; redirect_url: string; scopes?: string[] }): Promise<Application> =>
      post('/api/muninn/applications', app),
  },

  organizations: {
    list: (): Promise<Organization[]> => get('/api/muninn/organizations'),
    get: (id: string): Promise<Organization> => get(`/api/muninn/organizations/${id}`),
    create: (data: { name: string; domain?: string; metadata?: Record<string, any> }): Promise<Organization> =>
      post('/api/muninn/organizations', data),
    update: (id: string, data: { name?: string; domain?: string; status?: string; metadata?: Record<string, any> }): Promise<Organization> =>
      put(`/api/muninn/organizations/${id}`, data),
    assignUser: (userId: string, organizationId: string, isDefault?: boolean): Promise<void> =>
      post(`/api/muninn/users/${userId}/organizations`, { organization_id: organizationId, is_default: isDefault }).then(() => undefined),
    removeUser: (userId: string, organizationId: string): Promise<void> =>
      del(`/api/muninn/users/${userId}/organizations/${organizationId}`).then(() => undefined),
  },
};

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  status: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

