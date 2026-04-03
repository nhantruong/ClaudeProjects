# Legacy Data Migration Guide

> **Target database**: `cbimtech_raphael`
> **Source databases**: `cbimtech_dmc` · `cbimtech_TimeSheetWeb`
> **Engine**: MS SQL Server 2019+
> **Last updated**: 2026-04-02
> **Status**: Template — fill in placeholder names after running Part 1 discovery queries
> **Reviewed**: 2026-04-02 — two OUTPUT clause bugs fixed (missing legacy_db column in migration_user_map and migration_project_map inserts)

---

## Overview

This guide migrates employee, project, and project-assignment data from two legacy MS SQL Server databases into the Raphael schema. Reference/lookup tables (`ref_disciplines`, `ref_positions`, `ref_project_types`, `ref_work_type_groups`, `ref_work_types`) are already seeded by migration `002_seed_lookups.sql` and are **not** migrated again here.

The guide is structured as four sequential parts. Work through them in order. Do not skip to Part 3 until you have completed Part 1 and filled in every `[Placeholder]` in Part 2.

**Execution environment**: Run all queries in SSMS connected to the target server. Queries that read legacy data use three-part names (`cbimtech_dmc.dbo.TableName`) so they can run while connected to any database on the same server instance.

**Safety contract**:
- All migration scripts use `MERGE` or `WHERE NOT EXISTS` — they are **idempotent** and safe to re-run.
- No legacy data is modified. The scripts are read-only against source databases.
- Wrap each Part 3 script in a transaction and verify row counts before committing.
- Do not run Part 3 scripts on a production instance until Part 4 verification passes on a test restore.

---

## Part 1 — Schema Discovery Queries

Run each query block in SSMS and capture the results. You will use the output to fill in the mapping placeholders in Part 2.

### 1.1 — All tables with row counts in `cbimtech_dmc`

```sql
USE cbimtech_dmc;

SELECT
    t.TABLE_SCHEMA,
    t.TABLE_NAME,
    p.rows AS row_count
FROM INFORMATION_SCHEMA.TABLES t
INNER JOIN sys.tables st
    ON st.name = t.TABLE_NAME
INNER JOIN sys.partitions p
    ON p.object_id = st.object_id
    AND p.index_id IN (0, 1)   -- 0 = heap, 1 = clustered index
WHERE t.TABLE_TYPE = 'BASE TABLE'
ORDER BY p.rows DESC, t.TABLE_NAME;
```

### 1.2 — All tables with row counts in `cbimtech_TimeSheetWeb`

```sql
USE cbimtech_TimeSheetWeb;

SELECT
    t.TABLE_SCHEMA,
    t.TABLE_NAME,
    p.rows AS row_count
FROM INFORMATION_SCHEMA.TABLES t
INNER JOIN sys.tables st
    ON st.name = t.TABLE_NAME
INNER JOIN sys.partitions p
    ON p.object_id = st.object_id
    AND p.index_id IN (0, 1)
WHERE t.TABLE_TYPE = 'BASE TABLE'
ORDER BY p.rows DESC, t.TABLE_NAME;
```

### 1.3 — Columns of the employee/user table(s)

Once you have identified the likely employee table(s) from 1.1 and 1.2 (look for names containing "Employee", "User", "Staff", "NhanVien", "Member"), run this for each candidate table:

```sql
-- Replace 'cbimtech_dmc' and 'YourEmployeeTable' with actual values
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM cbimtech_dmc.INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = N'YourEmployeeTable'
ORDER BY ORDINAL_POSITION;

-- Repeat for cbimtech_TimeSheetWeb if it has a separate user table
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM cbimtech_TimeSheetWeb.INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = N'YourEmployeeTable'
ORDER BY ORDINAL_POSITION;
```

### 1.4 — Sample rows from the employee/user table(s)

```sql
-- Preview 20 rows to understand data quality
SELECT TOP 20 *
FROM cbimtech_dmc.dbo.[YourEmployeeTable]
ORDER BY 1;

SELECT TOP 20 *
FROM cbimtech_TimeSheetWeb.dbo.[YourEmployeeTable]
ORDER BY 1;
```

### 1.5 — Columns of the project table(s)

Look for tables named "Project", "DuAn", "ProjectInfo":

```sql
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM cbimtech_dmc.INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = N'YourProjectTable'
ORDER BY ORDINAL_POSITION;
```

### 1.6 — Columns of the project-assignment table(s)

Look for tables named "ProjectMember", "ProjectEmployee", "ProjectAssignment", "DuAn_NhanVien":

```sql
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM cbimtech_dmc.INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = N'YourProjectAssignmentTable'
ORDER BY ORDINAL_POSITION;
```

