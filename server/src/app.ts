/**
 * app.ts — Express application factory.
 *
 * Creates and configures the Express application with the full middleware
 * stack. This function is separate from server.ts so the app can be imported
 * in tests without starting an HTTP server.
 *
 * Middleware stack order (per ARCHITECTURE.md):
 *   helmet → cors → cookie-parser → morgan → express.json → rate-limit
 *   → routes → notFound → errorHandler
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './lib/env.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

// Route stubs
import authRouter from './routes/auth.routes.js';
import usersRouter from './routes/users.routes.js';
import projectsRouter from './routes/projects.routes.js';
import tasksRouter from './routes/tasks.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';
import advisorRouter from './routes/advisor.routes.js';
import leanRouter from './routes/lean.routes.js';

export function createApp(): express.Application {
  const app = express();

  // ── Security headers ────────────────────────────────────────────────────
  app.use(
    helmet({
      // CSP is set to false here — the frontend is a separate origin served
      // by Vite. Revisit if the frontend is ever co-hosted with the API.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ── CORS ────────────────────────────────────────────────────────────────
  // Restricts cross-origin requests to the configured frontend URL only.
  // credentials: true is required for cookies (JWT in httpOnly cookie, ADR-002).
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );

  // ── Cookie parser ────────────────────────────────────────────────────────
  // Required to read the httpOnly `token` cookie in auth middleware (ADR-002).
  app.use(cookieParser());

  // ── Request logging ──────────────────────────────────────────────────────
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // ── Body parsing ─────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Global rate limiting ─────────────────────────────────────────────────
  // 100 requests per 15 minutes per IP. Stricter limits are applied per-route
  // on auth endpoints (login, password change) in their respective routers.
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests — please try again later',
        },
      },
    }),
  );

  // ── Health check ─────────────────────────────────────────────────────────
  // Public endpoint — no authentication required.
  // Used by load balancers, uptime monitors, and CI smoke tests.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── API routes ───────────────────────────────────────────────────────────
  const prefix = '/api/v1';

  app.use(`${prefix}/auth`, authRouter);
  app.use(`${prefix}/users`, usersRouter);
  app.use(`${prefix}/projects`, projectsRouter);
  // Tasks also nested under projects for collection endpoints
  app.use(`${prefix}/projects/:projectId/tasks`, tasksRouter);
  app.use(`${prefix}/tasks`, tasksRouter);
  // Lean / Last Planner System nested under projects
  app.use(`${prefix}/projects/:projectId`, leanRouter);
  app.use(`${prefix}/dashboard`, dashboardRouter);
  app.use(`${prefix}/advisor`, advisorRouter);

  // ── Error handling ───────────────────────────────────────────────────────
  // These must be last — Express identifies error handlers by arity (4 args).
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
