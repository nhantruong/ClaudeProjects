# Database Reference

> **Engine**: MS SQL Server 2019+
> **ORM / Query layer**: Raw SQL via `mssql` Node.js driver (raw SQL per ADR-001)
> **Connection**: Via `DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` environment variables
> **Last updated**: 2026-04-06

---

## Schema Overview

Raphael's data model centres on Users, Projects, and Tasks. Projects group tasks across multiple disciplines. Teams are modelled through project membership. Lean construction data (weekly work plans, PPC) links back to projects and tasks. RFI (Request for Information) records track formal design queries per project. Reference tables (disciplines, positions, work types, project types) hold lookup data seeded at installation.

```
users
  │
  └──< project_members >──< projects ──< tasks ──< subtasks
                                │          │
                                │          ├──< task_comments
                                │          ├──< task_attachments
                                │          └──< task_dependencies
                                │
                                ├──< weekly_work_plans ──< wwp_tasks
                                │
                                ├──< rfis ──< rfi_comments
                                │        ├──< rfi_activity
                                │        └──< rfi_images
                                │
                                └──< timesheet_entries

ref_disciplines       (lookup — seeded)
ref_positions         (lookup — seeded)
ref_project_types     (lookup — seeded)
ref_work_type_groups  (lookup — seeded)
ref_work_types        (lookup — seeded, FK → ref_work_type_groups)
```

**Key relationships**:
- `users` → `project_members` → `projects`: users join projects through membership records (one role per project)
- `projects` → `tasks`: all tasks belong to a project
- `tasks` → `subtasks`: tasks can have checklist subtasks (cascade delete)
- `tasks` → `task_comments`: team discussion on a task (cascade delete)
- `tasks` → `task_attachments`: file metadata attached to a task (cascade delete)
- `tasks` → `task_dependencies`: many-to-many self-reference (blocks / blocked-by; no cascade — must be explicitly resolved)
- `projects` → `weekly_work_plans` → `wwp_tasks`: Last Planner System WWP records per week per project
- `projects` → `rfis`: formal design queries per project; no cascade on project deletion — RFI history is retained
- `rfis` → `rfi_comments`: threaded discussion on an RFI (cascade delete)
- `rfis` → `rfi_activity`: immutable audit log of state changes (cascade delete)
- `projects` → `timesheet_entries`: time logs per user per day per project (cascade delete on project deletion; no cascade on user deactivation)

---

## Sessions Table: Removed per ADR-002

The draft schema included a `sessions` table. This was removed after reviewing ADR-002. Authentication uses stateless JWT signed with `SESSION_SECRET`, stored in an `httpOnly`, `SameSite=Strict` cookie. No database lookup is performed per request — the JWT signature is verified in middleware. Because tokens cannot be individually revoked before expiry (acceptable for this use case), no sessions table is needed. If revocation requirements change in a future version, a new ADR must be written before adding this table.

---

## Tables

---

### users

**Purpose**: User accounts. Authentication identity. Admin-created only — no self-registration (FR-001, FR-003, FR-010, FR-011).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | int | PK, NOT NULL, IDENTITY(1,1) | Primary key |
| username | nvarchar(100) | NOT NULL, UNIQUE | Login identifier — case-insensitive collation from server default |
| password_hash | nvarchar(255) | NOT NULL | bcrypt hash at cost factor >= 12. Never store plaintext. |
| display_name | nvarchar(150) | NOT NULL | Name shown in the UI |
| role | nvarchar(20) | NOT NULL, DEFAULT 'member' | System role: `admin` / `manager` / `member` |
| is_active | bit | NOT NULL, DEFAULT 1 | 0 = deactivated account (soft delete) |
| avatar_url | nvarchar(500) | NULL | URL of the user's profile image (relative or absolute). NULL = use generated initials avatar. |
| created_at | datetime2 | NOT NULL, DEFAULT GETUTCDATE() | Record creation timestamp (UTC) |
| updated_at | datetime2 | NOT NULL, DEFAULT GETUTCDATE() | Last modification timestamp (UTC) — application must update on every PATCH |

**Constraints**:
- `CK_users_role` — role must be one of: `admin`, `manager`, `member`
- `UQ_users_username` — unique login identifiers

**Indexes**:
- `idx_users_username` on `(username)` WHERE `is_active = 1` — partial index supports the login query without scanning inactive accounts

**Relationships**: None (root entity)

**Notes**: Deactivated users (`is_active = 0`) retain their rows for referential integrity — tasks, comments, and membership records continue to reference them. Do not hard-delete users.

