---
id: "019"
title: "Implement team management UI"
status: "done"
area: "frontend"
agent: "@frontend-developer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: "2026-03-31"
completed_at: "2026-03-31"
prd_refs: ["FR-010", "FR-011", "FR-013"]
blocks: []
blocked_by: ["004", "006", "007"]
---

## Description

Build the team management section (admin only): user list, create user form, edit user form. Non-admin users should not see this section in navigation.

## Acceptance Criteria

- [x] `/team` route — accessible only to admin users; redirects others to `/`
- [x] User list table: display_name, username, role badge, active/inactive status
- [x] "Add User" form: display_name, username, password (set by admin), role select
- [x] Edit user: change display_name, role, activate/deactivate
- [x] Deactivated users shown with visual distinction (greyed out)
- [x] "Team" link only shows in sidebar nav for admin users
- [x] Responsive on mobile

## Technical Notes

- Role check in the frontend is display-only — the real enforcement is the API (task #007)
- Do not expose password in GET responses — create form only sets it, never shows it

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
| 2026-03-31 | @frontend-developer | Team page with user list (active/inactive), create/edit user modal, role badges, deactivate/reactivate toggle. |
