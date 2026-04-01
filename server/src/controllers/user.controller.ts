/**
 * user.controller.ts — Thin Express handlers for user management endpoints.
 *
 * Each handler: accepts typed input (already validated by Zod middleware),
 * delegates to the user service, and formats the HTTP response.
 *
 * No business logic lives here. Role enforcement is handled by requireAdmin
 * middleware in the router — not in these handlers.
 */

import { Response, NextFunction } from 'express';
import * as userService from '../services/user.service.js';
import { AuthRequest } from '../middleware/auth.js';

// ---------------------------------------------------------------------------
// Input types (post-Zod validation — req.body is already coerced)
// ---------------------------------------------------------------------------

interface CreateUserBody {
  username: string;
  displayName: string;
  password: string;
  role: 'admin' | 'manager' | 'member';
}

interface UpdateUserBody {
  displayName?: string;
  role?: 'admin' | 'manager' | 'member';
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/**
 * listUsers — GET /api/v1/users
 *
 * Returns all user accounts (active and inactive). Admin only.
 */
export async function listUsers(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const users = await userService.listUsers();
    res.status(200).json({ users });
  } catch (err) {
    next(err);
  }
}

/**
 * createUser — POST /api/v1/users
 *
 * Creates a new user account. Returns the new user with HTTP 201. Admin only.
 */
export async function createUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as CreateUserBody;
    const user = await userService.createUser({
      username: body.username,
      displayName: body.displayName,
      password: body.password,
      role: body.role,
    });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

/**
 * updateUser — PATCH /api/v1/users/:id
 *
 * Updates display_name, role, or is_active on an existing user. Admin only.
 * Setting isActive to false deactivates (soft-deletes) the account.
 */
export async function updateUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawId = req.params['id'];
    const id = parseInt(Array.isArray(rawId) ? rawId[0] ?? '' : (rawId ?? ''), 10);
    if (isNaN(id)) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'User id must be a valid integer' },
      });
      return;
    }

    const body = req.body as UpdateUserBody;
    const user = await userService.updateUser(id, {
      ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
      ...(body.role !== undefined ? { role: body.role } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    });
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

/**
 * getMe — GET /api/v1/users/me
 *
 * Returns the authenticated user's own profile. Available to any authenticated user.
 */
export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.getUserById(req.user!.userId);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}
