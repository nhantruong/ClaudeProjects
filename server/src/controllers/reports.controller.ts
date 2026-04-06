/**
 * reports.controller.ts — HTTP handlers for PDF report generation.
 *
 * Three endpoints:
 *   GET /reports/timesheet            — timesheet PDF (scoped by role)
 *   GET /projects/:projectId/reports/rfi — RFI summary PDF for a project
 *   GET /rfis/:id/report              — single RFI detail PDF
 */
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import * as reportsModel from '../models/reports.model.js';
import * as rfiModel from '../models/rfi.model.js';
import * as projectModel from '../models/project.model.js';
import { generateTimesheetPdf } from '../lib/pdf/timesheet.pdf.js';
import { generateRfiSummaryPdf } from '../lib/pdf/rfi-summary.pdf.js';
import { generateRfiDetailPdf } from '../lib/pdf/rfi-detail.pdf.js';
import { AppError } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// Timesheet report
// ---------------------------------------------------------------------------

/**
 * GET /reports/timesheet?from=&to=&userId=&projectId=
 *
 * Admin/Manager — can pass any userId; defaults to all users.
 * Member — always filtered to own data regardless of userId param.
 */
export async function timesheetReport(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const { from, to, projectId } = req.query as Record<string, string | undefined>;
    const requestedUserId = req.query['userId'] ? Number(req.query['userId']) : undefined;
    const isAdminOrManager = req.user.role === 'admin' || req.user.role === 'manager';

    // Non-admins/managers can only export their own data
    const filterUserId = isAdminOrManager ? requestedUserId : req.user.userId;

    const reportFilters: { userId?: number; projectId?: number; from?: string; to?: string } = {};
    if (filterUserId !== undefined) reportFilters.userId = filterUserId;
    if (projectId !== undefined) reportFilters.projectId = Number(projectId);
    if (from !== undefined) reportFilters.from = from;
    if (to !== undefined) reportFilters.to = to;

    const entries = await reportsModel.getTimesheetReportData(reportFilters);

    const meta: { from?: string; to?: string; memberName?: string; projectName?: string } = {};
    if (from !== undefined) meta.from = from;
    if (to !== undefined) meta.to = to;
    if (entries.length > 0 && filterUserId !== undefined) {
      meta.memberName = entries[0]!.displayName;
    }
    if (entries.length > 0 && projectId !== undefined) {
      meta.projectName = entries[0]!.projectName;
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="timesheet-report-${dateStr}.pdf"`,
    );
    generateTimesheetPdf(entries, meta, res);
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// RFI summary report
// ---------------------------------------------------------------------------

/**
 * GET /projects/:projectId/reports/rfi
 *
 * Returns all RFIs for the project as a summary PDF.
 * Auth: project members only.
 */
export async function rfiSummaryReport(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const projectId = Number(req.params['projectId']);
    if (isNaN(projectId)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid project id');
    }

    const project = await projectModel.getProjectById(projectId);
    if (!project) {
      throw new AppError(404, 'NOT_FOUND', 'Project not found');
    }

    // Verify the requesting user is a member of the project
    const isMember = await projectModel.isProjectMember(projectId, req.user.userId);
    if (!isMember) {
      throw new AppError(403, 'UNAUTHORIZED', 'You are not a member of this project');
    }

    const rfis = await rfiModel.findAllByProject(projectId, {});

    const dateStr = new Date().toISOString().slice(0, 10);
    const safeName = project.name.replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="rfi-summary-${safeName}-${dateStr}.pdf"`,
    );
    generateRfiSummaryPdf(rfis, { projectName: project.name }, res);
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// RFI detail report
// ---------------------------------------------------------------------------

/**
 * GET /rfis/:id/report
 *
 * Returns a single RFI as a detailed PDF including images and comments.
 * Auth: project members only.
 */
export async function rfiDetailReport(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const rfiId = Number(req.params['id']);
    if (isNaN(rfiId)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid RFI id');
    }

    const rfi = await rfiModel.findById(rfiId);
    if (!rfi) {
      throw new AppError(404, 'NOT_FOUND', 'RFI not found');
    }

    // Verify the requesting user is a member of the RFI's project
    const isMember = await projectModel.isProjectMember(rfi.projectId, req.user.userId);
    if (!isMember) {
      throw new AppError(403, 'UNAUTHORIZED', 'You are not a member of this project');
    }

    const project = await projectModel.getProjectById(rfi.projectId);
    const projectName = project?.name ?? `Project #${rfi.projectId}`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${rfi.rfiNumber}.pdf"`,
    );
    generateRfiDetailPdf(rfi, { projectName }, res);
  } catch (err) {
    next(err);
  }
}
