/**
 * reports.routes.ts — PDF report generation endpoints.
 *
 * Three routers exported:
 *   reportsRouter       — mounted at /reports            → GET /timesheet
 *   projectReportsRouter — mounted at /projects/:projectId → GET /reports/rfi
 *   rfiReportRouter     — mounted at /rfis               → GET /:id/report
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as reportsController from '../controllers/reports.controller.js';

// ── /reports ──────────────────────────────────────────────────────────────────
const reportsRouter = Router();

/** Timesheet report — scoped to authenticated user (or all users for admin/manager) */
reportsRouter.get('/timesheet', authenticate, reportsController.timesheetReport);

// ── /projects/:projectId ──────────────────────────────────────────────────────
// mergeParams: true so that req.params.projectId is accessible in the controller
const projectReportsRouter = Router({ mergeParams: true });

/** RFI summary PDF for a specific project */
projectReportsRouter.get('/reports/rfi', authenticate, reportsController.rfiSummaryReport);

// ── /rfis ─────────────────────────────────────────────────────────────────────
const rfiReportRouter = Router({ mergeParams: true });

/** Single RFI detail PDF */
rfiReportRouter.get('/:id/report', authenticate, reportsController.rfiDetailReport);

export { reportsRouter, projectReportsRouter, rfiReportRouter };