---

### projects

**Purpose**: Top-level containers for tasks and plans (FR-020 through FR-024).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | int | PK, NOT NULL, IDENTITY(1,1) | Primary key |
| name | nvarchar(200) | NOT NULL | Project name (supports Unicode — Vietnamese project names) |
| description | nvarchar(max) | NULL | Project description |
| domain | nvarchar(50) | NOT NULL | `electromechanical` / `bim` / `software` / `other` (FR-021) |
| status | nvarchar(30) | NOT NULL, DEFAULT 'planning' | `planning` / `active` / `on_hold` / `completed` / `cancelled` (FR-023) |
| start_date | date | NULL | Planned start date |
| end_date | date | NULL | Planned end date |
| cover_image_url | nvarchar(500) | NULL | URL of the project's cover image (relative or absolute). NULL = no cover image displayed. |
| created_by | int | NOT NULL, FK → users.id | User who created the project |
| created_at | datetime2 | NOT NULL, DEFAULT GETUTCDATE() | Record creation timestamp (UTC) |
| updated_at | datetime2 | NOT NULL, DEFAULT GETUTCDATE() | Last modification timestamp (UTC) |

**Constraints**:
- `CK_projects_domain` — enforces allowed domain values
- `CK_projects_status` — enforces allowed status values
- `FK_projects_created_by` → `users.id` (no cascade — project creator deletion must be handled explicitly)

**Indexes**:
- `idx_projects_status` on `(status)` INCLUDE `(name, domain, start_date, end_date)` — dashboard summary card query; covering index avoids table lookup
- `idx_projects_created_by` on `(created_by)` — FK index prevents full scan on user deletion check

**Notes**: `domain` is a controlled string rather than a FK to a reference table. The four domains are fixed by the PRD (FR-021) and changes require a schema migration — acceptable for this product's stability.

---

### project_members

**Purpose**: Many-to-many join between users and projects, with a project-level role per membership (FR-012, FR-013).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | int | PK, NOT NULL, IDENTITY(1,1) | Primary key |
| project_id | int | NOT NULL, FK → projects.id ON DELETE CASCADE | The project |
| user_id | int | NOT NULL, FK → users.id | The user |
| role | nvarchar(20) | NOT NULL, DEFAULT 'member' | Project-level role: `manager` / `member` |
| joined_at | datetime2 | NOT NULL, DEFAULT GETUTCDATE() | When the user was added to the project |

**Constraints**:
- `UQ_project_members_project_user` on `(project_id, user_id)` — one membership row per user per project
- `CK_project_members_role` — role must be `manager` or `member`
- `FK_project_members_project` → `projects.id` ON DELETE CASCADE — when a project is deleted, all membership rows are removed
- `FK_project_members_user` → `users.id` (no cascade — user deactivation does not remove memberships)

**Indexes**:
- `idx_project_members_user_id` on `(user_id)` INCLUDE `(project_id, role)` — covering index for "get all projects for user" (FR-013), the most frequent query
- `idx_project_members_project_id` on `(project_id)` — "get all members of a project"

---

### tasks

**Purpose**: Individual work items within a project (FR-030 through FR-037).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | int | PK, NOT NULL, IDENTITY(1,1) | Primary key |
| project_id | int | NOT NULL, FK → projects.id | Parent project |
| title | nvarchar(300) | NOT NULL | Task title |
| description | nvarchar(max) | NULL | Detailed description (Markdown supported in UI) |
| assignee_id | int | NULL, FK → users.id ON DELETE SET NULL | Assigned team member (nullable — unassigned tasks are valid) |
| status | nvarchar(30) | NOT NULL, DEFAULT 'todo' | `todo` / `in_progress` / `in_review` / `done` / `blocked` (FR-032) |
| priority | nvarchar(20) | NOT NULL, DEFAULT 'normal' | `critical` / `high` / `normal` / `low` (FR-033) |
| start_date | date | NULL | Planned start date |
| due_date | date | NULL | Due date (FR-031) |
| completed_at | datetime2 | NULL | Actual completion timestamp — set when status transitions to `done` |
| created_by | int | NOT NULL, FK → users.id | User who created the task |
| created_at | datetime2 | NOT NULL, DEFAULT GETUTCDATE() | Record creation timestamp (UTC) |
| updated_at | datetime2 | NOT NULL, DEFAULT GETUTCDATE() | Last modification timestamp (UTC) |

