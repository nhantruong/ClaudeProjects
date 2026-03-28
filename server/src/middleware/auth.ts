/**
 * auth.ts — JWT authentication middleware and token helpers.
 *
 * Per ADR-002: tokens are signed JWTs stored in an httpOnly, SameSite=Strict
 * cookie named `token`. The Authorization: Bearer header is also accepted to
 * support programmatic API clients and future mobile apps.
 *
 * Token payload: { userId, role, iat, exp }
 * Expiry: 30 days
 * Signed with: SESSION_SECRET (min 32 chars, enforced in env.ts)
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../lib/env.js';
import logger from '../lib/logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserRole = 'admin' | 'manager' | 'member';

export interface JwtPayload {
  userId: number;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/** Extends Express Request with the authenticated user from the JWT. */
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

const TOKEN_EXPIRY = '30d';

/**
 * signToken — creates a signed JWT for the given payload.
 * Used by the auth service after successful login.
 */
export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  // jwt.sign accepts ExpiresIn as any in older type definitions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, env.SESSION_SECRET, { expiresIn: TOKEN_EXPIRY as any });
}

/**
 * verifyToken — verifies and decodes a JWT string.
 * Returns null if the token is invalid or expired.
 */
function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, env.SESSION_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * authenticate — validates the JWT from cookie or Authorization header.
 *
 * Priority order:
 *   1. httpOnly cookie named `token` (browser clients — preferred, XSS-safe)
 *   2. Authorization: Bearer <token> header (API clients)
 *
 * On success: attaches `req.user` and calls next().
 * On failure: responds 401 UNAUTHENTICATED — no next() call.
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  // 1. Try cookie first (browser clients)
  const cookieToken = (req.cookies as Record<string, string | undefined>)['token'];

  // 2. Fall back to Authorization header (API clients)
  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  const rawToken = cookieToken ?? bearerToken;

  if (!rawToken) {
    res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Authentication required' },
    });
    return;
  }

  const payload = verifyToken(rawToken);
  if (!payload) {
    logger.debug('Invalid or expired JWT rejected');
    res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Invalid or expired session — please log in again' },
    });
    return;
  }

  req.user = payload;
  next();
}

/**
 * requireRole — middleware factory that enforces role-based access control.
 *
 * Must be applied after authenticate() — relies on req.user being set.
 *
 * @param roles - One or more roles that are allowed to proceed.
 *
 * @example
 *   router.post('/users', authenticate, requireRole('admin'), createUser);
 */
export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      // authenticate() was not applied upstream — defensive guard
      res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Authentication required' },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.debug('Access denied — insufficient role', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: roles,
      });
      res.status(403).json({
        error: { code: 'UNAUTHORIZED', message: 'You do not have permission to perform this action' },
      });
      return;
    }

    next();
  };
}

/** Shorthand guard: admin only. */
export const requireAdmin = requireRole('admin');

/** Shorthand guard: admin or manager. */
export const requireManager = requireRole('admin', 'manager');
