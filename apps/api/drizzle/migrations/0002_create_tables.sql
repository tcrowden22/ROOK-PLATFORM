-- Create all tables in their respective schemas
-- This migration creates all tables from the original Supabase schema

-- MUNINN SCHEMA TABLES
CREATE TABLE IF NOT EXISTS muninn.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'locked', 'suspended')),
  role text DEFAULT 'user' NOT NULL CHECK (role IN ('admin', 'agent', 'user')),
  mfa_enabled boolean DEFAULT false,
  mfa_secret text,
  recovery_codes text[],
  temp_password boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS muninn.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS muninn.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS muninn.user_groups (
  user_id uuid REFERENCES muninn.users(id) ON DELETE CASCADE,
  group_id uuid REFERENCES muninn.groups(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, group_id)
);

CREATE TABLE IF NOT EXISTS muninn.user_roles (
  user_id uuid REFERENCES muninn.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES muninn.roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS muninn.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES muninn.users(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS muninn.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES muninn.users(id),
  action text NOT NULL,
  target_type text,
  target_id uuid,
  target_name text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS muninn.iam_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('password', 'session', 'access', 'compliance')),
  value jsonb DEFAULT '{}',
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS muninn.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  redirect_url text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS muninn.sso_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES muninn.users(id) ON DELETE CASCADE NOT NULL,
  application_id uuid REFERENCES muninn.applications(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- SIGURD SCHEMA TABLES
CREATE TABLE IF NOT EXISTS sigurd.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('incident', 'request')),
  status text DEFAULT 'new' NOT NULL CHECK (status IN ('new', 'in_progress', 'waiting', 'resolved', 'closed')),
  priority text DEFAULT 'medium' NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  requester_user_id uuid REFERENCES muninn.users(id) NOT NULL,
  assignee_user_id uuid REFERENCES muninn.users(id),
  device_id uuid,
  title text NOT NULL,
  description text NOT NULL,
  breach_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS sigurd.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES sigurd.tickets(id) ON DELETE CASCADE NOT NULL,
  author_user_id uuid REFERENCES muninn.users(id) NOT NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS sigurd.knowledge_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS sigurd.service_catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS sigurd.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text DEFAULT 'new' NOT NULL CHECK (status IN ('new', 'in_progress', 'waiting', 'resolved', 'closed')),
  priority text DEFAULT 'medium' NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  requester_user_id uuid REFERENCES muninn.users(id) NOT NULL,
  assignee_user_id uuid REFERENCES muninn.users(id),
  device_id uuid,
  title text NOT NULL,
  description text NOT NULL,
  impact text,
  urgency text,
  breach_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS sigurd.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text DEFAULT 'new' NOT NULL CHECK (status IN ('new', 'in_progress', 'waiting', 'resolved', 'closed')),
  priority text DEFAULT 'medium' NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  requester_user_id uuid REFERENCES muninn.users(id) NOT NULL,
  assignee_user_id uuid REFERENCES muninn.users(id),
  catalog_item_id uuid REFERENCES sigurd.service_catalog_items(id),
  title text NOT NULL,
  description text NOT NULL,
  fulfillment_notes text,
  approved_by uuid REFERENCES muninn.users(id),
  approved_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS sigurd.problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text DEFAULT 'new' NOT NULL CHECK (status IN ('new', 'in_progress', 'waiting', 'resolved', 'closed')),
  priority text DEFAULT 'medium' NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_user_id uuid REFERENCES muninn.users(id),
  title text NOT NULL,
  description text NOT NULL,
  root_cause text,
  workaround text,
  resolution text,
  related_incidents uuid[],
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS sigurd.changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'pending_approval', 'approved', 'scheduled', 'in_progress', 'completed', 'failed', 'cancelled')),
  risk text DEFAULT 'medium' NOT NULL CHECK (risk IN ('low', 'medium', 'high')),
  requester_user_id uuid REFERENCES muninn.users(id) NOT NULL,
  assigned_user_id uuid REFERENCES muninn.users(id),
  title text NOT NULL,
  description text NOT NULL,
  reason text NOT NULL,
  impact_analysis text,
  rollback_plan text,
  approved_by uuid REFERENCES muninn.users(id),
  approved_at timestamptz,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS sigurd.ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type text NOT NULL,
  ticket_id uuid NOT NULL,
  author_user_id uuid REFERENCES muninn.users(id) NOT NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS sigurd.sigurd_ticket_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type text NOT NULL,
  ticket_id uuid NOT NULL,
  user_id uuid REFERENCES muninn.users(id),
  action text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- HUGINN SCHEMA TABLES
