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
> **Last updated**: 2026-03-30

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

**Auth required**: Yes
**Description**: Returns the authenticated user's own profile. Available to any authenticated user regardless of role.

**Request body**: None

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

**Error codes**:
- `401` — Not authenticated
- `404` — User no longer exists (account deactivated after token issued)

---

#### GET /users

**Auth required**: Yes — Admin only
**Description**: Returns all user accounts, including inactive (deactivated) ones. *(FR-010)*

**Request body**: None

**Response 200**:
```json
{
  "users": [
    {
      "id": "number",
      "username": "string",
      "displayName": "string",
      "role": "string — admin | manager | member",
      "isActive": "boolean"
    }
  ]
}
```

**Error codes**:
- `401` — Not authenticated
- `403` — Authenticated but not an admin

---

#### POST /users

**Auth required**: Yes — Admin only
**Description**: Creates a new user account. No self-registration — all accounts are admin-created. *(FR-003, FR-010)*

**Request body**:
```json
{
  "username": "string — login identifier (min 2, max 100 chars)",
  "displayName": "string — name shown in UI (min 2, max 150 chars)",
  "password": "string — plaintext password (min 8 chars, hashed before storage)",
  "role": "string — admin | manager | member (default: member)"
}
```

**Response 201**:
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
- `403` — Authenticated but not an admin
- `409` — Username is already taken
- `422` — Validation error (missing or invalid fields)

---

#### PATCH /users/:id

**Auth required**: Yes — Admin only
**Description**: Updates a user account's display name, role, or active status. Setting `isActive` to `false` deactivates (soft-deletes) the account — the record is retained for referential integrity. *(FR-010)*

**Request body** (at least one field required):
```json
{
  "displayName": "string — min 2, max 150 chars (optional)",
  "role": "string — admin | manager | member (optional)",
  "isActive": "boolean — false to deactivate, true to reactivate (optional)"
}
```

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
- `400` — User id is not a valid integer
- `401` — Not authenticated
- `403` — Authenticated but not an admin
- `404` — User not found
- `422` — Validation error (no fields provided, or field values invalid)

---

### Projects

#### GET /projects

**Auth required**: Yes
**Description**: Returns all non-cancelled projects the authenticated user is assigned to. Each item includes a `memberCount` and `taskCount`. *(FR-013)*

**Request body**: None

**Response 200**:
```json
{
  "projects": [
    {
      "id": "number",
      "name": "string",
      "description": "string | null",
      "domain": "string — electromechanical | bim | software | other",
      "status": "string — planning | active | on_hold | completed | cancelled",
      "startDate": "string | null — YYYY-MM-DD",
      "endDate": "string | null — YYYY-MM-DD",
      "createdBy": "number — user id",
      "createdAt": "string — ISO 8601",
      "updatedAt": "string — ISO 8601",
      "memberCount": "number",
      "taskCount": "number"
    }
  ]
}
```

**Error codes**:
- `401` — Not authenticated

---

#### POST /projects

**Auth required**: Yes — Manager or Admin only
**Description**: Creates a new project. The authenticated user is automatically added as a manager-level member of the new project. *(FR-020, FR-021)*

**Request body**:
```json
{
  "name": "string — min 2, max 200 chars",
  "description": "string — optional",
  "domain": "string — electromechanical | bim | software | other",
  "status": "string — planning | active | on_hold | completed | cancelled (default: planning)",
  "startDate": "string — YYYY-MM-DD, optional",
  "endDate": "string — YYYY-MM-DD, optional"
}
```

**Response 201**:
```json
{
  "project": {
    "id": "number",
    "name": "string",
    "description": "string | null",
    "domain": "string",
    "status": "string",
    "startDate": "string | null",
    "endDate": "string | null",
    "createdBy": "number",
    "createdAt": "string — ISO 8601",
    "updatedAt": "string — ISO 8601"
  }
}
```

**Error codes**:
- `401` — Not authenticated
- `403` — Authenticated but not a manager or admin
- `422` — Validation error (missing or invalid fields)

---

#### GET /projects/:id

