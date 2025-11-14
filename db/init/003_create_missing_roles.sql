-- Create missing database roles for Kong Gateway infrastructure
-- This script creates rook_migrate and rook_runtime roles if they don't exist

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

-- Grant usage on schemas to migrate role (DDL permissions)
GRANT USAGE ON SCHEMA muninn TO rook_migrate;
GRANT USAGE ON SCHEMA sigurd TO rook_migrate;
GRANT USAGE ON SCHEMA huginn TO rook_migrate;
GRANT USAGE ON SCHEMA skuld TO rook_migrate;
GRANT USAGE ON SCHEMA yggdrasil TO rook_migrate;
GRANT USAGE ON SCHEMA gateway TO rook_migrate;

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

-- Grant permissions on existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA muninn TO rook_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA sigurd TO rook_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA huginn TO rook_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA skuld TO rook_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA yggdrasil TO rook_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA gateway TO rook_runtime;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA muninn TO rook_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA sigurd TO rook_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA huginn TO rook_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA skuld TO rook_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA yggdrasil TO rook_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA gateway TO rook_runtime;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA muninn GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rook_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA sigurd GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rook_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA huginn GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rook_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA skuld GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rook_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA yggdrasil GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rook_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA gateway GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rook_runtime;

-- Set default privileges for sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA muninn GRANT USAGE, SELECT ON SEQUENCES TO rook_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA sigurd GRANT USAGE, SELECT ON SEQUENCES TO rook_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA huginn GRANT USAGE, SELECT ON SEQUENCES TO rook_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA skuld GRANT USAGE, SELECT ON SEQUENCES TO rook_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA yggdrasil GRANT USAGE, SELECT ON SEQUENCES TO rook_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA gateway GRANT USAGE, SELECT ON SEQUENCES TO rook_runtime;

