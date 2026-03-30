/**
 * dashboard.routes.ts — Dashboard route definitions.
 *
 * Route table:
 *   GET /api/v1/dashboard — dashboard summary: active project cards, task stats
 *                           (due today, overdue, completed this week),
 *                           team workload, PPC trend (FR-070 – FR-073)
 *
 * Authentication is applied at the app.ts mount point:
 *   app.use('/api/v1/dashboard', authenticate, dashboardRouter);
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as dashboardController from '../controllers/dashboard.controller.js';

const router = Router();

/**
 * GET /api/v1/dashboard
 * Authenticated — returns all data needed to render the dashboard in one request.
 */
router.get('/', authenticate, dashboardController.getDashboard);

export default router;
