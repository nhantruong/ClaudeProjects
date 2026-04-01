/**
 * users.routes.ts — User management routes.
 *
 * Route table:
 *   GET    /api/v1/users/me   — any authenticated user → getMe
 *   GET    /api/v1/users      — admin only → listUsers
 *   POST   /api/v1/users      — admin only → createUser
 *   PATCH  /api/v1/users/:id  — admin only → updateUser
 *
 * Middleware order per ARCHITECTURE.md:
 *   authenticate → (requireAdmin) → validate → handler
 *
 * Note: GET /users/me is registered BEFORE GET /users/:id (if added in future)
 * to ensure the literal string "me" is matched before the :id param.
 */

import { Router } from 'express';
import { z } from 'zod';

import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  listUsers,
  createUser,
  updateUser,
  getMe,
} from '../controllers/user.controller.js';

const router = Router();

// ---------------------------------------------------------------------------
// Zod validation schemas
// ---------------------------------------------------------------------------

const CreateUserSchema = z.object({
  username: z.string().min(2).max(100),
  displayName: z.string().min(2).max(150),
  password: z.string().min(8),
  role: z.enum(['admin', 'manager', 'member']).default('member'),
});

const UpdateUserSchema = z
  .object({
    displayName: z.string().min(2).max(150).optional(),
    role: z.enum(['admin', 'manager', 'member']).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.displayName !== undefined || data.role !== undefined || data.isActive !== undefined,
    { message: 'At least one field (displayName, role, isActive) must be provided' },
  );

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/users/me — authenticated user's own profile.
 * Registered before /:id routes to prevent "me" being treated as a numeric id.
 */
router.get('/me', authenticate, getMe);

/** GET /api/v1/users — list all users. Admin only. */
router.get('/', authenticate, requireAdmin, listUsers);

/** POST /api/v1/users — create a user account. Admin only. */
router.post('/', authenticate, requireAdmin, validate(CreateUserSchema), createUser);

/** PATCH /api/v1/users/:id — update a user account. Admin only. */
router.patch('/:id', authenticate, requireAdmin, validate(UpdateUserSchema), updateUser);

export default router;
