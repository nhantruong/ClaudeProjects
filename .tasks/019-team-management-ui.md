---
id: "019"
title: "Implement team management UI"
status: "todo"
area: "frontend"
agent: "@frontend-developer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-010", "FR-011", "FR-013"]
blocks: []
blocked_by: ["004", "006", "007"]
---

## Description

Build the team management section (admin only): user list, create user form, edit user form. Non-admin users should not see this section in navigation.

## Acceptance Criteria

- [ ] `/team` route — accessible only to admin users; redirects others to `/`
- [ ] User list table: display_name, username, role badge, active/inactive status
- [ ] "Add User" form: display_name, username, password (set by admin), role select
- [ ] Edit user: change display_name, role, activate/deactivate
- [ ] Deactivated users shown with visual distinction (greyed out)
- [ ] "Team" link only shows in sidebar nav for admin users
- [ ] Responsive on mobile

## Technical Notes

- Role check in the frontend is display-only — the real enforcement is the API (task #007)
- Do not expose password in GET responses — create form only sets it, never shows it

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
