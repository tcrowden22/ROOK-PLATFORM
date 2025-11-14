-- Rook Platform Database Initialization Script
-- This script sets up extensions, schemas, roles, and default privileges
-- It is idempotent and can be run multiple times safely

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Case-insensitive text type
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================================================================
-- SCHEMAS
-- ============================================================================

-- Create module-specific schemas
CREATE SCHEMA IF NOT EXISTS muninn;    -- Identity & Access Management
CREATE SCHEMA IF NOT EXISTS sigurd;    -- IT Service Management
CREATE SCHEMA IF NOT EXISTS huginn;     -- Mobile Device Management
CREATE SCHEMA IF NOT EXISTS skuld;     -- Asset Management
CREATE SCHEMA IF NOT EXISTS yggdrasil; -- Workflow Automation
CREATE SCHEMA IF NOT EXISTS gateway;   -- API Gateway (Agent Management)

-- ============================================================================
-- ROLES
-- ============================================================================

-- Application role (least-privilege for runtime operations)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'rook_app') THEN
    CREATE ROLE rook_app WITH LOGIN PASSWORD 'changeme_app_password';
  END IF;
END
$$;

-- Migrator role (for running migrations, has DDL privileges)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'rook_migrator') THEN
    CREATE ROLE rook_migrator WITH LOGIN PASSWORD 'changeme_migrator_password';
  END IF;
END
$$;

-- Migration role (DDL permissions for migrations)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'rook_migrate') THEN
    CREATE ROLE rook_migrate WITH LOGIN PASSWORD 'changeme_migrate_password';
  END IF;
END
$$;

-- Runtime role (R/W only, no DDL permissions)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'rook_runtime') THEN
    CREATE ROLE rook_runtime WITH LOGIN PASSWORD 'changeme_runtime_password';
  END IF;
END
$$;

-- ============================================================================
-- DEFAULT PRIVILEGES
-- ============================================================================

-- Grant usage on schemas to application role
GRANT USAGE ON SCHEMA muninn TO rook_app;
GRANT USAGE ON SCHEMA sigurd TO rook_app;
GRANT USAGE ON SCHEMA huginn TO rook_app;
GRANT USAGE ON SCHEMA skuld TO rook_app;
GRANT USAGE ON SCHEMA yggdrasil TO rook_app;
GRANT USAGE ON SCHEMA gateway TO rook_app;

-- Grant usage on schemas to migrator role (backward compatibility)
GRANT USAGE ON SCHEMA muninn TO rook_migrator;
GRANT USAGE ON SCHEMA sigurd TO rook_migrator;
GRANT USAGE ON SCHEMA huginn TO rook_migrator;
GRANT USAGE ON SCHEMA skuld TO rook_migrator;
GRANT USAGE ON SCHEMA yggdrasil TO rook_migrator;
GRANT USAGE ON SCHEMA gateway TO rook_migrator;

-- Grant create on schemas to migrator (for migrations, backward compatibility)
GRANT CREATE ON SCHEMA muninn TO rook_migrator;
GRANT CREATE ON SCHEMA sigurd TO rook_migrator;
GRANT CREATE ON SCHEMA huginn TO rook_migrator;
GRANT CREATE ON SCHEMA skuld TO rook_migrator;
GRANT CREATE ON SCHEMA yggdrasil TO rook_migrator;
GRANT CREATE ON SCHEMA gateway TO rook_migrator;

-- Grant usage on schemas to migrate role (DDL permissions)
GRANT USAGE ON SCHEMA muninn TO rook_migrate;
GRANT USAGE ON SCHEMA sigurd TO rook_migrate;
GRANT USAGE ON SCHEMA huginn TO rook_migrate;
GRANT USAGE ON SCHEMA skuld TO rook_migrate;
GRANT USAGE ON SCHEMA yggdrasil TO rook_migrate;
GRANT USAGE ON SCHEMA gateway TO rook_migrate;

-- Grant create on schemas to migrate role (for migrations)
GRANT CREATE ON SCHEMA muninn TO rook_migrate;
GRANT CREATE ON SCHEMA sigurd TO rook_migrate;
GRANT CREATE ON SCHEMA huginn TO rook_migrate;
GRANT CREATE ON SCHEMA skuld TO rook_migrate;
GRANT CREATE ON SCHEMA yggdrasil TO rook_migrate;
GRANT CREATE ON SCHEMA gateway TO rook_migrate;

