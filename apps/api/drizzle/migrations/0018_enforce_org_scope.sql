-- Migration: Enforce organization scoping across Sigurd, Huginn, and Skuld
-- This migration introduces missing organization_id columns, backfills data,
-- and enforces NOT NULL constraints plus supporting indexes.

\set default_org '''00000000-0000-0000-0000-000000000001'''

-- =====================================================
-- Sigurd additions
-- =====================================================
ALTER TABLE sigurd.comments
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_sigurd_comments_organization_id ON sigurd.comments(organization_id);

ALTER TABLE sigurd.knowledge_articles
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_organization_id ON sigurd.knowledge_articles(organization_id);

ALTER TABLE sigurd.service_catalog_items
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_service_catalog_items_organization_id ON sigurd.service_catalog_items(organization_id);

ALTER TABLE sigurd.ticket_comments
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_ticket_comments_organization_id ON sigurd.ticket_comments(organization_id);

ALTER TABLE sigurd.sigurd_ticket_history
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_sigurd_ticket_history_org ON sigurd.sigurd_ticket_history(organization_id);

ALTER TABLE sigurd.attachments
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_sigurd_attachments_organization_id ON sigurd.attachments(organization_id);

-- Backfill Sigurd data
UPDATE sigurd.comments c
SET organization_id = t.organization_id
FROM sigurd.tickets t
WHERE c.organization_id IS NULL AND c.ticket_id = t.id;

UPDATE sigurd.ticket_comments tc
SET organization_id = i.organization_id
FROM sigurd.incidents i
WHERE tc.organization_id IS NULL AND tc.ticket_type = 'incident' AND tc.ticket_id = i.id;

UPDATE sigurd.ticket_comments tc
SET organization_id = sr.organization_id
FROM sigurd.service_requests sr
WHERE tc.organization_id IS NULL AND tc.ticket_type = 'service_request' AND tc.ticket_id = sr.id;

UPDATE sigurd.ticket_comments tc
SET organization_id = p.organization_id
FROM sigurd.problems p
WHERE tc.organization_id IS NULL AND tc.ticket_type = 'problem' AND tc.ticket_id = p.id;

UPDATE sigurd.ticket_comments tc
SET organization_id = ch.organization_id
FROM sigurd.changes ch
WHERE tc.organization_id IS NULL AND tc.ticket_type = 'change' AND tc.ticket_id = ch.id;

UPDATE sigurd.sigurd_ticket_history h
SET organization_id = i.organization_id
FROM sigurd.incidents i
WHERE h.organization_id IS NULL AND h.ticket_type = 'incident' AND h.ticket_id = i.id;

UPDATE sigurd.sigurd_ticket_history h
SET organization_id = sr.organization_id
FROM sigurd.service_requests sr
WHERE h.organization_id IS NULL AND h.ticket_type = 'service_request' AND h.ticket_id = sr.id;

UPDATE sigurd.sigurd_ticket_history h
SET organization_id = p.organization_id
FROM sigurd.problems p
WHERE h.organization_id IS NULL AND h.ticket_type = 'problem' AND h.ticket_id = p.id;

UPDATE sigurd.sigurd_ticket_history h
SET organization_id = ch.organization_id
FROM sigurd.changes ch
WHERE h.organization_id IS NULL AND h.ticket_type = 'change' AND h.ticket_id = ch.id;

UPDATE sigurd.attachments a
SET organization_id = i.organization_id
FROM sigurd.incidents i
WHERE a.organization_id IS NULL AND a.ticket_type = 'incident' AND a.ticket_id = i.id;

UPDATE sigurd.attachments a
SET organization_id = sr.organization_id
FROM sigurd.service_requests sr
WHERE a.organization_id IS NULL AND a.ticket_type = 'service_request' AND a.ticket_id = sr.id;

UPDATE sigurd.attachments a
SET organization_id = p.organization_id
FROM sigurd.problems p
WHERE a.organization_id IS NULL AND a.ticket_type = 'problem' AND a.ticket_id = p.id;

