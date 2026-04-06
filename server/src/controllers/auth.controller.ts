/**
 * auth.controller.ts — Thin Express handlers for authentication endpoints.
 *
 * Each handler: validates typed input (already parsed by validate middleware),
 * delegates to the auth service, and formats the HTTP response.
 *
 * No business logic lives here. This layer's only job is to translate between
 * HTTP (req/res) and the service layer.
 *
 * Cookie spec (ADR-002):
 *   name: 'token'
 *   httpOnly: true         — not accessible via JS (XSS-safe)
 *   sameSite: 'strict'     — CSRF protection
 *   secure: true in prod   — HTTPS only in production
 *   maxAge: 30 days
 */

import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';
import { AuthRequest } from '../middleware/auth.js';

// ---------------------------------------------------------------------------
// Cookie configuration
// ---------------------------------------------------------------------------

const COOKIE_NAME = 'token';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function cookieOptions(req: Request) {
  // Use secure flag only when the request itself arrived over HTTPS.
  // Basing this on req.secure (or x-forwarded-proto) rather than NODE_ENV
  // means the cookie works correctly on HTTP deployments while automatically
  // upgrading to secure-only once a TLS certificate is installed.
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: isHttps,
    maxAge: THIRTY_DAYS_MS,
  };
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/**
 * login — POST /api/v1/auth/login
 *
 * Validates credentials, issues a JWT in an httpOnly cookie, and returns
 * the safe user object in the response body. The token itself is NOT returned
 * in the body — it lives in the cookie only.
 */
export async function login(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, password } = req.body as { username: string; password: string };
    const { token, user } = await authService.login(username, password);

    res.cookie(COOKIE_NAME, token, cookieOptions(req));

    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

/**
 * logout — POST /api/v1/auth/logout
 *
 * Clears the auth cookie. Because the JWT is stateless, there is no server-
 * side invalidation — clearing the cookie is sufficient for standard clients.
 * Returns 204 No Content.
 */
export function logout(req: AuthRequest, res: Response): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'strict',
    secure: isHttps,
  });

  res.status(204).send();
}

/**
 * getMe — GET /api/v1/auth/me
 *
 * Returns the authenticated user's profile. Requires authenticate middleware
 * upstream — req.user is guaranteed to be set.
 */
export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    // req.user is set by authenticate middleware — non-null here
    const user = await authService.getMe(req.user!.userId);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

/**
 * changePassword — PATCH /api/v1/auth/password
 *
 * Changes the authenticated user's password. Returns 204 No Content on success.
 * Requires authenticate middleware upstream.
 */
export async function changePassword(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };

    await authService.changePassword(req.user!.userId, currentPassword, newPassword);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