**Auth required**: Yes — project members only
**Description**: Returns a single project with its full member list. Returns 403 if the authenticated user is not a member of the project. *(FR-020)*

**Request body**: None

**Response 200**:
```json
{
  "project": {
    "id": "number",
    "name": "string",
    "description": "string | null",
    "domain": "string",
    "status": "string",
    "startDate": "string | null",
    "endDate": "string | null",
    "createdBy": "number",
    "createdAt": "string — ISO 8601",
    "updatedAt": "string — ISO 8601",
    "members": [
      {
        "userId": "number",
        "displayName": "string",
        "username": "string",
        "role": "string — manager | member",
        "joinedAt": "string — ISO 8601"
      }
    ]
  }
}
```

**Error codes**:
- `401` — Not authenticated
- `403` — Not a member of this project
- `404` — Project not found

---

#### PATCH /projects/:id

**Auth required**: Yes — Manager or Admin only
**Description**: Applies partial updates to a project. Only the provided fields are changed. Requesting user must be a project member. *(FR-022, FR-023)*

**Request body** (all fields optional — at least one required):
```json
{
  "name": "string — min 2, max 200 chars",
  "description": "string | null",
  "domain": "string — electromechanical | bim | software | other",
  "status": "string — planning | active | on_hold | completed | cancelled",
  "startDate": "string | null — YYYY-MM-DD",
  "endDate": "string | null — YYYY-MM-DD"
}
```

**Response 200**:
```json
{
  "project": {
    "id": "number",
    "name": "string",
    "description": "string | null",
    "domain": "string",
    "status": "string",
    "startDate": "string | null",
    "endDate": "string | null",
    "createdBy": "number",
    "createdAt": "string — ISO 8601",
    "updatedAt": "string — ISO 8601"
  }
}
```

**Error codes**:
- `401` — Not authenticated
- `403` — Not a member of this project, or not a manager/admin
- `404` — Project not found
- `422` — Validation error (invalid field values)

---

#### DELETE /projects/:id

**Auth required**: Yes — Admin only
**Description**: Permanently deletes a project and its membership records (cascade). Requesting user must be a project member. Tasks within the project are also deleted at the database level.

**Request body**: None

**Response 204**: No content

**Error codes**:
- `401` — Not authenticated
- `403` — Not a project member, or not an admin
- `404` — Project not found

---

#### POST /projects/:id/members

**Auth required**: Yes — Manager or Admin only
**Description**: Assigns a user to the project with the specified role. *(FR-012)*

**Request body**:
```json
{
  "userId": "number — target user's id",
  "role": "string — manager | member (default: member)"
}
```

**Response 201**:
```json
{
  "member": {
    "id": "number — membership record id",
    "projectId": "number",
    "userId": "number",
    "role": "string — manager | member",
    "joinedAt": "string — ISO 8601"
  }
}
```

**Error codes**:
- `401` — Not authenticated
- `403` — Requesting user is not a project member, or not a manager/admin
- `404` — Project not found
- `409` — User is already a member of this project
- `422` — Validation error (missing or invalid fields)

---

#### DELETE /projects/:id/members/:userId

**Auth required**: Yes — Manager or Admin only
**Description**: Removes a user from the project. *(FR-012)*

**Request body**: None

**Response 204**: No content

**Error codes**:
- `401` — Not authenticated
- `403` — Requesting user is not a project member, or not a manager/admin
- `404` — Project not found

---

#### GET /projects/:id/members

**Auth required**: Yes — project members only
**Description**: Returns all members of a project with their user details.

**Request body**: None

**Response 200**:
```json
{
  "members": [
    {
      "userId": "number",
      "displayName": "string",
      "username": "string",
      "role": "string — manager | member",
      "joinedAt": "string — ISO 8601"
    }
  ]
}
```

**Error codes**:
- `401` — Not authenticated
- `403` — Not a member of this project
- `404` — Project not found

---

### Tasks

#### GET /projects/:projectId/tasks

**Auth required**: Yes — project members only
**Description**: Returns all tasks in a project, ordered by priority (critical first) then due date. Supports optional query-string filters. *(FR-030)*