### 1.7 — Foreign key map (understand join paths)

```sql
-- Run in each legacy database to understand FK relationships
SELECT
    fk.name          AS fk_name,
    tp.name          AS parent_table,
    cp.name          AS parent_column,
    tr.name          AS referenced_table,
    cr.name          AS referenced_column
FROM cbimtech_dmc.sys.foreign_keys fk
INNER JOIN cbimtech_dmc.sys.tables tp         ON tp.object_id = fk.parent_object_id
INNER JOIN cbimtech_dmc.sys.tables tr         ON tr.object_id = fk.referenced_object_id
INNER JOIN cbimtech_dmc.sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
INNER JOIN cbimtech_dmc.sys.columns cp        ON cp.object_id = fk.parent_object_id  AND cp.column_id = fkc.parent_column_id
INNER JOIN cbimtech_dmc.sys.columns cr        ON cr.object_id = fk.referenced_object_id AND cr.column_id = fkc.referenced_column_id
ORDER BY tp.name, fk.name;
```

---

## Part 2 — Migration Mapping Assumptions

This section describes the assumed mapping between legacy columns and Raphael target columns. Every `[Placeholder]` must be filled in with the actual table/column name you discovered in Part 1 before running Part 3.

> **Instructions**: Replace every occurrence of `[SourceDB]`, `[SourceTable]`, and `[ColumnName]` with real names from your Part 1 results. Cells marked "(confirm)" require you to verify the assumption against actual data.

---

### 2.1 — Users mapping

**Source assumption**: Employee master data lives in one or both legacy databases. `cbimtech_dmc` likely has the authoritative list because it stores position (`17_Position`) and discipline (`18_Descipline`) lookups. `cbimtech_TimeSheetWeb` likely has a separate account/login table.

**Strategy**: Treat `cbimtech_dmc` as the authoritative employee source. If `cbimtech_TimeSheetWeb` has accounts that do not exist in `cbimtech_dmc`, add them as a second pass. De-duplicate on full name or email before inserting.

| Raphael `users` column | Source | Notes |
|------------------------|--------|-------|
| `username` | Generated from `[SourceDB].[SourceTable].[FullNameColumn]` | Formula: lowercase first initial + last word of name. Example: "Nguyen Van An" → `an`. Collision handling: append numeric suffix (`an2`, `an3`). See Part 3 script. |
| `password_hash` | Hardcoded constant | Bcrypt hash of `TempPass@123` at cost 12. All migrated users must change on first login. |
| `display_name` | `[SourceDB].[SourceTable].[FullNameColumn]` | Use the full name as-is. Trim whitespace. |
| `role` | `[SourceDB].[SourceTable].[PositionIdColumn]` → `[SourceDB].dbo.17_Position.[PositionName]` | Mapping table in Part 3. |
| `is_active` | `[SourceDB].[SourceTable].[IsActiveColumn]` (confirm) | If no active flag exists, default all migrated users to `1`. |
| `created_at` | `[SourceDB].[SourceTable].[CreatedDateColumn]` or `GETUTCDATE()` | Use source created date if available; fall back to migration run time. |
| `updated_at` | Same as `created_at` | Set to migration run time. |

**Position → role mapping** (fill in IDs after Part 1):

| Legacy position name | Legacy position id | Raphael `role` |
|---------------------|--------------------|----------------|
| Center Director | `[id]` | `admin` |
| Deputy Center Director | `[id]` | `admin` |
| Department Head | `[id]` | `manager` |
| Senior Specialist | `[id]` | `member` |
| Staff | `[id]` | `member` |
| (any other / NULL) | — | `member` |

---

### 2.2 — Projects mapping

**Source assumption**: `cbimtech_dmc` is the project master. It stores `13_ProjectType` which maps to `ref_project_types`. Projects likely have a Vietnamese name, an English name or code, start/end dates, and a status flag.

| Raphael `projects` column | Source | Notes |
|--------------------------|--------|-------|
| `name` | `[SourceDB].[SourceTable].[ProjectNameColumn]` | Use nvarchar — preserves Vietnamese characters. Trim. |
| `description` | `[SourceDB].[SourceTable].[DescriptionColumn]` | NULL if not present. |
| `domain` | `[SourceDB].[SourceTable].[ProjectTypeIdColumn]` → mapping below | Derive from project type name. |
| `status` | `[SourceDB].[SourceTable].[StatusColumn]` → mapping below | Map legacy status codes. |
| `start_date` | `[SourceDB].[SourceTable].[StartDateColumn]` | NULL if not available. Cast to `date`. |
| `end_date` | `[SourceDB].[SourceTable].[EndDateColumn]` | NULL if not available. Cast to `date`. |
| `created_by` | Constant: admin user id | The first admin user in `cbimtech_raphael.dbo.users` after migration. See note below. |
| `created_at` | `[SourceDB].[SourceTable].[CreatedDateColumn]` or `GETUTCDATE()` | |
| `updated_at` | Same as `created_at` | |