**Constraints**:
- `CK_tasks_status` — enforces allowed status values
- `CK_tasks_priority` — enforces allowed priority values
- `FK_tasks_project` → `projects.id` (no cascade — task deletion when a project is deleted must be explicit)
- `FK_tasks_assignee` → `users.id` ON DELETE SET NULL — deactivating a user nulls their task assignments
- `FK_tasks_created_by` → `users.id` (no cascade)

**Indexes**:
- `idx_tasks_project_id` on `(project_id)` INCLUDE `(title, status, priority, assignee_id, due_date)` — covering index for Kanban board and Gantt (most frequent large read)
- `idx_tasks_assignee_id` on `(assignee_id)` WHERE `assignee_id IS NOT NULL` — partial index for "tasks assigned to user" (dashboard workload, FR-072)
- `idx_tasks_due_date` on `(due_date)` WHERE `due_date IS NOT NULL` — partial index for overdue task detection (FR-071, FR-082)
- `idx_tasks_project_status` on `(project_id, status)` — Kanban column filter; equality columns first

**Notes**: The `completed_at` timestamp is set by application logic when `status` transitions to `done`. It is not set by a trigger to keep the schema simple. The application service layer is responsible for maintaining this invariant.

---

### subtasks

**Purpose**: Checklist items within a task (FR-034).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | int | PK, NOT NULL, IDENTITY(1,1) | Primary key |
| task_id | int | NOT NULL, FK → tasks.id ON DELETE CASCADE | Parent task |
| title | nvarchar(300) | NOT NULL | Subtask title |
| is_complete | bit | NOT NULL, DEFAULT 0 | 0 = incomplete, 1 = complete |
| sort_order | int | NOT NULL, DEFAULT 0 | Display order within the checklist |
| created_at | datetime2 | NOT NULL, DEFAULT GETUTCDATE() | Record creation timestamp (UTC) |

**Relationships**:
- `task_id` → `tasks.id` ON DELETE CASCADE — subtasks are meaningless without the parent task

**Indexes**:
- `idx_subtasks_task_id` on `(task_id, sort_order)` — composite for ordered checklist fetch

---

### task_dependencies

**Purpose**: Blocking relationships between tasks — blocks / blocked-by (FR-037).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | int | PK, NOT NULL, IDENTITY(1,1) | Primary key |
| task_id | int | NOT NULL, FK → tasks.id | The downstream (blocked) task |
| depends_on_task_id | int | NOT NULL, FK → tasks.id | The upstream task that must complete first |
| created_at | datetime2 | NOT NULL, DEFAULT GETUTCDATE() | Record creation timestamp (UTC) |

**Constraints**:
- `UQ_task_dependencies` on `(task_id, depends_on_task_id)` — no duplicate dependency rows
- `CK_task_deps_no_self` — `task_id <> depends_on_task_id` (a task cannot depend on itself)
- `FK_task_deps_task` → `tasks.id` (no cascade — dependency rows must be explicitly removed before deleting a task; application must enforce this)
- `FK_task_deps_depends_on` → `tasks.id` (no cascade — same reason)

**Indexes**:
- `idx_task_deps_task_id` on `(task_id)` — "what does task X depend on?"
- `idx_task_deps_depends_on` on `(depends_on_task_id)` — "what tasks does task X block?"

**Notes**: Cascade delete is intentionally omitted. Silently removing dependency rows when a task is deleted could leave other tasks blocked by a ghost. The application service layer must detect and resolve dependencies before permitting task deletion.

---

### task_attachments

**Purpose**: File attachment metadata for tasks (FR-035). File content is stored on the server filesystem or a configured file storage path. This table records metadata only — filename, path, MIME type, and size.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | int | PK, NOT NULL, IDENTITY(1,1) | Primary key |
| task_id | int | NOT NULL, FK → tasks.id ON DELETE CASCADE | Parent task |
| filename | nvarchar(255) | NOT NULL | Original filename as provided by the uploader |
| storage_path | nvarchar(500) | NOT NULL | Relative path on the server filesystem (e.g., `uploads/tasks/42/report.pdf`) |
| mime_type | nvarchar(100) | NULL | MIME type detected at upload time |
| file_size | bigint | NULL | File size in bytes |
| uploaded_by | int | NOT NULL, FK → users.id | User who uploaded the file |
| created_at | datetime2 | NOT NULL, DEFAULT GETUTCDATE() | Upload timestamp (UTC) |

**Relationships**:
- `task_id` → `tasks.id` ON DELETE CASCADE — attachment records removed when task is deleted. Application must also delete the physical file.
- `uploaded_by` → `users.id` (no cascade)

