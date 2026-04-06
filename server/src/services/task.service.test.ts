/**
 * task.service.test.ts — Unit tests for the task service business logic.
 *
 * All external dependencies (task model, project model) are mocked so these
 * tests run without a database or network connection.
 *
 * Test cases cover:
 *
 *  listTasks:
 *    - success: returns tasks for a project member
 *    - 403 when user is not a project member
 *
 *  createTask:
 *    - success: creates a task with defaults applied
 *    - 403 when user is not a project member
 *
 *  updateTask:
 *    - success: updates a task when user is a member
 *    - 404 when task does not exist
 *    - 403 when user is not a project member
 *
 *  deleteTask:
 *    - success: deletes when no dependents
 *    - 404 when task does not exist
 *    - 403 when user is not a project member
 *    - 409 when other tasks depend on this one
 *
 *  addDependency:
 *    - success: adds dependency when no cycle
 *    - 400 when taskId === dependsOnTaskId (self-reference)
 *    - 404 when upstream task does not exist
 *    - 409 when dependency would create a cycle
 *
 *  addSubtask:
 *    - success: returns the new subtask
 *    - 403 when user is not a project member
 *
 *  updateSubtask:
 *    - success: updates when subtask belongs to the task
 *    - 404 when subtask does not belong to the task
 *
 *  deleteSubtask:
 *    - success: deletes when subtask belongs to the task
 *    - 404 when subtask not found
 *
 *  addComment:
 *    - success: returns the new comment
 *    - 403 when user is not a project member
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// Mocks — set up before importing module under test
// ---------------------------------------------------------------------------

vi.mock('../lib/env.js', () => ({
  env: {
    SESSION_SECRET: 'test-secret-that-is-at-least-32-characters-long',
    NODE_ENV: 'test',
  },
}));

vi.mock('../lib/logger.js', () => ({
  default: { info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('../models/project.model.js', () => ({
  isProjectMember: vi.fn(),
}));

vi.mock('../models/task.model.js', () => ({
  listTasks: vi.fn(),
  getTaskById: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  getTaskDependents: vi.fn(),
  createSubtask: vi.fn(),
  getSubtaskById: vi.fn(),
  updateSubtask: vi.fn(),
  deleteSubtask: vi.fn(),
  createComment: vi.fn(),
  addDependency: vi.fn(),
  removeDependency: vi.fn(),
  getDependencies: vi.fn(),
  getDependenciesByProject: vi.fn(),
}));

import * as projectModel from '../models/project.model.js';
import * as taskModel from '../models/task.model.js';
import * as taskService from './task.service.js';

// ---------------------------------------------------------------------------
// Typed mock helpers
// ---------------------------------------------------------------------------

const mockIsProjectMember = vi.mocked(projectModel.isProjectMember);
const mockListTasks = vi.mocked(taskModel.listTasks);
const mockGetTaskById = vi.mocked(taskModel.getTaskById);
const mockCreateTask = vi.mocked(taskModel.createTask);
const mockUpdateTask = vi.mocked(taskModel.updateTask);
const mockDeleteTask = vi.mocked(taskModel.deleteTask);
const mockGetTaskDependents = vi.mocked(taskModel.getTaskDependents);
const mockCreateSubtask = vi.mocked(taskModel.createSubtask);
const mockGetSubtaskById = vi.mocked(taskModel.getSubtaskById);
const mockUpdateSubtask = vi.mocked(taskModel.updateSubtask);
const mockDeleteSubtask = vi.mocked(taskModel.deleteSubtask);
const mockCreateComment = vi.mocked(taskModel.createComment);
const mockAddDependency = vi.mocked(taskModel.addDependency);
const mockGetDependencies = vi.mocked(taskModel.getDependencies);
const mockGetDependenciesByProject = vi.mocked(taskModel.getDependenciesByProject);

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const baseTask = {
  id: 1,
  projectId: 10,
  title: 'Test task',
  description: null,
  assigneeId: null,
  assigneeName: null,
  status: 'todo' as const,
  priority: 'normal' as const,
  startDate: null,
  dueDate: null,
  completedAt: null,
  createdBy: 5,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const baseTaskDetail = {
  ...baseTask,
  subtasks: [],
  comments: [],
  dependsOn: [],
  blockedBy: [],
};

const baseSubtask = {
  id: 1,
  taskId: 1,
  title: 'First step',
  isComplete: false,
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const baseComment = {
  id: 1,
  taskId: 1,
  userId: 5,
  authorName: 'Alice',
  body: 'Looks good',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// listTasks
// ---------------------------------------------------------------------------

describe('taskService.listTasks', () => {
  it('returns tasks when user is a project member', async () => {
    mockIsProjectMember.mockResolvedValue(true);
    mockListTasks.mockResolvedValue([baseTask]);
    mockGetDependenciesByProject.mockResolvedValue([]);

    const result = await taskService.listTasks(10, 5);

    // listTasks decorates each task with dependsOn/blocks arrays from the bulk dep query
    expect(result).toEqual([{ ...baseTask, dependsOn: [], blocks: [] }]);
    expect(mockListTasks).toHaveBeenCalledWith(10, undefined);
    expect(mockGetDependenciesByProject).toHaveBeenCalledWith(10);
  });

  it('passes filters to the model', async () => {
    mockIsProjectMember.mockResolvedValue(true);
    mockListTasks.mockResolvedValue([baseTask]);
    mockGetDependenciesByProject.mockResolvedValue([]);

    await taskService.listTasks(10, 5, { status: 'in_progress', priority: 'high' });

    expect(mockListTasks).toHaveBeenCalledWith(10, { status: 'in_progress', priority: 'high' });
  });

  it('throws 403 when user is not a project member', async () => {
    mockIsProjectMember.mockResolvedValue(false);

    await expect(taskService.listTasks(10, 99)).rejects.toMatchObject({
      statusCode: 403,
      code: 'UNAUTHORIZED',
    });

    expect(mockListTasks).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// createTask
// ---------------------------------------------------------------------------

describe('taskService.createTask', () => {
  it('creates a task with status and priority defaults', async () => {
    mockIsProjectMember.mockResolvedValue(true);
    mockCreateTask.mockResolvedValue(baseTask);

    const result = await taskService.createTask(
      { projectId: 10, title: 'Test task' },
      5,
    );

    expect(result).toEqual(baseTask);
    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 10,
        title: 'Test task',
        status: 'todo',
        priority: 'normal',
        createdBy: 5,
      }),
    );
  });

  it('respects explicit status and priority when provided', async () => {
    mockIsProjectMember.mockResolvedValue(true);
    mockCreateTask.mockResolvedValue({ ...baseTask, status: 'in_progress', priority: 'high' });

    await taskService.createTask(
      { projectId: 10, title: 'Urgent', status: 'in_progress', priority: 'high' },
      5,
    );

    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'in_progress', priority: 'high' }),
    );
  });

  it('throws 403 when user is not a project member', async () => {
    mockIsProjectMember.mockResolvedValue(false);

    await expect(
      taskService.createTask({ projectId: 10, title: 'Test' }, 99),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(mockCreateTask).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateTask
// ---------------------------------------------------------------------------

describe('taskService.updateTask', () => {
  it('updates a task when user is a member', async () => {
    mockGetTaskById.mockResolvedValue(baseTaskDetail);
    mockIsProjectMember.mockResolvedValue(true);
    mockUpdateTask.mockResolvedValue({ ...baseTask, title: 'Updated' });

    const result = await taskService.updateTask(1, { title: 'Updated' }, 5);

    expect(result.title).toBe('Updated');
    expect(mockUpdateTask).toHaveBeenCalledWith(1, { title: 'Updated' });
  });

  it('throws 404 when the task does not exist', async () => {
    mockGetTaskById.mockResolvedValue(null);

    await expect(
      taskService.updateTask(999, { title: 'X' }, 5),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });

    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it('throws 403 when user is not a project member', async () => {
    mockGetTaskById.mockResolvedValue(baseTaskDetail);
    mockIsProjectMember.mockResolvedValue(false);

    await expect(
      taskService.updateTask(1, { title: 'X' }, 99),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(mockUpdateTask).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deleteTask
// ---------------------------------------------------------------------------

describe('taskService.deleteTask', () => {
  it('deletes a task when there are no dependents', async () => {
    mockGetTaskById.mockResolvedValue(baseTaskDetail);
    mockIsProjectMember.mockResolvedValue(true);
    mockGetTaskDependents.mockResolvedValue([]);
    mockDeleteTask.mockResolvedValue(undefined);

    await taskService.deleteTask(1, 5);

    expect(mockDeleteTask).toHaveBeenCalledWith(1);
  });

  it('throws 404 when the task does not exist', async () => {
    mockGetTaskById.mockResolvedValue(null);

    await expect(taskService.deleteTask(999, 5)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    expect(mockDeleteTask).not.toHaveBeenCalled();
  });

  it('throws 403 when user is not a project member', async () => {
    mockGetTaskById.mockResolvedValue(baseTaskDetail);
    mockIsProjectMember.mockResolvedValue(false);

    await expect(taskService.deleteTask(1, 99)).rejects.toMatchObject({ statusCode: 403 });

    expect(mockDeleteTask).not.toHaveBeenCalled();
  });

  it('throws 409 when other tasks depend on this task', async () => {
    mockGetTaskById.mockResolvedValue(baseTaskDetail);
    mockIsProjectMember.mockResolvedValue(true);
    mockGetTaskDependents.mockResolvedValue([2, 3]); // tasks 2 and 3 depend on task 1

    await expect(taskService.deleteTask(1, 5)).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });

    expect(mockDeleteTask).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// addDependency
// ---------------------------------------------------------------------------

describe('taskService.addDependency', () => {
  it('adds a dependency when there is no cycle', async () => {
    // task 1 will depend on task 2 — no cycle
    mockGetTaskById
      .mockResolvedValueOnce(baseTaskDetail) // task 1 exists
      .mockResolvedValueOnce({ ...baseTaskDetail, id: 2, projectId: 10 }); // task 2 exists
    mockIsProjectMember.mockResolvedValue(true);
    // Cycle detection: getDependencies(2) returns [], so no cycle
    mockGetDependencies.mockResolvedValue([]);
    mockAddDependency.mockResolvedValue(undefined);

    await taskService.addDependency(1, 2, 5);

    expect(mockAddDependency).toHaveBeenCalledWith(1, 2);
  });

  it('throws 400 when taskId equals dependsOnTaskId (self-reference)', async () => {
    await expect(taskService.addDependency(1, 1, 5)).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });

    expect(mockGetTaskById).not.toHaveBeenCalled();
    expect(mockAddDependency).not.toHaveBeenCalled();
  });

  it('throws 404 when the upstream task does not exist', async () => {
    mockGetTaskById
      .mockResolvedValueOnce(baseTaskDetail) // task 1 found
      .mockResolvedValueOnce(null); // task 2 not found
    mockIsProjectMember.mockResolvedValue(true);

    await expect(taskService.addDependency(1, 2, 5)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    expect(mockAddDependency).not.toHaveBeenCalled();
  });

  it('throws 409 when adding the dependency would create a cycle (A→B→C→A)', async () => {
    // Scenario: A=1, B=2, C=3 — existing chain: B depends on C, C depends on A.
    // Attempt: add A depends on B — this would create A→B→C→A cycle.
    const taskA = { ...baseTaskDetail, id: 1, projectId: 10 };
    const taskB = { ...baseTaskDetail, id: 2, projectId: 10 };

    mockGetTaskById
      .mockResolvedValueOnce(taskA) // assertTaskExists for task 1
      .mockResolvedValueOnce(taskB); // upstream task 2 exists
    mockIsProjectMember.mockResolvedValue(true);

    // detectCycle starts from dependsOnTaskId=2, looks for taskId=1
    // getDependencies(2) → [3] (B depends on C)
    // getDependencies(3) → [1] (C depends on A)
    // → 1 is found → cycle!
    mockGetDependencies
      .mockResolvedValueOnce([3]) // deps of task 2 (B)
      .mockResolvedValueOnce([1]); // deps of task 3 (C)

    await expect(taskService.addDependency(1, 2, 5)).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });

    expect(mockAddDependency).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// addSubtask
// ---------------------------------------------------------------------------

describe('taskService.addSubtask', () => {
  it('adds a subtask when user is a project member', async () => {
    mockGetTaskById.mockResolvedValue(baseTaskDetail);
    mockIsProjectMember.mockResolvedValue(true);
    mockCreateSubtask.mockResolvedValue(baseSubtask);

    const result = await taskService.addSubtask(1, { title: 'First step' }, 5);

    expect(result).toEqual(baseSubtask);
    expect(mockCreateSubtask).toHaveBeenCalledWith(1, { title: 'First step' });
  });

  it('throws 403 when user is not a project member', async () => {
    mockGetTaskById.mockResolvedValue(baseTaskDetail);
    mockIsProjectMember.mockResolvedValue(false);

    await expect(
      taskService.addSubtask(1, { title: 'Step' }, 99),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(mockCreateSubtask).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateSubtask
// ---------------------------------------------------------------------------

describe('taskService.updateSubtask', () => {
  it('updates a subtask when it belongs to the task', async () => {
    mockGetTaskById.mockResolvedValue(baseTaskDetail);
    mockIsProjectMember.mockResolvedValue(true);
    mockGetSubtaskById.mockResolvedValue(baseSubtask);
    mockUpdateSubtask.mockResolvedValue({ ...baseSubtask, isComplete: true });

    const result = await taskService.updateSubtask(1, 1, { isComplete: true }, 5);

    expect(result.isComplete).toBe(true);
    expect(mockUpdateSubtask).toHaveBeenCalledWith(1, { isComplete: true });
  });

  it('throws 404 when the subtask does not belong to the task', async () => {
    mockGetTaskById.mockResolvedValue(baseTaskDetail);
    mockIsProjectMember.mockResolvedValue(true);
    // Subtask belongs to a different task (taskId: 99, not 1)
    mockGetSubtaskById.mockResolvedValue({ ...baseSubtask, taskId: 99 });

    await expect(
      taskService.updateSubtask(1, 1, { isComplete: true }, 5),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });

    expect(mockUpdateSubtask).not.toHaveBeenCalled();
  });

  it('throws 404 when the subtask does not exist', async () => {
    mockGetTaskById.mockResolvedValue(baseTaskDetail);
    mockIsProjectMember.mockResolvedValue(true);
    mockGetSubtaskById.mockResolvedValue(null);

    await expect(
      taskService.updateSubtask(1, 999, { title: 'X' }, 5),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ---------------------------------------------------------------------------
// deleteSubtask
// ---------------------------------------------------------------------------

describe('taskService.deleteSubtask', () => {
  it('deletes a subtask when it belongs to the task', async () => {
    mockGetTaskById.mockResolvedValue(baseTaskDetail);
    mockIsProjectMember.mockResolvedValue(true);
    mockGetSubtaskById.mockResolvedValue(baseSubtask);
    mockDeleteSubtask.mockResolvedValue(undefined);

    await taskService.deleteSubtask(1, 1, 5);

    expect(mockDeleteSubtask).toHaveBeenCalledWith(1);
  });

  it('throws 404 when subtask does not exist', async () => {
    mockGetTaskById.mockResolvedValue(baseTaskDetail);
    mockIsProjectMember.mockResolvedValue(true);
    mockGetSubtaskById.mockResolvedValue(null);

    await expect(taskService.deleteSubtask(1, 999, 5)).rejects.toMatchObject({
      statusCode: 404,
    });

    expect(mockDeleteSubtask).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// addComment
// ---------------------------------------------------------------------------

describe('taskService.addComment', () => {
  it('adds a comment when user is a project member', async () => {
    mockGetTaskById.mockResolvedValue(baseTaskDetail);
    mockIsProjectMember.mockResolvedValue(true);
    mockCreateComment.mockResolvedValue(baseComment);

    const result = await taskService.addComment(1, 'Looks good', 5);

    expect(result).toEqual(baseComment);
    expect(mockCreateComment).toHaveBeenCalledWith(1, 5, 'Looks good');
  });

  it('throws 403 when user is not a project member', async () => {
    mockGetTaskById.mockResolvedValue(baseTaskDetail);
    mockIsProjectMember.mockResolvedValue(false);

    await expect(
      taskService.addComment(1, 'Hmm', 99),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(mockCreateComment).not.toHaveBeenCalled();
  });
});
