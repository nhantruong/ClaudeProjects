/**
 * task.service.ts — Business logic for task management.
 *
 * This service is the single source of truth for task rules. Controllers
 * call it; it calls the task and project models. No HTTP or Express types
 * appear here — this layer is testable without a web framework.
 *
 * Visibility invariant: users may only access tasks within projects they
 * are members of. Every operation checks project membership before proceeding.
 *
 * completed_at invariant: set by the model layer when status → 'done',
 * cleared when status transitions away from 'done'.
 */

import { AppError } from '../middleware/errorHandler.js';
import { isProjectMember } from '../models/project.model.js';
import * as taskModel from '../models/task.model.js';
import type {
  Task,
  TaskDetail,
  TaskStatus,
  TaskPriority,
  Subtask,
  Comment,
  ListTasksFilters,
} from '../models/task.model.js';

// Re-export types so controllers do not need to import from the model
export type { Task, TaskDetail, TaskStatus, TaskPriority, Subtask, Comment, ListTasksFilters };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * assertTaskExists — returns the task or throws 404.
 */
async function assertTaskExists(taskId: number): Promise<TaskDetail> {
  const task = await taskModel.getTaskById(taskId);
  if (!task) {
    throw new AppError(404, 'NOT_FOUND', 'Task not found');
  }
  return task;
}

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
 * detectCycle — BFS cycle detection for task dependencies.
 *
 * Starting from `startTaskId`, follows the dependency chain. Returns true if
 * `targetTaskId` is reachable — meaning adding a dependency from targetTaskId
 * → startTaskId would create a cycle.
 *
 * Time complexity: O(V + E) per call. Acceptable for the small dependency
 * graphs expected in this domain.
 */
