/**
 * lean.model.ts — Raw SQL query functions for the weekly_work_plans and
 * wwp_tasks tables (Last Planner System / Lean construction).
 *
 * This module is the only place that talks to these tables.
 * No business logic lives here — only parameterised SQL queries.
 *
 * SECURITY: All inputs are passed via named parameters — never string-concatenated.
 */

import { query, sql } from '../lib/db.js';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface Wwp {
  id: number;
  projectId: number;
  weekStartDate: string;
  ppc: number | null;
  createdBy: number;
  createdAt: string;
}

export interface WwpSummary extends Wwp {
  taskCount: number;
  completedTaskCount: number;
}

export interface WwpTask {
  id: number;
  wwpId: number;
  taskId: number | null;
  description: string;
  assigneeId: number | null;
  assigneeName: string | null;
  isComplete: boolean;
  varianceReason: string | null;
  createdAt: string;
}

export interface LookaheadTask {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  status: string;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// DB row shapes (snake_case from SQL Server)
// ---------------------------------------------------------------------------

interface WwpRow {
  id: number;
  project_id: number;
  week_start_date: string;
  ppc: number | null;
  created_by: number;
  created_at: string;
}

interface WwpSummaryRow extends WwpRow {
  task_count: number;
  completed_task_count: number;
}

interface WwpTaskRow {
  id: number;
  wwp_id: number;
  task_id: number | null;
  description: string;
  assignee_id: number | null;
  assignee_name: string | null;
  is_complete: boolean;
  variance_reason: string | null;
  created_at: string;
}

interface LookaheadTaskRow {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  assignee_id: number | null;
  assignee_name: string | null;
  status: string;
  priority: string;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

interface CloseStatsRow {
  total: number;
  completed: number;
  incompleteWithoutReason: number;
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function rowToWwp(row: WwpRow): Wwp {
  return {
    id: row.id,
    projectId: row.project_id,
    weekStartDate: row.week_start_date,
    ppc: row.ppc,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function rowToWwpSummary(row: WwpSummaryRow): WwpSummary {
  return {
    ...rowToWwp(row),
    taskCount: row.task_count,
    completedTaskCount: row.completed_task_count,
  };
}

function rowToWwpTask(row: WwpTaskRow): WwpTask {
  return {
    id: row.id,
    wwpId: row.wwp_id,
    taskId: row.task_id,
    description: row.description,
    assigneeId: row.assignee_id,
    assigneeName: row.assignee_name,
    isComplete: row.is_complete,
    varianceReason: row.variance_reason,
    createdAt: row.created_at,
  };
}

function rowToLookaheadTask(row: LookaheadTaskRow): LookaheadTask {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    assigneeId: row.assignee_id,
    assigneeName: row.assignee_name,
    status: row.status,
    priority: row.priority,
    startDate: row.start_date,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// WWP query functions
// ---------------------------------------------------------------------------

/**
 * listWwps — returns all weekly work plans for a project, sorted newest first.
 * Includes task counts via correlated subqueries.
 */
export async function listWwps(projectId: number): Promise<WwpSummary[]> {
  const rows = await query<WwpSummaryRow>(
    `SELECT
       w.id, w.project_id, w.week_start_date, w.ppc, w.created_by, w.created_at,
       (SELECT COUNT(*) FROM wwp_tasks wt WHERE wt.wwp_id = w.id) AS task_count,
       (SELECT COUNT(*) FROM wwp_tasks wt WHERE wt.wwp_id = w.id AND wt.is_complete = 1) AS completed_task_count
     FROM weekly_work_plans w
     WHERE w.project_id = @projectId
     ORDER BY w.week_start_date DESC`,
    { projectId: { type: sql.Int, value: projectId } },
  );

  return rows.map(rowToWwpSummary);
}

/**
 * createWwp — inserts a new weekly_work_plans row and returns the created record.
 */
export async function createWwp(
  projectId: number,
  weekStartDate: string,
  createdBy: number,
): Promise<Wwp> {
  const rows = await query<WwpRow>(
    `INSERT INTO weekly_work_plans (project_id, week_start_date, created_by)
     OUTPUT
       INSERTED.id, INSERTED.project_id, INSERTED.week_start_date,
       INSERTED.ppc, INSERTED.created_by, INSERTED.created_at
     VALUES (@projectId, @weekStartDate, @createdBy)`,
    {
      projectId: { type: sql.Int, value: projectId },
      weekStartDate: { type: sql.Date, value: weekStartDate },
      createdBy: { type: sql.Int, value: createdBy },
    },
  );

  if (!rows[0]) {
    throw new Error('createWwp: INSERT did not return a row');
  }

  return rowToWwp(rows[0]);
}

/**
 * getWwpById — returns a single WWP with all its tasks, or null if not found.
 */
export async function getWwpById(
  wwpId: number,
): Promise<(Wwp & { tasks: WwpTask[] }) | null> {
  const wwpRows = await query<WwpRow>(
    `SELECT id, project_id, week_start_date, ppc, created_by, created_at
     FROM weekly_work_plans
     WHERE id = @wwpId`,
    { wwpId: { type: sql.Int, value: wwpId } },
  );

  if (wwpRows.length === 0) {
    return null;
  }

  const wwp = rowToWwp(wwpRows[0]!);

  const taskRows = await query<WwpTaskRow>(
    `SELECT
       wt.id, wt.wwp_id, wt.task_id, wt.description,
       wt.assignee_id, u.display_name AS assignee_name,
       wt.is_complete, wt.variance_reason, wt.created_at
     FROM wwp_tasks wt
     LEFT JOIN users u ON u.id = wt.assignee_id
     WHERE wt.wwp_id = @wwpId
     ORDER BY wt.id ASC`,
    { wwpId: { type: sql.Int, value: wwpId } },
  );

  return {
    ...wwp,
    tasks: taskRows.map(rowToWwpTask),
  };
}

/**
 * getWwpByProjectAndWeek — returns a WWP matching the project + week, or null.
 * Used to check for duplicate week before inserting.
 */
export async function getWwpByProjectAndWeek(
  projectId: number,
  weekStartDate: string,
): Promise<Wwp | null> {
  const rows = await query<WwpRow>(
    `SELECT id, project_id, week_start_date, ppc, created_by, created_at
     FROM weekly_work_plans
     WHERE project_id = @projectId AND week_start_date = @weekStartDate`,
    {
      projectId: { type: sql.Int, value: projectId },
      weekStartDate: { type: sql.Date, value: weekStartDate },
    },
  );

  return rows.length > 0 ? rowToWwp(rows[0]!) : null;
}

// ---------------------------------------------------------------------------
// WWP task query functions
// ---------------------------------------------------------------------------

/**
 * addWwpTask — inserts a new wwp_tasks row and returns the created record.
 */
export async function addWwpTask(
  wwpId: number,
  data: { description: string; assigneeId?: number; taskId?: number },
): Promise<WwpTask> {
  const rows = await query<WwpTaskRow>(
    `INSERT INTO wwp_tasks (wwp_id, task_id, description, assignee_id)
     OUTPUT
       INSERTED.id, INSERTED.wwp_id, INSERTED.task_id, INSERTED.description,
       INSERTED.assignee_id, NULL AS assignee_name,
       INSERTED.is_complete, INSERTED.variance_reason, INSERTED.created_at
     VALUES (@wwpId, @taskId, @description, @assigneeId)`,
    {
      wwpId: { type: sql.Int, value: wwpId },
      taskId: { type: sql.Int, value: data.taskId ?? null },
      description: { type: sql.NVarChar(300), value: data.description },
      assigneeId: { type: sql.Int, value: data.assigneeId ?? null },
    },
  );

  if (!rows[0]) {
    throw new Error('addWwpTask: INSERT did not return a row');
  }

  return rowToWwpTask(rows[0]);
}

/**
 * updateWwpTask — applies partial updates to a wwp_tasks row.
 * Returns null if the row does not exist.
 */
export async function updateWwpTask(
  wwpTaskId: number,
  data: { isComplete?: boolean; varianceReason?: string },
): Promise<WwpTask | null> {
  const setClauses: string[] = [];
  const inputs: Record<string, { type: sql.ISqlTypeFactory; value: unknown }> = {
    id: { type: sql.Int, value: wwpTaskId },
  };

  if (data.isComplete !== undefined) {
    setClauses.push('is_complete = @isComplete');
    inputs['isComplete'] = { type: sql.Bit, value: data.isComplete ? 1 : 0 };
  }
  if ('varianceReason' in data) {
    setClauses.push('variance_reason = @varianceReason');
    inputs['varianceReason'] = {
      type: sql.NVarChar(500),
      value: data.varianceReason ?? null,
    };
  }

  if (setClauses.length === 0) {
    throw new Error('updateWwpTask: no fields provided to update');
  }

  const rows = await query<WwpTaskRow>(
    `UPDATE wwp_tasks
     SET ${setClauses.join(', ')}
     OUTPUT
       INSERTED.id, INSERTED.wwp_id, INSERTED.task_id, INSERTED.description,
       INSERTED.assignee_id, NULL AS assignee_name,
       INSERTED.is_complete, INSERTED.variance_reason, INSERTED.created_at
     WHERE id = @id`,
    inputs,
  );

  return rows.length > 0 ? rowToWwpTask(rows[0]!) : null;
}

// ---------------------------------------------------------------------------
// Close week / PPC query functions
// ---------------------------------------------------------------------------

/**
 * getWwpTasksForClose — returns aggregate counts needed for PPC calculation
 * and variance reason validation.
 *
 * Uses conditional aggregation so a single query retrieves:
 *  - total task count
 *  - completed task count
 *  - count of incomplete tasks with no variance reason (the business rule blocker)
 */
export async function getWwpTasksForClose(
  wwpId: number,
): Promise<{ total: number; completed: number; incompleteWithoutReason: number }> {
  const rows = await query<CloseStatsRow>(
    `SELECT
       COUNT(*) AS total,
       SUM(CAST(is_complete AS int)) AS completed,
       SUM(CASE WHEN is_complete = 0 AND variance_reason IS NULL THEN 1 ELSE 0 END) AS incompleteWithoutReason
     FROM wwp_tasks
     WHERE wwp_id = @wwpId`,
    { wwpId: { type: sql.Int, value: wwpId } },
  );

  const row = rows[0];
  if (!row) {
    return { total: 0, completed: 0, incompleteWithoutReason: 0 };
  }

  return {
    total: row.total ?? 0,
    completed: row.completed ?? 0,
    incompleteWithoutReason: row.incompleteWithoutReason ?? 0,
  };
}

/**
 * closeWwp — stores the calculated PPC value on the weekly_work_plans row.
 * Returns the updated WWP record.
 */
export async function closeWwp(wwpId: number, ppc: number): Promise<Wwp> {
  const rows = await query<WwpRow>(
    `UPDATE weekly_work_plans
     SET ppc = @ppc
     OUTPUT
       INSERTED.id, INSERTED.project_id, INSERTED.week_start_date,
       INSERTED.ppc, INSERTED.created_by, INSERTED.created_at
     WHERE id = @wwpId`,
    {
      wwpId: { type: sql.Int, value: wwpId },
      ppc: { type: sql.Decimal(5, 2), value: ppc },
    },
  );

  if (!rows[0]) {
    throw new Error('closeWwp: UPDATE did not return a row');
  }

  return rowToWwp(rows[0]);
}

// ---------------------------------------------------------------------------
// PPC history
// ---------------------------------------------------------------------------

/**
 * getPpcHistory — returns the last 12 closed weeks for a project, ordered
 * chronologically. Only weeks where ppc IS NOT NULL (closed weeks).
 */
export async function getPpcHistory(
  projectId: number,
): Promise<{ id: number; weekStartDate: string; ppc: number }[]> {
  const rows = await query<{ id: number; week_start_date: string; ppc: number }>(
    `SELECT TOP 12
       id, week_start_date, ppc
     FROM weekly_work_plans
     WHERE project_id = @projectId
       AND ppc IS NOT NULL
     ORDER BY week_start_date ASC`,
    { projectId: { type: sql.Int, value: projectId } },
  );

  return rows.map((r) => ({
    id: r.id,
    weekStartDate: r.week_start_date,
    ppc: r.ppc,
  }));
}

// ---------------------------------------------------------------------------
// Lookahead
// ---------------------------------------------------------------------------

/**
 * getLookahead — returns tasks due within the next N weeks for a project.
 * Excludes done and cancelled tasks.
 */
export async function getLookahead(
  projectId: number,
  weeks: number,
): Promise<LookaheadTask[]> {
  const rows = await query<LookaheadTaskRow>(
    `SELECT
       t.id, t.project_id, t.title, t.description,
       t.assignee_id, u.display_name AS assignee_name,
       t.status, t.priority, t.start_date, t.due_date,
       t.completed_at, t.created_by, t.created_at, t.updated_at
     FROM tasks t
     LEFT JOIN users u ON u.id = t.assignee_id
     WHERE t.project_id = @projectId
       AND t.due_date BETWEEN CAST(GETUTCDATE() AS date)
           AND DATEADD(day, @days, CAST(GETUTCDATE() AS date))
       AND t.status NOT IN (N'done', N'cancelled')
     ORDER BY t.due_date ASC, t.priority ASC`,
    {
      projectId: { type: sql.Int, value: projectId },
      days: { type: sql.Int, value: weeks * 7 },
    },
  );

  return rows.map(rowToLookaheadTask);
}
