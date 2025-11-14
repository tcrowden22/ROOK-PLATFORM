-- Create gateway schema
CREATE SCHEMA IF NOT EXISTS gateway;

-- Create agents table
CREATE TABLE IF NOT EXISTS gateway.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text UNIQUE NOT NULL,  -- External agent identifier (e.g., hostname-mac)
  owner_user_id uuid REFERENCES muninn.users(id) ON DELETE CASCADE,
  api_key_hash text NOT NULL,     -- Hashed API key (bcrypt)
  device_id uuid REFERENCES huginn.devices(id) ON DELETE SET NULL,
  last_seen_at timestamptz,
  status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'inactive', 'revoked')),
  metadata jsonb DEFAULT '{}',    -- Additional agent metadata
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create telemetry submissions audit table
CREATE TABLE IF NOT EXISTS gateway.telemetry_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES gateway.agents(id) ON DELETE CASCADE,
  device_id uuid REFERENCES huginn.devices(id) ON DELETE SET NULL,
  record_count integer DEFAULT 1,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agents_agent_id ON gateway.agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_owner_user_id ON gateway.agents(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_agents_device_id ON gateway.agents(device_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON gateway.agents(status);
CREATE INDEX IF NOT EXISTS idx_telemetry_submissions_agent_id ON gateway.telemetry_submissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_submissions_created_at ON gateway.telemetry_submissions(created_at);


