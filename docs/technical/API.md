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
> **Authentication**: Session token in `Authorization` header (Bearer) or httpOnly cookie (TBD — see Open Question #1 in PRD.md)
> **Content-Type**: `application/json` for all requests and responses
> **Last updated**: 2026-03-28

---

## Authentication

### How to Authenticate

Include the session token in every request:
```
Authorization: Bearer <token>
```

Tokens are obtained via the login endpoint and expire after 30 days of inactivity.

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
Authenticate with username and password. Returns a session token. *(FR-001)*

#### POST /auth/logout
Invalidate the current session token. *(FR-001)*

#### PATCH /auth/password
Change the authenticated user's password. *(FR-005)*

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
| 2026-03-28 | Initial API surface definition — planned endpoints from PRD.md |
