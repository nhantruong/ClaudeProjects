/**
 * rfi.controller.ts — Thin Express handlers for RFI endpoints.
 *
 * Each handler: reads typed/validated input, delegates to rfi.service,
 * and formats the HTTP response. No business logic lives here.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import * as rfiService from '../services/rfi.service.js';

function parseId(value: string | string[] | undefined): number {
  return parseInt(Array.isArray(value) ? (value[0] ?? '') : (value ?? ''), 10);
}

// ---------------------------------------------------------------------------
// RFI handlers
// ---------------------------------------------------------------------------

/** GET /api/v1/projects/:projectId/rfis */
export async function listRfis(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = parseId(req.params['projectId']);
    const filters: Parameters<typeof rfiService.listRfis>[2] = {};
    if (req.query['status'])     filters.status     = req.query['status'] as string;
    if (req.query['discipline']) filters.discipline = req.query['discipline'] as string;
    if (req.query['priority'])   filters.priority   = req.query['priority'] as string;

    const rfis = await rfiService.listRfis(projectId, req.user!.userId, filters);
    res.status(200).json({ rfis });
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/projects/:projectId/rfis */
export async function createRfi(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = parseId(req.params['projectId']);
    const rfi = await rfiService.createRfi(projectId, req.user!.userId, req.body as Parameters<typeof rfiService.createRfi>[2]);
    res.status(201).json({ rfi });
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/rfis/:id */
export async function getRfi(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rfiId = parseId(req.params['id']);
    const rfi = await rfiService.getRfi(rfiId, req.user!.userId);
    res.status(200).json({ rfi });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/v1/rfis/:id */
export async function updateRfi(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rfiId = parseId(req.params['id']);
    const rfi = await rfiService.updateRfi(rfiId, req.user!.userId, req.body as Parameters<typeof rfiService.updateRfi>[2]);
    res.status(200).json({ rfi });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/v1/rfis/:id */
export async function deleteRfi(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rfiId = parseId(req.params['id']);
    await rfiService.deleteRfi(rfiId, req.user!.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/rfis/:id/comments */
export async function addComment(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rfiId = parseId(req.params['id']);
    const { body } = req.body as { body: string };
    const comment = await rfiService.addComment(rfiId, req.user!.userId, body);
    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/v1/rfis/:id/comments/:commentId */
export async function deleteComment(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rfiId      = parseId(req.params['id']);
    const commentId  = parseId(req.params['commentId']);
    await rfiService.deleteComment(commentId, rfiId, req.user!.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/projects/:projectId/rfis/stats */
export async function getStats(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = parseId(req.params['projectId']);
    const stats = await rfiService.getProjectStats(projectId, req.user!.userId);
    res.status(200).json({ stats });
  } catch (err) {
    next(err);
  }
}
