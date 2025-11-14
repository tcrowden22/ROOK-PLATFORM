-- Migration: Add organization_id to all tenant-scoped tables
-- This migration adds organization_id to all tables that need tenant isolation
-- Note: NOT NULL constraints will be added after data migration (0014)

-- 1. Users (Muninn) - Primary entity
ALTER TABLE muninn.users
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON muninn.users(organization_id);

-- 2. Sigurd (ITSM) - All ticket types
ALTER TABLE sigurd.tickets
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_tickets_organization_id ON sigurd.tickets(organization_id);

ALTER TABLE sigurd.incidents
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_incidents_organization_id ON sigurd.incidents(organization_id);

ALTER TABLE sigurd.service_requests
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_service_requests_organization_id ON sigurd.service_requests(organization_id);

ALTER TABLE sigurd.problems
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_problems_organization_id ON sigurd.problems(organization_id);

ALTER TABLE sigurd.changes
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_changes_organization_id ON sigurd.changes(organization_id);

-- 3. Skuld (Assets)
ALTER TABLE skuld.assets
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_assets_organization_id ON skuld.assets(organization_id);

-- 4. Yggdrasil (Workflows)
ALTER TABLE yggdrasil.workflows
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_workflows_organization_id ON yggdrasil.workflows(organization_id);

-- 5. Huginn (Device Policies - if org-scoped)
ALTER TABLE huginn.device_policies
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_device_policies_organization_id ON huginn.device_policies(organization_id);

-- Note: huginn.devices already has organization_id from migration 0008
-- Gateway agents will be handled in gateway migration

-- Add comments for documentation
COMMENT ON COLUMN muninn.users.organization_id IS 'Organization this user belongs to. Required for tenant isolation.';
COMMENT ON COLUMN sigurd.tickets.organization_id IS 'Organization this ticket belongs to. Required for tenant isolation.';
COMMENT ON COLUMN sigurd.incidents.organization_id IS 'Organization this incident belongs to. Required for tenant isolation.';
COMMENT ON COLUMN sigurd.service_requests.organization_id IS 'Organization this service request belongs to. Required for tenant isolation.';
COMMENT ON COLUMN sigurd.problems.organization_id IS 'Organization this problem belongs to. Required for tenant isolation.';
COMMENT ON COLUMN sigurd.changes.organization_id IS 'Organization this change belongs to. Required for tenant isolation.';
COMMENT ON COLUMN skuld.assets.organization_id IS 'Organization this asset belongs to. Required for tenant isolation.';
COMMENT ON COLUMN yggdrasil.workflows.organization_id IS 'Organization this workflow belongs to. Required for tenant isolation.';
COMMENT ON COLUMN huginn.device_policies.organization_id IS 'Organization this device policy belongs to. Required for tenant isolation.';

