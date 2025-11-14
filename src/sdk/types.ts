/**
 * Shared TypeScript types for SDK
 * These match the backend API response types
 */

export type UserStatus = 'active' | 'locked' | 'suspended';
export type UserRole = 'admin' | 'agent' | 'user';
export type SyncSource = 'idp' | 'local';
export type TicketType = 'incident' | 'request';
export type TicketStatus = 'new' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type DeviceStatus = 'active' | 'retired';
export type DeviceOwnership = 'corporate' | 'personal' | 'shared';
export type JobStatus = 'pending' | 'running' | 'success' | 'failed';
export type DeviceActionStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface User {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  role: UserRole;
  department?: string;
  employee_id?: string;
  last_login?: string;
  sync_source?: SyncSource;
  mfa_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserDetail extends User {
  devices?: Device[];
  applications?: Application[];
  activity?: AuditLog[];
  groups?: Group[];
  roles?: Role[];
}

export interface Application {
  id: string;
  name: string;
  redirect_url: string;
  description?: string;
  logo_url?: string;
  scopes?: string[];
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_user_id?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  target_name?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  member_count?: number;
}

export interface Role {
  id: string;
  name: string;
  created_at: string;
}

export interface AuditNote {
  note: string;
}

export interface Ticket {
  id: string;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  requester_user_id: string;
  assignee_user_id?: string;
  device_id?: string;
  title: string;
  description: string;
  breach_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  hostname: string;
  os: string;
  os_version?: string;
  platform?: string;
  serial?: string;
  owner_user_id?: string;
  owner_name?: string;
  ownership?: DeviceOwnership;
  status: DeviceStatus;
  compliance: boolean;
  tags?: string[];
  organization_id?: string;
  last_seen_at: string;
  enrolled_at: string;
  updated_at?: string;
}

export interface DeviceListResponse {
  devices: Device[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DeviceDetail extends Device {
  owner_email?: string;
  telemetry?: Telemetry[];
  deployments?: DeploymentJob[];
  policies?: DevicePolicyAssignment[];
  activity?: DeviceActivity[];
}

export interface Telemetry {
  id: string;
  device_id: string;
  cpu?: number;
  memory?: number;
  disk?: number;
  created_at: string;
}

export interface SoftwarePackage {
  id: string;
  name: string;
  version: string;
  platform: string;
  created_at: string;
}

export interface DeploymentJob {
  id: string;
  device_id: string;
  package_id: string;
  package_name?: string;
  package_version?: string;
  package_platform?: string;
  status: JobStatus;
  created_at: string;
  finished_at?: string;
}

export interface DevicePolicy {
  id: string;
  name: string;
  description?: string;
  platform?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface DevicePolicyAssignment {
  id: string;
  policy_id: string;
  policy_name?: string;
  policy_description?: string;
  status: 'pending' | 'applied' | 'failed';
  assigned_at: string;
  applied_at?: string;
}

export interface DeviceActivity {
  id: string;
  device_id: string;
  action: string;
  initiated_by?: string;
  initiated_by_name?: string;
  status: DeviceActionStatus;
  metadata?: Record<string, any>;
  created_at: string;
  completed_at?: string;
}

export interface BulkActionRequest {
  deviceIds: string[];
  action: 'assignUser' | 'pushPolicy' | 'lock' | 'wipe' | 'rename' | 'tag';
  params?: {
    userId?: string;
    policyId?: string;
    hostname?: string;
    tags?: string[];
  };
}

export interface BulkActionResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors?: Array<{ deviceId: string; error: string }>;
}

export interface DeviceActionRequest {
  action: 'installApp' | 'rotateKey' | 'isolate' | 'restart' | 'wipe';
  params?: Record<string, any>;
}

export interface DeviceActionResponse {
  actionId: string;
  status: DeviceActionStatus;
}

export interface DashboardActivityItem {
  id: string;
  type: 'incident' | 'service-request' | 'device' | 'user';
  title: string;
  status?: string;
  description?: string;
  timestamp: string;
}

export interface DashboardMetrics {
  usersTotal: number;
  usersActive: number;
  usersLocked: number;
  ticketsTotal: number;
  ticketsOpen: number;
  ticketsClosed: number;
  ticketsResolvedToday: number;
  avgResolutionMinutes: number | null;
  incidentsOpen: number;
  serviceRequestsOpen: number;
  devicesTotal: number;
  devicesCompliant: number;
  devicesNonCompliant: number;
  recentActivity: DashboardActivityItem[];
}

// Re-export all types from lib/types for backward compatibility
export * from '../lib/types.js';

