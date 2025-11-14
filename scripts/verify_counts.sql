-- Verification Script for Data Migration
-- Compares row counts and checks data integrity

-- Row counts by module
SELECT 
    'muninn' as schema,
    'users' as table_name,
    COUNT(*) as row_count
FROM muninn.users
UNION ALL
SELECT 'muninn', 'groups', COUNT(*) FROM muninn.groups
UNION ALL
SELECT 'muninn', 'roles', COUNT(*) FROM muninn.roles
UNION ALL
SELECT 'muninn', 'sessions', COUNT(*) FROM muninn.sessions
UNION ALL
SELECT 'muninn', 'audit_logs', COUNT(*) FROM muninn.audit_logs
UNION ALL
SELECT 'sigurd', 'tickets', COUNT(*) FROM sigurd.tickets
UNION ALL
SELECT 'sigurd', 'comments', COUNT(*) FROM sigurd.comments
UNION ALL
SELECT 'sigurd', 'incidents', COUNT(*) FROM sigurd.incidents
UNION ALL
SELECT 'sigurd', 'service_requests', COUNT(*) FROM sigurd.service_requests
UNION ALL
SELECT 'sigurd', 'problems', COUNT(*) FROM sigurd.problems
UNION ALL
SELECT 'sigurd', 'changes', COUNT(*) FROM sigurd.changes
UNION ALL
SELECT 'huginn', 'devices', COUNT(*) FROM huginn.devices
UNION ALL
SELECT 'huginn', 'telemetry', COUNT(*) FROM huginn.telemetry
UNION ALL
SELECT 'huginn', 'software_packages', COUNT(*) FROM huginn.software_packages
UNION ALL
SELECT 'huginn', 'deployment_jobs', COUNT(*) FROM huginn.deployment_jobs
UNION ALL
SELECT 'skuld', 'assets', COUNT(*) FROM skuld.assets
UNION ALL
SELECT 'skuld', 'asset_models', COUNT(*) FROM skuld.asset_models
UNION ALL
SELECT 'skuld', 'vendors', COUNT(*) FROM skuld.vendors
UNION ALL
SELECT 'skuld', 'locations', COUNT(*) FROM skuld.locations
UNION ALL
SELECT 'yggdrasil', 'workflows', COUNT(*) FROM yggdrasil.workflows
UNION ALL
SELECT 'yggdrasil', 'workflow_triggers', COUNT(*) FROM yggdrasil.workflow_triggers
UNION ALL
SELECT 'yggdrasil', 'workflow_run_logs', COUNT(*) FROM yggdrasil.workflow_run_logs
ORDER BY schema, table_name;

-- Foreign key integrity check
SELECT 
    'Foreign key check' as check_type,
    COUNT(*) as orphaned_records
FROM sigurd.tickets t
WHERE t.requester_user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM muninn.users u WHERE u.id = t.requester_user_id);

-- Sample data validation
SELECT 
    'Sample users' as check_type,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE role = 'admin') as admins,
    COUNT(*) FILTER (WHERE status = 'active') as active
FROM muninn.users;

SELECT 
    'Sample tickets' as check_type,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE status = 'new') as new_tickets,
    COUNT(*) FILTER (WHERE status = 'closed') as closed_tickets
FROM sigurd.tickets;

SELECT 
    'Sample devices' as check_type,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE compliance = true) as compliant,
    COUNT(*) FILTER (WHERE compliance = false) as non_compliant
FROM huginn.devices;

