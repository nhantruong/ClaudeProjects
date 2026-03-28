---
id: "005"
title: "Implement authentication API"
status: "done"
area: "backend"
agent: "@backend-developer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: "2026-03-28"
completed_at: "2026-03-28"
prd_refs: ["FR-001", "FR-002", "FR-004", "FR-005"]
blocks: ["006", "007", "008", "009", "010", "016", "018"]
blocked_by: ["001", "003"]
---

## Description

Implement the authentication endpoints: login, logout, and password change. The auth method (session-based vs JWT) is an open question in PRD.md — resolve this with the project owner before starting. Passwords must be verified with bcrypt. Session tokens must expire after 30 days of inactivity (FR-004). All downstream API endpoints depend on auth middleware being in place.

## Acceptance Criteria

- [x] Open Question #1 in PRD.md resolved: auth method decided — JWT in httpOnly cookie (ADR-002, already scaffolded)
- [x] `POST /api/v1/auth/login` — validates credentials, sets httpOnly cookie, returns safe user (FR-001)
- [x] `POST /api/v1/auth/logout` — clears cookie, returns 204 (FR-001)
- [x] `GET /api/v1/auth/me` — returns current user profile (authenticated)
- [x] `PATCH /api/v1/auth/password` — changes authenticated user's password (FR-005)
- [x] Auth middleware validates token on all protected routes — returns 401 if invalid/expired
- [x] Sessions expire after 30 days (JWT maxAge + cookie maxAge = 30 days, FR-004)
- [x] Passwords verified with bcrypt cost factor 12 (never stored plaintext)
- [x] Unit tests for auth service (login success, wrong password, user not found, inactive user, changePassword success/failure, getMe success/failure)
- [x] API.md updated with final endpoint contracts

## Technical Notes

- Depends on task #001 (users table) and task #003 (server scaffold)
- If session-based: store token in `sessions` table, validate on each request
- If JWT: sign with `SESSION_SECRET` env var, verify on each request (no DB lookup)
- Bcrypt cost factor must be ≥ 12 (security requirement)
- See ARCHITECTURE.md auth flow for the expected request sequence

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
| 2026-03-28 | @backend-developer | Auth API implemented — login, logout, me, changePassword with tests |