**Note on `created_by`**: Determine the admin user's `id` in `cbimtech_raphael.dbo.users` after the users migration has run. Substitute that integer for `@adminUserId` in the Part 3 project script.

**Domain mapping** (based on `13_ProjectType` names):

| Legacy project type name | Raphael `domain` |
|--------------------------|-----------------|
| Civil & Infrastructure | `electromechanical` |
| Commercial | `electromechanical` |
| Hospitality & Tourism | `electromechanical` |
| Industrial | `electromechanical` |
| Mixed-Use | `electromechanical` |
| Residential | `electromechanical` |
| Educational | `electromechanical` |
| Healthcare | `electromechanical` |
| Recreational & Sports | `electromechanical` |
| Software / Internal Tool | `software` |
| (any BIM-specific type if present) | `bim` |
| (NULL / unknown) | `other` |

> Note: Most legacy project types map to `electromechanical` because that is the firm's primary domain. Adjust this mapping to `bim` or `other` if the source data has finer-grained type codes.

**Status mapping**:

| Legacy status value (confirm) | Raphael `status` |
|-------------------------------|-----------------|
| Active / In Progress / 1 | `active` |
| Completed / Done / Closed / 2 | `completed` |
| On Hold / Suspended / 3 | `on_hold` |
| Cancelled / Terminated / 4 | `cancelled` |
| (NULL / unknown / new) | `planning` |

---

### 2.3 — Project members mapping

**Source assumption**: A project-assignment table joins employees to projects, possibly with a role or lead flag. This table may live in `cbimtech_dmc`.

| Raphael `project_members` column | Source | Notes |
|----------------------------------|--------|-------|
| `project_id` | Looked up from migrated `projects` via legacy project id mapping table | See Part 3 — staging table approach. |
| `user_id` | Looked up from migrated `users` via legacy employee id mapping table | Same approach. |
| `role` | `[SourceDB].[SourceTable].[RoleColumn]` or position-based | If no project role column exists, assign `manager` to anyone whose position maps to `manager`/`admin`, else `member`. |
| `joined_at` | `[SourceDB].[SourceTable].[AssignedDateColumn]` or `GETUTCDATE()` | Use source date if available. |

---

## Part 3 — Migration SQL Scripts

All scripts target `cbimtech_raphael`. Run them in the order shown: users first, then projects, then project members.

Each script wraps its work in an explicit transaction. Review row counts in the `PRINT` output before typing `COMMIT`. If anything looks wrong, type `ROLLBACK` instead.

---

### 3.0 — Pre-migration: staging tables and ID maps

These staging tables track the mapping between legacy primary keys and new Raphael primary keys. They are created once and referenced by all subsequent scripts.

```sql
USE cbimtech_raphael;

-- Drop staging tables if re-running from scratch
IF OBJECT_ID('dbo.migration_user_map',    'U') IS NOT NULL DROP TABLE dbo.migration_user_map;
IF OBJECT_ID('dbo.migration_project_map', 'U') IS NOT NULL DROP TABLE dbo.migration_project_map;

-- Maps legacy employee id → new Raphael users.id
CREATE TABLE dbo.migration_user_map (
    legacy_db       nvarchar(100)  NOT NULL,  -- 'cbimtech_dmc' or 'cbimtech_TimeSheetWeb'
    legacy_id       int            NOT NULL,
    raphael_user_id int            NOT NULL,
    PRIMARY KEY (legacy_db, legacy_id)
);

-- Maps legacy project id → new Raphael projects.id
CREATE TABLE dbo.migration_project_map (
    legacy_db          nvarchar(100)  NOT NULL,
    legacy_id          int            NOT NULL,
    raphael_project_id int            NOT NULL,
    PRIMARY KEY (legacy_db, legacy_id)
);
```

---

### 3.1 — Users migration

**Bcrypt hash for `TempPass@123` at cost 12**:
```
$2b$12$K8GpU3Z6QwXmR9vN2LsT4OzYpA1BcDeFgHiJkLmNoPqRsTuVwXyZ
```

> **Important**: The hash above is a placeholder illustration of the bcrypt format. You must generate the real hash before running this script. Use this Node.js one-liner on the server:
> ```
> node -e "const b=require('bcrypt'); b.hash('TempPass@123',12).then(h=>console.log(h));"
> ```
> Copy the output and replace the `@tempPasswordHash` value below.

