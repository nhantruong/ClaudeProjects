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

import { join } from 'path';
import { existsSync } from 'fs';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

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
import { projectRfiRouter, rfiRouter } from './routes/rfi.routes.js';
import timesheetRouter from './routes/timesheet.routes.js';
import lookupRouter from './routes/lookup.routes.js';
import { reportsRouter, projectReportsRouter, rfiReportRouter } from './routes/reports.routes.js';

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
  // RFI — collection endpoints nested under projects; resource endpoints at /rfis
  app.use(`${prefix}/projects/:projectId/rfis`, projectRfiRouter);
  app.use(`${prefix}/rfis`, rfiRouter);
  app.use(`${prefix}/timesheets`, timesheetRouter);
  app.use(`${prefix}/lookups`, lookupRouter);
  // PDF report endpoints
  app.use(`${prefix}/reports`, reportsRouter);
  app.use(`${prefix}/projects/:projectId`, projectReportsRouter);
  app.use(`${prefix}/rfis`, rfiReportRouter);

  // ── Static uploads ───────────────────────────────────────────────────────
  // Serves user-uploaded files (RFI images, etc.) from /uploads/.
  // The uploads directory lives at the project root, one level above server/.
  // __dirname resolves to server/dist/src in production, so ../../../ reaches root.
  const uploadsServePath = join(__dirname, '../../../uploads');
  app.use('/uploads', express.static(uploadsServePath));

  // ── Static files + SPA fallback ──────────────────────────────────────────
  // When co-hosted with the API (production on iisnode), serve the React build
  // from two levels up (site root). Skipped in local dev where Vite serves the
  // frontend on a separate port.
  const clientDistPath = join(__dirname, '../../');
  const clientIndexPath = join(clientDistPath, 'index.html');
  if (existsSync(clientIndexPath)) {
    app.use(express.static(clientDistPath));
    // SPA fallback — all non-API routes return index.html for client-side routing
    app.get(/^(?!\/api\/|\/health).*/, (_req, res) => {
      res.sendFile(clientIndexPath);
    });
  }

  // ── Error handling ───────────────────────────────────────────────────────
  // These must be last — Express identifies error handlers by arity (4 args).
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
