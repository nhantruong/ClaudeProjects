/**
 * auth.service.ts — Business logic for authentication and password management.
 *
 * This service is the single source of truth for auth rules. Controllers call
 * it; it calls the user model. No HTTP or Express types appear here — this
 * layer must be testable and reusable without a web framework.
 *
 * Security invariants enforced here:
 *  - Identical 401 error message for "user not found" and "wrong password"
 *    so callers cannot enumerate valid usernames.
 *  - bcrypt cost factor 12 (per security requirements).
 *  - Password hash is never included in the returned SafeUser.
 */

import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/errorHandler.js';
import { signToken } from '../middleware/auth.js';
import {
  findByUsername,
  findById,
  updatePassword,
  type SafeUser,
  type User,
} from '../models/user.model.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BCRYPT_ROUNDS = 12;

/**
 * Generic credential error — same message regardless of whether the username
 * or the password was wrong. Prevents user enumeration (OWASP A07).
 */
const INVALID_CREDENTIALS_ERROR = new AppError(
  401,
  'UNAUTHENTICATED',
  'Invalid username or password',
);

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
 * login — verify credentials and issue a signed JWT.
 *
 * @returns `{ token, user }` on success. token is the raw JWT string;
 *          the controller stores it in a cookie — it never appears in the
 *          response body.
 * @throws AppError 401 if the username is not found, the account is inactive,
 *         or the password does not match (same message in all cases).
 */
export async function login(
  username: string,
  password: string,
): Promise<{ token: string; user: SafeUser }> {
  const user = await findByUsername(username);

  if (!user) {
    // Intentionally identical to the wrong-password branch — no enumeration.
    throw INVALID_CREDENTIALS_ERROR;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    throw INVALID_CREDENTIALS_ERROR;
  }

  const token = signToken({ userId: user.id, role: user.role });

  return { token, user: toSafeUser(user) };
}

/**
 * changePassword — verify the current password then replace it with a new hash.
 *
 * @throws AppError 404 if the user does not exist.
 * @throws AppError 401 if the current password is wrong.
 */
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await findById(userId);

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!passwordMatch) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Current password is incorrect');
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await updatePassword(userId, newHash);
}

/**
 * getMe — return the authenticated user's public profile.
 *
 * @throws AppError 404 if the user no longer exists (e.g. deactivated between
 *         token issuance and this request — rare but possible).
 */
export async function getMe(userId: number): Promise<SafeUser> {
  const user = await findById(userId);

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  return toSafeUser(user);
}