CREATE TABLE IF NOT EXISTS huginn.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname text NOT NULL,
  os text NOT NULL,
  owner_user_id uuid REFERENCES muninn.users(id),
  status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'retired')),
  compliance boolean DEFAULT true NOT NULL,
  last_seen_at timestamptz DEFAULT now() NOT NULL,
  enrolled_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS huginn.telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES huginn.devices(id) ON DELETE CASCADE NOT NULL,
  cpu numeric,
  memory numeric,
  disk numeric,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS huginn.software_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version text NOT NULL,
  platform text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS huginn.deployment_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES huginn.devices(id) ON DELETE CASCADE NOT NULL,
  package_id uuid REFERENCES huginn.software_packages(id) NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failed')),
  created_at timestamptz DEFAULT now() NOT NULL,
  finished_at timestamptz
);

-- Add foreign key for tickets.device_id
ALTER TABLE sigurd.tickets 
  ADD CONSTRAINT tickets_device_id_fkey 
  FOREIGN KEY (device_id) REFERENCES huginn.devices(id);

ALTER TABLE sigurd.incidents 
  ADD CONSTRAINT incidents_device_id_fkey 
  FOREIGN KEY (device_id) REFERENCES huginn.devices(id);

-- SKULD SCHEMA TABLES
CREATE TABLE IF NOT EXISTS skuld.lifecycle_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  retire_after_months integer DEFAULT 36,
  warranty_months integer DEFAULT 12,
  actions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skuld.asset_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('laptop', 'desktop', 'phone', 'tablet', 'peripheral', 'software', 'license', 'other')),
  manufacturer text NOT NULL,
  specs jsonb DEFAULT '{}',
  lifecycle_policy_id uuid REFERENCES skuld.lifecycle_policies(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skuld.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  external_id text,
  contact jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skuld.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  address jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skuld.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text UNIQUE,
  serial text,
  model_id uuid REFERENCES skuld.asset_models(id),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'ordered', 'received', 'in_stock', 'assigned', 'in_use', 'in_repair', 'lost', 'retired', 'disposed')),
  owner_user_id uuid REFERENCES muninn.users(id),
  device_id uuid REFERENCES huginn.devices(id),
  location_id uuid REFERENCES skuld.locations(id),
  cost numeric(10,2),
  purchase_date date,
  warranty_end date,
  vendor_id uuid REFERENCES skuld.vendors(id),
  po_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skuld.asset_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES skuld.assets(id) ON DELETE CASCADE,
  type text NOT NULL,
  from_status text,
  to_status text,
  actor_user_id uuid REFERENCES muninn.users(id),
  payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skuld.asset_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES skuld.assets(id) ON DELETE CASCADE,
  assignee_user_id uuid NOT NULL REFERENCES muninn.users(id),
  assignee_org_unit text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skuld.asset_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('csv', 'workday', 'intune', 'jamf', 'kandji', 'sentinelone', 'manageengine')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  stats jsonb DEFAULT '{}',
  error_text text,
  created_by uuid REFERENCES muninn.users(id),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- YGGDRASIL SCHEMA TABLES
CREATE TABLE IF NOT EXISTS yggdrasil.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled')),
  trigger_type text NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'event')),
  definition jsonb DEFAULT '{}',
  created_by uuid REFERENCES muninn.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_run_at timestamptz,
  run_count integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS yggdrasil.workflow_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES yggdrasil.workflows(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('webhook', 'schedule', 'event', 'manual')),
  enabled boolean DEFAULT true,
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS yggdrasil.workflow_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  config jsonb DEFAULT '{}',
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS yggdrasil.workflow_run_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES yggdrasil.workflows(id) ON DELETE CASCADE,
  workflow_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('running', 'success', 'failed', 'cancelled')),
  started_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  duration_ms integer,
  trigger_type text NOT NULL,
  error_message text,
  steps_completed integer DEFAULT 0,
  steps_total integer DEFAULT 0,
  payload jsonb DEFAULT '{}'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON muninn.users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON muninn.users(status);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON muninn.sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON muninn.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON sigurd.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_requester ON sigurd.tickets(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON sigurd.tickets(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_device ON sigurd.tickets(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_owner ON huginn.devices(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_devices_compliance ON huginn.devices(compliance);
CREATE INDEX IF NOT EXISTS idx_telemetry_device ON huginn.telemetry(device_id);
CREATE INDEX IF NOT EXISTS idx_deployment_jobs_device ON huginn.deployment_jobs(device_id);
CREATE INDEX IF NOT EXISTS idx_assets_model_id ON skuld.assets(model_id);
CREATE INDEX IF NOT EXISTS idx_assets_owner_user_id ON skuld.assets(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_assets_device_id ON skuld.assets(device_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON yggdrasil.workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_created_by ON yggdrasil.workflows(created_by);

