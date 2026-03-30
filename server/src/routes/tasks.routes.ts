/**
 * tasks.routes.ts — Task management route definitions.
 *
 * This router is mounted at two prefixes in app.ts:
 *   /api/v1/projects/:projectId/tasks  — collection endpoints (list, create)
 *   /api/v1/tasks                      — individual resource endpoints
 *
 * Route table:
 *   GET    /api/v1/projects/:projectId/tasks             — list tasks (FR-030)
 *   POST   /api/v1/projects/:projectId/tasks             — create task (FR-030, FR-031)
 *   GET    /api/v1/tasks/:id                             — get task detail
 *   PATCH  /api/v1/tasks/:id                             — update task (FR-032, FR-033, FR-041)
 *   DELETE /api/v1/tasks/:id                             — delete task
 *   POST   /api/v1/tasks/:id/subtasks                    — add subtask (FR-034)
 *   PATCH  /api/v1/tasks/:id/subtasks/:subtaskId         — update subtask (FR-034)
 *   DELETE /api/v1/tasks/:id/subtasks/:subtaskId         — delete subtask (FR-034)
 *   POST   /api/v1/tasks/:id/comments                    — add comment (FR-036)
 *   POST   /api/v1/tasks/:id/dependencies                — add dependency (FR-037)
 *   DELETE /api/v1/tasks/:id/dependencies/:dependsOnId   — remove dependency (FR-037)
 *   POST   /api/v1/tasks/:id/attachments                 — 501 stub (FR-035, v2)
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as taskController from '../controllers/task.controller.js';

// ---------------------------------------------------------------------------
// Zod validation schemas
// ---------------------------------------------------------------------------

const STATUS_VALUES = ['todo', 'in_progress', 'in_review', 'done', 'blocked'] as const;
const PRIORITY_VALUES = ['critical', 'high', 'normal', 'low'] as const;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const dateString = z
  .string()
  .regex(DATE_REGEX, 'Date must be in YYYY-MM-DD format');

const CreateTaskSchema = z.object({
  title: z
    .string({ required_error: 'title is required' })
    .min(1, 'title must not be empty')
    .max(300, 'title must not exceed 300 characters'),
  description: z.string().optional(),
  assigneeId: z
    .number({ invalid_type_error: 'assigneeId must be a number' })
    .int()
    .positive()
    .optional(),
  status: z
    .enum(STATUS_VALUES, {
      errorMap: () => ({ message: `status must be one of: ${STATUS_VALUES.join(', ')}` }),
    })
    .default('todo'),
  priority: z
    .enum(PRIORITY_VALUES, {
      errorMap: () => ({ message: `priority must be one of: ${PRIORITY_VALUES.join(', ')}` }),
    })
    .default('normal'),
  startDate: dateString.optional(),
  dueDate: dateString.optional(),
});

const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().nullable().optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
  status: z.enum(STATUS_VALUES).optional(),
  priority: z.enum(PRIORITY_VALUES).optional(),
  startDate: dateString.nullable().optional(),
  dueDate: dateString.nullable().optional(),
});

const CreateSubtaskSchema = z.object({
  title: z
    .string({ required_error: 'title is required' })
    .min(1, 'title must not be empty')
    .max(300, 'title must not exceed 300 characters'),
  sortOrder: z.number().int().optional(),
});

const UpdateSubtaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  isComplete: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const CreateCommentSchema = z.object({
  body: z
    .string({ required_error: 'body is required' })
    .min(1, 'body must not be empty'),
});

const DependencySchema = z.object({
  dependsOnTaskId: z.number({
    required_error: 'dependsOnTaskId is required',
    invalid_type_error: 'dependsOnTaskId must be a number',
  }).int().positive('dependsOnTaskId must be a positive integer'),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router({ mergeParams: true });

// ── Project-scoped task collection endpoints ────────────────────────────────
// These are reached via /api/v1/projects/:projectId/tasks

/**
 * GET /api/v1/projects/:projectId/tasks
 * Authenticated — list all tasks in a project, with optional filters.
 */
router.get('/', authenticate, taskController.listTasks);

/**
 * POST /api/v1/projects/:projectId/tasks
 * Authenticated — create a new task in the project.
 */
router.post('/', authenticate, validate(CreateTaskSchema), taskController.createTask);

// ── Individual task endpoints ────────────────────────────────────────────────
// These are reached via /api/v1/tasks/:id

/**
 * GET /api/v1/tasks/:id
 * Authenticated — returns full task detail with subtasks, comments, and dependencies.
 */
router.get('/:id', authenticate, taskController.getTask);

/**
 * PATCH /api/v1/tasks/:id
 * Authenticated — applies partial updates to a task.
 */
router.patch('/:id', authenticate, validate(UpdateTaskSchema), taskController.updateTask);

/**
 * DELETE /api/v1/tasks/:id
 * Authenticated — permanently deletes a task. 409 if dependents exist.
 */
router.delete('/:id', authenticate, taskController.deleteTask);

// ── Subtask endpoints ────────────────────────────────────────────────────────

/**
 * POST /api/v1/tasks/:id/subtasks
 * Authenticated — adds a checklist item to a task.
 */
router.post(
  '/:id/subtasks',
  authenticate,
  validate(CreateSubtaskSchema),
  taskController.addSubtask,
);

/**
 * PATCH /api/v1/tasks/:id/subtasks/:subtaskId
 * Authenticated — updates a subtask's title, completion, or order.
 */
router.patch(
  '/:id/subtasks/:subtaskId',
  authenticate,
  validate(UpdateSubtaskSchema),
  taskController.updateSubtask,
);

/**
 * DELETE /api/v1/tasks/:id/subtasks/:subtaskId
 * Authenticated — removes a subtask.
 */
router.delete(
  '/:id/subtasks/:subtaskId',
  authenticate,
  taskController.deleteSubtask,
);

// ── Comment endpoints ─────────────────────────────────────────────────────────

/**
 * POST /api/v1/tasks/:id/comments
 * Authenticated — adds a comment to a task.
 */
router.post(
  '/:id/comments',
  authenticate,
  validate(CreateCommentSchema),
  taskController.addComment,
);

// ── Dependency endpoints ──────────────────────────────────────────────────────

/**
 * POST /api/v1/tasks/:id/dependencies
 * Authenticated — records that this task depends on another task.
 * Cycle detection prevents circular chains.
 */
router.post(
  '/:id/dependencies',
  authenticate,
  validate(DependencySchema),
  taskController.addDependency,
);

/**
 * DELETE /api/v1/tasks/:id/dependencies/:dependsOnId
 * Authenticated — removes a dependency relationship.
 */
router.delete(
  '/:id/dependencies/:dependsOnId',
  authenticate,
  taskController.removeDependency,
);

// ── Attachment stub ───────────────────────────────────────────────────────────

/**
 * POST /api/v1/tasks/:id/attachments
 * 501 Not Implemented — file attachments deferred to v2 (FR-035).
 */
router.post('/:id/attachments', authenticate, taskController.notImplementedAttachments);

export default router;