UPDATE sigurd.attachments a
SET organization_id = ch.organization_id
FROM sigurd.changes ch
WHERE a.organization_id IS NULL AND a.ticket_type = 'change' AND a.ticket_id = ch.id;

UPDATE sigurd.knowledge_articles
SET organization_id = :default_org::uuid
WHERE organization_id IS NULL;

UPDATE sigurd.service_catalog_items
SET organization_id = :default_org::uuid
WHERE organization_id IS NULL;

UPDATE sigurd.comments
SET organization_id = :default_org::uuid
WHERE organization_id IS NULL;

UPDATE sigurd.ticket_comments
SET organization_id = :default_org::uuid
WHERE organization_id IS NULL;

UPDATE sigurd.sigurd_ticket_history
SET organization_id = :default_org::uuid
WHERE organization_id IS NULL;

UPDATE sigurd.attachments
SET organization_id = :default_org::uuid
WHERE organization_id IS NULL;

-- Enforce NOT NULL on Sigurd tables
ALTER TABLE sigurd.tickets ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE sigurd.incidents ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE sigurd.service_requests ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE sigurd.problems ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE sigurd.changes ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE sigurd.comments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE sigurd.knowledge_articles ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE sigurd.service_catalog_items ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE sigurd.ticket_comments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE sigurd.sigurd_ticket_history ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE sigurd.attachments ALTER COLUMN organization_id SET NOT NULL;

-- =====================================================
-- Huginn additions
-- =====================================================
ALTER TABLE huginn.telemetry
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_telemetry_organization_id ON huginn.telemetry(organization_id);

ALTER TABLE huginn.software_packages
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_software_packages_organization_id ON huginn.software_packages(organization_id);
CREATE INDEX IF NOT EXISTS idx_software_packages_platform ON huginn.software_packages(platform);

ALTER TABLE huginn.deployment_jobs
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_deployment_jobs_organization_id ON huginn.deployment_jobs(organization_id);

ALTER TABLE huginn.device_policy_assignments
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_device_policy_assignments_org ON huginn.device_policy_assignments(organization_id);

ALTER TABLE huginn.device_activity
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_device_activity_organization_id ON huginn.device_activity(organization_id);

-- Backfill Huginn data
UPDATE huginn.devices
SET organization_id = COALESCE(organization_id, :default_org::uuid);

UPDATE huginn.telemetry t
SET organization_id = d.organization_id
FROM huginn.devices d
WHERE t.organization_id IS NULL AND t.device_id = d.id;

UPDATE huginn.deployment_jobs dj
SET organization_id = d.organization_id
FROM huginn.devices d
WHERE dj.organization_id IS NULL AND dj.device_id = d.id;

UPDATE huginn.device_policy_assignments dpa
SET organization_id = dp.organization_id
FROM huginn.device_policies dp
WHERE dpa.organization_id IS NULL AND dpa.policy_id = dp.id;

UPDATE huginn.device_activity da
SET organization_id = d.organization_id
FROM huginn.devices d
WHERE da.organization_id IS NULL AND da.device_id = d.id;

UPDATE huginn.software_packages
SET organization_id = :default_org::uuid
WHERE organization_id IS NULL;

UPDATE huginn.device_policies
SET organization_id = COALESCE(organization_id, :default_org::uuid);

UPDATE huginn.telemetry
SET organization_id = :default_org::uuid
WHERE organization_id IS NULL;

UPDATE huginn.deployment_jobs
SET organization_id = :default_org::uuid
WHERE organization_id IS NULL;

UPDATE huginn.device_policy_assignments
SET organization_id = :default_org::uuid
WHERE organization_id IS NULL;

UPDATE huginn.device_activity
SET organization_id = :default_org::uuid
WHERE organization_id IS NULL;

-- Enforce NOT NULL on Huginn tables
ALTER TABLE huginn.devices ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE huginn.telemetry ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE huginn.software_packages ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE huginn.deployment_jobs ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE huginn.device_policies ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE huginn.device_policy_assignments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE huginn.device_activity ALTER COLUMN organization_id SET NOT NULL;

