/**
 * tasks.routes.ts — Task management route stubs.
 *
 * Endpoints (to be implemented in task #009):
 *   GET    /api/v1/projects/:projectId/tasks            — list tasks in a project (FR-030)
 *   POST   /api/v1/projects/:projectId/tasks            — create a task (FR-030)
 *   GET    /api/v1/tasks/:id                            — get a task with full details (FR-030)
 *   PATCH  /api/v1/tasks/:id                            — update a task (FR-030, FR-041)
 *   DELETE /api/v1/tasks/:id                            — delete a task
 *   POST   /api/v1/tasks/:id/comments                   — add a comment (FR-036)
 *   POST   /api/v1/tasks/:id/subtasks                   — add a subtask (FR-034)
 *   PATCH  /api/v1/tasks/:id/subtasks/:subtaskId        — update a subtask (FR-034)
 */

import { Router } from 'express';

const router = Router();

// TODO (task #009): implement task CRUD endpoints
// TODO (task #009): implement task comment endpoints
// TODO (task #009): implement subtask endpoints

export default router;
