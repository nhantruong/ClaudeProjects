import { apiClient } from './client';
import type { TimesheetEntry, TaskLog, TaskLogInput, WeekSummary, ClockInInput, ClockOutInput } from '@bim/shared-types';

export const timesheetApi = {
  getToday: async (): Promise<TimesheetEntry | null> => {
    const { data } = await apiClient.get('/timesheet/me/today');
    return data.data;
  },

  getWeek: async (weekStart?: string): Promise<WeekSummary> => {
    const { data } = await apiClient.get('/timesheet/me', {
      params: weekStart ? { weekStart } : {},
    });
    return data.data;
  },

  clockIn: async (input: ClockInInput = {}): Promise<TimesheetEntry> => {
    const { data } = await apiClient.post('/timesheet/clock-in', input);
    return data.data;
  },

  clockOut: async (input: ClockOutInput = {}): Promise<TimesheetEntry> => {
    const { data } = await apiClient.patch('/timesheet/clock-out', input);
    return data.data;
  },

  submitWeek: async (weekStart: string): Promise<{ updated: number }> => {
    const { data } = await apiClient.post('/timesheet/submit-week', { weekStart });
    return data.data;
  },

  getPending: async (): Promise<TimesheetEntry[]> => {
    const { data } = await apiClient.get('/timesheet/pending');
    return data.data;
  },

  approve: async (entryId: number): Promise<void> => {
    await apiClient.patch(`/timesheet/${entryId}/approve`);
  },

  reject: async (entryId: number, note: string): Promise<void> => {
    await apiClient.patch(`/timesheet/${entryId}/reject`, { note });
  },
};

export const taskLogApi = {
  list: async (date: string): Promise<TaskLog[]> => {
    const { data } = await apiClient.get('/timesheet/tasks', { params: { date } });
    return data.data;
  },

  create: async (input: TaskLogInput): Promise<TaskLog> => {
    const { data } = await apiClient.post('/timesheet/tasks', input);
    return data.data;
  },

  update: async (logId: number, input: Partial<TaskLogInput>): Promise<TaskLog> => {
    const { data } = await apiClient.patch(`/timesheet/tasks/${logId}`, input);
    return data.data;
  },

  delete: async (logId: number): Promise<void> => {
    await apiClient.delete(`/timesheet/tasks/${logId}`);
  },
};
