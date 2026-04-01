/**
 * errorHandler.ts — Global error handling middleware and AppError class.
 *
 * Error classification (in order of precedence):
 *   1. AppError — known domain/application errors → 4xx with structured body
 *   2. ZodError — validation failures → 422 VALIDATION_ERROR with field details
 *   3. Unknown errors — unexpected infrastructure failures → 500 INTERNAL_ERROR
 *
 * SECURITY: Stack traces, file paths, and internal variable names are NEVER
 * returned in API responses. They are logged server-side only.
 *
 * Middleware order in app.ts:
 *   ... routes ...
 *   app.use(notFound);       // 404 for unmatched routes
 *   app.use(errorHandler);   // must be last — four-argument signature
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../lib/logger.js';

// ---------------------------------------------------------------------------
// AppError — thrown by services and controllers for expected error conditions
// ---------------------------------------------------------------------------

/**
 * AppError — represents a known, expected error in the application domain.
 *
 * @example
 *   throw new AppError(404, 'NOT_FOUND', 'Project not found');
 *   throw new AppError(409, 'CONFLICT', 'Username already exists');
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    // Maintains proper stack trace in V8
    Error.captureStackTrace(this, this.constructor);
  }
}

// ---------------------------------------------------------------------------
// Convenience factory functions for common error types
// ---------------------------------------------------------------------------

export const notFoundError = (resource: string) =>
  new AppError(404, 'NOT_FOUND', `${resource} not found`);

export const conflictError = (message: string) =>
  new AppError(409, 'CONFLICT', message);

export const forbiddenError = (message = 'You do not have permission to perform this action') =>
  new AppError(403, 'UNAUTHORIZED', message);

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * notFound — catches requests to undefined routes and returns 404.
 * Mount after all route definitions, before errorHandler.
 */
export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}

/**
 * errorHandler — global error-handling middleware.
 * Must be the last middleware registered — Express identifies error handlers
 * by the four-argument signature (err, req, res, next).
 *
 * Never throws. Always sends a response.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  // 1. Known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  // 2. Zod validation errors (when thrown directly, not via validate middleware)
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.errors.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      },
    });
    return;
  }

  // 3. Unexpected errors — log everything, return nothing sensitive
  logger.error('Unhandled error', {
    method: req.method,
    path: req.path,
    err,
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
    },
  });
}