**Indexes**:
- `idx_task_attachments_task_id` on `(task_id)` — "all attachments for a task"

**Notes**: The file deletion responsibility lies with the application. When a task is deleted, the cascade removes the metadata row, but the application's delete handler must also remove the file from `storage_path`.

---

### task_comments

**Purpose**: Team discussion on tasks (FR-036).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | int | PK, NOT NULL, IDENTITY(1,1) | Primary key |
| task_id | int | NOT NULL, FK → tasks.id ON DELETE CASCADE | Parent task |
| user_id | int | NOT NULL, FK → users.id | Comment author |
| body | nvarchar(max) | NOT NULL | Comment text (Markdown supported in UI) |
| created_at | datetime2 | NOT NULL, DEFAULT GETUTCDATE() | Creation timestamp (UTC) |
| updated_at | datetime2 | NOT NULL, DEFAULT GETUTCDATE() | Last edit timestamp (UTC) |

**Relationships**:
- `task_id` → `tasks.id` ON DELETE CASCADE
- `user_id` → `users.id` (no cascade — comments remain even if user is deactivated)

**Indexes**:
- `idx_task_comments_task_id` on `(task_id, created_at)` — all comments for a task in chronological order

---

### weekly_work_plans

**Purpose**: Last Planner System — weekly work plan headers, one per project per week (FR-060).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | int | PK, NOT NULL, IDENTITY(1,1) | Primary key |
| project_id | int | NOT NULL, FK → projects.id | Owning project |
| week_start_date | date | NOT NULL | Monday that begins the plan week |
| ppc | decimal(5,2) | NULL | Percent Plan Complete (0.00–100.00). NULL until the week is closed and calculated. |
| created_by | int | NOT NULL, FK → users.id | User who created the plan |
| created_at | datetime2 | NOT NULL, DEFAULT GETUTCDATE() | Record creation timestamp (UTC) |

**Constraints**:
- `UQ_wwp_project_week` on `(project_id, week_start_date)` — one WWP per project per week
- `CK_wwp_ppc_range` — ppc must be NULL or between 0.00 and 100.00

**Relationships**:
- `project_id` → `projects.id` (no cascade — WWP history is retained even if the project is archived)
- `created_by` → `users.id` (no cascade)

**Indexes**:
- `idx_wwp_project_week` on `(project_id, week_start_date)` — PPC trend chart reads weeks in order per project (FR-064)

**Notes**: `ppc` is calculated by the application at week close: `completed wwp_tasks / total wwp_tasks * 100`. It is stored (not computed on every read) for historical accuracy — once a week is closed the PPC does not change.

---

### wwp_tasks

**Purpose**: Individual commitments within a weekly work plan (FR-061, FR-062, FR-063).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | int | PK, NOT NULL, IDENTITY(1,1) | Primary key |
| wwp_id | int | NOT NULL, FK → weekly_work_plans.id ON DELETE CASCADE | Parent weekly work plan |
| task_id | int | NULL, FK → tasks.id | Optional link to a task record |
| description | nvarchar(300) | NOT NULL | What was committed to this week |
| assignee_id | int | NULL, FK → users.id ON DELETE SET NULL | Team member responsible |
| is_complete | bit | NOT NULL, DEFAULT 0 | Marked at week end |
| variance_reason | nvarchar(500) | NULL | Required by business rule when is_complete = 0 and week is closed (FR-063) |
| created_at | datetime2 | NOT NULL, DEFAULT GETUTCDATE() | Record creation timestamp (UTC) |

**Relationships**:
- `wwp_id` → `weekly_work_plans.id` ON DELETE CASCADE — wwp_tasks are meaningless without their parent WWP
- `task_id` → `tasks.id` (no cascade — the link is optional and informational)
- `assignee_id` → `users.id` ON DELETE SET NULL

**Indexes**:
- `idx_wwp_tasks_wwp_id` on `(wwp_id)` — all tasks for a given plan

**Notes**: `variance_reason` is enforced at the application layer (not via a database constraint) because the rule is conditional on week status: it only becomes required when the week is closed with `is_complete = 0`. A CHECK constraint cannot reference a column in a joined table, so the service layer must enforce this before persisting.

---

### timesheet_entries

