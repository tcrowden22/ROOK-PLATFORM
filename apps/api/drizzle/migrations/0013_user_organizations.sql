-- Migration: Create user-organizations junction table
-- Allows users to belong to multiple organizations

CREATE TABLE IF NOT EXISTS muninn.user_organizations (
  user_id uuid NOT NULL REFERENCES muninn.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES muninn.organizations(id) ON DELETE CASCADE,
  is_default boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, organization_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON muninn.user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_organization_id ON muninn.user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_default ON muninn.user_organizations(user_id, is_default) WHERE is_default = true;

-- Add comment for documentation
COMMENT ON TABLE muninn.user_organizations IS 'Junction table for many-to-many relationship between users and organizations. Tracks which organizations a user belongs to and their default organization.';
COMMENT ON COLUMN muninn.user_organizations.is_default IS 'Indicates if this is the default organization for the user. One organization per user should be marked as default.';

