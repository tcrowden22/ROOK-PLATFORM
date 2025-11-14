-- Move legacy service request rows from sigurd.tickets to sigurd.service_requests
-- Assumes service request schema columns can accept NULL where legacy data lacks values
INSERT INTO sigurd.service_requests (
  id,
  status,
  priority,
  requester_user_id,
  assignee_user_id,
  catalog_item_id,
  organization_id,
  title,
  description,
  fulfillment_notes,
  approved_by,
  approved_at,
  completed_at,
  created_at,
  updated_at
)
SELECT
  t.id,
  t.status,
  t.priority,
  t.requester_user_id,
  t.assignee_user_id,
  NULL AS catalog_item_id,
  t.organization_id,
  t.title,
  t.description,
  NULL AS fulfillment_notes,
  NULL AS approved_by,
  NULL AS approved_at,
  NULL AS completed_at,
  t.created_at,
  t.updated_at
FROM sigurd.tickets t
LEFT JOIN sigurd.service_requests sr ON sr.id = t.id
WHERE t.type = 'request'
  AND sr.id IS NULL;

-- Optionally, you can delete migrated rows from the legacy table.
-- Uncomment the following statement if you want to fully remove them once migrated.
-- DELETE FROM sigurd.tickets WHERE type = 'request' AND id IN (
--   SELECT id FROM sigurd.tickets EXCEPT SELECT id FROM sigurd.service_requests
-- );
