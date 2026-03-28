---
id: "011"
title: "Implement project management UI"
status: "todo"
area: "frontend"
agent: "@frontend-developer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-020", "FR-021", "FR-022", "FR-023", "FR-012", "FR-013"]
blocks: ["012", "013", "017"]
blocked_by: ["004", "006", "008"]
---

## Description

Build the project list page and project creation/edit form. Users see only their projects (FR-013). Managers/admins can create and edit projects. Include project member management (assign/remove team members).

## Acceptance Criteria

- [ ] `/projects` — project list page showing all user's projects as cards with domain badge and status
- [ ] Project card shows: name, domain, status, task count summary
- [ ] Create project modal/form: name, description, domain (select), start date, end date
- [ ] Edit project page: all fields editable, status change
- [ ] Project members tab: list current members with roles, add/remove members (manager/admin only)
- [ ] Domain badge colors match design system (from task #002)
- [ ] Empty state when user has no projects
- [ ] Responsive on mobile

## Technical Notes

- Depends on tasks #004 (scaffold), #006 (auth), #008 (project API)
- React Query for project list and mutations
- Domain values must match API: electromechanical / bim / software / other

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
