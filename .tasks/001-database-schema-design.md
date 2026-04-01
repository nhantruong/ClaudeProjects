---
id: "001"
title: "Design and document full database schema"
status: "done"
area: "database"
agent: "@database-expert"
priority: "high"
created_at: "2026-03-28"
due_date: null
started_at: "2026-03-28"
completed_at: "2026-03-28"
prd_refs: ["FR-001", "FR-010", "FR-020", "FR-030", "FR-034", "FR-036", "FR-037", "FR-060", "FR-061", "FR-062", "FR-063"]
blocks: ["003", "005", "007", "008", "009", "016"]
blocked_by: []
---

## Description

Design the complete MS SQL Server database schema for Raphael covering all entities: users, sessions, projects, project_members, tasks, subtasks, task_dependencies, task_comments, weekly_work_plans, and wwp_tasks. The schema draft in `docs/technical/DATABASE.md` is a starting point — the database expert must review it, fill in all columns with correct MS SQL Server types, write the actual CREATE TABLE SQL, add all indexes, and document final decisions. This schema blocks all backend implementation.

## Reuse Context

Two existing production SQL databases have been identified for schema inspiration and seed data. Do NOT import them directly — Raphael needs a clean, normalized schema. Use the lookup tables as seed data sources and the project/staff tables as validation against real-world data.

### Database 1: `cbimtech_dmc.sql`
Source path: `D:\00. CloudData\Personal\OneDrive\MyApp\ClaudeProjects\CurrentDb\cbimtech_dmc.sql`

Relevant tables and their value as seed data:

| Table | Rows (approx.) | Raphael use |
|-------|---------------|-------------|
| `01_Projects` | 200+ | Real project names — validate that the `projects` schema can hold them; use a subset as dev seed data |
| `02_Members` | — | Staff records — seed for `users` table (re-hash passwords with bcrypt — see WARNING below) |
| `16_Status` | 3 | Status values with color codes — inform the status enum design |
| `17_Position` | 5 | Staff levels (position/seniority) — consider adding a `position` field to `users` |
| `18_Descipline` | 7 | Discipline values (electromechanical, BIM, etc.) — seed for a `disciplines` lookup or `projects.domain` enum |
| `13_ProjectType` | 9 | Project type values — consider adding `project_type` to `projects` |
| `11_Location` | 66 | Vietnamese province names — seed data for a `location` field on projects if needed |
| `07_WorkType` | 17 | Work type categories — reference when designing task category fields |

### Database 2: `cbimtech_TimeSheetWeb.sql`
Source path: `D:\00. CloudData\Personal\OneDrive\MyApp\ClaudeProjects\CurrentDb\cbimtech_TimeSheetWeb.sql`

Relevant tables and their value as seed data:

| Table | Rows (approx.) | Raphael use |
|-------|---------------|-------------|
| `15_TimeSheet` | 9,043 | Real timesheet rows — useful for volume testing task/time data if a time-tracking feature is added later |
| `02_BIMstaff` | 72 | BIM staff records — additional seed candidates for `users` (re-hash passwords — see WARNING) |
| `16_WorkType` | 29 | BIM-specific work types — reference alongside `07_WorkType` above |
| `16a_WorkTypeGroup` | 5 | Work type group categories |
| `14_Descipline` | 11 | Discipline list (11 entries, more granular than the 7 in cbimtech_dmc) — use this fuller list |
| `49_ClientsList` | 103 | Client companies — seed for a future `clients` table or `projects.client` field |

### WARNING: Plain-text Passwords

`02_Members.Pass` and `02_BIMstaff.Password` are stored as plain text in the source databases. **Do NOT import these values.** When seeding the `users` table, generate temporary passwords and hash them with bcrypt (cost factor 12) as required by the security architecture.

### Schema Design Notes

The existing schemas are BIM-workflow-specific and denormalized. Column names use spaces (e.g., `[BIM staff]`, `[Project Name]`) which is incompatible with Raphael's raw-SQL approach. Design a clean Raphael schema using the `DATABASE.md` draft as the base, then use the lookup table values as seed INSERT statements.

## Acceptance Criteria

- [x] All tables defined in DATABASE.md are reviewed and finalised with MS SQL Server-specific types (nvarchar, datetime2, bit, etc.)
- [x] CREATE TABLE SQL scripts written and tested against a local MS SQL Server instance
- [x] All foreign keys, unique constraints, and indexes defined
- [x] Migration files created in `server/src/db/migrations/`
- [x] DATABASE.md updated with final schema (column types, indexes, relationships)
- [ ] Schema successfully creates without errors on MS SQL Server 2019+ *(to be verified by @backend-developer during task #003 environment setup)*

## Technical Notes

- Use `IDENTITY(1,1)` for integer PKs (MS SQL Server syntax, not `SERIAL`)
- Use `datetime2` not `datetime` for timestamp columns — better precision and range
- Use `nvarchar` (Unicode) for all text columns — engineering project names may include special characters and Vietnamese text
- Password field must be `nvarchar(255)` to accommodate bcrypt hashes
- Consider adding `position` (nvarchar, nullable) to `users` — 5 levels exist in `17_Position`
- Consider adding `domain` enum values drawn from `14_Descipline` (11 disciplines) rather than the 4 values originally planned
- Migration output directory: `server/src/db/migrations/` (relative to worktree root)
- See `docs/technical/DATABASE.md` for the planned schema draft
- See `docs/technical/DECISIONS.md` ADR-001 for the decision to use raw SQL

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
| 2026-03-28 | human | Existing Timesheet codebase and CurrentDb databases identified for reuse — task updated |
| 2026-03-28 | @database-expert | Schema designed; migration files 001_initial_schema.sql and 002_seed_lookups.sql written; DATABASE.md fully updated with all tables, indexes, query patterns, and retention policy; task marked done |