```sql
USE cbimtech_raphael;

-- ---------------------------------------------------------------
-- CONFIGURATION — fill in before running
-- ---------------------------------------------------------------
DECLARE @sourceDb        nvarchar(100) = N'cbimtech_dmc';
DECLARE @tempPasswordHash nvarchar(255) = N'$2b$12$REPLACE_WITH_REAL_BCRYPT_HASH';
-- ---------------------------------------------------------------

BEGIN TRANSACTION;

BEGIN TRY

    -- Step 1: Build a de-duplicated employee list with generated usernames
    -- Replace [YourEmployeeTable], [IdColumn], [FullNameColumn],
    -- [PositionIdColumn], [IsActiveColumn], [CreatedDateColumn]
    -- with the real column names discovered in Part 1.

    WITH source_employees AS (
        SELECT
            emp.[IdColumn]                                   AS legacy_id,
            LTRIM(RTRIM(emp.[FullNameColumn]))               AS full_name,
            pos.[PositionName]                               AS position_name,
            ISNULL(emp.[IsActiveColumn], 1)                  AS is_active,
            ISNULL(emp.[CreatedDateColumn], GETUTCDATE())    AS source_created_at,

            -- Generate base username: lowercase of last word in the full name
            LOWER(
                REVERSE(
                    LEFT(
                        REVERSE(LTRIM(RTRIM(emp.[FullNameColumn]))),
                        CHARINDEX(N' ',
                            REVERSE(LTRIM(RTRIM(emp.[FullNameColumn]))) + N' '
                        ) - 1
                    )
                )
            ) AS base_username

        FROM cbimtech_dmc.dbo.[YourEmployeeTable] emp
        LEFT JOIN cbimtech_dmc.dbo.[17_Position] pos
            ON pos.[IdColumn] = emp.[PositionIdColumn]
    ),

    -- Attach a collision-resolution suffix using ROW_NUMBER
    deduped AS (
        SELECT
            legacy_id,
            full_name,
            position_name,
            is_active,
            source_created_at,
            base_username,
            ROW_NUMBER() OVER (PARTITION BY base_username ORDER BY legacy_id) AS username_seq
        FROM source_employees
    ),

    -- Build final username: base if unique, base+N if collision
    final_usernames AS (
        SELECT
            legacy_id,
            full_name,
            position_name,
            is_active,
            source_created_at,
            CASE
                WHEN username_seq = 1 THEN base_username
                ELSE base_username + CAST(username_seq AS nvarchar(5))
            END AS username
        FROM deduped
    )

    -- Step 2: MERGE into users (idempotent — match on username)
    MERGE dbo.users AS tgt
    USING (
        SELECT
            legacy_id,
            username,
            full_name,
            -- Map position name to Raphael role
            CASE
                WHEN position_name IN (N'Center Director', N'Deputy Center Director') THEN N'admin'
                WHEN position_name IN (N'Department Head')                            THEN N'manager'
                ELSE N'member'
            END AS role,
            is_active,
            source_created_at
        FROM final_usernames
        WHERE full_name IS NOT NULL AND LEN(full_name) > 0  -- skip blank rows
    ) AS src
    ON tgt.username = src.username

    WHEN NOT MATCHED BY TARGET THEN
        INSERT (username, password_hash, display_name, role, is_active, created_at, updated_at)
        VALUES (
            src.username,
            @tempPasswordHash,
            src.full_name,
            src.role,
            src.is_active,
            src.source_created_at,
            GETUTCDATE()
        )

    WHEN MATCHED THEN
        -- Row already exists (re-run) — update display_name and role but never overwrite password_hash
        UPDATE SET
            tgt.display_name = src.full_name,
            tgt.role         = src.role,
            tgt.is_active    = src.is_active,
            tgt.updated_at   = GETUTCDATE()

    OUTPUT @sourceDb, src.legacy_id, inserted.id
    INTO dbo.migration_user_map (legacy_db, legacy_id, raphael_user_id)
    -- Note: OUTPUT with MERGE only fires for INSERT rows; re-runs will not duplicate the map.
    -- If re-running, truncate migration_user_map first (see note after script).
    ;

    -- Step 3: Populate map for rows that already existed (re-run scenario)
    -- This fills in map entries for MATCHED rows that OUTPUT skipped.
    INSERT INTO dbo.migration_user_map (legacy_db, legacy_id, raphael_user_id)
    SELECT
        @sourceDb,
        fu.legacy_id,
        u.id
    FROM (
        -- Rebuild final_usernames CTE inline (SQL Server CTEs cannot be reused after MERGE)
        SELECT
            emp.[IdColumn] AS legacy_id,
            CASE
                WHEN ROW_NUMBER() OVER (
                    PARTITION BY LOWER(REVERSE(LEFT(REVERSE(LTRIM(RTRIM(emp.[FullNameColumn]))),
                        CHARINDEX(N' ', REVERSE(LTRIM(RTRIM(emp.[FullNameColumn]))) + N' ') - 1)))
                    ORDER BY emp.[IdColumn]
                ) = 1
                THEN LOWER(REVERSE(LEFT(REVERSE(LTRIM(RTRIM(emp.[FullNameColumn]))),
                        CHARINDEX(N' ', REVERSE(LTRIM(RTRIM(emp.[FullNameColumn]))) + N' ') - 1)))
                ELSE LOWER(REVERSE(LEFT(REVERSE(LTRIM(RTRIM(emp.[FullNameColumn]))),
                        CHARINDEX(N' ', REVERSE(LTRIM(RTRIM(emp.[FullNameColumn]))) + N' ') - 1)))
                     + CAST(ROW_NUMBER() OVER (
                           PARTITION BY LOWER(REVERSE(LEFT(REVERSE(LTRIM(RTRIM(emp.[FullNameColumn]))),
                               CHARINDEX(N' ', REVERSE(LTRIM(RTRIM(emp.[FullNameColumn]))) + N' ') - 1)))
                           ORDER BY emp.[IdColumn]
                       ) AS nvarchar(5))
            END AS username
        FROM cbimtech_dmc.dbo.[YourEmployeeTable] emp
    ) fu
    INNER JOIN dbo.users u ON u.username = fu.username
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.migration_user_map m
        WHERE m.legacy_db = @sourceDb AND m.legacy_id = fu.legacy_id
    );

    PRINT 'Users migrated. Row count in cbimtech_raphael.dbo.users:';
    SELECT COUNT(*) AS users_total FROM dbo.users;

    PRINT 'User map entries:';
    SELECT COUNT(*) AS map_entries FROM dbo.migration_user_map WHERE legacy_db = @sourceDb;

    -- Review these counts before committing.
    -- COMMIT TRANSACTION;
    -- ROLLBACK TRANSACTION;

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    THROW;
END CATCH;
```

