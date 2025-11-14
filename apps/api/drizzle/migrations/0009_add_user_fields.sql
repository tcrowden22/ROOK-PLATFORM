-- Migration: Add user fields for Okta parity
-- Adds department, employee_id, last_login, and sync_source fields
-- Also adds description to groups table if missing

-- Add new columns to users table
ALTER TABLE muninn.users
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS employee_id text,
  ADD COLUMN IF NOT EXISTS last_login timestamptz,
  ADD COLUMN IF NOT EXISTS sync_source text DEFAULT 'local';

-- Add description to groups table if missing
ALTER TABLE muninn.groups
  ADD COLUMN IF NOT EXISTS description text;

-- Create indexes for search performance
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON muninn.users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON muninn.users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_sync_source ON muninn.users(sync_source);

-- Add comment for sync_source column
COMMENT ON COLUMN muninn.users.sync_source IS 'Source of user data: idp (from identity provider) or local (local override)';

