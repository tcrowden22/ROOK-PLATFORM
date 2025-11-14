-- Migrate legacy incident rows from sigurd.tickets to sigurd.incidents
INSERT INTO sigurd.incidents (
  id,
  status,
  priority,
  requester_user_id,
  assignee_user_id,
  device_id,
  organization_id,
  title,
  description,
  impact,
  urgency,
  breach_at,
  resolved_at,
  created_at,
  updated_at
)
SELECT
  t.id,
  t.status,
  t.priority,
  t.requester_user_id,
  t.assignee_user_id,
  t.device_id,
  t.organization_id,
  t.title,
  t.description,
  NULL AS impact,
  NULL AS urgency,
  t.breach_at,
  t.resolved_at,
  t.created_at,
  t.updated_at
FROM sigurd.tickets t
LEFT JOIN sigurd.incidents i ON i.id = t.id
WHERE t.type = 'incident'
  AND i.id IS NULL;
