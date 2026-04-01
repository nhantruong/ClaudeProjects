-- =============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Initial Raphael database schema — all core tables
-- Date: 2026-03-28
-- Deployment risk: None — new database, no existing data
-- Reversible: Yes — see ROLLBACK section at the bottom of this file
-- =============================================================================
--
-- NOTE ON SESSIONS TABLE:
-- Per ADR-002, authentication uses stateless JWT in httpOnly cookies.
-- No DB lookup is performed per request — the JWT signature is verified
-- in middleware. The sessions table is therefore NOT created in this schema.
-- If token revocation is required in a future version, revisit this decision
-- with a new ADR and add the table at that time.
--
-- =============================================================================
-- FORWARD MIGRATION
-- =============================================================================

USE [raphael];
GO

-- ---------------------------------------------------------------------------
-- users
-- Admin-created only (no self-registration, FR-001, FR-003, FR-010, FR-011)
-- ---------------------------------------------------------------------------
CREATE TABLE [dbo].[users] (
    [id]            INT             NOT NULL    IDENTITY(1,1),
    [username]      NVARCHAR(100)   NOT NULL,
    [password_hash] NVARCHAR(255)   NOT NULL,   -- bcrypt hash, cost factor >= 12
    [display_name]  NVARCHAR(150)   NOT NULL,
    [role]          NVARCHAR(20)    NOT NULL    CONSTRAINT [DF_users_role]     DEFAULT (N'member'),
    [is_active]     BIT             NOT NULL    CONSTRAINT [DF_users_is_active] DEFAULT (1),
    [created_at]    DATETIME2       NOT NULL    CONSTRAINT [DF_users_created_at] DEFAULT (GETUTCDATE()),
    [updated_at]    DATETIME2       NOT NULL    CONSTRAINT [DF_users_updated_at] DEFAULT (GETUTCDATE()),

    CONSTRAINT [PK_users] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [UQ_users_username] UNIQUE ([username]),
    CONSTRAINT [CK_users_role] CHECK ([role] IN (N'admin', N'manager', N'member'))
);
GO

-- Supports fast login lookup by username (most frequent read path)
CREATE NONCLUSTERED INDEX [idx_users_username]
    ON [dbo].[users] ([username] ASC)
    WHERE [is_active] = 1;
GO

-- ---------------------------------------------------------------------------
-- projects
-- Top-level containers for tasks and plans (FR-020, FR-021, FR-022, FR-023)
-- ---------------------------------------------------------------------------
CREATE TABLE [dbo].[projects] (
    [id]          INT             NOT NULL    IDENTITY(1,1),
    [name]        NVARCHAR(200)   NOT NULL,
    [description] NVARCHAR(MAX)   NULL,
    [domain]      NVARCHAR(50)    NOT NULL,   -- electromechanical / bim / software / other
    [status]      NVARCHAR(30)    NOT NULL    CONSTRAINT [DF_projects_status] DEFAULT (N'planning'),
    [start_date]  DATE            NULL,
    [end_date]    DATE            NULL,
    [created_by]  INT             NOT NULL,
    [created_at]  DATETIME2       NOT NULL    CONSTRAINT [DF_projects_created_at] DEFAULT (GETUTCDATE()),
    [updated_at]  DATETIME2       NOT NULL    CONSTRAINT [DF_projects_updated_at] DEFAULT (GETUTCDATE()),

    CONSTRAINT [PK_projects] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_projects_created_by] FOREIGN KEY ([created_by])
        REFERENCES [dbo].[users] ([id]),
    CONSTRAINT [CK_projects_domain] CHECK ([domain] IN (N'electromechanical', N'bim', N'software', N'other')),
    CONSTRAINT [CK_projects_status] CHECK ([status] IN (N'planning', N'active', N'on_hold', N'completed', N'cancelled'))
);
GO

-- Dashboard query filters on status frequently; equality column goes first
CREATE NONCLUSTERED INDEX [idx_projects_status]
    ON [dbo].[projects] ([status] ASC)
    INCLUDE ([name], [domain], [start_date], [end_date]);
GO

CREATE NONCLUSTERED INDEX [idx_projects_created_by]
    ON [dbo].[projects] ([created_by] ASC);
GO

