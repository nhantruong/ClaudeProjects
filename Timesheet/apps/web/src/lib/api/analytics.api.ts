import { apiClient } from './client';
import type {
  DashboardSummary, OvertimeData, BudgetBurnData,
  AttendanceData, ProductivityData, AIInsight
} from '@bim/shared-types';

export const analyticsApi = {
  getDashboard: async (): Promise<DashboardSummary> => {
    const { data } = await apiClient.get('/analytics/dashboard');
    return data.data;
  },

  getOvertime: async (weeks = 4, departmentId?: number): Promise<OvertimeData[]> => {
    const { data } = await apiClient.get('/analytics/overtime', {
      params: { weeks, departmentId },
    });
    return data.data;
  },

  getBudgetBurn: async (): Promise<BudgetBurnData[]> => {
    const { data } = await apiClient.get('/analytics/budget-burn');
    return data.data;
  },

  getAttendance: async (startDate: string, endDate: string, departmentId?: number): Promise<AttendanceData[]> => {
    const { data } = await apiClient.get('/analytics/attendance', {
      params: { startDate, endDate, departmentId },
    });
    return data.data;
  },

  getProductivity: async (startDate: string, endDate: string, employeeId?: number): Promise<ProductivityData> => {
    const { data } = await apiClient.get('/analytics/productivity', {
      params: { startDate, endDate, employeeId },
    });
    return data.data;
  },
};

export const aiApi = {
  getInsights: async (insightType?: string, limit = 20): Promise<AIInsight[]> => {
    const { data } = await apiClient.get('/ai/insights', {
      params: { insightType, limit },
    });
    return data.data;
  },

  generateInsight: async (payload: {
    insightType: string;
    targetType: string;
    targetId?: number;
  }): Promise<AIInsight> => {
    const { data } = await apiClient.post('/ai/insights/generate', payload);
    return data.data;
  },

  chat: async (messages: Array<{ role: string; content: string; timestamp: string }>): Promise<string> => {
    const { data } = await apiClient.post('/ai/chat', { messages });
    return data.data.content;
  },

  markRead: async (insightId: number): Promise<void> => {
    await apiClient.patch(`/ai/insights/${insightId}/read`);
  },
};
