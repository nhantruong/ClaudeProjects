---
id: "016"
title: "Implement Lean construction (Last Planner System) API"
status: "done"
area: "backend"
agent: "@backend-developer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: "2026-03-31"
completed_at: "2026-03-31"
prd_refs: ["FR-060", "FR-061", "FR-062", "FR-063", "FR-064", "FR-065"]
blocks: ["017"]
blocked_by: ["001", "003", "005", "008", "009"]
---

## Description

Implement the Last Planner System endpoints: create and manage weekly work plans (WWP), update task completion at week end, auto-calculate Percent Plan Complete (PPC), record variance reasons, and serve the lookahead planning view (3–6 week rolling).

## Acceptance Criteria

- [x] `GET /api/v1/projects/:projectId/wwp` — list all WWPs for a project with PPC values
- [x] `POST /api/v1/projects/:projectId/wwp` — create a new weekly work plan for a given week_start_date
- [x] `GET /api/v1/projects/:projectId/wwp/:weekId` — get a specific WWP with all planned tasks
- [x] `POST /api/v1/projects/:projectId/wwp/:weekId/tasks` — add a task to the WWP
- [x] `PATCH /api/v1/projects/:projectId/wwp/:weekId/tasks/:taskId` — update is_complete + variance_reason (FR-061, FR-063)
- [x] `POST /api/v1/projects/:projectId/wwp/:weekId/close` — close the week and calculate PPC (FR-062)
- [x] PPC = completed_tasks / total_tasks * 100, stored on wwp record
- [x] `GET /api/v1/projects/:projectId/ppc` — PPC history for trend chart (FR-064)
- [x] `GET /api/v1/projects/:projectId/lookahead?weeks=4` — tasks due in next N weeks (FR-065)
- [x] Unit tests for PPC calculation service
- [x] API.md updated

## Technical Notes

- `week_start_date` must always be a Monday — validate and reject if not
- Closing a week is idempotent — re-calculating PPC on an already-closed week is allowed
- Lookahead query: tasks where `due_date BETWEEN today AND today + (weeks * 7)`

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
| 2026-03-31 | @backend-developer | All 8 endpoints implemented. Monday validation, PPC calculation, variance reason enforcement, idempotent close. 20 unit tests passing. |