> **After reviewing**: Type `COMMIT TRANSACTION;` to finalize, or `ROLLBACK TRANSACTION;` to undo.
>
> **Re-running**: If you need to start fresh, run:
> ```sql
> TRUNCATE TABLE dbo.migration_user_map;
> DELETE FROM cbimtech_raphael.dbo.users WHERE id > 0; -- only if no application data exists yet
> ```

---

### 3.2 — Projects migration

```sql
USE cbimtech_raphael;

-- ---------------------------------------------------------------
-- CONFIGURATION — fill in before running
-- ---------------------------------------------------------------
DECLARE @sourceDb   nvarchar(100) = N'cbimtech_dmc';
-- Find the admin user id after running 3.1:
-- SELECT id FROM cbimtech_raphael.dbo.users WHERE role = 'admin' ORDER BY id;
DECLARE @adminUserId int = NULL;  -- REPLACE with actual admin id
-- ---------------------------------------------------------------

IF @adminUserId IS NULL
BEGIN
    RAISERROR('Set @adminUserId before running this script.', 16, 1);
    RETURN;
END;

BEGIN TRANSACTION;

BEGIN TRY

    -- Replace [YourProjectTable], [IdColumn], [NameColumn], [DescriptionColumn],
    -- [ProjectTypeIdColumn], [StatusColumn], [StartDateColumn], [EndDateColumn],
    -- [CreatedDateColumn] with real column names from Part 1.

    MERGE dbo.projects AS tgt
    USING (
        SELECT
            prj.[IdColumn]                                   AS legacy_id,
            LTRIM(RTRIM(prj.[NameColumn]))                   AS name,
            prj.[DescriptionColumn]                          AS description,

            -- Domain mapping from project type
            CASE
                WHEN pt.[TypeName] = N'Software / Internal Tool' THEN N'software'
                WHEN pt.[TypeName] LIKE N'%BIM%'                 THEN N'bim'
                WHEN pt.[TypeName] IS NULL                       THEN N'other'
                ELSE N'electromechanical'
            END AS domain,

            -- Status mapping — adjust the legacy values to match your actual data
            CASE prj.[StatusColumn]
                WHEN 1 THEN N'active'
                WHEN 2 THEN N'completed'
                WHEN 3 THEN N'on_hold'
                WHEN 4 THEN N'cancelled'
                ELSE        N'planning'
            END AS status,

            TRY_CAST(prj.[StartDateColumn] AS date)          AS start_date,
            TRY_CAST(prj.[EndDateColumn]   AS date)          AS end_date,
            ISNULL(prj.[CreatedDateColumn], GETUTCDATE())    AS source_created_at

        FROM cbimtech_dmc.dbo.[YourProjectTable] prj
        LEFT JOIN cbimtech_dmc.dbo.[13_ProjectType] pt
            ON pt.[IdColumn] = prj.[ProjectTypeIdColumn]

        WHERE LTRIM(RTRIM(prj.[NameColumn])) IS NOT NULL
          AND LEN(LTRIM(RTRIM(prj.[NameColumn]))) > 0
    ) AS src

    -- Match on name — prevents duplicates on re-run.
    -- If names are not unique across legacy projects, add a legacy_code column
    -- to the source and match on that instead.
    ON tgt.name = src.name

    WHEN NOT MATCHED BY TARGET THEN
        INSERT (name, description, domain, status, start_date, end_date,
                created_by, created_at, updated_at)
        VALUES (
            src.name,
            src.description,
            src.domain,
            src.status,
            src.start_date,
            src.end_date,
            @adminUserId,
            src.source_created_at,
            GETUTCDATE()
        )

    WHEN MATCHED THEN
        UPDATE SET
            tgt.description = src.description,
            tgt.domain      = src.domain,
            tgt.status      = src.status,
            tgt.start_date  = src.start_date,
            tgt.end_date    = src.end_date,
            tgt.updated_at  = GETUTCDATE()

    OUTPUT @sourceDb, src.legacy_id, inserted.id
    INTO dbo.migration_project_map (legacy_db, legacy_id, raphael_project_id)
    ;

    -- Fill map for MATCHED rows (re-run scenario)
    INSERT INTO dbo.migration_project_map (legacy_db, legacy_id, raphael_project_id)
    SELECT
        @sourceDb,
        prj.[IdColumn],
        p.id
    FROM cbimtech_dmc.dbo.[YourProjectTable] prj
    INNER JOIN dbo.projects p
        ON p.name = LTRIM(RTRIM(prj.[NameColumn]))
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.migration_project_map m
        WHERE m.legacy_db = @sourceDb AND m.legacy_id = prj.[IdColumn]
    );

    PRINT 'Projects migrated. Row count in cbimtech_raphael.dbo.projects:';
    SELECT COUNT(*) AS projects_total FROM dbo.projects;

    PRINT 'Project map entries:';
    SELECT COUNT(*) AS map_entries FROM dbo.migration_project_map WHERE legacy_db = @sourceDb;

    -- COMMIT TRANSACTION;
    -- ROLLBACK TRANSACTION;

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    THROW;
END CATCH;
```

