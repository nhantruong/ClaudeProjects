import { get, post, patch, del } from '@/lib/api';
import type { Task } from '@/types';

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

// ── API functions ──────────────────────────────────────────────────────────────

export const tasksApi = {
  list: (projectId: number, params?: ListTasksParams) =>
    get<{ tasks: Task[] }>(`/projects/${projectId}/tasks`, params as Record<string, unknown>),

  create: (projectId: number, data: CreateTaskInput) =>
    post<{ task: Task }>(`/projects/${projectId}/tasks`, data),

  update: (taskId: number, data: UpdateTaskInput) =>
    patch<{ task: Task }>(`/tasks/${taskId}`, data),

  delete: (taskId: number) => del<void>(`/tasks/${taskId}`),
};
