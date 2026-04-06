-- 006_schema_migrations.sql
-- Creates the migration tracking table.
-- Safe to run multiple times (IF NOT EXISTS guard).
-- Run this FIRST on any environment before running the migration runner.
-- The migration runner (src/db/migrate.ts) also executes this guard inline,
-- so manual execution is only required when bootstrapping from SSMS.

-- ============================================================
-- Forward DDL
-- ============================================================

IF NOT EXISTS (
  SELECT 1 FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[schema_migrations]')
    AND type = N'U'
)
BEGIN
  CREATE TABLE schema_migrations (
    id          INT           NOT NULL IDENTITY(1,1) PRIMARY KEY,
    filename    NVARCHAR(255) NOT NULL,
    applied_at  DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_schema_migrations_filename UNIQUE (filename)
  );
  PRINT 'Created schema_migrations table';
END
ELSE
BEGIN
  PRINT 'schema_migrations table already exists — skipping';
END

-- ============================================================
-- Rollback DDL
-- WARNING: destructive — drops the tracking table and all records.
-- Only run this to completely reset migration tracking on a dev environment.
-- ============================================================

-- DROP TABLE IF EXISTS schema_migrations;