---

### 3.3 — Project members migration

```sql
USE cbimtech_raphael;

-- ---------------------------------------------------------------
-- CONFIGURATION
-- ---------------------------------------------------------------
DECLARE @sourceDb nvarchar(100) = N'cbimtech_dmc';
-- ---------------------------------------------------------------

BEGIN TRANSACTION;

BEGIN TRY

    -- Replace [YourProjectAssignmentTable], [ProjectIdColumn], [EmployeeIdColumn],
    -- [RoleColumn], [AssignedDateColumn] with real column names from Part 1.
    --
    -- If there is no role column, the CASE expression defaults everyone to 'member'
    -- except those already mapped as 'manager' or 'admin' in the users table.

    MERGE dbo.project_members AS tgt
    USING (
        SELECT DISTINCT
            pm_map.raphael_project_id       AS project_id,
            um_map.raphael_user_id          AS user_id,

            -- Project-level role: use source role if available, else infer from system role
            CASE
                WHEN u.role IN (N'admin', N'manager') THEN N'manager'
                ELSE N'member'
                -- If your source table has an explicit role column, use:
                -- WHEN pa.[RoleColumn] = 'Lead' THEN N'manager'
                -- ELSE N'member'
            END AS role,

            ISNULL(
                TRY_CAST(pa.[AssignedDateColumn] AS datetime2),
                GETUTCDATE()
            ) AS joined_at

        FROM cbimtech_dmc.dbo.[YourProjectAssignmentTable] pa

        -- Join to ID maps to get Raphael PKs
        INNER JOIN dbo.migration_project_map pm_map
            ON pm_map.legacy_db = @sourceDb
           AND pm_map.legacy_id = pa.[ProjectIdColumn]

        INNER JOIN dbo.migration_user_map um_map
            ON um_map.legacy_db = @sourceDb
           AND um_map.legacy_id = pa.[EmployeeIdColumn]

        -- Join to users to check system role
        INNER JOIN dbo.users u
            ON u.id = um_map.raphael_user_id
           AND u.is_active = 1  -- only active users get memberships

    ) AS src
    ON tgt.project_id = src.project_id
   AND tgt.user_id    = src.user_id

    WHEN NOT MATCHED BY TARGET THEN
        INSERT (project_id, user_id, role, joined_at)
        VALUES (src.project_id, src.user_id, src.role, src.joined_at)

    WHEN MATCHED THEN
        UPDATE SET
            tgt.role      = src.role,
            tgt.joined_at = src.joined_at
    ;

    PRINT 'Project members migrated. Row count in cbimtech_raphael.dbo.project_members:';
    SELECT COUNT(*) AS project_members_total FROM dbo.project_members;

    -- COMMIT TRANSACTION;
    -- ROLLBACK TRANSACTION;

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    THROW;
END CATCH;
```

