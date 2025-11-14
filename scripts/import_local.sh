#!/bin/bash

# Import Supabase Export to Local Postgres
# Imports data and moves tables to correct schemas

set -e

# Configuration
DB_URL="${DATABASE_URL:-postgresql://postgres:changeme@localhost:5432/rook}"
INPUT_FILE="${1:-}"

if [ -z "$INPUT_FILE" ]; then
    echo "Usage: $0 <path_to_export.sql>"
    echo "Example: $0 backups/supabase_export_20250101_120000.sql"
    exit 1
fi

if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: File not found: $INPUT_FILE"
    exit 1
fi

echo "Importing Supabase export to local Postgres..."
echo "Source: $INPUT_FILE"
echo "Target: $DB_URL"

# Step 1: Import the dump (this will create tables in public schema)
echo "Step 1: Importing dump..."
psql "$DB_URL" < "$INPUT_FILE" || {
    echo "⚠ Some errors during import (may be expected if tables already exist)"
}

# Step 2: Move tables to correct schemas
echo "Step 2: Moving tables to module schemas..."

psql "$DB_URL" <<EOF
-- Muninn (IAM)
ALTER TABLE IF EXISTS public.users SET SCHEMA muninn;
ALTER TABLE IF EXISTS public.groups SET SCHEMA muninn;
ALTER TABLE IF EXISTS public.roles SET SCHEMA muninn;
ALTER TABLE IF EXISTS public.user_groups SET SCHEMA muninn;
ALTER TABLE IF EXISTS public.user_roles SET SCHEMA muninn;
ALTER TABLE IF EXISTS public.sessions SET SCHEMA muninn;
ALTER TABLE IF EXISTS public.audit_logs SET SCHEMA muninn;
ALTER TABLE IF EXISTS public.iam_policies SET SCHEMA muninn;
ALTER TABLE IF EXISTS public.applications SET SCHEMA muninn;
ALTER TABLE IF EXISTS public.sso_grants SET SCHEMA muninn;

-- Sigurd (ITSM)
ALTER TABLE IF EXISTS public.tickets SET SCHEMA sigurd;
ALTER TABLE IF EXISTS public.comments SET SCHEMA sigurd;
ALTER TABLE IF EXISTS public.knowledge_articles SET SCHEMA sigurd;
ALTER TABLE IF EXISTS public.service_catalog_items SET SCHEMA sigurd;
ALTER TABLE IF EXISTS public.incidents SET SCHEMA sigurd;
ALTER TABLE IF EXISTS public.service_requests SET SCHEMA sigurd;
ALTER TABLE IF EXISTS public.problems SET SCHEMA sigurd;
ALTER TABLE IF EXISTS public.changes SET SCHEMA sigurd;
ALTER TABLE IF EXISTS public.ticket_comments SET SCHEMA sigurd;
ALTER TABLE IF EXISTS public.sigurd_ticket_history SET SCHEMA sigurd;

-- Huginn (MDM)
ALTER TABLE IF EXISTS public.devices SET SCHEMA huginn;
ALTER TABLE IF EXISTS public.telemetry SET SCHEMA huginn;
ALTER TABLE IF EXISTS public.software_packages SET SCHEMA huginn;
ALTER TABLE IF EXISTS public.deployment_jobs SET SCHEMA huginn;

-- Skuld (Assets)
ALTER TABLE IF EXISTS public.lifecycle_policies SET SCHEMA skuld;
ALTER TABLE IF EXISTS public.asset_models SET SCHEMA skuld;
ALTER TABLE IF EXISTS public.vendors SET SCHEMA skuld;
ALTER TABLE IF EXISTS public.locations SET SCHEMA skuld;
ALTER TABLE IF EXISTS public.assets SET SCHEMA skuld;
ALTER TABLE IF EXISTS public.asset_events SET SCHEMA skuld;
ALTER TABLE IF EXISTS public.asset_assignments SET SCHEMA skuld;
ALTER TABLE IF EXISTS public.asset_imports SET SCHEMA skuld;

-- Yggdrasil (Workflows)
ALTER TABLE IF EXISTS public.workflows SET SCHEMA yggdrasil;
ALTER TABLE IF EXISTS public.workflow_triggers SET SCHEMA yggdrasil;
ALTER TABLE IF EXISTS public.workflow_integrations SET SCHEMA yggdrasil;
ALTER TABLE IF EXISTS public.workflow_run_logs SET SCHEMA yggdrasil;
EOF

echo "✓ Import completed"
echo ""
echo "Next steps:"
echo "  1. Run verification script: psql \$DATABASE_URL < scripts/verify_counts.sql"
echo "  2. Check foreign key constraints work across schemas"
echo "  3. Update application DATABASE_URL to point to local Postgres"

