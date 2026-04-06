/**
 * projects.routes.ts — Project management route definitions.
 *
 * Route table:
 *   GET    /api/v1/projects                     — authenticated: list user's projects (FR-013)
 *   POST   /api/v1/projects                     — manager/admin: create a project (FR-020)
 *   GET    /api/v1/projects/:id                 — authenticated member: get project detail (FR-020)
 *   PATCH  /api/v1/projects/:id                 — manager/admin: update a project (FR-022)
 *   DELETE /api/v1/projects/:id                 — admin: delete a project
 *   POST   /api/v1/projects/:id/members         — manager/admin: assign a user (FR-012)
 *   DELETE /api/v1/projects/:id/members/:userId — manager/admin: remove a user
 *   GET    /api/v1/projects/:id/members         — authenticated member: list members
 *
 * Per FR-021: domain validated as electromechanical | bim | software | other
 * Per FR-023: status validated as planning | active | on_hold | completed | cancelled
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin, requireManager } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as projectController from '../controllers/project.controller.js';

// ---------------------------------------------------------------------------
// Zod validation schemas
// ---------------------------------------------------------------------------

const DOMAIN_VALUES = ['electromechanical', 'bim', 'software', 'other'] as const;
const STATUS_VALUES = ['planning', 'active', 'on_hold', 'completed', 'cancelled'] as const;
const MEMBER_ROLE_VALUES = ['manager', 'member'] as const;

const CreateProjectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200, 'Name must not exceed 200 characters'),
  description: z.string().optional(),
  domain: z.enum(DOMAIN_VALUES, {
    errorMap: () => ({ message: `Domain must be one of: ${DOMAIN_VALUES.join(', ')}` }),
  }),
  status: z.enum(STATUS_VALUES, {
    errorMap: () => ({ message: `Status must be one of: ${STATUS_VALUES.join(', ')}` }),
  }).default('planning'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be a date in YYYY-MM-DD format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be a date in YYYY-MM-DD format').optional(),
});

const UpdateProjectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200, 'Name must not exceed 200 characters').optional(),
  description: z.string().nullable().optional(),
  domain: z.enum(DOMAIN_VALUES, {
    errorMap: () => ({ message: `Domain must be one of: ${DOMAIN_VALUES.join(', ')}` }),
  }).optional(),
  status: z.enum(STATUS_VALUES, {
    errorMap: () => ({ message: `Status must be one of: ${STATUS_VALUES.join(', ')}` }),
  }).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be a date in YYYY-MM-DD format').nullable().optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be a date in YYYY-MM-DD format').nullable().optional(),
  coverImageUrl: z.string().max(500).nullable().optional(),
});

const AddMemberSchema = z.object({
  userId: z.number({ invalid_type_error: 'userId must be a number', required_error: 'userId is required' }).int().positive('userId must be a positive integer'),
  role: z.enum(MEMBER_ROLE_VALUES, {
    errorMap: () => ({ message: `Role must be one of: ${MEMBER_ROLE_VALUES.join(', ')}` }),
  }).default('member'),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

/**
 * GET /api/v1/projects
 * Authenticated — returns all non-cancelled projects the user is a member of.
 */
router.get('/', authenticate, projectController.listProjects);

/**
 * POST /api/v1/projects
 * Manager/Admin — creates a new project; creator is auto-added as manager.
 */
router.post(
  '/',
  authenticate,
  requireManager,
  validate(CreateProjectSchema),
  projectController.createProject,
);

/**
 * GET /api/v1/projects/:id
 * Authenticated — returns project detail + member list. 403 if not a member.
 */
router.get('/:id', authenticate, projectController.getProject);

/**
 * PATCH /api/v1/projects/:id
 * Manager/Admin — applies partial updates to a project.
 */
router.patch(
  '/:id',
  authenticate,
  requireManager,
  validate(UpdateProjectSchema),
  projectController.updateProject,
);

/**
 * DELETE /api/v1/projects/:id
 * Admin only — permanently deletes a project and its cascaded members.
 */
router.delete('/:id', authenticate, requireAdmin, projectController.deleteProject);

/**
 * POST /api/v1/projects/:id/members
 * Manager/Admin — assigns a user to the project with a role.
 */
router.post(
  '/:id/members',
  authenticate,
  requireManager,
  validate(AddMemberSchema),
  projectController.addMember,
);

/**
 * DELETE /api/v1/projects/:id/members/:userId
 * Manager/Admin — removes a user from the project.
 */
router.delete(
  '/:id/members/:userId',
  authenticate,
  requireManager,
  projectController.removeMember,
);

/**
 * GET /api/v1/projects/:id/members
 * Authenticated member — lists all members of a project.
 */
router.get('/:id/members', authenticate, projectController.listMembers);

export default router;