-- ---------------------------------------------------------------------------
-- project_members
-- Many-to-many: users <-> projects with a project-level role (FR-012, FR-013)
-- ---------------------------------------------------------------------------
CREATE TABLE [dbo].[project_members] (
    [id]         INT           NOT NULL    IDENTITY(1,1),
    [project_id] INT           NOT NULL,
    [user_id]    INT           NOT NULL,
    [role]       NVARCHAR(20)  NOT NULL    CONSTRAINT [DF_project_members_role] DEFAULT (N'member'),
    [joined_at]  DATETIME2     NOT NULL    CONSTRAINT [DF_project_members_joined_at] DEFAULT (GETUTCDATE()),

    CONSTRAINT [PK_project_members] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [UQ_project_members_project_user] UNIQUE ([project_id], [user_id]),
    CONSTRAINT [FK_project_members_project] FOREIGN KEY ([project_id])
        REFERENCES [dbo].[projects] ([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_project_members_user] FOREIGN KEY ([user_id])
        REFERENCES [dbo].[users] ([id]),
    CONSTRAINT [CK_project_members_role] CHECK ([role] IN (N'manager', N'member'))
);
GO

-- Used in every "get projects for user" query (FR-013)
CREATE NONCLUSTERED INDEX [idx_project_members_user_id]
    ON [dbo].[project_members] ([user_id] ASC)
    INCLUDE ([project_id], [role]);
GO

CREATE NONCLUSTERED INDEX [idx_project_members_project_id]
    ON [dbo].[project_members] ([project_id] ASC);
GO

-- ---------------------------------------------------------------------------
-- tasks
-- Individual work items within a project (FR-030 through FR-037)
-- ---------------------------------------------------------------------------
CREATE TABLE [dbo].[tasks] (
    [id]           INT             NOT NULL    IDENTITY(1,1),
    [project_id]   INT             NOT NULL,
    [title]        NVARCHAR(300)   NOT NULL,
    [description]  NVARCHAR(MAX)   NULL,
    [assignee_id]  INT             NULL,
    [status]       NVARCHAR(30)    NOT NULL    CONSTRAINT [DF_tasks_status]   DEFAULT (N'todo'),
    [priority]     NVARCHAR(20)    NOT NULL    CONSTRAINT [DF_tasks_priority] DEFAULT (N'normal'),
    [start_date]   DATE            NULL,
    [due_date]     DATE            NULL,
    [completed_at] DATETIME2       NULL,
    [created_by]   INT             NOT NULL,
    [created_at]   DATETIME2       NOT NULL    CONSTRAINT [DF_tasks_created_at] DEFAULT (GETUTCDATE()),
    [updated_at]   DATETIME2       NOT NULL    CONSTRAINT [DF_tasks_updated_at] DEFAULT (GETUTCDATE()),

    CONSTRAINT [PK_tasks] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_tasks_project]  FOREIGN KEY ([project_id])  REFERENCES [dbo].[projects] ([id]),
    CONSTRAINT [FK_tasks_assignee] FOREIGN KEY ([assignee_id]) REFERENCES [dbo].[users] ([id]) ON DELETE SET NULL,
    CONSTRAINT [FK_tasks_created_by] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users] ([id]),
    CONSTRAINT [CK_tasks_status] CHECK ([status] IN (N'todo', N'in_progress', N'in_review', N'done', N'blocked')),
    CONSTRAINT [CK_tasks_priority] CHECK ([priority] IN (N'critical', N'high', N'normal', N'low'))
);
GO

-- Primary access pattern: all tasks in a project (Kanban, Gantt)
CREATE NONCLUSTERED INDEX [idx_tasks_project_id]
    ON [dbo].[tasks] ([project_id] ASC)
    INCLUDE ([title], [status], [priority], [assignee_id], [due_date]);
GO

-- Dashboard: tasks assigned to a user across all projects
CREATE NONCLUSTERED INDEX [idx_tasks_assignee_id]
    ON [dbo].[tasks] ([assignee_id] ASC)
    WHERE [assignee_id] IS NOT NULL;
GO

-- Dashboard: overdue task detection (due_date < TODAY AND status != done/blocked)
CREATE NONCLUSTERED INDEX [idx_tasks_due_date]
    ON [dbo].[tasks] ([due_date] ASC)
    WHERE [due_date] IS NOT NULL;
GO

-- Kanban column filter: project + status composite (equality column first)
CREATE NONCLUSTERED INDEX [idx_tasks_project_status]
    ON [dbo].[tasks] ([project_id] ASC, [status] ASC);
GO