-- =====================================================
-- Skuld additions
-- =====================================================
ALTER TABLE skuld.lifecycle_policies
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_lifecycle_policies_organization_id ON skuld.lifecycle_policies(organization_id);

ALTER TABLE skuld.asset_models
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_asset_models_organization_id ON skuld.asset_models(organization_id);

ALTER TABLE skuld.vendors
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_vendors_organization_id ON skuld.vendors(organization_id);

ALTER TABLE skuld.locations
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_locations_organization_id ON skuld.locations(organization_id);

ALTER TABLE skuld.asset_events
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_asset_events_organization_id ON skuld.asset_events(organization_id);

ALTER TABLE skuld.asset_assignments
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_asset_assignments_organization_id ON skuld.asset_assignments(organization_id);

ALTER TABLE skuld.asset_imports
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES muninn.organizations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_asset_imports_organization_id ON skuld.asset_imports(organization_id);

-- Backfill Skuld data
UPDATE skuld.assets
SET organization_id = COALESCE(organization_id, :default_org::uuid);

WITH model_org AS (
  SELECT model_id, MIN(organization_id) AS organization_id
  FROM skuld.assets
  WHERE model_id IS NOT NULL
  GROUP BY model_id
)
UPDATE skuld.asset_models m
SET organization_id = mo.organization_id
FROM model_org mo
WHERE m.organization_id IS NULL AND mo.model_id = m.id;

WITH policy_org AS (
  SELECT lifecycle_policy_id, MIN(organization_id) AS organization_id
  FROM skuld.asset_models
  WHERE lifecycle_policy_id IS NOT NULL
  GROUP BY lifecycle_policy_id
)
UPDATE skuld.lifecycle_policies lp
SET organization_id = po.organization_id
FROM policy_org po
WHERE lp.organization_id IS NULL AND lp.id = po.lifecycle_policy_id;

WITH vendor_org AS (
  SELECT vendor_id, MIN(organization_id) AS organization_id
  FROM skuld.assets
  WHERE vendor_id IS NOT NULL
  GROUP BY vendor_id
)
UPDATE skuld.vendors v
SET organization_id = vo.organization_id
FROM vendor_org vo
WHERE v.organization_id IS NULL AND v.id = vo.vendor_id;

WITH location_org AS (
  SELECT location_id, MIN(organization_id) AS organization_id
  FROM skuld.assets
  WHERE location_id IS NOT NULL
  GROUP BY location_id
)
UPDATE skuld.locations l
SET organization_id = lo.organization_id
FROM location_org lo
WHERE l.organization_id IS NULL AND l.id = lo.location_id;

UPDATE skuld.asset_events ae
SET organization_id = a.organization_id
FROM skuld.assets a
WHERE ae.organization_id IS NULL AND ae.asset_id = a.id;

UPDATE skuld.asset_assignments aa
SET organization_id = a.organization_id
FROM skuld.assets a
WHERE aa.organization_id IS NULL AND aa.asset_id = a.id;

UPDATE skuld.asset_imports
SET organization_id = :default_org::uuid
WHERE organization_id IS NULL;

-- Ensure defaults where still missing
UPDATE skuld.lifecycle_policies
SET organization_id = :default_org::uuid
WHERE organization_id IS NULL;

UPDATE skuld.asset_models
SET organization_id = :default_org::uuid
WHERE organization_id IS NULL;

UPDATE skuld.vendors
SET organization_id = :default_org::uuid
WHERE organization_id IS NULL;

UPDATE skuld.locations
SET organization_id = :default_org::uuid
WHERE organization_id IS NULL;

UPDATE skuld.asset_events
SET organization_id = :default_org::uuid
WHERE organization_id IS NULL;

UPDATE skuld.asset_assignments
SET organization_id = :default_org::uuid
WHERE organization_id IS NULL;

-- Enforce NOT NULL on Skuld tables
ALTER TABLE skuld.lifecycle_policies ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE skuld.asset_models ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE skuld.vendors ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE skuld.locations ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE skuld.assets ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE skuld.asset_events ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE skuld.asset_assignments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE skuld.asset_imports ALTER COLUMN organization_id SET NOT NULL;


