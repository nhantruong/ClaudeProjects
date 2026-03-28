<!--
DOCUMENT METADATA
Owner: @backend-developer
Update trigger: Any API endpoint is added, modified, or removed
Update scope: Full document
Read by: @frontend-developer (to know what endpoints to call and their contracts),
          @qa-engineer (for API contract testing)
-->

# API Reference

> **Base URL**: `http://103.27.60.66/api/v1` (production) · `http://localhost:3001/api/v1` (local)
> **Authentication**: JWT stored in an `httpOnly`, `SameSite=Strict` cookie named `token` (set on login). Also accepted via `Authorization: Bearer <token>` header for API clients. See ADR-002.
> **Content-Type**: `application/json` for all requests and responses
> **Last updated**: 2026-03-28

---

## Authentication

### How to Authenticate

The preferred method is the **httpOnly cookie** `token`, set automatically by `POST /auth/login`. Browser clients receive this automatically — no manual handling needed.

API clients (scripts, mobile apps) may alternatively include the token in the `Authorization` header:

```
Authorization: Bearer <token>
```

When both the cookie and the header are present, the cookie takes precedence.

Tokens expire after **30 days**. After expiry the server returns `401 UNAUTHENTICATED` and the client should redirect to the login page.

### Obtaining a Token

See `POST /auth/login` below.

---

## Standard Error Format

All error responses follow this structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [
      { "field": "username", "message": "Username is required" }
    ]
  }
}
```

**Common error codes**:
| HTTP Status | Code | Meaning |
|-------------|------|---------|
| 400 | `VALIDATION_ERROR` | Request body or params failed validation |
| 401 | `UNAUTHENTICATED` | No valid auth token provided |
| 403 | `UNAUTHORIZED` | Authenticated but insufficient permissions |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate resource or state conflict |
| 500 | `INTERNAL_ERROR` | Server-side error |

---

## Endpoints

> This document will be filled in by @backend-developer as endpoints are implemented.
> The sections below represent the planned API surface based on PRD.md requirements.

---

### Auth

#### POST /auth/login

**Auth required**: No
**Description**: Authenticate with username and password. On success, sets an `httpOnly` cookie named `token` containing the signed JWT. The token is not returned in the response body. *(FR-001)*

**Request body**:
```json
{
  "username": "string — login identifier (min 1 char)",
  "password": "string — plaintext password (min 1 char)"
}
```

**Response 200**:
```json
{
  "user": {
    "id": "number — user primary key",
    "username": "string",
    "displayName": "string",
    "role": "string — admin | manager | member",
    "isActive": "boolean"
  }
}
```

Sets cookie: `token=<jwt>; HttpOnly; SameSite=Strict; Max-Age=2592000` (30 days)

**Error codes**:
- `422` — Validation error (missing username or password)
- `401` — Invalid username or password (same message for both cases — no enumeration)

---

#### POST /auth/logout

**Auth required**: Yes
**Description**: Clears the `token` cookie. Because JWTs are stateless, there is no server-side session to invalidate — clearing the cookie is sufficient for browser clients. *(FR-001)*

**Request body**: None

**Response 204**: No content

**Error codes**:
- `401` — Not authenticated

---

#### GET /auth/me

**Auth required**: Yes
**Description**: Returns the authenticated user's profile. Useful for bootstrapping the client after a page refresh.

**Request body**: None

**Response 200**:
```json
{
  "user": {
    "id": "number",
    "username": "string",
    "displayName": "string",
    "role": "string — admin | manager | member",
    "isActive": "boolean"
  }
}
```

**Error codes**:
- `401` — Not authenticated
- `404` — User no longer exists (account deactivated after token issued)

---

#### PATCH /auth/password

**Auth required**: Yes
**Description**: Changes the authenticated user's password. The current password must be verified before the new one is accepted. *(FR-005)*

**Request body**:
```json
{
  "currentPassword": "string — the user's existing password (min 1 char)",
  "newPassword": "string — the replacement password (min 8 chars)"
}
```

**Response 204**: No content

**Error codes**:
- `401` — Current password is incorrect, or not authenticated
- `404` — User not found
- `422` — Validation error (missing fields, new password too short)

---

### Users

#### GET /users/me
Return the authenticated user's profile.

#### GET /users
List all users. Admin only. *(FR-010)*

#### POST /users
Create a new user account. Admin only. *(FR-003, FR-010)*

#### PATCH /users/:id
Update a user account. Admin only. *(FR-010)*

#### DELETE /users/:id
Deactivate a user account. Admin only. *(FR-010)*

---

### Projects

#### GET /projects
List all projects the authenticated user is assigned to. *(FR-013)*

#### POST /projects
Create a new project. Manager/Admin only. *(FR-020)*

#### GET /projects/:id
Get a project by ID. *(FR-020)*

#### PATCH /projects/:id
Update a project. Manager/Admin only. *(FR-022)*

#### DELETE /projects/:id
Delete a project. Admin only.

#### POST /projects/:id/members
Assign a user to a project. Manager/Admin only. *(FR-012)*

#### DELETE /projects/:id/members/:userId
Remove a user from a project. Manager/Admin only.

---

### Tasks

#### GET /projects/:projectId/tasks
List all tasks in a project. *(FR-030)*

#### POST /projects/:projectId/tasks
Create a task. *(FR-030)*

#### GET /tasks/:id
Get a task by ID with full details (subtasks, comments, attachments). *(FR-030)*

#### PATCH /tasks/:id
Update a task (status, assignee, dates, priority, etc.). *(FR-030, FR-041)*

#### DELETE /tasks/:id
Delete a task.

#### POST /tasks/:id/comments
Add a comment to a task. *(FR-036)*

#### POST /tasks/:id/subtasks
Add a subtask. *(FR-034)*

#### PATCH /tasks/:id/subtasks/:subtaskId
Update a subtask. *(FR-034)*

---

### Lean / Last Planner System

#### GET /projects/:projectId/wwp
Get the weekly work plan for a project. *(FR-060)*

#### POST /projects/:projectId/wwp
Create a weekly work plan. *(FR-060)*

#### PATCH /projects/:projectId/wwp/:weekId
Update WWP task completion status and variance reason. *(FR-061, FR-063)*

#### GET /projects/:projectId/ppc
Get PPC history for a project. *(FR-062, FR-064)*

#### GET /projects/:projectId/lookahead
Get the 3–6 week lookahead plan. *(FR-065)*

---

### Dashboard

#### GET /dashboard
Get dashboard summary: active projects, task counts (due today, overdue, completed this week), team workload, PPC trend. *(FR-070, FR-071, FR-072, FR-073)*

---

### Raphael AI Advisor

#### GET /advisor/briefing
Get AI-generated daily briefing: top priorities, conflicts, recommendations. *(FR-081, FR-082, FR-084)*

#### POST /advisor/ask
Ask the AI advisor a natural language question about project status. *(FR-083)*

---

## Changelog

| Date | Change |
|------|--------|
| 2026-03-28 | Auth endpoints implemented — POST /auth/login, POST /auth/logout, GET /auth/me, PATCH /auth/password |
| 2026-03-28 | Initial API surface definition — planned endpoints from PRD.md |