**Purpose**: Daily time logs — one row per user per project per calendar day. Records how many hours a team member worked on a project on a given date, with an optional work-type classification and free-text notes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | int | PK, NOT NULL, IDENTITY(1,1) | Primary key |
| user_id | int | NOT NULL, FK → users.id | The user who logged the time |
| project_id | int | NOT NULL, FK → projects.id ON DELETE CASCADE | The project the time was logged against |
| work_type_id | int | NULL, FK → ref_work_types.id | Optional work type classification (e.g., Modelling, Coordination) |
| entry_date | date | NOT NULL | Calendar date on which the work was performed |
| hours | decimal(4,2) | NOT NULL | Hours logged; must be > 0 and <= 24 (quarter-hour precision via 2 d.p.) |
| description | nvarchar(500) | NULL | Optional free-text notes about the work performed |
| created_at | datetime2 | NOT NULL, DEFAULT GETUTCDATE() | Record creation timestamp (UTC) |
| updated_at | datetime2 | NOT NULL, DEFAULT GETUTCDATE() | Last modification timestamp (UTC) — application must update on every PATCH |

**Constraints**:
- `UQ_timesheet_user_project_date` on `(user_id, project_id, entry_date)` — one entry per user per project per day; the application UPDATEs the existing row rather than INSERTing a duplicate
- `CK_timesheet_hours` — `hours > 0 AND hours <= 24`
- `FK_timesheet_user` → `users.id` (no cascade — timesheet history is retained when a user is deactivated; hard deletion requires explicit DBA action)
- `FK_timesheet_project` → `projects.id` ON DELETE CASCADE — time entries have no business value without their project
- `FK_timesheet_work_type` → `ref_work_types.id` (no cascade — deactivating a lookup row does not invalidate historical entries)

**Indexes**:
- `idx_timesheet_user_date` on `(user_id, entry_date)` — primary read path: all entries for a user in a date range (user timesheet view, personal summary)
- `idx_timesheet_project_date` on `(project_id, entry_date)` — project-level time reporting and cost tracking
- `idx_timesheet_entry_date` on `(entry_date)` — cross-user period aggregation where neither user nor project is the leading predicate

**Relationships**:
- `user_id` → `users.id` (no cascade — see constraints note above)
- `project_id` → `projects.id` ON DELETE CASCADE
- `work_type_id` → `ref_work_types.id` (no cascade — optional classification)

**Notes**: The `decimal(4,2)` type for `hours` supports values from 0.01 to 99.99, but the CHECK constraint caps the meaningful range at 24.00. Quarter-hour precision (0.25 increments) is the expected input granularity from the UI, but the constraint does not enforce this — any value with up to 2 decimal places is accepted. The UNIQUE constraint drives an upsert pattern: the application attempts an UPDATE first; if zero rows are affected it falls back to INSERT.

---

## Reference / Lookup Tables

These tables are seeded by migration `002_seed_lookups.sql` and are read-only in normal application operation. New rows are added via future migrations.

---

### ref_disciplines

**Purpose**: Engineering and BIM discipline taxonomy. Merged from two source databases: `18_Descipline` (cbimtech_dmc) and `14_Descipline` (cbimtech_TimeSheetWeb). The more granular TimeSheetWeb list is used as the basis, with MEP sub-disciplines separated.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | int | PK, NOT NULL, IDENTITY(1,1) | Primary key |
| name | nvarchar(100) | NOT NULL, UNIQUE | Discipline name (e.g., `MEP - Electrical`) |
| is_active | bit | NOT NULL, DEFAULT 1 | Can be deactivated without deletion |
| sort_order | int | NOT NULL, DEFAULT 0 | Display order in dropdowns |

**Seed data** (12 rows): Architecture, Structure, MEP, MEP - Electrical, MEP - Plumbing, MEP - HVAC, MEP - Fire Protection, BIM Coordinator, QA/QC, Software / IT, Admin, All Disciplines.

---

### ref_positions

**Purpose**: Staff position / job title taxonomy. Source: `17_Position` (cbimtech_dmc) — translated from Vietnamese to English.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | int | PK, NOT NULL, IDENTITY(1,1) | Primary key |
| name | nvarchar(100) | NOT NULL, UNIQUE | Position name |
| is_leader | bit | NOT NULL, DEFAULT 0 | Whether this position implies team lead responsibility |
| is_active | bit | NOT NULL, DEFAULT 1 | Can be deactivated |
| sort_order | int | NOT NULL, DEFAULT 0 | Display order |

**Seed data** (5 rows): Center Director, Deputy Center Director, Department Head, Senior Specialist, Staff.

---

### ref_project_types

