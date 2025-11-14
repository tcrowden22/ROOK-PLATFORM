-- Migration: Create organizations table
-- Organizations are the primary tenant isolation mechanism

CREATE TABLE IF NOT EXISTS muninn.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text, -- Optional: email domain for auto-assignment
  status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'suspended', 'archived')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_organizations_domain ON muninn.organizations(domain);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON muninn.organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON muninn.organizations(name);

-- Add comments for documentation
COMMENT ON TABLE muninn.organizations IS 'Organizations are the primary tenant isolation mechanism. All tenant-scoped data is associated with an organization.';
COMMENT ON COLUMN muninn.organizations.domain IS 'Optional email domain for automatic organization assignment during user creation';
COMMENT ON COLUMN muninn.organizations.status IS 'Organization status: active (normal operation), suspended (temporarily disabled), archived (soft deleted)';