**Query parameters** (all optional):
- `status` — filter by task status: `todo | in_progress | in_review | done | blocked`
- `assigneeId` — filter by assignee user id (integer)
- `priority` — filter by priority: `critical | high | normal | low`

**Request body**: None

**Response 200**:
```json
{
  "tasks": [
    {
      "id": "number",
      "projectId": "number",
      "title": "string",
      "description": "string | null",
      "assigneeId": "number | null",
      "assigneeName": "string | null",
      "status": "string — todo | in_progress | in_review | done | blocked",
      "priority": "string — critical | high | normal | low",
      "startDate": "string | null — YYYY-MM-DD",
      "dueDate": "string | null — YYYY-MM-DD",
      "completedAt": "string | null — ISO 8601",
      "createdBy": "number",
      "createdAt": "string — ISO 8601",
      "updatedAt": "string — ISO 8601"
    }
  ]
}
```

**Error codes**:
- `401` — Not authenticated
- `403` — Not a member of this project

---

#### POST /projects/:projectId/tasks

**Auth required**: Yes — project members only
**Description**: Creates a new task in the project. The authenticated user is recorded as `createdBy`. *(FR-030, FR-031)*

**Request body**:
```json
{
  "title": "string — min 1, max 300 chars (required)",
  "description": "string — optional",
  "assigneeId": "number — optional, user id of assignee",
  "status": "string — todo | in_progress | in_review | done | blocked (default: todo)",
  "priority": "string — critical | high | normal | low (default: normal)",
  "startDate": "string — YYYY-MM-DD, optional",
  "dueDate": "string — YYYY-MM-DD, optional"
}
```

**Response 201**:
```json
{
  "task": {
    "id": "number",
    "projectId": "number",
    "title": "string",
    "description": "string | null",
    "assigneeId": "number | null",
    "assigneeName": "string | null",
    "status": "string",
    "priority": "string",
    "startDate": "string | null",
    "dueDate": "string | null",
    "completedAt": "string | null",
    "createdBy": "number",
    "createdAt": "string — ISO 8601",
    "updatedAt": "string — ISO 8601"
  }
}
```

**Error codes**:
- `401` — Not authenticated
- `403` — Not a member of this project
- `422` — Validation error (missing or invalid fields)

---

#### GET /tasks/:id

**Auth required**: Yes — project members only
**Description**: Returns full task detail including subtasks, comments (with author name), and dependency IDs in both directions. *(FR-030)*

**Request body**: None

**Response 200**:
```json
{
  "task": {
    "id": "number",
    "projectId": "number",
    "title": "string",
    "description": "string | null",
    "assigneeId": "number | null",
    "assigneeName": "string | null",
    "status": "string",
    "priority": "string",
    "startDate": "string | null",
    "dueDate": "string | null",
    "completedAt": "string | null",
    "createdBy": "number",
    "createdAt": "string — ISO 8601",
    "updatedAt": "string — ISO 8601",
    "subtasks": [
      {
        "id": "number",
        "taskId": "number",
        "title": "string",
        "isComplete": "boolean",
        "sortOrder": "number",
        "createdAt": "string — ISO 8601"
      }
    ],
    "comments": [
      {
        "id": "number",
        "taskId": "number",
        "userId": "number",
        "authorName": "string",
        "body": "string",
        "createdAt": "string — ISO 8601",
        "updatedAt": "string — ISO 8601"
      }
    ],
    "dependsOn": "number[] — task ids this task depends on",
    "blockedBy": "number[] — task ids that are blocked by this task"
  }
}
```

**Error codes**:
- `401` — Not authenticated
- `403` — Not a member of this task's project
- `404` — Task not found

---

#### PATCH /tasks/:id

**Auth required**: Yes — project members only
**Description**: Applies partial updates to a task. Only provided fields are changed. When `status` transitions to `done`, `completedAt` is set automatically; transitioning away from `done` clears it. *(FR-030, FR-032, FR-033, FR-041)*

