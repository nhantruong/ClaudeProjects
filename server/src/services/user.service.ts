/**
 * user.service.ts — Business logic for user management.
 *
 * Admin-only operations (list, create, update) are gated here.
 * The service does not interact with Express — no req/res types appear.
 * All external dependencies (model, bcrypt) are imported directly; tests
 * mock them at the module level via vi.mock().
 *
 * Security invariants enforced here:
 *  - Usernames are checked for uniqueness before INSERT (throws 409 on conflict).
 *  - Passwords are hashed with bcrypt cost factor 12 before storage.
 *  - The password hash is never returned to callers — SafeUser excludes it.
 *  - Deactivation sets is_active = 0 and retains the record (preserves history).
 */

import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/errorHandler.js';
import {
  findByUsername,
  findById,
  listUsers as modelListUsers,
  createUser as modelCreateUser,
  updateUser as modelUpdateUser,
  type SafeUser,
  type User,
} from '../models/user.model.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip the password hash from a User object before returning to callers. */
function toSafeUser(user: User): SafeUser {
  const { passwordHash: _removed, ...safe } = user;
  return safe;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * listUsers — return all user accounts (active and inactive).
 * Admin-only — callers must enforce role before calling this function.
 */
export async function listUsers(): Promise<SafeUser[]> {
  return modelListUsers();
}

/**
 * createUser — create a new user account.
 *
 * Steps:
 *  1. Verify the username is not already taken.
 *  2. Hash the plaintext password with bcrypt (cost 12).
 *  3. Persist the record via the model.
 *  4. Return the SafeUser (no hash).
 *
 * @throws AppError 409 CONFLICT if the username is already in use.
 */
export async function createUser(data: {
  username: string;
  displayName: string;
  password: string;
  role: 'admin' | 'manager' | 'member';
}): Promise<SafeUser> {
  const existing = await findByUsername(data.username);
  if (existing) {
    throw new AppError(409, 'CONFLICT', 'Username is already taken');
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  return modelCreateUser({
    username: data.username,
    passwordHash,
    displayName: data.displayName,
    role: data.role,
  });
}

/**
 * updateUser — update mutable fields on an existing user.
 *
 * Accepts any combination of: displayName, role, isActive.
 * Setting isActive to false deactivates the account (soft delete).
 *
 * @throws AppError 404 NOT_FOUND if no user with the given id exists.
 */
export async function updateUser(
  id: number,
  data: Partial<{ displayName: string; role: 'admin' | 'manager' | 'member'; isActive: boolean }>,
): Promise<SafeUser> {
  const existing = await findById(id);
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  return modelUpdateUser(id, data);
}

/**
 * getUserById — return a single user's public profile.
 *
 * @throws AppError 404 NOT_FOUND if no user with the given id exists.
 */
export async function getUserById(id: number): Promise<SafeUser> {
  const user = await findById(id);
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }
  return toSafeUser(user);
}
