/**
 * dashboard.service.ts — Business logic for the dashboard summary.
 *
 * Orchestrates four parallel model queries and assembles the response shape
 * that the dashboard controller returns directly. No HTTP or Express types
 * appear here — this layer is testable without a web framework.
 *
 * All data is scoped to the authenticated user's projects by passing userId
 * down to each model function.
 */

import * as dashboardModel from '../models/dashboard.model.js';
import type {
  DashboardProject,
  DashboardStats,
  WorkloadEntry,
  PpcTrendEntry,
} from '../models/dashboard.model.js';

// Re-export types so the controller does not need to import from the model
export type { DashboardProject, DashboardStats, WorkloadEntry, PpcTrendEntry };

// ---------------------------------------------------------------------------
// Response shape
// ---------------------------------------------------------------------------

export interface DashboardSummary {
  projects: DashboardProject[];
  stats: DashboardStats;
  workload: WorkloadEntry[];
  ppcTrend: PpcTrendEntry[];
}

// ---------------------------------------------------------------------------
// Service function
// ---------------------------------------------------------------------------

/**
 * getDashboardSummary — fetches all dashboard data in parallel for the given
 * user. Executes four independent queries concurrently via Promise.all to
 * keep total response time well under 500ms.
 *
 * No additional access checks are needed: all four model queries already
 * scope results to projects the user is a member of.
 */
export async function getDashboardSummary(userId: number): Promise<DashboardSummary> {
  const [projects, stats, workload, ppcTrend] = await Promise.all([
    dashboardModel.getProjectSummaries(userId),
    dashboardModel.getTaskStats(userId),
    dashboardModel.getWorkload(userId),
    dashboardModel.getPpcTrend(userId),
  ]);

  return { projects, stats, workload, ppcTrend };
}
