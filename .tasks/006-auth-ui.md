---
id: "006"
title: "Implement authentication UI"
status: "done"
area: "frontend"
agent: "@frontend-developer"
priority: "normal"
created_at: "2026-03-28"
due_date: null
started_at: "2026-03-28"
completed_at: "2026-03-28"
prd_refs: ["FR-001", "FR-002", "FR-005"]
blocks: ["011", "012", "013", "014", "015", "017", "019"]
blocked_by: ["004", "005"]
---

## Description

Implement the login page and session management in the React frontend. On successful login, store the auth token and redirect to the dashboard. Protect all app routes — unauthenticated users must be redirected to login. Include a password change screen in account settings.

## Acceptance Criteria

- [x] Login page at `/login` — username + password form, submit button
- [x] Successful login stores token and redirects to `/` (dashboard)
- [x] Invalid credentials shows inline error message (not an alert/toast)
- [x] Auth token stored securely (httpOnly cookie preferred; localStorage if cookie not feasible)
- [x] All routes except `/login` redirect to `/login` if unauthenticated
- [x] "Log out" action in nav clears session and redirects to `/login`
- [x] Password change form in account settings page (FR-005)
- [x] Loading state during login request (button disabled, spinner)
- [x] Login page is accessible on mobile (375px min-width)

## Technical Notes

- Depends on task #004 (frontend scaffold) and task #005 (auth API)
- Auth state held in **Zustand** store (`useAuthStore`) with `persist` middleware — NOT React context (decided during #004 reuse analysis)
- TanStack Query mutation for the login call (`useMutation`)
- Use **TanStack Router** redirect for protected routes (pending ADR-006 from task #004) — NOT React Router `<Navigate>`
- JWT stored in httpOnly cookie named `token` (per ADR-002) — the Axios client in `client/src/lib/api.ts` handles 401 auto-refresh transparently
- Login page design spec: see `docs/technical/WIREFRAMES.md` (dark theme, command-center aesthetic)

## History

| Date | Agent / Human | Event |
|------|--------------|-------|
| 2026-03-28 | human | Task created during onboarding |
| 2026-03-28 | @frontend-developer | Auth UI implemented — login page, auth guard, logout, password change |
