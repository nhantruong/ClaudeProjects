-- =============================================================================
-- Migration 003: RFI (Request for Information) tables
-- Date: 2026-04-02
-- Author: @database-expert
--
-- Creates three tables:
--   rfis          — RFI header records per project
--   rfi_comments  — threaded discussion on an RFI (cascade delete from rfis)
--   rfi_activity  — immutable audit log for state changes (cascade delete from rfis)
--
-- Deployment risk: NONE — additive only; no existing tables are altered.
--
-- ROLLBACK DDL (run in reverse order to undo):
--   DROP TABLE IF EXISTS rfi_activity;
--   DROP TABLE IF EXISTS rfi_comments;
--   DROP TABLE IF EXISTS rfis;
-- WARNING: rollback is destructive — all RFI data will be permanently lost.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. rfis
-- -----------------------------------------------------------------------------

CREATE TABLE rfis (
    id             int            NOT NULL IDENTITY(1,1),
    project_id     int            NOT NULL,
    rfi_number     nvarchar(20)   NOT NULL,
    title          nvarchar(300)  NOT NULL,
    discipline     nvarchar(50)   NOT NULL,
    priority       nvarchar(20)   NOT NULL CONSTRAINT DF_rfis_priority     DEFAULT N'Medium',
    status         nvarchar(30)   NOT NULL CONSTRAINT DF_rfis_status       DEFAULT N'Open',
    submitted_by   nvarchar(200)  NOT NULL,
    assigned_to    nvarchar(200)  NULL,
    drawing_ref    nvarchar(200)  NULL,
    spec_ref       nvarchar(100)  NULL,
    date_submitted date           NOT NULL CONSTRAINT DF_rfis_date_submitted DEFAULT CAST(GETUTCDATE() AS date),
    required_date  date           NULL,
    response_date  date           NULL,
    description    nvarchar(max)  NOT NULL,
    response       nvarchar(max)  NULL,
    created_by     int            NOT NULL,
    created_at     datetime2      NOT NULL CONSTRAINT DF_rfis_created_at   DEFAULT GETUTCDATE(),
    updated_at     datetime2      NOT NULL CONSTRAINT DF_rfis_updated_at   DEFAULT GETUTCDATE(),

    -- Primary key
    CONSTRAINT PK_rfis PRIMARY KEY (id),

    -- Unique RFI number per project
    CONSTRAINT UQ_rfis_project_rfi_number UNIQUE (project_id, rfi_number),

    -- Controlled vocabulary constraints
    CONSTRAINT CK_rfis_discipline CHECK (discipline IN (
        N'Mechanical', N'Electrical', N'Plumbing', N'Fire Protection',
        N'Civil / Structural', N'Architectural', N'General'
    )),
    CONSTRAINT CK_rfis_priority CHECK (priority IN (
        N'Low', N'Medium', N'High', N'Urgent'
    )),
    CONSTRAINT CK_rfis_status CHECK (status IN (
        N'Open', N'Under Review', N'Responded', N'Closed'
    )),

    -- Foreign keys (no cascade on either — RFI history must survive project
    -- archival and user deactivation; deletion must be explicit)
    CONSTRAINT FK_rfis_project    FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT FK_rfis_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

-- List view: all RFIs for a project, with key display columns pre-fetched
CREATE INDEX idx_rfis_project_id
    ON rfis (project_id)
    INCLUDE (rfi_number, title, status, priority, discipline, required_date);

-- Kanban / status-grouped view: equality columns first
CREATE INDEX idx_rfis_project_status
    ON rfis (project_id, status);

-- Overdue SLA detection: partial — skips the majority of rows with no deadline
CREATE INDEX idx_rfis_required_date
    ON rfis (required_date)
    WHERE required_date IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 2. rfi_comments
-- -----------------------------------------------------------------------------

CREATE TABLE rfi_comments (
    id         int           NOT NULL IDENTITY(1,1),
    rfi_id     int           NOT NULL,
    user_id    int           NOT NULL,
    body       nvarchar(max) NOT NULL,
    created_at datetime2     NOT NULL CONSTRAINT DF_rfi_comments_created_at DEFAULT GETUTCDATE(),
    updated_at datetime2     NOT NULL CONSTRAINT DF_rfi_comments_updated_at DEFAULT GETUTCDATE(),

    CONSTRAINT PK_rfi_comments PRIMARY KEY (id),

    -- Cascade: comments are meaningless without the parent RFI
    CONSTRAINT FK_rfi_comments_rfi     FOREIGN KEY (rfi_id)  REFERENCES rfis(id)  ON DELETE CASCADE,
    -- No cascade on user: comments remain for audit trail after deactivation
    CONSTRAINT FK_rfi_comments_user    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Chronological comment thread fetch
CREATE INDEX idx_rfi_comments_rfi_id
    ON rfi_comments (rfi_id, created_at);


-- -----------------------------------------------------------------------------
-- 3. rfi_activity
-- -----------------------------------------------------------------------------

CREATE TABLE rfi_activity (
    id         int           NOT NULL IDENTITY(1,1),
    rfi_id     int           NOT NULL,
    -- NULL user_id is intentional: system-generated events (e.g. SLA breach
    -- detected by a background job) have no user actor
    user_id    int           NULL,
    event      nvarchar(200) NOT NULL,
    created_at datetime2     NOT NULL CONSTRAINT DF_rfi_activity_created_at DEFAULT GETUTCDATE(),

    CONSTRAINT PK_rfi_activity PRIMARY KEY (id),

    -- Cascade: activity log entries are scoped to the RFI
    CONSTRAINT FK_rfi_activity_rfi  FOREIGN KEY (rfi_id)  REFERENCES rfis(id)  ON DELETE CASCADE,
    -- No cascade on user: log entries must survive user deactivation
    CONSTRAINT FK_rfi_activity_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Full audit trail for an RFI in chronological order
CREATE INDEX idx_rfi_activity_rfi_id
    ON rfi_activity (rfi_id, created_at);


-- =============================================================================
-- END OF FORWARD MIGRATION
-- =============================================================================
--
-- ROLLBACK DDL (destructive — data loss):
--
--   IF OBJECT_ID('rfi_activity', 'U') IS NOT NULL  DROP TABLE rfi_activity;
--   IF OBJECT_ID('rfi_comments', 'U') IS NOT NULL  DROP TABLE rfi_comments;
--   IF OBJECT_ID('rfis',         'U') IS NOT NULL  DROP TABLE rfis;
--
-- =============================================================================
