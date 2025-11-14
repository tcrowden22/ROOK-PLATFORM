-- Create registration_codes table for agent registration codes
CREATE TABLE IF NOT EXISTS gateway.registration_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,  -- Registration code (e.g., "RC-XXXX-XXXX")
  created_by_user_id uuid REFERENCES muninn.users(id) ON DELETE CASCADE NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by_agent_id uuid REFERENCES gateway.agents(id) ON DELETE SET NULL,
  status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'used', 'expired', 'revoked')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_registration_codes_code ON gateway.registration_codes(code);
CREATE INDEX IF NOT EXISTS idx_registration_codes_created_by ON gateway.registration_codes(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_registration_codes_status ON gateway.registration_codes(status);
CREATE INDEX IF NOT EXISTS idx_registration_codes_expires_at ON gateway.registration_codes(expires_at);





