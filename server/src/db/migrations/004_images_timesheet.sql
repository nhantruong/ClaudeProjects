-- =============================================================================
-- Migration 004: Cover images, user avatars, and timesheet entries
-- Date: 2026-04-03
-- Author: @database-expert
--
-- Changes:
--   1. ALTER projects       — add cover_image_url nvarchar(500) NULL
--   2. ALTER users          — add avatar_url nvarchar(500) NULL
--   3. CREATE TABLE timesheet_entries — one time-log row per user per project
--                                       per day; links optionally to a work type
--
-- Deployment risk: LOW — steps 1 and 2 are nullable column additions (no table
-- lock beyond metadata update on SQL Server 2019+). Step 3 creates a new table
-- with no existing data to migrate.
--
-- ROLLBACK DDL (run in reverse order to undo):
--   -- Step 3 rollback
--   IF OBJECT_ID('timesheet_entries', 'U') IS NOT NULL
--       DROP TABLE timesheet_entries;
--   -- Step 2 rollback
--   IF COL_LENGTH('users', 'avatar_url') IS NOT NULL
--       ALTER TABLE users DROP COLUMN avatar_url;
--   -- Step 1 rollback
--   IF COL_LENGTH('projects', 'cover_image_url') IS NOT NULL
--       ALTER TABLE projects DROP COLUMN cover_image_url;
--
-- WARNING: rolling back step 3 is destructive — all timesheet data will be
-- permanently lost. Steps 1 and 2 rollback will also drop any stored URLs.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. projects — add cover image URL
-- -----------------------------------------------------------------------------

ALTER TABLE projects
    ADD cover_image_url nvarchar(500) NULL;


-- -----------------------------------------------------------------------------
-- 2. users — add avatar URL
-- -----------------------------------------------------------------------------

ALTER TABLE users
    ADD avatar_url nvarchar(500) NULL;


-- -----------------------------------------------------------------------------
-- 3. timesheet_entries
-- -----------------------------------------------------------------------------
--
-- One row per user per project per calendar day. Hours are stored as
-- decimal(4,2) which covers 0.25–24.00 with two decimal places (quarter-hour
-- precision). The UNIQUE constraint on (user_id, project_id, entry_date)
-- enforces the one-row-per-day rule at the database level — the application
-- UPDATEs the existing row rather than INSERTing a duplicate.
--
-- FK design decisions:
--   user_id    — NO CASCADE: deactivated users retain timesheet history for
--                payroll and audit purposes. Soft-delete pattern on users table.
--   project_id — ON DELETE CASCADE: if a project is hard-deleted its time logs
--                are orphaned data with no business value; cascade removes them.
--   work_type_id — NO CASCADE: work type is optional classification metadata;
--                  deactivating a ref_work_types row does not invalidate past
--                  entries.

CREATE TABLE timesheet_entries (
    id            int            NOT NULL IDENTITY(1,1),
    user_id       int            NOT NULL,
    project_id    int            NOT NULL,
    work_type_id  int            NULL,
    entry_date    date           NOT NULL,
    hours         decimal(4,2)   NOT NULL,
    ot         decimal(4,2)      NULL,
    description   nvarchar(500)  NULL,
    created_at    datetime2      NOT NULL CONSTRAINT DF_timesheet_created_at DEFAULT GETUTCDATE(),
    updated_at    datetime2      NOT NULL CONSTRAINT DF_timesheet_updated_at DEFAULT GETUTCDATE(),

    -- Primary key
    CONSTRAINT PK_timesheet_entries PRIMARY KEY (id),

    -- One entry per user per project per day — UPDATE to edit, never INSERT twice
    CONSTRAINT UQ_timesheet_user_project_date UNIQUE (user_id, project_id, entry_date),

    -- Hours must be a positive value not exceeding a full day
    CONSTRAINT CK_timesheet_hours CHECK (hours > 0 AND hours <= 24),

    -- user_id: no cascade — timesheet history is retained when a user is
    -- deactivated (soft delete). Hard deletion of a user requires explicit DBA
    -- action and a decision about what to do with their time records.
    CONSTRAINT FK_timesheet_user
        FOREIGN KEY (user_id) REFERENCES users(id),

    -- project_id: cascade — time entries have no meaning without their project.
    CONSTRAINT FK_timesheet_project
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,

    -- work_type_id: no cascade — deactivating a lookup row does not invalidate
    -- historical entries that used it.
    CONSTRAINT FK_timesheet_work_type
        FOREIGN KEY (work_type_id) REFERENCES ref_work_types(id)
);

-- "All entries for this user in a date range" — the most common read path
-- (user timesheet view, payroll export). (user_id, entry_date) composite
-- covers equality on user_id + range scan on entry_date.
CREATE INDEX idx_timesheet_user_date
    ON timesheet_entries (user_id, entry_date);

-- "All entries for this project in a date range" — project-level time
-- reporting and cost tracking. Same composite pattern.
CREATE INDEX idx_timesheet_project_date
    ON timesheet_entries (project_id, entry_date);

-- Cross-user / cross-project period aggregation (e.g. "total hours logged
-- this week across all projects"). A standalone date index supports range
-- scans where neither user nor project is the leading predicate.
CREATE INDEX idx_timesheet_entry_date
    ON timesheet_entries (entry_date);


-- =============================================================================
-- END OF FORWARD MIGRATION
-- =============================================================================
--
-- ROLLBACK DDL (destructive — data loss):
--
--   IF OBJECT_ID('timesheet_entries', 'U') IS NOT NULL
--       DROP TABLE timesheet_entries;
--   IF COL_LENGTH('users', 'avatar_url') IS NOT NULL
--       ALTER TABLE users DROP COLUMN avatar_url;
--   IF COL_LENGTH('projects', 'cover_image_url') IS NOT NULL
--       ALTER TABLE projects DROP COLUMN cover_image_url;
--
-- =============================================================================
