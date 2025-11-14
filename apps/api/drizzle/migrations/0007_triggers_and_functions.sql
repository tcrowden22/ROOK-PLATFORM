-- Triggers and Functions
-- These recreate the functionality from Supabase migrations

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to audit user changes
CREATE OR REPLACE FUNCTION audit_user_changes()
RETURNS TRIGGER AS $$
DECLARE
  action_name text;
  current_user_id uuid;
BEGIN
  -- In backend, we'll pass user_id via application context
  -- For now, use NULL if not available
  current_user_id := NULL;

  IF TG_OP = 'INSERT' THEN
    action_name := 'user.created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      action_name := 'user.status_changed';
    ELSIF OLD.role != NEW.role THEN
      action_name := 'user.role_changed';
    ELSIF (OLD.mfa_enabled IS DISTINCT FROM NEW.mfa_enabled) THEN
      action_name := 'user.mfa_changed';
    ELSE
      action_name := 'user.updated';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_name := 'user.deleted';
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO muninn.audit_logs (actor_user_id, action, target_type, target_id, target_name, metadata)
    VALUES (
      current_user_id,
      action_name,
      'user',
      OLD.id,
      OLD.email,
      jsonb_build_object('operation', TG_OP, 'table', TG_TABLE_NAME)
    );
    RETURN OLD;
  ELSE
    INSERT INTO muninn.audit_logs (actor_user_id, action, target_type, target_id, target_name, metadata)
    VALUES (
      current_user_id,
      action_name,
      'user',
      NEW.id,
      NEW.email,
      jsonb_build_object(
        'operation', TG_OP,
        'table', TG_TABLE_NAME,
        'changes', CASE
          WHEN TG_OP = 'UPDATE' THEN
            jsonb_build_object(
              'old_status', OLD.status,
              'new_status', NEW.status,
              'old_role', OLD.role,
              'new_role', NEW.role
            )
          ELSE '{}'::jsonb
        END
      )
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment workflow run count
CREATE OR REPLACE FUNCTION increment_workflow_run_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('running', 'success') THEN
    UPDATE yggdrasil.workflows
    SET
      run_count = run_count + 1,
      last_run_at = NEW.started_at
    WHERE id = NEW.workflow_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate run duration
CREATE OR REPLACE FUNCTION calculate_run_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    NEW.duration_ms = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at (applied to tables that need it)
-- Note: Drizzle will create these via schema, but we include them here for manual migration

-- Trigger for user audit logging
CREATE TRIGGER audit_users_trigger
  AFTER INSERT OR UPDATE OR DELETE ON muninn.users
  FOR EACH ROW
  EXECUTE FUNCTION audit_user_changes();

-- Trigger for workflow run count
CREATE TRIGGER auto_increment_workflow_run_count
  AFTER INSERT ON yggdrasil.workflow_run_logs
  FOR EACH ROW
  EXECUTE FUNCTION increment_workflow_run_count();

-- Trigger for workflow duration calculation
CREATE TRIGGER auto_calculate_run_duration
  BEFORE UPDATE ON yggdrasil.workflow_run_logs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_run_duration();