**Purpose**: Building/project type taxonomy for categorising projects. Source: `13_ProjectType` (cbimtech_dmc) — already in English. One additional row added for internal software projects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | int | PK, NOT NULL, IDENTITY(1,1) | Primary key |
| name | nvarchar(100) | NOT NULL, UNIQUE | Project type name |
| description | nvarchar(500) | NULL | Explanatory description |
| is_active | bit | NOT NULL, DEFAULT 1 | Can be deactivated |

**Seed data** (10 rows): Civil & Infrastructure, Commercial, Hospitality & Tourism, Industrial, Mixed-Use, Residential, Educational, Healthcare, Recreational & Sports, Software / Internal Tool.

---

### ref_work_type_groups

**Purpose**: Groups of work types for task categorisation. Source: `16a_WorkTypeGroup` (cbimtech_TimeSheetWeb). The numeric prefix (G1-, G2-) is stripped; sort_order preserves the original sequence.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | int | PK, NOT NULL | Natural key from source (1–5) |
| name | nvarchar(100) | NOT NULL, UNIQUE | Group name |
| sort_order | int | NOT NULL, DEFAULT 0 | Display order |

**Seed data** (5 rows): Meeting & Preparation, Modelling, QA Checking, R&D, Other.

---

### ref_work_types

**Purpose**: Individual work type codes for task/timesheet categorisation. Source: `16_WorkType` (cbimtech_TimeSheetWeb) with minor typo corrections and 4 additional software-focused entries.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | int | PK, NOT NULL, IDENTITY(1,1) | Primary key |
| name | nvarchar(100) | NOT NULL, UNIQUE | Work type name |
| group_id | int | NOT NULL, FK → ref_work_type_groups.id | Owning group |
| is_active | bit | NOT NULL, DEFAULT 1 | Can be deactivated |

**Seed data** (33 rows): Project Kickoff Meeting, Project Meeting, Modelling (STR/ARC/MEP), Self Checking, Read Drawing, Scheduling & Planning, Revit Family Creation, Review Sub-model, Software Testing, Clash Detection & Report, Shop Drawing (ARC/STR/MEP), QTO, 4D Simulation, Coordination, Update Model, Presentation, Training, Rendering & Visualisation, AR/VR Experience, R&D, Documentation, Infrastructure Modelling, As-Built Modelling, BIM Proposal, BIM Execution Plan, Software Development, Code Review, Bug Fix, Deployment.

---

## Migrations Log

| Migration File | Date | Description | Reversible | Deployment Risk |
|----------------|------|-------------|------------|-----------------|
| `001_initial_schema.sql` | 2026-03-28 | Create all core tables: users, projects, project_members, tasks, subtasks, task_dependencies, task_attachments, task_comments, weekly_work_plans, wwp_tasks | Yes — rollback DDL in file comments; WARNING: data loss | None — new database |
| `002_seed_lookups.sql` | 2026-03-28 | Create and seed reference tables: ref_disciplines, ref_positions, ref_project_types, ref_work_type_groups, ref_work_types | Yes — DELETE + DROP statements in file comments | None — INSERT only |
| `003_rfi.sql` | 2026-04-02 | Create RFI tables: rfis, rfi_comments, rfi_activity | Yes — DROP TABLE statements in file comments; WARNING: data loss | None — additive only |
| `004_images_timesheet.sql` | 2026-04-03 | Add cover_image_url to projects; add avatar_url to users; create timesheet_entries table | Yes — rollback DDL in file comments; WARNING: timesheet data loss on step 3 rollback | Low — nullable column additions + new table; no existing rows affected |
| `005_rfi_images.sql` | 2026-04-03 | Create rfi_images table for file attachments on RFIs and RFI comments (1–6 per RFI) | Yes — `DROP TABLE IF EXISTS rfi_images`; WARNING: data loss | None — additive only |
| `006_schema_migrations.sql` | 2026-04-06 | Create schema_migrations tracking table (IF NOT EXISTS guard — idempotent). Used by the migration runner to track applied files. | Yes — `DROP TABLE IF EXISTS schema_migrations`; WARNING: loses migration tracking history | None — additive only |

See `docs/technical/MIGRATION_GUIDE.md` for the legacy data migration strategy (one-time, manual execution via SSMS) — migrates users, projects, and project_members from `cbimtech_dmc` and `cbimtech_TimeSheetWeb` into `cbimtech_raphael`. This is not a numbered migration file because it requires human discovery steps before running.

---

## Running Migrations

The migration runner lives at `server/src/db/migrate.ts`. It is a standalone Node.js script — not part of the Express application. Run it from the `server/` directory.

### Running pending migrations

```bash
# From server/
npm run db:migrate
```

