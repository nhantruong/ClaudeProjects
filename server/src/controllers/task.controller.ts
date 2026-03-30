/**
 * task.controller.ts — Thin Express handlers for task endpoints.
 *
 * Each handler: reads typed input (already validated by validate middleware
 * or parsed from URL params), delegates to the task service, and formats
 * the HTTP response.
 *
 * No business logic lives here. This layer's only job is to translate between
 * HTTP (req/res) and the service layer.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import * as taskService from '../services/task.service.js';
import type { TaskStatus, TaskPriority } from '../services/task.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a numeric route param — returns NaN if the value is not a valid int. */
function parseId(value: string | undefined): number {
  return parseInt(value ?? '', 10);
}

// ---------------------------------------------------------------------------
// Task handlers
// ---------------------------------------------------------------------------

/**
 * listTasks — GET /api/v1/projects/:projectId/tasks
 *
 * Returns all tasks in the project, with optional query-string filters:
 *   ?status=in_progress&assigneeId=5&priority=high
 */
export async function listTasks(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = parseId(req.params['projectId']);

    const filters: Parameters<typeof taskService.listTasks>[2] = {};
    if (req.query['status']) {
      filters.status = req.query['status'] as TaskStatus;
    }
    if (req.query['assigneeId']) {
      filters.assigneeId = parseInt(req.query['assigneeId'] as string, 10);
    }
    if (req.query['priority']) {
      filters.priority = req.query['priority'] as TaskPriority;
    }

    const tasks = await taskService.listTasks(projectId, req.user!.userId, filters);
    res.status(200).json({ tasks });
  } catch (err) {
    next(err);
  }
}

/**
 * createTask — POST /api/v1/projects/:projectId/tasks
 *
 * Creates a new task. Body validated by CreateTaskSchema upstream.
 */
export async function createTask(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = parseId(req.params['projectId']);
    const { title, description, assigneeId, status, priority, startDate, dueDate } = req.body as {
      title: string;
      description?: string;
      assigneeId?: number;
      status?: TaskStatus;
      priority?: TaskPriority;
      startDate?: string;
      dueDate?: string;
    };

    const task = await taskService.createTask(
      { projectId, title, description, assigneeId, status, priority, startDate, dueDate },
      req.user!.userId,
    );

    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
}

/**
 * getTask — GET /api/v1/tasks/:id
 *
 * Returns full task detail including subtasks, comments, and dependencies.
 */
export async function getTask(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const taskId = parseId(req.params['id']);
    const task = await taskService.getTask(taskId, req.user!.userId);
    res.status(200).json({ task });
  } catch (err) {
    next(err);
  }
}

/**
 * updateTask — PATCH /api/v1/tasks/:id
 *
 * Applies partial updates. Body validated by UpdateTaskSchema upstream.
 */
export async function updateTask(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const taskId = parseId(req.params['id']);
    const { title, description, assigneeId, status, priority, startDate, dueDate } = req.body as {
      title?: string;
      description?: string | null;
      assigneeId?: number | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      startDate?: string | null;
      dueDate?: string | null;
    };

    const task = await taskService.updateTask(
      taskId,
      { title, description, assigneeId, status, priority, startDate, dueDate },
      req.user!.userId,
    );

    res.status(200).json({ task });
  } catch (err) {
    next(err);
  }
}

/**
 * deleteTask — DELETE /api/v1/tasks/:id
 *
 * Permanently deletes a task. Returns 409 if other tasks depend on it.
 */
export async function deleteTask(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const taskId = parseId(req.params['id']);
    await taskService.deleteTask(taskId, req.user!.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Subtask handlers
// ---------------------------------------------------------------------------

/**
 * addSubtask — POST /api/v1/tasks/:id/subtasks
 */
export async function addSubtask(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const taskId = parseId(req.params['id']);
    const { title, sortOrder } = req.body as { title: string; sortOrder?: number };

    const subtask = await taskService.addSubtask(taskId, { title, sortOrder }, req.user!.userId);
    res.status(201).json({ subtask });
  } catch (err) {
    next(err);
  }
}

/**
 * updateSubtask — PATCH /api/v1/tasks/:id/subtasks/:subtaskId
 */
export async function updateSubtask(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const taskId = parseId(req.params['id']);
    const subtaskId = parseId(req.params['subtaskId']);
    const { title, isComplete, sortOrder } = req.body as {
      title?: string;
      isComplete?: boolean;
      sortOrder?: number;
    };

    const subtask = await taskService.updateSubtask(
      taskId,
      subtaskId,
      { title, isComplete, sortOrder },
      req.user!.userId,
    );

    res.status(200).json({ subtask });
  } catch (err) {
    next(err);
  }
}

/**
 * deleteSubtask — DELETE /api/v1/tasks/:id/subtasks/:subtaskId
 */
export async function deleteSubtask(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const taskId = parseId(req.params['id']);
    const subtaskId = parseId(req.params['subtaskId']);
    await taskService.deleteSubtask(taskId, subtaskId, req.user!.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Comment handlers
// ---------------------------------------------------------------------------

/**
 * addComment — POST /api/v1/tasks/:id/comments
 */
export async function addComment(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const taskId = parseId(req.params['id']);
    const { body } = req.body as { body: string };

    const comment = await taskService.addComment(taskId, body, req.user!.userId);
    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Dependency handlers
// ---------------------------------------------------------------------------

/**
 * addDependency — POST /api/v1/tasks/:id/dependencies
 */
export async function addDependency(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const taskId = parseId(req.params['id']);
    const { dependsOnTaskId } = req.body as { dependsOnTaskId: number };

    await taskService.addDependency(taskId, dependsOnTaskId, req.user!.userId);
    res.status(201).json({ message: 'Dependency added' });
  } catch (err) {
    next(err);
  }
}

/**
 * removeDependency — DELETE /api/v1/tasks/:id/dependencies/:dependsOnId
 */
export async function removeDependency(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const taskId = parseId(req.params['id']);
    const dependsOnTaskId = parseId(req.params['dependsOnId']);

    await taskService.removeDependency(taskId, dependsOnTaskId, req.user!.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * notImplementedAttachments — POST /api/v1/tasks/:id/attachments
 *
 * File attachments (FR-035) are deferred to v2.
 */
export function notImplementedAttachments(
  _req: AuthRequest,
  res: Response,
): void {
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'File attachments coming in v2',
    },
  });
}