async function detectCycle(startTaskId: number, targetTaskId: number): Promise<boolean> {
  const visited = new Set<number>();
  const queue: number[] = [startTaskId];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === targetTaskId) {
      return true;
    }

    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    const deps = await taskModel.getDependencies(current);
    for (const dep of deps) {
      if (!visited.has(dep)) {
        queue.push(dep);
      }
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Task service functions
// ---------------------------------------------------------------------------

/**
 * listTasks — returns all tasks in a project, with optional filters.
 *
 * @throws AppError 403 if the requesting user is not a project member.
 */
export async function listTasks(
  projectId: number,
  requestingUserId: number,
  filters?: ListTasksFilters,
): Promise<Task[]> {
  await assertProjectMember(projectId, requestingUserId);
  return taskModel.listTasks(projectId, filters);
}

/**
 * getTask — returns a task with subtasks, comments, and dependency IDs.
 *
 * @throws AppError 404 if the task does not exist.
 * @throws AppError 403 if the requesting user is not a member of the task's project.
 */
export async function getTask(taskId: number, requestingUserId: number): Promise<TaskDetail> {
  const task = await assertTaskExists(taskId);
  await assertProjectMember(task.projectId, requestingUserId);
  return task;
}

/**
 * createTask — creates a new task within a project.
 *
 * @throws AppError 403 if the requesting user is not a project member.
 */
export async function createTask(
  data: {
    projectId: number;
    title: string;
    description?: string;
    assigneeId?: number;
    status?: TaskStatus;
    priority?: TaskPriority;
    startDate?: string;
    dueDate?: string;
  },
  requestingUserId: number,
): Promise<Task> {
  await assertProjectMember(data.projectId, requestingUserId);

  return taskModel.createTask({
    projectId: data.projectId,
    title: data.title,
    description: data.description,
    assigneeId: data.assigneeId,
    status: data.status ?? 'todo',
    priority: data.priority ?? 'normal',
    startDate: data.startDate,
    dueDate: data.dueDate,
    createdBy: requestingUserId,
  });
}

/**
 * updateTask — applies partial updates to a task.
 *
 * @throws AppError 404 if the task does not exist.
 * @throws AppError 403 if the requesting user is not a project member.
 */
export async function updateTask(
  taskId: number,
  data: Partial<{
    title: string;
    description: string | null;
    assigneeId: number | null;
    status: TaskStatus;
    priority: TaskPriority;
    startDate: string | null;
    dueDate: string | null;
  }>,
  requestingUserId: number,
): Promise<Task> {
  const task = await assertTaskExists(taskId);
  await assertProjectMember(task.projectId, requestingUserId);

  return taskModel.updateTask(taskId, data);
}

/**
 * deleteTask — permanently deletes a task.
 *
 * Subtasks and comments cascade at the DB level.
 * Dependency rows must not exist — throws 409 if other tasks depend on this one.
 *
 * @throws AppError 404 if the task does not exist.
 * @throws AppError 403 if the requesting user is not a project member.
 * @throws AppError 409 if other tasks depend on this task (blocking relationship).
 */
export async function deleteTask(taskId: number, requestingUserId: number): Promise<void> {
  const task = await assertTaskExists(taskId);
  await assertProjectMember(task.projectId, requestingUserId);

  // Check if any tasks depend on this one — cannot delete a blocking task
  const dependents = await taskModel.getTaskDependents(taskId);
  if (dependents.length > 0) {
    throw new AppError(
      409,
      'CONFLICT',
      'Cannot delete this task — other tasks depend on it. Remove the dependencies first.',
    );
  }

  await taskModel.deleteTask(taskId);
}

// ---------------------------------------------------------------------------
// Subtask service functions
// ---------------------------------------------------------------------------

/**
 * addSubtask — adds a checklist item to a task.
 *
 * @throws AppError 404 if the task does not exist.
 * @throws AppError 403 if the requesting user is not a project member.
 */
export async function addSubtask(
  taskId: number,
  data: { title: string; sortOrder?: number },
  requestingUserId: number,
): Promise<Subtask> {
  const task = await assertTaskExists(taskId);
  await assertProjectMember(task.projectId, requestingUserId);

  return taskModel.createSubtask(taskId, data);
}

/**
 * updateSubtask — updates a subtask's title, completion, or sort order.
 *
 * @throws AppError 404 if the task or subtask does not exist.
 * @throws AppError 403 if the requesting user is not a project member.
 */
export async function updateSubtask(
  taskId: number,
  subtaskId: number,
  data: Partial<{ title: string; isComplete: boolean; sortOrder: number }>,
  requestingUserId: number,
): Promise<Subtask> {
  const task = await assertTaskExists(taskId);
  await assertProjectMember(task.projectId, requestingUserId);

  const subtask = await taskModel.getSubtaskById(subtaskId);
  if (!subtask || subtask.taskId !== taskId) {
    throw new AppError(404, 'NOT_FOUND', 'Subtask not found');
  }

  return taskModel.updateSubtask(subtaskId, data);
}

/**
 * deleteSubtask — removes a subtask from a task.
 *
 * @throws AppError 404 if the task or subtask does not exist.
 * @throws AppError 403 if the requesting user is not a project member.
 */
export async function deleteSubtask(
  taskId: number,
  subtaskId: number,
  requestingUserId: number,
): Promise<void> {
  const task = await assertTaskExists(taskId);
  await assertProjectMember(task.projectId, requestingUserId);

  const subtask = await taskModel.getSubtaskById(subtaskId);
  if (!subtask || subtask.taskId !== taskId) {
    throw new AppError(404, 'NOT_FOUND', 'Subtask not found');
  }

  await taskModel.deleteSubtask(subtaskId);
}

// ---------------------------------------------------------------------------
// Comment service functions
// ---------------------------------------------------------------------------

/**
 * addComment — adds a comment to a task.
 *
 * @throws AppError 404 if the task does not exist.
 * @throws AppError 403 if the requesting user is not a project member.
 */
export async function addComment(
  taskId: number,
  body: string,
  requestingUserId: number,
): Promise<Comment> {
  const task = await assertTaskExists(taskId);
  await assertProjectMember(task.projectId, requestingUserId);

  return taskModel.createComment(taskId, requestingUserId, body);
}

// ---------------------------------------------------------------------------
// Dependency service functions
// ---------------------------------------------------------------------------

/**
 * addDependency — records that taskId depends on dependsOnTaskId.
 *
 * Performs cycle detection before inserting. Rejects if adding this
 * dependency would create a circular chain (A → B → … → A).
 *
 * @throws AppError 404 if either task does not exist.
 * @throws AppError 403 if the requesting user is not a member of either task's project.
 * @throws AppError 400 if taskId === dependsOnTaskId (self-dependency).
 * @throws AppError 409 if the dependency would create a cycle.
 */
export async function addDependency(
  taskId: number,
  dependsOnTaskId: number,
  requestingUserId: number,
): Promise<void> {
  if (taskId === dependsOnTaskId) {
    throw new AppError(400, 'VALIDATION_ERROR', 'A task cannot depend on itself');
  }

  const task = await assertTaskExists(taskId);
  await assertProjectMember(task.projectId, requestingUserId);

  // Verify the upstream task exists (may be in a different project)
  const upstreamTask = await taskModel.getTaskById(dependsOnTaskId);
  if (!upstreamTask) {
    throw new AppError(404, 'NOT_FOUND', 'Upstream task not found');
  }

  // Cycle detection: would adding taskId → dependsOnTaskId create a cycle?
  // A cycle exists if dependsOnTaskId can already reach taskId through the graph.
  const wouldCycle = await detectCycle(dependsOnTaskId, taskId);
  if (wouldCycle) {
    throw new AppError(
      409,
      'CONFLICT',
      'Adding this dependency would create a circular dependency chain',
    );
  }

  await taskModel.addDependency(taskId, dependsOnTaskId);
}

/**
 * removeDependency — removes the dependency record between two tasks.
 *
 * @throws AppError 404 if the task does not exist.
 * @throws AppError 403 if the requesting user is not a project member.
 */
export async function removeDependency(
  taskId: number,
  dependsOnTaskId: number,
  requestingUserId: number,
): Promise<void> {
  const task = await assertTaskExists(taskId);
  await assertProjectMember(task.projectId, requestingUserId);

  await taskModel.removeDependency(taskId, dependsOnTaskId);
}