The runner:
1. Reads `DB_*` variables from `server/.env` (variables already in the environment take precedence).
2. Connects to MS SQL Server.
3. Ensures the `schema_migrations` tracking table exists (inline `IF NOT EXISTS` guard — safe on any environment).
4. Reads all `*.sql` files from `server/src/db/migrations/` sorted lexicographically.
5. For each file: skips if its filename is already recorded in `schema_migrations`; otherwise executes the file and inserts a tracking row.
6. Prints a summary (N run, N skipped) and exits 0 on success, 1 on error.

It is safe to run multiple times — already-applied migrations are always skipped.

### First-time setup on a new environment

```bash
# From server/
npm run db:migrate
```

No manual steps are required. The tracking table is created automatically on the first run.

### Adding a new migration

1. Create a file in `server/src/db/migrations/` with the next sequential prefix: `007_description.sql`.
2. Write valid T-SQL. Use `GO` as a batch separator where needed — the runner splits on `GO` automatically before sending batches to the driver.
3. Run `npm run db:migrate` to apply it.

### Checking migration status (via SSMS or sqlcmd)

```sql
SELECT filename, applied_at FROM schema_migrations ORDER BY filename;
```

### Rollback

The runner applies migrations forward only. To roll back, execute the rollback DDL from the migration file's comments manually via SSMS, then delete the corresponding row from `schema_migrations`:

```sql
DELETE FROM schema_migrations WHERE filename = N'007_description.sql';
```

---

## Query Patterns

### Get user by username (login)
```sql
SELECT id, username, password_hash, display_name, role, is_active
FROM users
WHERE username = @username AND is_active = 1;
```

### Get all projects for a user (respects FR-013 — users see only their projects)
```sql
SELECT p.id, p.name, p.domain, p.status, p.start_date, p.end_date
FROM projects p
INNER JOIN project_members pm ON pm.project_id = p.id
WHERE pm.user_id = @userId
  AND p.status NOT IN (N'cancelled')
ORDER BY p.updated_at DESC;
```

### Get all tasks for a project with assignee info (Kanban / Gantt)
```sql
SELECT t.id, t.title, t.status, t.priority, t.start_date, t.due_date,
       t.completed_at, u.display_name AS assignee_name, u.id AS assignee_id
FROM tasks t
LEFT JOIN users u ON u.id = t.assignee_id
WHERE t.project_id = @projectId
ORDER BY
    CASE t.priority
        WHEN N'critical' THEN 1
        WHEN N'high'     THEN 2
        WHEN N'normal'   THEN 3
        WHEN N'low'      THEN 4
    END ASC,
    t.due_date ASC;
```

### Get overdue tasks for dashboard (FR-071, FR-082)
```sql
SELECT t.id, t.title, t.due_date, t.status, t.priority,
       p.name AS project_name,
       u.display_name AS assignee_name
FROM tasks t
JOIN projects p ON p.id = t.project_id
LEFT JOIN users u ON u.id = t.assignee_id
INNER JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = @userId
WHERE t.due_date < CAST(GETUTCDATE() AS date)
  AND t.status NOT IN (N'done')
ORDER BY t.due_date ASC;
```

### Get tasks due today for dashboard (FR-071)
```sql
SELECT t.id, t.title, t.status, t.priority,
       p.name AS project_name,
       u.display_name AS assignee_name
FROM tasks t
JOIN projects p ON p.id = t.project_id
LEFT JOIN users u ON u.id = t.assignee_id
INNER JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = @userId
WHERE t.due_date = CAST(GETUTCDATE() AS date)
  AND t.status NOT IN (N'done')
ORDER BY t.priority, t.title;
```

### Get team workload (tasks per assignee across active projects — FR-072)
```sql
SELECT u.id AS user_id, u.display_name,
       COUNT(*) AS open_task_count
FROM tasks t
JOIN users u ON u.id = t.assignee_id
JOIN projects p ON p.id = t.project_id
WHERE t.status NOT IN (N'done')
  AND p.status = N'active'
GROUP BY u.id, u.display_name
ORDER BY open_task_count DESC;
```

### Get WWP with PPC trend for a project (FR-064)
```sql
SELECT w.id, w.week_start_date, w.ppc,
       COUNT(wt.id) AS total_tasks,
       SUM(CAST(wt.is_complete AS int)) AS completed_tasks
FROM weekly_work_plans w
LEFT JOIN wwp_tasks wt ON wt.wwp_id = w.id
WHERE w.project_id = @projectId
GROUP BY w.id, w.week_start_date, w.ppc
ORDER BY w.week_start_date ASC;
```

