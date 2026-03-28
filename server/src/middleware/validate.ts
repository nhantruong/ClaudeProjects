/**
 * validate.ts — Zod request body validation middleware factory.
 *
 * Usage:
 *   import { validate } from '../middleware/validate.js';
 *   import { z } from 'zod';
 *
 *   const createProjectSchema = z.object({
 *     name: z.string().min(1).max(200),
 *     domain: z.enum(['electromechanical', 'bim', 'software', 'other']),
 *   });
 *
 *   router.post('/projects', authenticate, validate(createProjectSchema), createProject);
 *
 * On validation failure: responds 422 VALIDATION_ERROR with field-level details.
 * On success: replaces req.body with the parsed (and coerced) Zod output,
 * then calls next().
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * validate — creates an Express middleware that validates req.body against
 * the provided Zod schema.
 *
 * The parsed output replaces req.body so downstream handlers receive
 * typed, coerced data — never raw user input.
 */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const formatted = formatZodError(result.error);
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: formatted,
        },
      });
      return;
    }

    // Replace req.body with the typed, coerced output
    req.body = result.data;
    next();
  };
}

/**
 * formatZodError — converts a ZodError into an array of field-level messages
 * that are safe to return in an API response.
 */
function formatZodError(error: ZodError): Array<{ field: string; message: string }> {
  return error.errors.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
}
