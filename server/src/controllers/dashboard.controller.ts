/**
 * dashboard.controller.ts — Thin Express handler for the dashboard endpoint.
 *
 * Reads the authenticated user id from req.user (set by authenticate middleware),
 * delegates to the dashboard service, and returns the JSON response.
 *
 * No business logic lives here. This layer's only job is to translate between
 * HTTP (req/res) and the service layer.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import * as dashboardService from '../services/dashboard.service.js';

/**
 * getDashboard — GET /api/v1/dashboard
 *
 * Returns a single JSON object with all data needed to render the dashboard:
 *   - projects: active project summary cards
 *   - stats: due_today, overdue, completed_this_week counts
 *   - workload: tasks per assignee across the user's projects
 *   - ppc_trend: last 8 weeks of PPC data across all user projects
 */
export async function getDashboard(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const summary = await dashboardService.getDashboardSummary(req.user!.userId);

    res.status(200).json({
      projects: summary.projects,
      stats: {
        dueToday: summary.stats.dueToday,
        overdue: summary.stats.overdue,
        completedThisWeek: summary.stats.completedThisWeek,
      },
      workload: summary.workload,
      ppcTrend: summary.ppcTrend,
      rfiStats: summary.rfiStats,
    });
  } catch (err) {
    next(err);
  }
}
