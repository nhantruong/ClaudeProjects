/**
 * lean.controller.ts — Thin Express handlers for Lean / Last Planner System endpoints.
 *
 * Each handler: reads typed input (already validated by validate middleware
 * or parsed from URL params), delegates to the lean service, and formats
 * the HTTP response.
 *
 * No business logic lives here. This layer's only job is to translate between
 * HTTP (req/res) and the service layer.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import * as leanService from '../services/lean.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a numeric route param — returns NaN if the value is not a valid int. */
function parseId(value: string | string[] | undefined): number {
  return parseInt(Array.isArray(value) ? value[0] ?? '' : (value ?? ''), 10);
}

// ---------------------------------------------------------------------------
// WWP handlers
// ---------------------------------------------------------------------------

/**
 * listWwps — GET /api/v1/projects/:projectId/wwp
 *
 * Returns all weekly work plans for a project, newest first.
 */
export async function listWwps(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = parseId(req.params['projectId']);
    const wwps = await leanService.listWwps(req.user!.userId, projectId);
    res.status(200).json({ wwps });
  } catch (err) {
    next(err);
  }
}

/**
 * createWwp — POST /api/v1/projects/:projectId/wwp
 *
 * Creates a new weekly work plan. Body validated upstream.
 */
export async function createWwp(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = parseId(req.params['projectId']);
    const { weekStartDate } = req.body as { weekStartDate: string };

    const wwp = await leanService.createWwp(req.user!.userId, projectId, weekStartDate);
    res.status(201).json({ wwp });
  } catch (err) {
    next(err);
  }
}

/**
 * getWwp — GET /api/v1/projects/:projectId/wwp/:weekId
 *
 * Returns a single WWP with all its task commitments.
 */
export async function getWwp(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = parseId(req.params['projectId']);
    const weekId = parseId(req.params['weekId']);

    const wwp = await leanService.getWwp(req.user!.userId, projectId, weekId);
    res.status(200).json({ wwp });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// WWP task handlers
// ---------------------------------------------------------------------------

/**
 * addWwpTask — POST /api/v1/projects/:projectId/wwp/:weekId/tasks
 *
 * Adds a task commitment to a weekly work plan.
 */
export async function addWwpTask(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = parseId(req.params['projectId']);
    const weekId = parseId(req.params['weekId']);
    const { description, assigneeId, taskId } = req.body as {
      description: string;
      assigneeId?: number;
      taskId?: number;
    };

    const wwpTask = await leanService.addWwpTask(
      req.user!.userId,
      projectId,
      weekId,
      {
        description,
        ...(assigneeId !== undefined ? { assigneeId } : {}),
        ...(taskId !== undefined ? { taskId } : {}),
      },
    );

    res.status(201).json({ wwpTask });
  } catch (err) {
    next(err);
  }
}

/**
 * updateWwpTask — PATCH /api/v1/projects/:projectId/wwp/:weekId/tasks/:wwpTaskId
 *
 * Updates a wwp_task's completion status or variance reason.
 */
export async function updateWwpTask(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = parseId(req.params['projectId']);
    const weekId = parseId(req.params['weekId']);
    const wwpTaskId = parseId(req.params['wwpTaskId']);
    const { isComplete, varianceReason } = req.body as {
      isComplete?: boolean;
      varianceReason?: string;
    };

    const wwpTask = await leanService.updateWwpTask(
      req.user!.userId,
      projectId,
      weekId,
      wwpTaskId,
      {
        ...(isComplete !== undefined ? { isComplete } : {}),
        ...(varianceReason !== undefined ? { varianceReason } : {}),
      },
    );

    res.status(200).json({ wwpTask });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Close week handler
// ---------------------------------------------------------------------------

/**
 * closeWwp — POST /api/v1/projects/:projectId/wwp/:weekId/close
 *
 * Closes the week and calculates PPC. Returns 422 if incomplete tasks
 * lack variance reasons.
 */
export async function closeWwp(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = parseId(req.params['projectId']);
    const weekId = parseId(req.params['weekId']);

    const result = await leanService.closeWwp(req.user!.userId, projectId, weekId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PPC history handler
// ---------------------------------------------------------------------------

/**
 * getPpcHistory — GET /api/v1/projects/:projectId/ppc
 *
 * Returns PPC trend data for the last 12 closed weeks.
 */
export async function getPpcHistory(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = parseId(req.params['projectId']);
    const history = await leanService.getPpcHistory(req.user!.userId, projectId);
    res.status(200).json({ history });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Lookahead handler
// ---------------------------------------------------------------------------

/**
 * getLookahead — GET /api/v1/projects/:projectId/lookahead?weeks=4
 *
 * Returns tasks due in the next N weeks (1–6, default 4).
 */
export async function getLookahead(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = parseId(req.params['projectId']);
    const weeksParam = req.query['weeks'];
    const weeks = weeksParam ? parseInt(weeksParam as string, 10) : 4;

    const tasks = await leanService.getLookahead(req.user!.userId, projectId, weeks);
    res.status(200).json({ tasks });
  } catch (err) {
    next(err);
  }
}
