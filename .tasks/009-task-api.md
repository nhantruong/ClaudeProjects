---
id: "009"
title: "Implement task CRUD API"
status: "todo"
area: "backend"
agent: "@backend-developer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-030", "FR-031", "FR-032", "FR-033", "FR-034", "FR-035", "FR-036", "FR-037"]
blocks: ["012", "013", "014"]
blocked_by: ["001", "003", "005", "008"]
---

## Description

Implement all task-related endpoints: full task CRUD within a project, subtask management, comments, and dependency tracking. This is the core data layer for Kanban and Gantt views.

## Acceptance Criteria

- [ ] `GET /api/v1/projects/:projectId/tasks` — list tasks with assignee info, supports filter by status/assignee/priority
- [ ] `POST /api/v1/projects/:projectId/tasks` — create task (FR-030, FR-031)
- [ ] `GET /api/v1/tasks/:id` — get full task detail with subtasks, comments, dependencies
- [ ] `PATCH /api/v1/tasks/:id` — update any task field including status (FR-041 Kanban drag)
- [ ] `DELETE /api/v1/tasks/:id` — delete task and cascade subtasks/comments
- [ ] `POST /api/v1/tasks/:id/subtasks` — add subtask (FR-034)
- [ ] `PATCH /api/v1/tasks/:id/subtasks/:subtaskId` — update subtask title or completion
- [ ] `DELETE /api/v1/tasks/:id/subtasks/:subtaskId` — delete subtask
- [ ] `POST /api/v1/tasks/:id/comments` — add comment (FR-036)
- [ ] `POST /api/v1/tasks/:id/dependencies` — add dependency (FR-037)
- [ ] `DELETE /api/v1/tasks/:id/dependencies/:dependencyId` — remove dependency
- [ ] Status values validated: todo / in_progress / in_review / done / blocked (FR-032)
- [ ] Priority values validated: critical / high / normal / low (FR-033)
- [ ] Unit tests for task service
- [ ] API.md updated

## Technical Notes

- File attachments (FR-035) are a v1 stretch goal — implement as a stub endpoint if time allows, or defer
- Dependency cycle detection: prevent task A → B → A circular dependency
- Gantt needs tasks with start_date, due_date, and dependencies in a single response

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