**Request body** (all fields optional — at least one required):
```json
{
  "title": "string — min 1, max 300 chars",
  "description": "string | null",
  "assigneeId": "number | null — set to null to unassign",
  "status": "string — todo | in_progress | in_review | done | blocked",
  "priority": "string — critical | high | normal | low",
  "startDate": "string | null — YYYY-MM-DD",
  "dueDate": "string | null — YYYY-MM-DD"
}
```

**Response 200**:
```json
{
  "task": {
    "id": "number",
    "projectId": "number",
    "title": "string",
    "description": "string | null",
    "assigneeId": "number | null",
    "assigneeName": "string | null",
    "status": "string",
    "priority": "string",
    "startDate": "string | null",
    "dueDate": "string | null",
    "completedAt": "string | null",
    "createdBy": "number",
    "createdAt": "string — ISO 8601",
    "updatedAt": "string — ISO 8601"
  }
}
```

**Error codes**:
- `401` — Not authenticated
- `403` — Not a member of this project
- `404` — Task not found
- `422` — Validation error (invalid field values)

---

#### DELETE /tasks/:id

**Auth required**: Yes — project members only
**Description**: Permanently deletes a task. Subtasks and comments cascade at the database level. Returns 409 if other tasks have a dependency on this task — caller must remove all dependencies first.

**Request body**: None

**Response 204**: No content

**Error codes**:
- `401` — Not authenticated
- `403` — Not a member of this project
- `404` — Task not found
- `409` — Other tasks depend on this task (remove dependencies first)

---

#### POST /tasks/:id/subtasks

**Auth required**: Yes — project members only
**Description**: Adds a checklist subtask to a task. *(FR-034)*

**Request body**:
```json
{
  "title": "string — min 1, max 300 chars (required)",
  "sortOrder": "number — display order (optional, default 0)"
}
```

**Response 201**:
```json
{
  "subtask": {
    "id": "number",
    "taskId": "number",
    "title": "string",
    "isComplete": "boolean",
    "sortOrder": "number",
    "createdAt": "string — ISO 8601"
  }
}
```

**Error codes**:
- `401` — Not authenticated
- `403` — Not a member of this project
- `404` — Task not found
- `422` — Validation error

---

#### PATCH /tasks/:id/subtasks/:subtaskId

**Auth required**: Yes — project members only
**Description**: Updates a subtask's title, completion status, or display order. *(FR-034)*

**Request body** (at least one field required):
```json
{
  "title": "string — min 1, max 300 chars (optional)",
  "isComplete": "boolean — (optional)",
  "sortOrder": "number — (optional)"
}
```

**Response 200**:
```json
{
  "subtask": {
    "id": "number",
    "taskId": "number",
    "title": "string",
    "isComplete": "boolean",
    "sortOrder": "number",
    "createdAt": "string — ISO 8601"
  }
}
```

**Error codes**:
- `401` — Not authenticated
- `403` — Not a member of this project
- `404` — Task or subtask not found
- `422` — Validation error

---

#### DELETE /tasks/:id/subtasks/:subtaskId

**Auth required**: Yes — project members only
**Description**: Removes a subtask from a task. *(FR-034)*

**Request body**: None

**Response 204**: No content

**Error codes**:
- `401` — Not authenticated
- `403` — Not a member of this project
- `404` — Task or subtask not found

---

#### POST /tasks/:id/comments

**Auth required**: Yes — project members only
**Description**: Adds a comment to a task. The authenticated user is recorded as the author. *(FR-036)*

**Request body**:
```json
{
  "body": "string — min 1 char (required)"
}
```

**Response 201**:
```json
{
  "comment": {
    "id": "number",
    "taskId": "number",
    "userId": "number",
    "authorName": "string",
    "body": "string",
    "createdAt": "string — ISO 8601",
    "updatedAt": "string — ISO 8601"
  }
}
```

**Error codes**:
- `401` — Not authenticated
- `403` — Not a member of this project
- `404` — Task not found
- `422` — Validation error (empty body)

---

#### POST /tasks/:id/dependencies

