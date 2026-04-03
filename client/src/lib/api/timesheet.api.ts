import { get, post, patch, del } from '@/lib/api';

export interface TimesheetEntry {
  id: number;
  userId: number;
  projectId: number;
  projectName: string;
  workTypeId: number | null;
  workTypeName: string | null;
  entryDate: string;
  hours: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklySummaryRow {
  year: number;
  week: number;
  projectId: number;
  projectName: string;
  hours: number;
}

export interface MonthlySummaryRow {
  year: number;
  month: number;
  projectId: number;
  projectName: string;
  hours: number;
}

export interface YearlySummaryRow {
  year: number;
  projectId: number;
  projectName: string;
  hours: number;
}

export interface CreateTimesheetInput {
  projectId: number;
  entryDate: string;
  hours: number;
  workTypeId?: number;
  description?: string;
}

export interface UpdateTimesheetInput {
  hours?: number;
  description?: string | null;
  workTypeId?: number | null;
  entryDate?: string;
}

export const timesheetApi = {
  listEntries: (filters?: { projectId?: number; from?: string; to?: string }) => {
    const params = new URLSearchParams();
    if (filters?.projectId !== undefined) params.set('projectId', String(filters.projectId));
    if (filters?.from !== undefined) params.set('from', filters.from);
    if (filters?.to !== undefined) params.set('to', filters.to);
    const qs = params.toString();
    return get<{ entries: TimesheetEntry[] }>(`/timesheets${qs ? `?${qs}` : ''}`);
  },

  createEntry: (data: CreateTimesheetInput) =>
    post<{ entry: TimesheetEntry }>('/timesheets', data),

  updateEntry: (id: number, data: UpdateTimesheetInput) =>
    patch<{ entry: TimesheetEntry }>(`/timesheets/${id}`, data),

  deleteEntry: (id: number) => del<void>(`/timesheets/${id}`),

  getWeeklySummary: (year: number) =>
    get<{ summary: WeeklySummaryRow[] }>(`/timesheets/summary/weekly?year=${year}`),

  getMonthlySummary: (year: number) =>
    get<{ summary: MonthlySummaryRow[] }>(`/timesheets/summary/monthly?year=${year}`),

  getYearlySummary: () =>
    get<{ summary: YearlySummaryRow[] }>('/timesheets/summary/yearly'),

  getAdminEntries: (filters?: { userId?: number; projectId?: number; from?: string; to?: string }) => {
    const params = new URLSearchParams();
    if (filters?.userId !== undefined) params.set('userId', String(filters.userId));
    if (filters?.projectId !== undefined) params.set('projectId', String(filters.projectId));
    if (filters?.from !== undefined) params.set('from', filters.from);
    if (filters?.to !== undefined) params.set('to', filters.to);
    const qs = params.toString();
    return get<{ entries: TimesheetEntry[] }>(`/timesheets/admin${qs ? `?${qs}` : ''}`);
  },
};
