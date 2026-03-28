/**
 * errorHandler.test.ts — Unit tests for AppError and error formatting.
 *
 * These tests exercise the pure logic in errorHandler.ts without an HTTP
 * server or database connection.
 */

import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import {
  AppError,
  notFoundError,
  conflictError,
  forbiddenError,
  notFound,
  errorHandler,
} from './errorHandler.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    path: '/test',
    ...overrides,
  } as Request;
}

const next: NextFunction = vi.fn();

// ---------------------------------------------------------------------------
// AppError
// ---------------------------------------------------------------------------

describe('AppError', () => {
  it('stores statusCode, code, and message', () => {
    const err = new AppError(404, 'NOT_FOUND', 'Project not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Project not found');
    expect(err.name).toBe('AppError');
  });

  it('stores optional details', () => {
    const details = { field: 'id', issue: 'must be a number' };
    const err = new AppError(400, 'VALIDATION_ERROR', 'Bad request', details);
    expect(err.details).toEqual(details);
  });

  it('is an instance of Error', () => {
    const err = new AppError(500, 'INTERNAL_ERROR', 'oops');
    expect(err).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

describe('notFoundError', () => {
  it('creates a 404 AppError', () => {
    const err = notFoundError('Task');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Task not found');
  });
});

describe('conflictError', () => {
  it('creates a 409 AppError', () => {
    const err = conflictError('Username already exists');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });
});

describe('forbiddenError', () => {
  it('creates a 403 AppError with default message', () => {
    const err = forbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('accepts a custom message', () => {
    const err = forbiddenError('Admin only');
    expect(err.message).toBe('Admin only');
  });
});

// ---------------------------------------------------------------------------
// notFound middleware
// ---------------------------------------------------------------------------

describe('notFound middleware', () => {
  it('responds 404 with NOT_FOUND code', () => {
    const req = mockReq({ method: 'DELETE', path: '/api/v1/nonexistent' });
    const res = mockRes();
    notFound(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'NOT_FOUND' }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// errorHandler middleware
// ---------------------------------------------------------------------------

describe('errorHandler middleware', () => {
  it('handles AppError and uses its statusCode and code', () => {
    const err = new AppError(403, 'UNAUTHORIZED', 'Forbidden');
    const req = mockReq();
    const res = mockRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'UNAUTHORIZED', message: 'Forbidden' },
    });
  });

  it('handles ZodError with 422 and field details', () => {
    const schema = z.object({ name: z.string() });
    const result = schema.safeParse({ name: 123 });
    if (result.success) throw new Error('Expected parse failure');
    const req = mockReq();
    const res = mockRes();
    errorHandler(result.error, req, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      error: { code: string; details: unknown[] };
    };
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.error.details)).toBe(true);
  });

  it('handles unknown errors with 500', () => {
    const err = new Error('Something exploded');
    const req = mockReq();
    const res = mockRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: expect.any(String) },
    });
  });

  it('does not leak error message for unknown errors', () => {
    const err = new Error('db password is hunter2');
    const req = mockReq();
    const res = mockRes();
    errorHandler(err, req, res, next);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      error: { message: string };
    };
    expect(body.error.message).not.toContain('hunter2');
  });
});
