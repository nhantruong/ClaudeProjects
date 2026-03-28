/**
 * auth.test.ts — Unit tests for JWT signing, verification, and middleware.
 *
 * These tests exercise pure middleware logic without a database or HTTP server.
 * The SESSION_SECRET env var is stubbed to a test value.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// ---------------------------------------------------------------------------
// Stub env before importing auth (env.ts runs at import time)
// ---------------------------------------------------------------------------

vi.mock('../lib/env.js', () => ({
  env: {
    SESSION_SECRET: 'test-secret-that-is-at-least-32-characters-long',
    NODE_ENV: 'test',
  },
}));

vi.mock('../lib/logger.js', () => ({
  default: { info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Import after mocks are in place
const { signToken, authenticate, requireRole, requireAdmin, requireManager } = await import(
  './auth.js'
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    cookies: {},
    ...overrides,
  } as unknown as Request;
}

const next: NextFunction = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// signToken
// ---------------------------------------------------------------------------

describe('signToken', () => {
  it('returns a non-empty string', () => {
    const token = signToken({ userId: 1, role: 'member' });
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('produces a valid JWT (three dot-separated segments)', () => {
    const token = signToken({ userId: 42, role: 'admin' });
    expect(token.split('.')).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// authenticate middleware
// ---------------------------------------------------------------------------

describe('authenticate middleware', () => {
  it('rejects requests with no token', () => {
    const req = mockReq();
    const res = mockRes();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects requests with a malformed Bearer token', () => {
    const req = mockReq({ headers: { authorization: 'Bearer not-a-jwt' } });
    const res = mockRes();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a valid Bearer token and attaches user to req', () => {
    const token = signToken({ userId: 7, role: 'manager' });
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authReq = req as any;
    expect(authReq.user).toMatchObject({ userId: 7, role: 'manager' });
  });

  it('accepts a valid cookie token and attaches user to req', () => {
    const token = signToken({ userId: 3, role: 'admin' });
    const req = mockReq({ cookies: { token } });
    const res = mockRes();
    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authReq = req as any;
    expect(authReq.user).toMatchObject({ userId: 3, role: 'admin' });
  });

  it('prefers cookie over Authorization header when both are present', () => {
    const cookieToken = signToken({ userId: 1, role: 'admin' });
    const headerToken = signToken({ userId: 2, role: 'member' });
    const req = mockReq({
      cookies: { token: cookieToken },
      headers: { authorization: `Bearer ${headerToken}` },
    });
    const res = mockRes();
    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((req as any).user.userId).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// requireRole middleware factory
// ---------------------------------------------------------------------------

describe('requireRole', () => {
  function reqWithRole(role: string) {
    const req = mockReq();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).user = { userId: 1, role };
    return req;
  }

  it('allows matching role', () => {
    const guard = requireRole('admin');
    const req = reqWithRole('admin');
    const res = mockRes();
    guard(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows any of the listed roles', () => {
    const guard = requireRole('admin', 'manager');
    const req = reqWithRole('manager');
    const res = mockRes();
    guard(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('blocks a role that is not listed', () => {
    const guard = requireRole('admin');
    const req = reqWithRole('member');
    const res = mockRes();
    guard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks unauthenticated requests (no req.user)', () => {
    const guard = requireRole('admin');
    const req = mockReq();
    const res = mockRes();
    guard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Convenience guards
// ---------------------------------------------------------------------------

describe('requireAdmin', () => {
  it('allows admin', () => {
    const req = mockReq();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).user = { userId: 1, role: 'admin' };
    const res = mockRes();
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('blocks manager', () => {
    const req = mockReq();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).user = { userId: 1, role: 'manager' };
    const res = mockRes();
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('requireManager', () => {
  it('allows admin and manager', () => {
    for (const role of ['admin', 'manager'] as const) {
      vi.clearAllMocks();
      const req = mockReq();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).user = { userId: 1, role };
      const res = mockRes();
      requireManager(req, res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  it('blocks member', () => {
    const req = mockReq();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).user = { userId: 1, role: 'member' };
    const res = mockRes();
    requireManager(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
