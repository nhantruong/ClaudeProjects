import { get, post, patch, del } from '@/lib/api';
import type { Task, Subtask } from '@/types';

// ── Input types ────────────────────────────────────────────────────────────────

export interface ListTasksParams {
  status?: string;
  assigneeId?: number;
  priority?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  assigneeId?: number;
  status?: string;
  priority?: string;
  startDate?: string;
  dueDate?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  assigneeId?: number | null;
  status?: string;
  priority?: string;
  startDate?: string | null;
  dueDate?: string | null;
}

export interface TaskComment {
  id: number;
  taskId: number;
  userId: number;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDetail extends Task {
  subtasks: Subtask[];
  comments: TaskComment[];
  dependsOn: number[];
  blockedBy: number[];
}

// ── API functions ──────────────────────────────────────────────────────────────

export const tasksApi = {
  list: (projectId: number, params?: ListTasksParams) =>
    get<{ tasks: Task[] }>(`/projects/${projectId}/tasks`, params as Record<string, unknown>),

  get: (taskId: number) => get<{ task: TaskDetail }>(`/tasks/${taskId}`),

  create: (projectId: number, data: CreateTaskInput) =>
    post<{ task: Task }>(`/projects/${projectId}/tasks`, data),

  update: (taskId: number, data: UpdateTaskInput) =>
    patch<{ task: Task }>(`/tasks/${taskId}`, data),

  delete: (taskId: number) => del<void>(`/tasks/${taskId}`),

  // ── Subtasks ──────────────────────────────────────────────────────────────

  addSubtask: (taskId: number, data: { title: string; sortOrder?: number }) =>
    post<{ subtask: Subtask }>(`/tasks/${taskId}/subtasks`, data),

  updateSubtask: (
    taskId: number,
    subtaskId: number,
    data: { title?: string; isComplete?: boolean; sortOrder?: number }
  ) => patch<{ subtask: Subtask }>(`/tasks/${taskId}/subtasks/${subtaskId}`, data),

  deleteSubtask: (taskId: number, subtaskId: number) =>
    del<void>(`/tasks/${taskId}/subtasks/${subtaskId}`),

  // ── Comments ──────────────────────────────────────────────────────────────

  addComment: (taskId: number, body: string) =>
    post<{ comment: TaskComment }>(`/tasks/${taskId}/comments`, { body }),

  // ── Dependencies ──────────────────────────────────────────────────────────

  addDependency: (taskId: number, dependsOnTaskId: number) =>
    post<{ message: string }>(`/tasks/${taskId}/dependencies`, { dependsOnTaskId }),

  removeDependency: (taskId: number, dependsOnId: number) =>
    del<void>(`/tasks/${taskId}/dependencies/${dependsOnId}`),
};