---

### 3.4 — Post-migration cleanup

After all three scripts are committed, drop the staging tables:

```sql
USE cbimtech_raphael;

-- Keep these until you are satisfied with verification (Part 4).
-- Drop only after all verification queries pass.
DROP TABLE IF EXISTS dbo.migration_user_map;
DROP TABLE IF EXISTS dbo.migration_project_map;
```

---

## Part 4 — Verification Queries

Run these after all three Part 3 scripts have been committed. Each query includes an expected outcome. Investigate any unexpected result before releasing the system.

### 4.1 — Row count comparison: users

```sql
-- Source count
SELECT COUNT(*) AS legacy_employee_count
FROM cbimtech_dmc.dbo.[YourEmployeeTable];

-- Target count
SELECT COUNT(*) AS raphael_user_count
FROM cbimtech_raphael.dbo.users;

-- Expected: counts should be equal (or target slightly higher if a seed admin was
-- pre-created). Investigate if the difference is > 5.
```

### 4.2 — Row count comparison: projects

```sql
SELECT COUNT(*) AS legacy_project_count
FROM cbimtech_dmc.dbo.[YourProjectTable];

SELECT COUNT(*) AS raphael_project_count
FROM cbimtech_raphael.dbo.projects;

-- Expected: counts should match.
```

### 4.3 — Row count comparison: project members

```sql
SELECT COUNT(*) AS legacy_assignment_count
FROM cbimtech_dmc.dbo.[YourProjectAssignmentTable];

SELECT COUNT(*) AS raphael_member_count
FROM cbimtech_raphael.dbo.project_members;

-- Expected: Raphael count = legacy count minus any assignments for inactive users
-- (which were excluded). The difference should equal the count below.
SELECT COUNT(*) AS excluded_inactive
FROM cbimtech_dmc.dbo.[YourProjectAssignmentTable] pa
INNER JOIN dbo.migration_user_map um
    ON um.legacy_id = pa.[EmployeeIdColumn]
INNER JOIN cbimtech_raphael.dbo.users u
    ON u.id = um.raphael_user_id
WHERE u.is_active = 0;
```

### 4.4 — Role distribution check

```sql
SELECT role, COUNT(*) AS count
FROM cbimtech_raphael.dbo.users
GROUP BY role
ORDER BY role;

-- Expected: at least one 'admin', a sensible number of 'manager',
-- majority 'member'. If 0 admins, the system cannot be managed — fix before launch.
```

### 4.5 — Spot-check: specific user exists and is correct

```sql
-- Replace 'expected.username' and 'Expected Display Name' with a known person.
SELECT id, username, display_name, role, is_active
FROM cbimtech_raphael.dbo.users
WHERE username = N'expected.username';

-- Verify: display_name matches the full name from the legacy system.
-- Verify: role matches the mapping table in Part 2.1.
-- Verify: is_active = 1 for active staff.
```

### 4.6 — Spot-check: specific project exists and is correct

```sql
-- Replace N'Known Project Name' with a project you can verify manually.
SELECT id, name, domain, status, start_date, end_date, created_by
FROM cbimtech_raphael.dbo.projects
WHERE name = N'Known Project Name';

-- Verify: domain is the correct mapped value.
-- Verify: status is the correct mapped value.
-- Verify: start_date and end_date are not NULL when source had values.
```

### 4.7 — Orphaned project members check

```sql
-- No rows should be returned. Any row indicates a FK violation.
SELECT pm.*
FROM cbimtech_raphael.dbo.project_members pm
LEFT JOIN cbimtech_raphael.dbo.users u     ON u.id     = pm.user_id
LEFT JOIN cbimtech_raphael.dbo.projects p  ON p.id     = pm.project_id
WHERE u.id IS NULL OR p.id IS NULL;

-- Expected: 0 rows.
```

### 4.8 — Password hash integrity check