-- ---------------------------------------------------------------------------
-- subtasks
-- Checklist items within a task (FR-034)
-- Cascade delete: subtasks are meaningless without their parent task
-- ---------------------------------------------------------------------------
CREATE TABLE [dbo].[subtasks] (
    [id]          INT             NOT NULL    IDENTITY(1,1),
    [task_id]     INT             NOT NULL,
    [title]       NVARCHAR(300)   NOT NULL,
    [is_complete] BIT             NOT NULL    CONSTRAINT [DF_subtasks_is_complete] DEFAULT (0),
    [sort_order]  INT             NOT NULL    CONSTRAINT [DF_subtasks_sort_order]  DEFAULT (0),
    [created_at]  DATETIME2       NOT NULL    CONSTRAINT [DF_subtasks_created_at]  DEFAULT (GETUTCDATE()),

    CONSTRAINT [PK_subtasks] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_subtasks_task] FOREIGN KEY ([task_id])
        REFERENCES [dbo].[tasks] ([id]) ON DELETE CASCADE
);
GO

CREATE NONCLUSTERED INDEX [idx_subtasks_task_id]
    ON [dbo].[subtasks] ([task_id] ASC, [sort_order] ASC);
GO

-- ---------------------------------------------------------------------------
-- task_dependencies
-- Blocking relationships between tasks — blocks / blocked-by (FR-037)
-- No cascade delete: dropping a task with dependencies must be an explicit
-- application decision, not a silent cascade, to avoid data integrity surprises.
-- ---------------------------------------------------------------------------
CREATE TABLE [dbo].[task_dependencies] (
    [id]                 INT       NOT NULL    IDENTITY(1,1),
    [task_id]            INT       NOT NULL,   -- the blocked task
    [depends_on_task_id] INT       NOT NULL,   -- must complete first
    [created_at]         DATETIME2 NOT NULL    CONSTRAINT [DF_task_deps_created_at] DEFAULT (GETUTCDATE()),

    CONSTRAINT [PK_task_dependencies] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [UQ_task_dependencies] UNIQUE ([task_id], [depends_on_task_id]),
    CONSTRAINT [FK_task_deps_task]   FOREIGN KEY ([task_id])
        REFERENCES [dbo].[tasks] ([id]),
    CONSTRAINT [FK_task_deps_depends_on] FOREIGN KEY ([depends_on_task_id])
        REFERENCES [dbo].[tasks] ([id]),
    -- Prevent a task from depending on itself
    CONSTRAINT [CK_task_deps_no_self] CHECK ([task_id] <> [depends_on_task_id])
);
GO

-- Look up "what does task X block?" and "what blocks task X?"
CREATE NONCLUSTERED INDEX [idx_task_deps_task_id]
    ON [dbo].[task_dependencies] ([task_id] ASC);
GO

CREATE NONCLUSTERED INDEX [idx_task_deps_depends_on]
    ON [dbo].[task_dependencies] ([depends_on_task_id] ASC);
GO

-- ---------------------------------------------------------------------------
-- task_attachments
-- File attachment metadata for tasks (FR-035)
-- File content is stored on the filesystem; this table records metadata only.
-- Cascade delete: attachments are meaningless without their parent task.
-- ---------------------------------------------------------------------------
CREATE TABLE [dbo].[task_attachments] (
    [id]            INT             NOT NULL    IDENTITY(1,1),
    [task_id]       INT             NOT NULL,
    [filename]      NVARCHAR(255)   NOT NULL,   -- original filename as uploaded
    [storage_path]  NVARCHAR(500)   NOT NULL,   -- server filesystem path or relative URL
    [mime_type]     NVARCHAR(100)   NULL,
    [file_size]     BIGINT          NULL,        -- bytes
    [uploaded_by]   INT             NOT NULL,
    [created_at]    DATETIME2       NOT NULL    CONSTRAINT [DF_task_attachments_created_at] DEFAULT (GETUTCDATE()),

    CONSTRAINT [PK_task_attachments] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_task_attachments_task] FOREIGN KEY ([task_id])
        REFERENCES [dbo].[tasks] ([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_task_attachments_user] FOREIGN KEY ([uploaded_by])
        REFERENCES [dbo].[users] ([id])
);
GO

CREATE NONCLUSTERED INDEX [idx_task_attachments_task_id]
    ON [dbo].[task_attachments] ([task_id] ASC);
GO

-- ---------------------------------------------------------------------------
-- task_comments
-- Team discussion on tasks (FR-036)
-- Cascade delete: comments are meaningless without their parent task.
-- ---------------------------------------------------------------------------
CREATE TABLE [dbo].[task_comments] (
    [id]         INT             NOT NULL    IDENTITY(1,1),
    [task_id]    INT             NOT NULL,
    [user_id]    INT             NOT NULL,
    [body]       NVARCHAR(MAX)   NOT NULL,
    [created_at] DATETIME2       NOT NULL    CONSTRAINT [DF_task_comments_created_at] DEFAULT (GETUTCDATE()),
    [updated_at] DATETIME2       NOT NULL    CONSTRAINT [DF_task_comments_updated_at] DEFAULT (GETUTCDATE()),

    CONSTRAINT [PK_task_comments] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_task_comments_task] FOREIGN KEY ([task_id])
        REFERENCES [dbo].[tasks] ([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_task_comments_user] FOREIGN KEY ([user_id])
        REFERENCES [dbo].[users] ([id])
);
GO

