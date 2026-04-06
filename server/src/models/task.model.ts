/**
 * task.model.ts — Raw SQL query functions for tasks, subtasks,
 * task_comments, and task_dependencies tables.
 *
 * This module is the only place that talks to these tables.
 * No business logic lives here — only parameterised SQL queries.
 *
 * SECURITY: All inputs are passed via named parameters — never string-concatenated.
 * Dynamic SET clauses are built from an explicit developer-controlled allowlist,
 * never from user-supplied column names.
 */

import { query, sql } from '../lib/db.js';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked';
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  dependsOn?: number[];
  blocks?: number[];
}

export interface Subtask {
  id: number;
  taskId: number;
  title: string;
  isComplete: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface Comment {
  id: number;
  taskId: number;
  userId: number;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDependency {
  taskId: number;
  dependsOnTaskId: number;
}

export interface TaskDetail extends Task {
  subtasks: Subtask[];
  comments: Comment[];
  dependsOn: number[]; // dependsOnTaskId values
  blockedBy: number[]; // task ids that block this task
}

// ---------------------------------------------------------------------------
// DB row shapes (snake_case from SQL Server)
// ---------------------------------------------------------------------------

interface TaskRow {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  assignee_id: number | null;
  assignee_name: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

interface SubtaskRow {
  id: number;
  task_id: number;
  title: string;
  is_complete: boolean;
  sort_order: number;
  created_at: string;
}

interface CommentRow {
  id: number;
  task_id: number;
  user_id: number;
  author_name: string;
  body: string;
  created_at: string;
  updated_at: string;
}

interface DependencyRow {
  task_id: number;
  depends_on_task_id: number;
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function rowToTask(row: TaskRow): Task {
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

function rowToSubtask(row: SubtaskRow): Subtask {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    isComplete: row.is_complete,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function rowToComment(row: CommentRow): Comment {
  return {
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Task query functions
// ---------------------------------------------------------------------------

export interface ListTasksFilters {
  status?: TaskStatus;
  assigneeId?: number;
  priority?: TaskPriority;
}

/**
 * listTasks — returns all tasks for a project, with optional filters.
 * JOINs users to include the assignee display name.
 * Ordered by priority (critical first) then due date ascending.
 */
export async function listTasks(
  projectId: number,
  filters?: ListTasksFilters,
): Promise<Task[]> {
  const inputs: Record<string, { type: sql.ISqlTypeFactory; value: unknown }> = {
    projectId: { type: sql.Int, value: projectId },
  };

  const whereClauses: string[] = ['t.project_id = @projectId'];

  if (filters?.status !== undefined) {
    whereClauses.push('t.status = @status');
    inputs['status'] = { type: sql.NVarChar(30), value: filters.status };
  }
  if (filters?.assigneeId !== undefined) {
    whereClauses.push('t.assignee_id = @assigneeId');
    inputs['assigneeId'] = { type: sql.Int, value: filters.assigneeId };
  }
  if (filters?.priority !== undefined) {
    whereClauses.push('t.priority = @priority');
    inputs['priority'] = { type: sql.NVarChar(20), value: filters.priority };
  }

  const rows = await query<TaskRow>(
    `SELECT
       t.id, t.project_id, t.title, t.description,
       t.assignee_id, u.display_name AS assignee_name,
       t.status, t.priority, t.start_date, t.due_date,
       t.completed_at, t.created_by, t.created_at, t.updated_at
     FROM tasks t
     LEFT JOIN users u ON u.id = t.assignee_id
     WHERE ${whereClauses.join(' AND ')}
     ORDER BY
       CASE t.priority
         WHEN N'critical' THEN 1
         WHEN N'high'     THEN 2
         WHEN N'normal'   THEN 3
         WHEN N'low'      THEN 4
       END ASC,
       t.due_date ASC`,
    inputs,
  );

  return rows.map(rowToTask);
}

/**
 * getTaskById — returns a single task with its subtasks, comments, and
 * dependency IDs. Returns null if the task does not exist.
 */
export async function getTaskById(id: number): Promise<TaskDetail | null> {
  const taskRows = await query<TaskRow>(
    `SELECT
       t.id, t.project_id, t.title, t.description,
       t.assignee_id, u.display_name AS assignee_name,
       t.status, t.priority, t.start_date, t.due_date,
       t.completed_at, t.created_by, t.created_at, t.updated_at
     FROM tasks t
     LEFT JOIN users u ON u.id = t.assignee_id
     WHERE t.id = @id`,
    { id: { type: sql.Int, value: id } },
  );

  if (taskRows.length === 0) {
    return null;
  }

  const task = rowToTask(taskRows[0]!);

  // Fetch subtasks ordered by sort_order
  const subtaskRows = await query<SubtaskRow>(
    `SELECT id, task_id, title, is_complete, sort_order, created_at
     FROM subtasks
     WHERE task_id = @taskId
     ORDER BY sort_order ASC, id ASC`,
    { taskId: { type: sql.Int, value: id } },
  );

  // Fetch comments with author name, ordered chronologically
  const commentRows = await query<CommentRow>(
    `SELECT tc.id, tc.task_id, tc.user_id, u.display_name AS author_name,
            tc.body, tc.created_at, tc.updated_at
     FROM task_comments tc
     INNER JOIN users u ON u.id = tc.user_id
     WHERE tc.task_id = @taskId
     ORDER BY tc.created_at ASC`,
    { taskId: { type: sql.Int, value: id } },
  );

  // Fetch dependency IDs in both directions
  const depRows = await query<DependencyRow>(
    `SELECT task_id, depends_on_task_id
     FROM task_dependencies
     WHERE task_id = @taskId OR depends_on_task_id = @taskId2`,
    {
      taskId: { type: sql.Int, value: id },
      taskId2: { type: sql.Int, value: id },
    },
  );

  const dependsOn = depRows
    .filter((r) => r.task_id === id)
    .map((r) => r.depends_on_task_id);

  const blockedBy = depRows
    .filter((r) => r.depends_on_task_id === id)
    .map((r) => r.task_id);

  return {
    ...task,
    subtasks: subtaskRows.map(rowToSubtask),
    comments: commentRows.map(rowToComment),
    dependsOn,
    blockedBy,
  };
}

/**
 * createTask — inserts a new task row and returns the created record.
 */
export async function createTask(data: {
  projectId: number;
  title: string;
  description?: string;
  assigneeId?: number;
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: string;
  dueDate?: string;
  createdBy: number;
}): Promise<Task> {
  const rows = await query<TaskRow>(
    `INSERT INTO tasks (
       project_id, title, description, assignee_id,
       status, priority, start_date, due_date, created_by
     )
     OUTPUT
       INSERTED.id, INSERTED.project_id, INSERTED.title, INSERTED.description,
       INSERTED.assignee_id, NULL AS assignee_name,
       INSERTED.status, INSERTED.priority, INSERTED.start_date, INSERTED.due_date,
       INSERTED.completed_at, INSERTED.created_by, INSERTED.created_at, INSERTED.updated_at
     VALUES (
       @projectId, @title, @description, @assigneeId,
       @status, @priority, @startDate, @dueDate, @createdBy
     )`,
    {
      projectId: { type: sql.Int, value: data.projectId },
      title: { type: sql.NVarChar(300), value: data.title },
      description: { type: sql.NVarChar(sql.MAX), value: data.description ?? null },
      assigneeId: { type: sql.Int, value: data.assigneeId ?? null },
      status: { type: sql.NVarChar(30), value: data.status },
      priority: { type: sql.NVarChar(20), value: data.priority },
      startDate: { type: sql.Date, value: data.startDate ?? null },
      dueDate: { type: sql.Date, value: data.dueDate ?? null },
      createdBy: { type: sql.Int, value: data.createdBy },
    },
  );

  if (!rows[0]) {
    throw new Error('createTask: INSERT did not return a row');
  }

  return rowToTask(rows[0]);
}

/**
 * updateTask — applies partial updates to a task row.
 * Only the supplied fields are changed; updated_at is always bumped.
 * When status transitions to 'done', completed_at is set to GETUTCDATE().
 * When status transitions away from 'done', completed_at is cleared.
 *
 * Dynamic SET clause is built from a developer-controlled allowlist —
 * no user-supplied column names enter the SQL string.
 */
export async function updateTask(
  id: number,
  data: Partial<{
    title: string;
    description: string | null;
    assigneeId: number | null;
    status: TaskStatus;
    priority: TaskPriority;
    startDate: string | null;
    dueDate: string | null;
  }>,
): Promise<Task> {
  const setClauses: string[] = ['updated_at = GETUTCDATE()'];
  const inputs: Record<string, { type: sql.ISqlTypeFactory; value: unknown }> = {
    id: { type: sql.Int, value: id },
  };

  if (data.title !== undefined) {
    setClauses.push('title = @title');
    inputs['title'] = { type: sql.NVarChar(300), value: data.title };
  }
  if ('description' in data) {
    setClauses.push('description = @description');
    inputs['description'] = { type: sql.NVarChar(sql.MAX), value: data.description };
  }
  if ('assigneeId' in data) {
    setClauses.push('assignee_id = @assigneeId');
    inputs['assigneeId'] = { type: sql.Int, value: data.assigneeId };
  }
  if (data.status !== undefined) {
    setClauses.push('status = @status');
    inputs['status'] = { type: sql.NVarChar(30), value: data.status };

    // Maintain completed_at invariant in the model layer
    if (data.status === 'done') {
      setClauses.push('completed_at = GETUTCDATE()');
    } else {
      setClauses.push('completed_at = NULL');
    }
  }
  if (data.priority !== undefined) {
    setClauses.push('priority = @priority');
    inputs['priority'] = { type: sql.NVarChar(20), value: data.priority };
  }
  if ('startDate' in data) {
    setClauses.push('start_date = @startDate');
    inputs['startDate'] = { type: sql.Date, value: data.startDate };
  }
  if ('dueDate' in data) {
    setClauses.push('due_date = @dueDate');
    inputs['dueDate'] = { type: sql.Date, value: data.dueDate };
  }

  const rows = await query<TaskRow>(
    `UPDATE tasks
     SET ${setClauses.join(', ')}
     OUTPUT
       INSERTED.id, INSERTED.project_id, INSERTED.title, INSERTED.description,
       INSERTED.assignee_id, NULL AS assignee_name,
       INSERTED.status, INSERTED.priority, INSERTED.start_date, INSERTED.due_date,
       INSERTED.completed_at, INSERTED.created_by, INSERTED.created_at, INSERTED.updated_at
     WHERE id = @id`,
    inputs,
  );

  if (!rows[0]) {
    throw new Error('updateTask: UPDATE did not return a row');
  }

  return rowToTask(rows[0]);
}

/**
 * deleteTask — permanently deletes a task. Cascade deletes subtasks and
 * comments at the DB level. Dependencies have no cascade — caller must
 * ensure none exist before calling this.
 */
export async function deleteTask(id: number): Promise<void> {
  await query(`DELETE FROM tasks WHERE id = @id`, { id: { type: sql.Int, value: id } });
}

// ---------------------------------------------------------------------------
// Subtask query functions
// ---------------------------------------------------------------------------

/**
 * createSubtask — inserts a subtask row for the given task.
 */
export async function createSubtask(
  taskId: number,
  data: { title: string; sortOrder?: number },
): Promise<Subtask> {
  const rows = await query<SubtaskRow>(
    `INSERT INTO subtasks (task_id, title, sort_order)
     OUTPUT
       INSERTED.id, INSERTED.task_id, INSERTED.title,
       INSERTED.is_complete, INSERTED.sort_order, INSERTED.created_at
     VALUES (@taskId, @title, @sortOrder)`,
    {
      taskId: { type: sql.Int, value: taskId },
      title: { type: sql.NVarChar(300), value: data.title },
      sortOrder: { type: sql.Int, value: data.sortOrder ?? 0 },
    },
  );

  if (!rows[0]) {
    throw new Error('createSubtask: INSERT did not return a row');
  }

  return rowToSubtask(rows[0]);
}

/**
 * updateSubtask — applies partial updates to a subtask row.
 */
export async function updateSubtask(
  id: number,
  data: Partial<{ title: string; isComplete: boolean; sortOrder: number }>,
): Promise<Subtask> {
  const setClauses: string[] = [];
  const inputs: Record<string, { type: sql.ISqlTypeFactory; value: unknown }> = {
    id: { type: sql.Int, value: id },
  };

  if (data.title !== undefined) {
    setClauses.push('title = @title');
    inputs['title'] = { type: sql.NVarChar(300), value: data.title };
  }
  if (data.isComplete !== undefined) {
    setClauses.push('is_complete = @isComplete');
    inputs['isComplete'] = { type: sql.Bit, value: data.isComplete ? 1 : 0 };
  }
  if (data.sortOrder !== undefined) {
    setClauses.push('sort_order = @sortOrder');
    inputs['sortOrder'] = { type: sql.Int, value: data.sortOrder };
  }

  if (setClauses.length === 0) {
    throw new Error('updateSubtask: no fields provided to update');
  }

  const rows = await query<SubtaskRow>(
    `UPDATE subtasks
     SET ${setClauses.join(', ')}
     OUTPUT
       INSERTED.id, INSERTED.task_id, INSERTED.title,
       INSERTED.is_complete, INSERTED.sort_order, INSERTED.created_at
     WHERE id = @id`,
    inputs,
  );

  if (!rows[0]) {
    throw new Error('updateSubtask: UPDATE did not return a row');
  }

  return rowToSubtask(rows[0]);
}

/**
 * deleteSubtask — deletes a subtask row by id.
 */
export async function deleteSubtask(id: number): Promise<void> {
  await query(`DELETE FROM subtasks WHERE id = @id`, { id: { type: sql.Int, value: id } });
}

/**
 * getSubtaskById — returns a subtask by its id, or null if not found.
 * Used to verify ownership (task_id) before mutations.
 */
export async function getSubtaskById(id: number): Promise<Subtask | null> {
  const rows = await query<SubtaskRow>(
    `SELECT id, task_id, title, is_complete, sort_order, created_at
     FROM subtasks
     WHERE id = @id`,
    { id: { type: sql.Int, value: id } },
  );

  return rows.length > 0 ? rowToSubtask(rows[0]!) : null;
}

// ---------------------------------------------------------------------------
// Comment query functions
// ---------------------------------------------------------------------------

/**
 * createComment — inserts a task_comments row.
 */
export async function createComment(
  taskId: number,
  userId: number,
  body: string,
): Promise<Comment> {
  const rows = await query<CommentRow>(
    `INSERT INTO task_comments (task_id, user_id, body)
     OUTPUT
       INSERTED.id, INSERTED.task_id, INSERTED.user_id,
       (SELECT display_name FROM users WHERE id = INSERTED.user_id) AS author_name,
       INSERTED.body, INSERTED.created_at, INSERTED.updated_at
     VALUES (@taskId, @userId, @body)`,
    {
      taskId: { type: sql.Int, value: taskId },
      userId: { type: sql.Int, value: userId },
      body: { type: sql.NVarChar(sql.MAX), value: body },
    },
  );

  if (!rows[0]) {
    throw new Error('createComment: INSERT did not return a row');
  }

  return rowToComment(rows[0]);
}

// ---------------------------------------------------------------------------
// Dependency query functions
// ---------------------------------------------------------------------------

/**
 * addDependency — inserts a task_dependencies row.
 * Caller must verify there is no cycle before calling this.
 */
export async function addDependency(
  taskId: number,
  dependsOnTaskId: number,
): Promise<void> {
  await query(
    `INSERT INTO task_dependencies (task_id, depends_on_task_id)
     VALUES (@taskId, @dependsOnTaskId)`,
    {
      taskId: { type: sql.Int, value: taskId },
      dependsOnTaskId: { type: sql.Int, value: dependsOnTaskId },
    },
  );
}

/**
 * removeDependency — deletes the dependency row between two tasks.
 */
export async function removeDependency(
  taskId: number,
  dependsOnTaskId: number,
): Promise<void> {
  await query(
    `DELETE FROM task_dependencies
     WHERE task_id = @taskId AND depends_on_task_id = @dependsOnTaskId`,
    {
      taskId: { type: sql.Int, value: taskId },
      dependsOnTaskId: { type: sql.Int, value: dependsOnTaskId },
    },
  );
}

/**
 * getDependencies — returns the dependsOnTaskId values for a task.
 * Used by the cycle detection algorithm in the service layer.
 */
export async function getDependencies(taskId: number): Promise<number[]> {
  const rows = await query<{ depends_on_task_id: number }>(
    `SELECT depends_on_task_id
     FROM task_dependencies
     WHERE task_id = @taskId`,
    { taskId: { type: sql.Int, value: taskId } },
  );

  return rows.map((r) => r.depends_on_task_id);
}

/**
 * getTaskDependents — returns the task IDs that depend on (are blocked by)
 * the given task. Used by deleteTask to check for blocking dependents.
 */
export async function getTaskDependents(taskId: number): Promise<number[]> {
  const rows = await query<{ task_id: number }>(
    `SELECT task_id
     FROM task_dependencies
     WHERE depends_on_task_id = @taskId`,
    { taskId: { type: sql.Int, value: taskId } },
  );

  return rows.map((r) => r.task_id);
}

/**
 * getDependenciesByProject — returns all dependency rows for every task in a
 * project in a single query. Used to attach dependsOn / blocks arrays to the
 * bulk task list response (e.g. Gantt chart dependency arrows).
 */
export async function getDependenciesByProject(
  projectId: number,
): Promise<TaskDependency[]> {
  const rows = await query<{ task_id: number; depends_on_task_id: number }>(
    `SELECT td.task_id, td.depends_on_task_id
     FROM task_dependencies td
     INNER JOIN tasks t ON t.id = td.task_id
     WHERE t.project_id = @projectId`,
    { projectId: { type: sql.Int, value: projectId } },
  );

  return rows.map((r) => ({
    taskId: r.task_id,
    dependsOnTaskId: r.depends_on_task_id,
  }));
}
