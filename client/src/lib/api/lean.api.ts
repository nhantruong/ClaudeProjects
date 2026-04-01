import { get, post, patch } from '@/lib/api';
import type { Task } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface WwpSummary {
  id: number;
  projectId: number;
  weekStartDate: string;
  ppc: number | null;
  createdBy: number;
  createdAt: string;
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

export interface WwpDetail {
  id: number;
  projectId: number;
  weekStartDate: string;
  ppc: number | null;
  createdBy: number;
  createdAt: string;
  tasks: WwpTask[];
}

export interface PpcHistoryItem {
  id: number;
  weekStartDate: string;
  ppc: number;
}

export interface AddWwpTaskInput {
  description: string;
  assigneeId?: number;
  taskId?: number;
}

export interface UpdateWwpTaskInput {
  isComplete?: boolean;
  varianceReason?: string;
}

// ── API functions ──────────────────────────────────────────────────────────────

export const leanApi = {
  // ── WWP ────────────────────────────────────────────────────────────────────

  listWwps: (projectId: number) =>
    get<{ wwps: WwpSummary[] }>(`/projects/${projectId}/wwp`),

  createWwp: (projectId: number, weekStartDate: string) =>
    post<{ wwp: WwpDetail }>(`/projects/${projectId}/wwp`, { weekStartDate }),

  getWwp: (projectId: number, weekId: number) =>
    get<{ wwp: WwpDetail }>(`/projects/${projectId}/wwp/${weekId}`),

  closeWwp: (projectId: number, weekId: number) =>
    post<{ wwp: WwpDetail }>(`/projects/${projectId}/wwp/${weekId}/close`),

  // ── WWP Tasks ──────────────────────────────────────────────────────────────

  addWwpTask: (projectId: number, weekId: number, data: AddWwpTaskInput) =>
    post<{ wwpTask: WwpTask }>(`/projects/${projectId}/wwp/${weekId}/tasks`, data),

  updateWwpTask: (
    projectId: number,
    weekId: number,
    wwpTaskId: number,
    data: UpdateWwpTaskInput
  ) =>
    patch<{ wwpTask: WwpTask }>(
      `/projects/${projectId}/wwp/${weekId}/tasks/${wwpTaskId}`,
      data
    ),

  // ── PPC History ────────────────────────────────────────────────────────────

  getPpcHistory: (projectId: number) =>
    get<{ history: PpcHistoryItem[] }>(`/projects/${projectId}/ppc`),

  // ── Lookahead ──────────────────────────────────────────────────────────────

  getLookahead: (projectId: number, weeks: number = 4) =>
    get<{ tasks: Task[] }>(`/projects/${projectId}/lookahead`, {
      weeks: weeks as unknown as Record<string, unknown>,
    } as Record<string, unknown>),
};
