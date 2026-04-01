import { get } from '@/lib/api';

// ── Dashboard API types ────────────────────────────────────────────────────────

export interface ProjectSummary {
  id: number;
  name: string;
  domain: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  taskCount: number;
  memberCount: number;
}

export interface DashboardData {
  projects: ProjectSummary[];
  stats: {
    dueToday: number;
    overdue: number;
    completedThisWeek: number;
  };
  workload: Array<{
    userId: number;
    displayName: string;
    taskCount: number;
    overdueCount: number;
  }>;
  ppcTrend: Array<{
    weekStartDate: string;
    ppc: number | null;
  }>;
}

// ── Dashboard API ──────────────────────────────────────────────────────────────

export const dashboardApi = {
  getSummary: () => get<DashboardData>('/dashboard'),
};