-- Grant usage on schemas to runtime role (R/W only)
GRANT USAGE ON SCHEMA muninn TO rook_runtime;
GRANT USAGE ON SCHEMA sigurd TO rook_runtime;
GRANT USAGE ON SCHEMA huginn TO rook_runtime;
GRANT USAGE ON SCHEMA skuld TO rook_runtime;
GRANT USAGE ON SCHEMA yggdrasil TO rook_runtime;
GRANT USAGE ON SCHEMA gateway TO rook_runtime;

-- Set default privileges for future tables (will be applied by migrations)
-- Runtime role gets R/W permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA muninn GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rook_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA sigurd GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rook_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA huginn GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rook_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA skuld GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rook_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA yggdrasil GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rook_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA gateway GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rook_runtime;

-- Backward compatibility: rook_app gets same permissions as rook_runtime
ALTER DEFAULT PRIVILEGES IN SCHEMA muninn GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rook_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA sigurd GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rook_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA huginn GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rook_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA skuld GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rook_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA yggdrasil GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rook_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA gateway GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rook_app;

-- Set default privileges for sequences
-- Runtime role gets sequence permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA muninn GRANT USAGE, SELECT ON SEQUENCES TO rook_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA sigurd GRANT USAGE, SELECT ON SEQUENCES TO rook_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA huginn GRANT USAGE, SELECT ON SEQUENCES TO rook_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA skuld GRANT USAGE, SELECT ON SEQUENCES TO rook_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA yggdrasil GRANT USAGE, SELECT ON SEQUENCES TO rook_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA gateway GRANT USAGE, SELECT ON SEQUENCES TO rook_runtime;

-- Backward compatibility: rook_app gets same permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA muninn GRANT USAGE, SELECT ON SEQUENCES TO rook_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA sigurd GRANT USAGE, SELECT ON SEQUENCES TO rook_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA huginn GRANT USAGE, SELECT ON SEQUENCES TO rook_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA skuld GRANT USAGE, SELECT ON SEQUENCES TO rook_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA yggdrasil GRANT USAGE, SELECT ON SEQUENCES TO rook_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA gateway GRANT USAGE, SELECT ON SEQUENCES TO rook_app;

-- Migrator gets all privileges on all objects
ALTER DEFAULT PRIVILEGES IN SCHEMA muninn GRANT ALL ON TABLES TO rook_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA sigurd GRANT ALL ON TABLES TO rook_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA huginn GRANT ALL ON TABLES TO rook_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA skuld GRANT ALL ON TABLES TO rook_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA yggdrasil GRANT ALL ON TABLES TO rook_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA gateway GRANT ALL ON TABLES TO rook_migrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA muninn GRANT ALL ON SEQUENCES TO rook_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA sigurd GRANT ALL ON SEQUENCES TO rook_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA huginn GRANT ALL ON SEQUENCES TO rook_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA skuld GRANT ALL ON SEQUENCES TO rook_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA yggdrasil GRANT ALL ON SEQUENCES TO rook_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA gateway GRANT ALL ON SEQUENCES TO rook_migrator;

-- ============================================================================
-- SEARCH PATH
-- ============================================================================

-- Set default search path to include all schemas (for cross-schema queries)
-- This allows queries to reference tables across schemas without full qualification
-- Application code should use fully qualified names when needed
ALTER DATABASE rook SET search_path TO muninn, sigurd, huginn, skuld, yggdrasil, gateway, public;

-- ============================================================================
-- NOTES
-- ============================================================================

-- This script is idempotent:
-- - Extensions use "IF NOT EXISTS"
-- - Schemas use "IF NOT EXISTS"
-- - Roles use conditional creation
-- - Grants are idempotent (safe to run multiple times)

-- Password changes:
-- After initial setup, change passwords:
-- ALTER ROLE rook_app WITH PASSWORD 'new_secure_password';
-- ALTER ROLE rook_migrator WITH PASSWORD 'new_secure_password';
-- ALTER ROLE rook_migrate WITH PASSWORD 'new_secure_password';
-- ALTER ROLE rook_runtime WITH PASSWORD 'new_secure_password';

-- Security:
-- - rook_app: Least-privilege role for application runtime (backward compatibility)
-- - rook_migrator: Higher-privilege role for migrations (backward compatibility)
-- - rook_migrate: DDL permissions for migrations (CREATE, ALTER, DROP)
-- - rook_runtime: R/W only permissions for application runtime (SELECT, INSERT, UPDATE, DELETE)
-- - Never use superuser for application connections

