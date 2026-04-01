/**
 * auth.routes.ts — Authentication route definitions.
 *
 * Route table:
 *   POST   /api/v1/auth/login     — public: validate credentials, set cookie
 *   POST   /api/v1/auth/logout    — authenticated: clear cookie
 *   GET    /api/v1/auth/me        — authenticated: return current user profile
 *   PATCH  /api/v1/auth/password  — authenticated: change password
 *
 * Per ADR-002: JWT stored in httpOnly, SameSite=Strict cookie named `token`.
 * Per FR-001, FR-004, FR-005.
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as authController from '../controllers/auth.controller.js';

// ---------------------------------------------------------------------------
// Zod validation schemas
// ---------------------------------------------------------------------------

const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters'),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

/**
 * POST /api/v1/auth/login
 * Public — no authentication required.
 * Validates body, calls login handler which sets httpOnly cookie on success.
 */
router.post('/login', validate(LoginSchema), authController.login);

/**
 * POST /api/v1/auth/logout
 * Authenticated — clears the auth cookie.
 * Returns 204.
 */
router.post('/logout', authenticate, authController.logout);

/**
 * GET /api/v1/auth/me
 * Authenticated — returns the current user's profile.
 * No request body; no additional validation needed.
 */
router.get('/me', authenticate, authController.getMe);

/**
 * PATCH /api/v1/auth/password
 * Authenticated — changes the current user's password.
 * Validates body before handler runs.
 */
router.patch('/password', authenticate, validate(ChangePasswordSchema), authController.changePassword);

export default router;
