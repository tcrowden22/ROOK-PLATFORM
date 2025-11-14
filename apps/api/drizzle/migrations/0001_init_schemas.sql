-- Initialize schemas (idempotent)
-- This is handled by db/init/001_init.sql, but included here for reference

CREATE SCHEMA IF NOT EXISTS muninn;
CREATE SCHEMA IF NOT EXISTS sigurd;
CREATE SCHEMA IF NOT EXISTS huginn;
CREATE SCHEMA IF NOT EXISTS skuld;
CREATE SCHEMA IF NOT EXISTS yggdrasil;

