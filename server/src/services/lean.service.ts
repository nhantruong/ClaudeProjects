/**
 * lean.service.ts — Business logic for the Last Planner System (Lean construction).
 *
 * Covers: weekly work plans (WWP), wwp_tasks, PPC calculation, and lookahead.
 *
 * Visibility invariant: users may only access WWPs within projects they are
 * members of. Every operation checks project membership before proceeding.
 *
 * PPC invariant: a week may only be closed when all incomplete wwp_tasks have
 * a variance reason recorded. PPC = (completed / total) * 100, stored on the
 * weekly_work_plans row. Closing an already-closed week recalculates PPC
 * (idempotent).
 *
 * Monday invariant: week_start_date must always be a Monday (ISO day 1).
 * Validated in UTC to avoid DST shifts.
 */

import { AppError } from '../middleware/errorHandler.js';
import { isProjectMember } from '../models/project.model.js';
import * as leanModel from '../models/lean.model.js';
import type { Wwp, WwpSummary, WwpTask, LookaheadTask } from '../models/lean.model.js';

// Re-export types so controllers do not need to import from the model
export type { Wwp, WwpSummary, WwpTask, LookaheadTask };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * assertProjectMember — throws 403 if the user is not a project member.
 */
async function assertProjectMember(projectId: number, userId: number): Promise<void> {
  const member = await isProjectMember(projectId, userId);
  if (!member) {
    throw new AppError(403, 'UNAUTHORIZED', 'You do not have access to this project');
  }
}

/**
 * assertWwpExists — returns the WWP with its tasks or throws 404.
 */
async function assertWwpExists(
  wwpId: number,
): Promise<Wwp & { tasks: WwpTask[] }> {
  const wwp = await leanModel.getWwpById(wwpId);
  if (!wwp) {
    throw new AppError(404, 'NOT_FOUND', 'Weekly work plan not found');
  }
  return wwp;
}

/**
 * isMonday — returns true if the date string (YYYY-MM-DD) is a Monday.
 * Forces UTC parsing to avoid DST shifts on the server's local timezone.
 */
export function isMonday(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.getUTCDay() === 1; // 1 = Monday
}

// ---------------------------------------------------------------------------
// WWP service functions
// ---------------------------------------------------------------------------

/**
 * listWwps — returns all WWPs for a project, newest first.
 *
 * @throws AppError 403 if the requesting user is not a project member.
 */
export async function listWwps(
  userId: number,
  projectId: number,
): Promise<WwpSummary[]> {
  await assertProjectMember(projectId, userId);
  return leanModel.listWwps(projectId);
}

/**
 * createWwp — creates a new weekly work plan for a given week.
 *
 * @throws AppError 422 if weekStartDate is not a Monday.
 * @throws AppError 409 if a WWP already exists for that project + week.
 * @throws AppError 403 if the requesting user is not a project member.
 */
export async function createWwp(
  userId: number,
  projectId: number,
  weekStartDate: string,
): Promise<Wwp> {
  await assertProjectMember(projectId, userId);

  if (!isMonday(weekStartDate)) {
    throw new AppError(
      422,
      'VALIDATION_ERROR',
      'weekStartDate must be a Monday (ISO day 1)',
    );
  }

  const existing = await leanModel.getWwpByProjectAndWeek(projectId, weekStartDate);
  if (existing) {
    throw new AppError(
      409,
      'CONFLICT',
      'A weekly work plan already exists for this project and week',
    );
  }

  return leanModel.createWwp(projectId, weekStartDate, userId);
}

/**
 * getWwp — returns a single WWP with its tasks.
 *
 * @throws AppError 404 if the WWP does not exist.
 * @throws AppError 403 if the requesting user is not a project member.
 */
export async function getWwp(
  userId: number,
  projectId: number,
  weekId: number,
): Promise<Wwp & { tasks: WwpTask[] }> {
  await assertProjectMember(projectId, userId);
  const wwp = await assertWwpExists(weekId);

  // Ensure the WWP belongs to the requested project
  if (wwp.projectId !== projectId) {
    throw new AppError(404, 'NOT_FOUND', 'Weekly work plan not found');
  }

  return wwp;
}

// ---------------------------------------------------------------------------
// WWP task service functions
// ---------------------------------------------------------------------------

