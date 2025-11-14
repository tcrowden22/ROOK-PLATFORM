export type UserStatus = 'active' | 'locked' | 'suspended';
export type UserRole = 'admin' | 'agent' | 'user';
export type TicketType = 'incident' | 'request';
export type TicketStatus = 'new' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type DeviceStatus = 'active' | 'retired';
export type JobStatus = 'pending' | 'running' | 'success' | 'failed';
export type ChangeStatus = 'draft' | 'pending_approval' | 'approved' | 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type ChangeRisk = 'low' | 'medium' | 'high';

export type SyncSource = 'idp' | 'local';

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

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
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
  change_summary?: string;
  breach_at?: string;
  resolved_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  ticket_id: string;
  author_user_id: string;
  body: string;
  created_at: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
  description: string;
  category?: string;
  form_schema?: Record<string, any>;
  created_at: string;
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
  ownership?: 'corporate' | 'personal' | 'shared';
  status: DeviceStatus;
  compliance: boolean;
  tags?: string[];
  organization_id?: string;
  last_seen_at: string;
  enrolled_at: string;
  updated_at?: string;
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
  status: JobStatus;
  created_at: string;
  finished_at?: string;
}

export interface Application {
  id: string;
  name: string;
  redirect_url: string;
  created_at: string;
}

export interface Incident {
  id: string;
  status: TicketStatus;
  priority: TicketPriority;
  requester_user_id: string;
  assignee_user_id?: string;
  device_id?: string;
  title: string;
  description: string;
  impact?: string;
  urgency?: string;
  breach_at?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequest {
  id: string;
  status: TicketStatus;
  priority: TicketPriority;
  requester_user_id: string;
  assignee_user_id?: string;
  catalog_item_id?: string;
  title: string;
  description: string;
  fulfillment_notes?: string;
  approved_by?: string;
  approved_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Problem {
  id: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigned_user_id?: string;
  title: string;
  description: string;
  root_cause?: string;
  workaround?: string;
  resolution?: string;
  related_incidents?: string[];
  created_at: string;
  updated_at: string;
}

export interface Change {
  id: string;
  status: ChangeStatus;
  risk: ChangeRisk;
  requester_user_id: string;
  assigned_user_id?: string;
  title: string;
  description: string;
  reason: string;
  impact_analysis?: string;
  rollback_plan?: string;
  approved_by?: string;
  approved_at?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: string;
  ticket_type: 'incident' | 'service_request' | 'problem' | 'change';
  ticket_id: string;
  author_user_id: string;
  body: string;
  mentions?: string[];
  created_at: string;
}

export interface Attachment {
  id: string;
  ticket_type: 'incident' | 'service_request' | 'problem' | 'change';
  ticket_id: string;
  file_name: string;
  file_path: string;
  file_size: string;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
}

export interface TicketHistory {
  id: string;
  ticket_type: 'incident' | 'service_request' | 'problem' | 'change';
  ticket_id: string;
  user_id?: string;
  action: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
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
