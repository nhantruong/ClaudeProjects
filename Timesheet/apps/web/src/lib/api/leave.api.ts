import { apiClient } from './client';
import type { LeaveType, LeaveBalance, LeaveRequest } from '@bim/shared-types';

export interface CreateLeaveInput {
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason?: string;
}

export const leaveApi = {
  getTypes: async (): Promise<LeaveType[]> => {
    const { data } = await apiClient.get('/leave/types');
    return data.data;
  },

  getBalance: async (year?: number): Promise<LeaveBalance[]> => {
    const { data } = await apiClient.get('/leave/balance', {
      params: year ? { year } : {},
    });
    return data.data;
  },

  getBalanceFor: async (employeeId: number, year?: number): Promise<LeaveBalance[]> => {
    const { data } = await apiClient.get(`/leave/balance/${employeeId}`, {
      params: year ? { year } : {},
    });
    return data.data;
  },

  listMyRequests: async (filters?: { status?: string; year?: number; page?: number }): Promise<{
    data: LeaveRequest[];
    total: number;
  }> => {
    const { data } = await apiClient.get('/leave/requests', { params: filters });
    return data;
  },

  getPending: async (): Promise<{ data: LeaveRequest[]; total: number }> => {
    const { data } = await apiClient.get('/leave/pending');
    return data;
  },

  create: async (input: CreateLeaveInput): Promise<LeaveRequest> => {
    const { data } = await apiClient.post('/leave/requests', input);
    return data.data;
  },

  cancel: async (requestId: number): Promise<void> => {
    await apiClient.patch(`/leave/requests/${requestId}/cancel`);
  },

  approve: async (requestId: number): Promise<LeaveRequest> => {
    const { data } = await apiClient.patch(`/leave/requests/${requestId}/approve`);
    return data.data;
  },

  reject: async (requestId: number, note: string): Promise<LeaveRequest> => {
    const { data } = await apiClient.patch(`/leave/requests/${requestId}/reject`, { note });
    return data.data;
  },
};
