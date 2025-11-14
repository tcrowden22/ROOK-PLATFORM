-- Migration: Add organization_id to gateway.agents
-- Gateway agents need to be scoped to organizations for tenant isolation

ALTER TABLE gateway.agents
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_agents_organization_id ON gateway.agents(organization_id);

-- Add comment for documentation
COMMENT ON COLUMN gateway.agents.organization_id IS 'Organization this agent belongs to. Required for tenant isolation.';