-- Fetch all comments for a task in chronological order (most common pattern)
CREATE NONCLUSTERED INDEX [idx_task_comments_task_id]
    ON [dbo].[task_comments] ([task_id] ASC, [created_at] ASC);
GO

-- ---------------------------------------------------------------------------
-- weekly_work_plans
-- Last Planner System — WWP headers, one per project per week (FR-060)
-- ---------------------------------------------------------------------------
CREATE TABLE [dbo].[weekly_work_plans] (
    [id]              INT            NOT NULL    IDENTITY(1,1),
    [project_id]      INT            NOT NULL,
    [week_start_date] DATE           NOT NULL,   -- always a Monday
    [ppc]             DECIMAL(5, 2)  NULL,        -- 0.00–100.00; NULL until week is closed
    [created_by]      INT            NOT NULL,
    [created_at]      DATETIME2      NOT NULL    CONSTRAINT [DF_wwp_created_at] DEFAULT (GETUTCDATE()),

    CONSTRAINT [PK_weekly_work_plans] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [UQ_wwp_project_week] UNIQUE ([project_id], [week_start_date]),
    CONSTRAINT [FK_wwp_project]    FOREIGN KEY ([project_id]) REFERENCES [dbo].[projects] ([id]),
    CONSTRAINT [FK_wwp_created_by] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users] ([id]),
    CONSTRAINT [CK_wwp_ppc_range]  CHECK ([ppc] IS NULL OR ([ppc] >= 0 AND [ppc] <= 100))
);
GO

-- PPC trend chart fetches plans for a project in week order
CREATE NONCLUSTERED INDEX [idx_wwp_project_week]
    ON [dbo].[weekly_work_plans] ([project_id] ASC, [week_start_date] ASC);
GO

-- ---------------------------------------------------------------------------
-- wwp_tasks
-- Individual commitments within a weekly work plan (FR-061, FR-062, FR-063)
-- Cascade delete: wwp_tasks are meaningless without their parent WWP.
-- ---------------------------------------------------------------------------
CREATE TABLE [dbo].[wwp_tasks] (
    [id]              INT             NOT NULL    IDENTITY(1,1),
    [wwp_id]          INT             NOT NULL,
    [task_id]         INT             NULL,       -- optional link to a tasks row
    [description]     NVARCHAR(300)   NOT NULL,
    [assignee_id]     INT             NULL,
    [is_complete]     BIT             NOT NULL    CONSTRAINT [DF_wwp_tasks_is_complete] DEFAULT (0),
    [variance_reason] NVARCHAR(500)   NULL,       -- required if is_complete = 0 at week close
    [created_at]      DATETIME2       NOT NULL    CONSTRAINT [DF_wwp_tasks_created_at] DEFAULT (GETUTCDATE()),

    CONSTRAINT [PK_wwp_tasks] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_wwp_tasks_wwp]      FOREIGN KEY ([wwp_id])      REFERENCES [dbo].[weekly_work_plans] ([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_wwp_tasks_task]     FOREIGN KEY ([task_id])     REFERENCES [dbo].[tasks] ([id]),
    CONSTRAINT [FK_wwp_tasks_assignee] FOREIGN KEY ([assignee_id]) REFERENCES [dbo].[users] ([id]) ON DELETE SET NULL
);
GO

CREATE NONCLUSTERED INDEX [idx_wwp_tasks_wwp_id]
    ON [dbo].[wwp_tasks] ([wwp_id] ASC);
GO

-- =============================================================================
-- ROLLBACK MIGRATION
-- Run in reverse order to avoid FK violations.
-- WARNING: All data in these tables will be permanently destroyed.
-- =============================================================================
--
-- DROP TABLE IF EXISTS [dbo].[wwp_tasks];
-- DROP TABLE IF EXISTS [dbo].[weekly_work_plans];
-- DROP TABLE IF EXISTS [dbo].[task_comments];
-- DROP TABLE IF EXISTS [dbo].[task_attachments];
-- DROP TABLE IF EXISTS [dbo].[task_dependencies];
-- DROP TABLE IF EXISTS [dbo].[subtasks];
-- DROP TABLE IF EXISTS [dbo].[tasks];
-- DROP TABLE IF EXISTS [dbo].[project_members];
-- DROP TABLE IF EXISTS [dbo].[projects];
-- DROP TABLE IF EXISTS [dbo].[users];
