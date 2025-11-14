-- Migration: Add enhanced device fields and supporting tables
-- This migration adds missing fields to devices table and creates policy/activity tables

-- Create device_ownership enum
DO $$ BEGIN
  CREATE TYPE huginn.device_ownership AS ENUM ('corporate', 'personal', 'shared');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to devices table
ALTER TABLE huginn.devices
  ADD COLUMN IF NOT EXISTS os_version text,
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS serial text,
  ADD COLUMN IF NOT EXISTS ownership huginn.device_ownership DEFAULT 'corporate',
  ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS organization_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_devices_serial ON huginn.devices(serial);
CREATE INDEX IF NOT EXISTS idx_devices_platform ON huginn.devices(platform);
CREATE INDEX IF NOT EXISTS idx_devices_ownership ON huginn.devices(ownership);
CREATE INDEX IF NOT EXISTS idx_devices_organization ON huginn.devices(organization_id);

-- Create device_policies table
CREATE TABLE IF NOT EXISTS huginn.device_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  platform text, -- null = all platforms
  config jsonb DEFAULT '{}'::jsonb NOT NULL,
  enabled boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create device_policy_assignments table
CREATE TABLE IF NOT EXISTS huginn.device_policy_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES huginn.devices(id) ON DELETE CASCADE NOT NULL,
  policy_id uuid REFERENCES huginn.device_policies(id) ON DELETE CASCADE NOT NULL,
  assigned_at timestamptz DEFAULT now() NOT NULL,
  applied_at timestamptz,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'applied', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_device_policy_assignments_device ON huginn.device_policy_assignments(device_id);
CREATE INDEX IF NOT EXISTS idx_device_policy_assignments_policy ON huginn.device_policy_assignments(policy_id);

-- Create device_activity table
CREATE TABLE IF NOT EXISTS huginn.device_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES huginn.devices(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL, -- installApp, rotateKey, isolate, restart, wipe, etc.
  initiated_by uuid REFERENCES muninn.users(id),
  status text DEFAULT 'queued' NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_device_activity_device ON huginn.device_activity(device_id);
CREATE INDEX IF NOT EXISTS idx_device_activity_action ON huginn.device_activity(action);
CREATE INDEX IF NOT EXISTS idx_device_activity_created_at ON huginn.device_activity(created_at);

