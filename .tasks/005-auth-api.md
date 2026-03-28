---
id: "005"
title: "Implement authentication API"
status: "todo"
area: "backend"
agent: "@backend-developer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: null
completed_at: null
prd_refs: ["FR-001", "FR-002", "FR-004", "FR-005"]
blocks: ["006", "007", "008", "009", "010", "016", "018"]
blocked_by: ["001", "003"]
---

## Description

Implement the authentication endpoints: login, logout, and password change. The auth method (session-based vs JWT) is an open question in PRD.md — resolve this with the project owner before starting. Passwords must be verified with bcrypt. Session tokens must expire after 30 days of inactivity (FR-004). All downstream API endpoints depend on auth middleware being in place.

## Acceptance Criteria

- [ ] Open Question #1 in PRD.md resolved: auth method decided (session token in DB or JWT)
- [ ] `POST /api/v1/auth/login` — validates credentials, returns token (FR-001)
- [ ] `POST /api/v1/auth/logout` — invalidates current session (FR-001)
- [ ] `PATCH /api/v1/auth/password` — changes authenticated user's password (FR-005)
- [ ] Auth middleware validates token on all protected routes — returns 401 if invalid/expired
- [ ] Sessions expire after 30 days of inactivity (FR-004)
- [ ] Passwords verified with bcrypt (never stored plaintext)
- [ ] Unit tests for auth service (login success, login failure, expired session)
- [ ] API.md updated with final endpoint contracts

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
