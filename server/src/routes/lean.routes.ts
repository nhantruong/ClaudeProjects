/**
 * lean.routes.ts — Last Planner System / Lean construction route definitions.
 *
 * This router is mounted at /api/v1/projects/:projectId in app.ts with
 * mergeParams: true, so req.params.projectId is available in all handlers.
 *
 * Route table:
 *   GET    /api/v1/projects/:projectId/wwp                             — list WWPs (FR-060)
 *   POST   /api/v1/projects/:projectId/wwp                             — create WWP (FR-060)
 *   GET    /api/v1/projects/:projectId/wwp/:weekId                     — get WWP with tasks (FR-060)
 *   POST   /api/v1/projects/:projectId/wwp/:weekId/tasks               — add wwp_task (FR-061)
 *   PATCH  /api/v1/projects/:projectId/wwp/:weekId/tasks/:wwpTaskId    — update wwp_task (FR-061, FR-063)
 *   POST   /api/v1/projects/:projectId/wwp/:weekId/close               — close week, calc PPC (FR-062)
 *   GET    /api/v1/projects/:projectId/ppc                             — PPC history (FR-064)
 *   GET    /api/v1/projects/:projectId/lookahead                       — 3–6 week lookahead (FR-065)
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as lean from '../controllers/lean.controller.js';

// ---------------------------------------------------------------------------
// Zod validation schemas
// ---------------------------------------------------------------------------

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const CreateWwpSchema = z.object({
  weekStartDate: z
    .string({ required_error: 'weekStartDate is required' })
    .regex(DATE_REGEX, 'weekStartDate must be in YYYY-MM-DD format'),
});

const AddWwpTaskSchema = z.object({
  description: z
    .string({ required_error: 'description is required' })
    .min(1, 'description must not be empty')
    .max(300, 'description must not exceed 300 characters'),
  assigneeId: z
    .number({ invalid_type_error: 'assigneeId must be a number' })
    .int()
    .positive()
    .optional(),
  taskId: z
    .number({ invalid_type_error: 'taskId must be a number' })
    .int()
    .positive()
    .optional(),
});

const UpdateWwpTaskSchema = z
  .object({
    isComplete: z.boolean().optional(),
    varianceReason: z.string().max(500, 'varianceReason must not exceed 500 characters').optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field (isComplete or varianceReason) is required',
  });

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router({ mergeParams: true });

// All lean endpoints require authentication
router.use(authenticate);

// ── WWP collection endpoints ─────────────────────────────────────────────────

/**
 * GET /api/v1/projects/:projectId/wwp
 * List all weekly work plans for the project, newest first.
 */
router.get('/wwp', lean.listWwps);

/**
 * POST /api/v1/projects/:projectId/wwp
 * Create a new weekly work plan. weekStartDate must be a Monday.
 */
router.post('/wwp', validate(CreateWwpSchema), lean.createWwp);

// ── WWP individual resource endpoints ────────────────────────────────────────

/**
 * GET /api/v1/projects/:projectId/wwp/:weekId
 * Get a single WWP with all its task commitments.
 */
router.get('/wwp/:weekId', lean.getWwp);

/**
 * POST /api/v1/projects/:projectId/wwp/:weekId/tasks
 * Add a task commitment to the weekly work plan.
 */
router.post('/wwp/:weekId/tasks', validate(AddWwpTaskSchema), lean.addWwpTask);

/**
 * PATCH /api/v1/projects/:projectId/wwp/:weekId/tasks/:wwpTaskId
 * Update a wwp_task: mark complete/incomplete, set variance reason.
 */
router.patch(
  '/wwp/:weekId/tasks/:wwpTaskId',
  validate(UpdateWwpTaskSchema),
  lean.updateWwpTask,
);

/**
 * POST /api/v1/projects/:projectId/wwp/:weekId/close
 * Close the week and calculate PPC.
 * 422 if any incomplete task lacks a variance reason.
 */
router.post('/wwp/:weekId/close', lean.closeWwp);

// ── PPC history endpoint ──────────────────────────────────────────────────────

/**
 * GET /api/v1/projects/:projectId/ppc
 * PPC history for trend chart — last 12 closed weeks, ascending.
 */
router.get('/ppc', lean.getPpcHistory);

// ── Lookahead endpoint ────────────────────────────────────────────────────────

/**
 * GET /api/v1/projects/:projectId/lookahead?weeks=4
 * Tasks due in the next N weeks (default 4, max 6).
 */
router.get('/lookahead', lean.getLookahead);

export default router;