**Auth required**: Yes — project members only
**Description**: Records that this task depends on another task (upstream must complete first). Performs cycle detection — rejects the request if adding the dependency would create a circular chain (A → B → … → A). *(FR-037)*

**Request body**:
```json
{
  "dependsOnTaskId": "number — id of the upstream task (required)"
}
```

**Response 201**:
```json
{
  "message": "Dependency added"
}
```

**Error codes**:
- `400` — taskId equals dependsOnTaskId (self-dependency)
- `401` — Not authenticated
- `403` — Not a member of this project
- `404` — Task or upstream task not found
- `409` — Adding this dependency would create a circular chain
- `422` — Validation error (missing or invalid field)

---

#### DELETE /tasks/:id/dependencies/:dependsOnId

**Auth required**: Yes — project members only
**Description**: Removes the dependency record between this task and the upstream task. *(FR-037)*

**Request body**: None

**Response 204**: No content

**Error codes**:
- `401` — Not authenticated
- `403` — Not a member of this project
- `404` — Task not found

---

#### POST /tasks/:id/attachments

**Auth required**: Yes
**Description**: File attachment upload. **Not yet implemented** — returns `501` with a message indicating it is planned for v2. *(FR-035)*

**Response 501**:
```json
{
  "error": {
    "code": "NOT_IMPLEMENTED",
    "message": "File attachments coming in v2"
  }
}
```

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

**Auth required**: Yes
**Description**: Returns all data needed to render the main dashboard in a single request: active project summary cards, task statistics (due today, overdue, completed this week), team workload, and PPC trend across all the authenticated user's projects. All data is scoped to projects the requesting user is a member of. *(FR-070, FR-071, FR-072, FR-073)*

**Request body**: None

**Response 200**:
```json
{
  "projects": [
    {
      "id": "number",
      "name": "string",
      "domain": "string — electromechanical | bim | software | other",
      "status": "string — planning | active | on_hold | completed | cancelled",
      "taskCount": "number — total tasks in this project",
      "memberCount": "number — total members in this project"
    }
  ],
  "stats": {
    "dueToday": "number — tasks with due_date = today AND status != done",
    "overdue": "number — tasks with due_date < today AND status != done",
    "completedThisWeek": "number — tasks completed since Monday of the current ISO week"
  },
  "workload": [
    {
      "userId": "number",
      "displayName": "string",
      "taskCount": "number — open tasks assigned to this user",
      "overdueCount": "number — overdue tasks assigned to this user"
    }
  ],
  "ppcTrend": [
    {
      "weekStartDate": "string — YYYY-MM-DD, Monday of the plan week",
      "ppc": "number | null — Percent Plan Complete (0–100), null if week not yet closed"
    }
  ]
}
```

Notes:
- `projects` excludes cancelled projects; ordered by most recently updated first
- `workload` is ordered by `taskCount` descending (most loaded team member first); only users with at least one open task appear
- `ppcTrend` covers up to the last 8 calendar weeks across all user projects, ordered chronologically (oldest first)

**Error codes**:
- `401` — Not authenticated

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
| 2026-03-30 | Dashboard endpoint implemented — GET /dashboard (projects, stats, workload, ppcTrend) |
| 2026-03-30 | Tasks endpoints implemented — GET/POST /projects/:projectId/tasks, GET/PATCH/DELETE /tasks/:id, POST/PATCH/DELETE /tasks/:id/subtasks/:subtaskId, POST /tasks/:id/comments, POST/DELETE /tasks/:id/dependencies, POST /tasks/:id/attachments (501 stub) |
| 2026-03-30 | Projects endpoints implemented — GET/POST /projects, GET/PATCH/DELETE /projects/:id, POST/DELETE/GET /projects/:id/members |
| 2026-03-30 | Users endpoints implemented — GET /users/me, GET /users, POST /users, PATCH /users/:id |
| 2026-03-28 | Auth endpoints implemented — POST /auth/login, POST /auth/logout, GET /auth/me, PATCH /auth/password |
| 2026-03-28 | Initial API surface definition — planned endpoints from PRD.md |
