/**
 * rfi.routes.ts — RFI route definitions.
 *
 * Route table:
 *   GET    /api/v1/projects/:projectId/rfis         — list RFIs for a project
 *   POST   /api/v1/projects/:projectId/rfis         — create new RFI
 *   GET    /api/v1/projects/:projectId/rfis/stats   — project RFI statistics
 *   GET    /api/v1/rfis/:id                         — get RFI detail
 *   PATCH  /api/v1/rfis/:id                         — update RFI
 *   DELETE /api/v1/rfis/:id                         — delete RFI
 *   POST   /api/v1/rfis/:id/comments                — add comment
 *   DELETE /api/v1/rfis/:id/comments/:commentId     — delete comment
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as rfiController from '../controllers/rfi.controller.js';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const DISCIPLINE_VALUES = [
  'Mechanical', 'Electrical', 'Plumbing', 'Fire Protection',
  'Civil / Structural', 'Architectural', 'General',
] as const;

const PRIORITY_VALUES = ['Low', 'Medium', 'High', 'Urgent'] as const;
const STATUS_VALUES = ['Open', 'Under Review', 'Responded', 'Closed'] as const;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const dateString = z.string().regex(DATE_REGEX, 'Date must be YYYY-MM-DD format');

const CreateRfiSchema = z.object({
  title:        z.string().min(1).max(300),
  discipline:   z.enum(DISCIPLINE_VALUES),
  priority:     z.enum(PRIORITY_VALUES).default('Medium'),
  submittedBy:  z.string().min(1).max(200),
  assignedTo:   z.string().max(200).nullable().optional(),
  drawingRef:   z.string().max(200).nullable().optional(),
  specRef:      z.string().max(100).nullable().optional(),
  dateSubmitted: dateString.optional(),
  requiredDate: dateString.nullable().optional(),
  description:  z.string().min(1),
});

const UpdateRfiSchema = z.object({
  title:        z.string().min(1).max(300).optional(),
  discipline:   z.enum(DISCIPLINE_VALUES).optional(),
  priority:     z.enum(PRIORITY_VALUES).optional(),
  status:       z.enum(STATUS_VALUES).optional(),
  submittedBy:  z.string().min(1).max(200).optional(),
  assignedTo:   z.string().max(200).nullable().optional(),
  drawingRef:   z.string().max(200).nullable().optional(),
  specRef:      z.string().max(100).nullable().optional(),
  requiredDate: dateString.nullable().optional(),
  responseDate: dateString.nullable().optional(),
  description:  z.string().min(1).optional(),
  response:     z.string().nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

const AddCommentSchema = z.object({
  body: z.string().min(1, 'Comment body is required'),
});

// ---------------------------------------------------------------------------
// Project-scoped router (mounted at /api/v1/projects/:projectId/rfis)
// ---------------------------------------------------------------------------

export const projectRfiRouter = Router({ mergeParams: true });

projectRfiRouter.use(authenticate);

projectRfiRouter.get('/stats', rfiController.getStats);
projectRfiRouter.get('/', rfiController.listRfis);
projectRfiRouter.post('/', validate(CreateRfiSchema), rfiController.createRfi);

// ---------------------------------------------------------------------------
// Resource router (mounted at /api/v1/rfis)
// ---------------------------------------------------------------------------

export const rfiRouter = Router();

rfiRouter.use(authenticate);

rfiRouter.get('/:id', rfiController.getRfi);
rfiRouter.patch('/:id', validate(UpdateRfiSchema), rfiController.updateRfi);
rfiRouter.delete('/:id', rfiController.deleteRfi);

rfiRouter.post('/:id/comments', validate(AddCommentSchema), rfiController.addComment);
rfiRouter.delete('/:id/comments/:commentId', rfiController.deleteComment);