### Get blocked tasks and their blocking dependencies (for AI advisor context — FR-082)
```sql
SELECT t.id AS blocked_task_id, t.title AS blocked_task,
       t.project_id, p.name AS project_name,
       dep.id AS blocking_task_id, dep.title AS blocking_task,
       dep.status AS blocking_status
FROM tasks t
JOIN task_dependencies td ON td.task_id = t.id
JOIN tasks dep ON dep.id = td.depends_on_task_id
JOIN projects p ON p.id = t.project_id
WHERE t.status = N'blocked'
ORDER BY p.name, t.title;
```

---

## Index Decision Log

| Index | Type | Rationale |
|-------|------|-----------|
| `idx_users_username` (partial, active only) | B-tree | Login is a high-frequency equality lookup; partial index skips inactive accounts |
| `idx_projects_status` (covering) | B-tree | Dashboard loads active/planning projects — covering index avoids heap lookup |
| `idx_project_members_user_id` (covering) | B-tree | Every page load calls "get projects for user" — covering avoids join to projects for role check |
| `idx_tasks_project_id` (covering) | B-tree | Kanban and Gantt fetch all tasks for a project — covering avoids heap lookup for display columns |
| `idx_tasks_assignee_id` (partial, non-null only) | B-tree | Workload dashboard; partial skips unassigned tasks which are irrelevant here |
| `idx_tasks_due_date` (partial, non-null only) | B-tree | Overdue query filters on due_date; partial skips tasks without a due date |
| `idx_tasks_project_status` | B-tree | Kanban column filter — composite; equality columns (project_id, status) ordered first |
| `idx_subtasks_task_id` (composite with sort_order) | B-tree | Fetches checklist in display order in one index operation |
| `idx_task_deps_task_id` + `idx_task_deps_depends_on` | B-tree | Both directions of dependency traversal need index support |
| `idx_wwp_project_week` | B-tree | PPC trend chart reads in date order per project |
| `idx_timesheet_user_date` (composite) | B-tree | Primary timesheet read path — equality on user_id + range on entry_date; supports user timesheet view and payroll export |
| `idx_timesheet_project_date` (composite) | B-tree | Project-level time reporting — equality on project_id + range on entry_date |
| `idx_timesheet_entry_date` | B-tree | Cross-user period aggregation where date is the only predicate (e.g. "all hours logged this week") |

**Indexes NOT added and why**:
- `tasks.status` alone — low cardinality (5 values); covered by the composite `idx_tasks_project_status` instead
- `tasks.priority` alone — low cardinality (4 values); covered by the project_id composite index INCLUDE
- `wwp_tasks.is_complete` — only 2 values; sequential scan of a small child set is faster
- Any index on `ref_*` lookup tables — all are < 50 rows; sequential scans are optimal

---

## Data Retention Policy

| Table | Retention | Mechanism |
|-------|-----------|-----------|
| users | Indefinite (soft delete via is_active) | Admin deactivation; hard delete requires explicit DBA action |
| projects | Indefinite | Status transitions to `cancelled`; no automatic deletion |
| tasks | Indefinite | Deleted only on explicit user action; no automatic purge |
| task_comments | Indefinite | Retained for audit trail |
| task_attachments | Until manually deleted | Application must also delete physical files |
| weekly_work_plans | Indefinite | PPC history required for trend reporting |
| wwp_tasks | Indefinite (cascade from WWP) | Retained as long as the WWP exists |
| timesheet_entries | Indefinite | Retained for payroll and audit purposes; cascade-deleted if the parent project is hard-deleted |

---

## Known Issues & Tech Debt

| Issue | Impact | Plan |
|-------|--------|------|
| ~~No migration runner configured~~ | **Resolved** — `npm run db:migrate` runs all pending migrations from `server/src/db/migrations/*.sql`. Tracks applied files in the `schema_migrations` table. The runner ensures the table exists automatically on first run. See the "Running Migrations" section above. | — |
| updated_at not auto-maintained | Application must set updated_at on every UPDATE; no trigger | Accept for v1; add a trigger or handle in the model layer |
| No full-text index on task descriptions | LIKE '%keyword%' searches will be slow on large datasets | Add a full-text catalog and index on tasks.description if search is prioritised in v2 |
| Circular dependency detection | The schema prevents self-referencing (CK_task_deps_no_self) but not longer cycles (A→B→A) | Enforce cycle detection in the application service layer before inserting a dependency row |
