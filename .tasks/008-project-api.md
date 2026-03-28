---
id: "008"
title: "Implement project CRUD API"
status: "todo"
area: "backend"
agent: "@backend-developer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-012", "FR-013", "FR-020", "FR-021", "FR-022", "FR-023", "FR-024"]
blocks: ["009", "011", "016"]
blocked_by: ["001", "003", "005"]
---

## Description

Implement all project-related endpoints: create, list (filtered to user's projects), get, update, delete, and member management (assign/remove users). Users must only see projects they are assigned to (FR-013).

## Acceptance Criteria

- [ ] `GET /api/v1/projects` — list projects for the authenticated user only (FR-013)
- [ ] `POST /api/v1/projects` — create project with name, description, domain, start_date, end_date (manager/admin)
- [ ] `GET /api/v1/projects/:id` — get project detail (only if user is a member)
- [ ] `PATCH /api/v1/projects/:id` — update project fields (manager/admin)
- [ ] `DELETE /api/v1/projects/:id` — delete project and cascade tasks (admin only)
- [ ] `POST /api/v1/projects/:id/members` — assign user to project with role (manager/admin)
- [ ] `DELETE /api/v1/projects/:id/members/:userId` — remove user from project
- [ ] Domain values validated: electromechanical / bim / software / other (FR-021)
- [ ] Status values validated: planning / active / on_hold / completed / cancelled (FR-023)
- [ ] Unit tests for project service
- [ ] API.md updated

## Technical Notes

- Depends on tasks #001, #003, #005
- The creator of a project is automatically added as admin member
- Project visibility: query joins through `project_members` to enforce FR-013

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
