-- Migration: Migrate existing data to have organization_id
-- This creates a default organization and assigns all existing data to it

-- Step 1: Create default organization
INSERT INTO muninn.organizations (id, name, status, metadata)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Organization',
  'active',
  '{"migrated": true, "created_by": "migration"}'::jsonb
)
ON CONFLICT DO NOTHING;

-- Step 2: Assign all existing users to default organization
-- First, update users.organization_id
UPDATE muninn.users
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Step 3: Create user_organizations entries for all users
INSERT INTO muninn.user_organizations (user_id, organization_id, is_default)
SELECT 
  id as user_id,
  '00000000-0000-0000-0000-000000000001'::uuid as organization_id,
  true as is_default
FROM muninn.users
WHERE NOT EXISTS (
  SELECT 1 FROM muninn.user_organizations uo 
  WHERE uo.user_id = muninn.users.id 
  AND uo.organization_id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- Step 4: Update all tenant-scoped tables with default organization
-- Sigurd (Tickets & ITIL)
UPDATE sigurd.tickets
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE sigurd.incidents
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE sigurd.service_requests
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE sigurd.problems
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE sigurd.changes
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Skuld (Assets)
UPDATE skuld.assets
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Yggdrasil (Workflows)
UPDATE yggdrasil.workflows
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Huginn (Device Policies)
UPDATE huginn.device_policies
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Note: huginn.devices already may have organization_id from migration 0008
-- If not set, update them too
UPDATE huginn.devices
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Gateway (Agents) - will be handled in gateway migration
-- For now, we'll update if they exist
UPDATE gateway.agents
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Add comment
COMMENT ON TABLE muninn.organizations IS 'Organizations table. Default organization created during migration for existing data.';

