---
id: "008"
title: "Implement project CRUD API"
status: "done"
area: "backend"
agent: "@backend-developer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: "2026-03-30"
completed_at: "2026-03-30"
prd_refs: ["FR-012", "FR-013", "FR-020", "FR-021", "FR-022", "FR-023", "FR-024"]
blocks: ["009", "011", "016"]
blocked_by: ["001", "003", "005"]
---

## Description

Implement all project-related endpoints: create, list (filtered to user's projects), get, update, delete, and member management (assign/remove users). Users must only see projects they are assigned to (FR-013).

## Acceptance Criteria

- [x] `GET /api/v1/projects` — list projects for the authenticated user only (FR-013)
- [x] `POST /api/v1/projects` — create project with name, description, domain, start_date, end_date (manager/admin)
- [x] `GET /api/v1/projects/:id` — get project detail (only if user is a member)
- [x] `PATCH /api/v1/projects/:id` — update project fields (manager/admin)
- [x] `DELETE /api/v1/projects/:id` — delete project and cascade tasks (admin only)
- [x] `POST /api/v1/projects/:id/members` — assign user to project with role (manager/admin)
- [x] `DELETE /api/v1/projects/:id/members/:userId` — remove user from project
- [x] Domain values validated: electromechanical / bim / software / other (FR-021)
- [x] Status values validated: planning / active / on_hold / completed / cancelled (FR-023)
- [x] Unit tests for project service
- [x] API.md updated

## Technical Notes

- Depends on tasks #001, #003, #005
- The creator of a project is automatically added as admin member
- Project visibility: query joins through `project_members` to enforce FR-013

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
| 2026-03-30 | @backend-developer | Implemented project.model.ts, project.service.ts, project.controller.ts, projects.routes.ts, project.service.test.ts. API.md Projects section filled in. Task #009 unblocked. |