/**
 * addWwpTask — adds a task commitment to a weekly work plan.
 *
 * @throws AppError 404 if the WWP does not exist or belongs to another project.
 * @throws AppError 403 if the requesting user is not a project member.
 */
export async function addWwpTask(
  userId: number,
  projectId: number,
  weekId: number,
  data: { description: string; assigneeId?: number; taskId?: number },
): Promise<WwpTask> {
  await assertProjectMember(projectId, userId);
  const wwp = await assertWwpExists(weekId);

  if (wwp.projectId !== projectId) {
    throw new AppError(404, 'NOT_FOUND', 'Weekly work plan not found');
  }

  return leanModel.addWwpTask(weekId, data);
}

/**
 * updateWwpTask — updates a wwp_task's completion status or variance reason.
 *
 * @throws AppError 404 if the WWP or wwp_task does not exist.
 * @throws AppError 403 if the requesting user is not a project member.
 */
export async function updateWwpTask(
  userId: number,
  projectId: number,
  weekId: number,
  wwpTaskId: number,
  data: { isComplete?: boolean; varianceReason?: string },
): Promise<WwpTask> {
  await assertProjectMember(projectId, userId);
  const wwp = await assertWwpExists(weekId);

  if (wwp.projectId !== projectId) {
    throw new AppError(404, 'NOT_FOUND', 'Weekly work plan not found');
  }

  const updated = await leanModel.updateWwpTask(wwpTaskId, data);
  if (!updated) {
    throw new AppError(404, 'NOT_FOUND', 'WWP task not found');
  }

  return updated;
}

// ---------------------------------------------------------------------------
// Close week / PPC service function
// ---------------------------------------------------------------------------

/**
 * closeWwp — closes a week and calculates PPC.
 *
 * Business rules:
 *  - All incomplete tasks must have a variance reason before closing.
 *  - PPC = (completed / total) * 100; 0 when total = 0.
 *  - Idempotent: closing an already-closed week recalculates PPC.
 *
 * @throws AppError 422 if incomplete tasks lack variance reasons.
 * @throws AppError 404 if the WWP does not exist.
 * @throws AppError 403 if the requesting user is not a project member.
 */
export async function closeWwp(
  userId: number,
  projectId: number,
  weekId: number,
): Promise<{ wwp: Wwp }> {
  await assertProjectMember(projectId, userId);
  const wwp = await assertWwpExists(weekId);

  if (wwp.projectId !== projectId) {
    throw new AppError(404, 'NOT_FOUND', 'Weekly work plan not found');
  }

  const stats = await leanModel.getWwpTasksForClose(weekId);

  if (stats.incompleteWithoutReason > 0) {
    throw new AppError(
      422,
      'VALIDATION_ERROR',
      'All incomplete tasks must have a variance reason before closing the week',
    );
  }

  const ppc =
    stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 10000) / 100;

  const updated = await leanModel.closeWwp(weekId, ppc);
  return { wwp: updated };
}

// ---------------------------------------------------------------------------
// PPC history service function
// ---------------------------------------------------------------------------

/**
 * getPpcHistory — returns the last 12 closed-week PPC values for trend chart.
 *
 * @throws AppError 403 if the requesting user is not a project member.
 */
export async function getPpcHistory(
  userId: number,
  projectId: number,
): Promise<{ id: number; weekStartDate: string; ppc: number }[]> {
  await assertProjectMember(projectId, userId);
  return leanModel.getPpcHistory(projectId);
}

// ---------------------------------------------------------------------------
// Lookahead service function
// ---------------------------------------------------------------------------

/**
 * getLookahead — returns tasks due in the next N weeks for a project.
 *
 * @param weeks — number of weeks to look ahead (1–6; clamped to 6).
 * @throws AppError 422 if weeks is less than 1.
 * @throws AppError 403 if the requesting user is not a project member.
 */
export async function getLookahead(
  userId: number,
  projectId: number,
  weeks: number,
): Promise<LookaheadTask[]> {
  await assertProjectMember(projectId, userId);

  if (weeks < 1) {
    throw new AppError(422, 'VALIDATION_ERROR', 'weeks must be at least 1');
  }

  const clampedWeeks = Math.min(weeks, 6);
  return leanModel.getLookahead(projectId, clampedWeeks);
}
