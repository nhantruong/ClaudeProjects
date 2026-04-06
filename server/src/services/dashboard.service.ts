/**
 * dashboard.service.ts — Business logic for the dashboard summary.
 */

import * as dashboardModel from '../models/dashboard.model.js';
import type {
  DashboardProject,
  DashboardStats,
  WorkloadEntry,
  PpcTrendEntry,
  DashboardRfiStats,
} from '../models/dashboard.model.js';

export type { DashboardProject, DashboardStats, WorkloadEntry, PpcTrendEntry, DashboardRfiStats };

export interface DashboardSummary {
  projects: DashboardProject[];
  stats: DashboardStats;
  workload: WorkloadEntry[];
  ppcTrend: PpcTrendEntry[];
  rfiStats: DashboardRfiStats;
}

export async function getDashboardSummary(userId: number): Promise<DashboardSummary> {
  const [projects, stats, workload, ppcTrend, rfiStats] = await Promise.all([
    dashboardModel.getProjectSummaries(userId),
    dashboardModel.getTaskStats(userId),
    dashboardModel.getWorkload(userId),
    dashboardModel.getPpcTrend(userId),
    dashboardModel.getRfiStats(userId),
  ]);

  return { projects, stats, workload, ppcTrend, rfiStats };
}
