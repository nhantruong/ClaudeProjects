---
id: "007"
title: "Implement user management API"
status: "done"
area: "backend"
agent: "@backend-developer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: "2026-03-30"
completed_at: "2026-03-30"
prd_refs: ["FR-003", "FR-010", "FR-011"]
blocks: ["019"]
blocked_by: ["001", "003", "005"]
---

## Description

Implement the user management endpoints for admin users: list all users, create a new user, update a user, and deactivate a user. No self-registration — accounts are admin-created only (FR-003). Role options: admin, manager, member (FR-011).

## Acceptance Criteria

- [x] `GET /api/v1/users` — list all users (admin only, returns id, username, display_name, role, is_active)
- [x] `POST /api/v1/users` — create user with username, display_name, password, role (admin only, FR-003)
- [x] `PATCH /api/v1/users/:id` — update display_name, role, is_active (admin only)
- [x] `GET /api/v1/users/me` — get own profile (any authenticated user)
- [x] Non-admin requests to admin-only endpoints return 403
- [x] New user password hashed with bcrypt on creation
- [x] Unit tests for user service (create user, get user, role enforcement)
- [x] API.md updated with final endpoint contracts

## Technical Notes

- Depends on tasks #001, #003, #005
- Role check middleware: `requireRole('admin')` — reusable middleware factory
- Deactivation sets `is_active = 0` — does not delete the record (preserves task/comment history)

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
| 2026-03-30 | @backend-developer | Implemented user model (listUsers, createUser, updateUser), user service, user controller, and routes; wrote Vitest unit tests; updated API.md |