```sql
-- Every migrated user must have a non-empty bcrypt hash.
-- Bcrypt hashes always start with '$2b$'.
SELECT COUNT(*) AS users_with_invalid_hash
FROM cbimtech_raphael.dbo.users
WHERE password_hash NOT LIKE N'$2b$%'
  AND password_hash NOT LIKE N'$2a$%';

-- Expected: 0 rows.
```

### 4.9 — Username uniqueness check

```sql
-- Verify the UNIQUE constraint was not bypassed.
SELECT username, COUNT(*) AS count
FROM cbimtech_raphael.dbo.users
GROUP BY username
HAVING COUNT(*) > 1;

-- Expected: 0 rows.
```

### 4.10 — Projects with no members (warning, not error)

```sql
-- Projects with zero members are valid but may indicate an incomplete migration.
SELECT p.id, p.name, p.status
FROM cbimtech_raphael.dbo.projects p
LEFT JOIN cbimtech_raphael.dbo.project_members pm ON pm.project_id = p.id
WHERE pm.id IS NULL
ORDER BY p.name;

-- Review this list. Projects with no members will be invisible to all users.
-- Add memberships manually via the Raphael admin UI after launch if needed.
```

### 4.11 — Duplicate project names (warning)

```sql
SELECT name, COUNT(*) AS count
FROM cbimtech_raphael.dbo.projects
GROUP BY name
HAVING COUNT(*) > 1;

-- Expected: 0 rows.
-- If duplicates exist, the Part 3.2 MERGE matched on name, so this should not occur.
-- If it does, the source had duplicate names — investigate and deduplicate manually.
```

---

## Post-Migration Checklist

Work through this list after all Part 4 queries pass.

- [ ] All Part 4 queries return expected results (no failures, no orphaned rows)
- [ ] At least one admin account exists and you can log in with `TempPass@123`
- [ ] Force all migrated users to change their password before the system goes live (email them credentials out-of-band; there is no in-app notification in v1)
- [ ] Drop staging tables (`migration_user_map`, `migration_project_map`) after verification
- [ ] Update the Migrations Log in `docs/technical/DATABASE.md` with the migration file and date
- [ ] Take a full database backup of `cbimtech_raphael` before opening the system to users

---

## Appendix A — Generating the bcrypt hash

Run this once on the application server (requires Node.js and the `bcrypt` package from the `server/` directory):

```bash
cd /path/to/raphael/server
node -e "const b=require('bcrypt'); b.hash('TempPass@123', 12).then(h => console.log(h));"
```

Copy the output (e.g., `$2b$12$abc...xyz`) and paste it as the value of `@tempPasswordHash` in script 3.1.

The hash is deterministic per-run with a random salt — each execution produces a different hash string, but all valid bcrypt hashes will verify correctly against the plaintext password.

---

## Appendix B — Username generation rules

The username generation logic in script 3.1 uses the last word of the full name (lowercased) as the base username. For Vietnamese names structured as "Family Middle Given" (e.g., "Nguyen Van An"), this produces `an` — the given name, which is culturally appropriate for a login handle.

Collision handling appends a numeric suffix in insertion order by legacy employee id: `an`, `an2`, `an3`, etc.

If this scheme produces poor results (e.g., too many collisions on common given names like "Anh", "Linh"), consider an alternative: first initial + full last name (`nguyen.v.an`). Update the LOWER/REVERSE expression in script 3.1 accordingly. Confirm the chosen scheme with the project owner before running on production data.

---

## Appendix C — If the two legacy databases have separate user tables

If `cbimtech_TimeSheetWeb` has login accounts that do not correspond 1-to-1 with employees in `cbimtech_dmc`, run script 3.1 a second time with `@sourceDb = N'cbimtech_TimeSheetWeb'` and the appropriate table/column substitutions. The `migration_user_map` table uses `(legacy_db, legacy_id)` as a composite key to support this two-source scenario.

De-duplicate before inserting: run this check first to find name overlaps between the two databases:

```sql
SELECT
    tsweb.[FullNameColumn] AS tsw_name,
    dmc.[FullNameColumn]   AS dmc_name
FROM cbimtech_TimeSheetWeb.dbo.[TSWebEmployeeTable] tsweb
INNER JOIN cbimtech_dmc.dbo.[YourEmployeeTable] dmc
    ON LOWER(LTRIM(RTRIM(dmc.[FullNameColumn])))
     = LOWER(LTRIM(RTRIM(tsweb.[FullNameColumn])));

-- Rows returned = employees that appear in both databases.
-- These people should only be inserted ONCE.
-- Add a NOT EXISTS filter to the second 3.1 run to exclude them.
```
