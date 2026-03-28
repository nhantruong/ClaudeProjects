import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

// Routers
import authRouter from './modules/auth/auth.router.js';
import timesheetRouter from './modules/timesheet/timesheet.router.js';
import worktypeRouter from './modules/worktype/worktype.router.js';
import employeesRouter from './modules/employees/employees.router.js';
import projectsRouter from './modules/projects/projects.router.js';
import leaveRouter from './modules/leave/leave.router.js';
import analyticsRouter from './modules/analytics/analytics.router.js';
import aiRouter from './modules/ai/ai.router.js';

export function createApp(): express.Application {
  const app = express();

  // ── Security ──────────────────────────────────────────────
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  }));

  app.use(cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }));

  // ── Request parsing ───────────────────────────────────────
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Logging ───────────────────────────────────────────────
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // ── Global rate limiter ───────────────────────────────────
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 min
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
  }));

  // ── Health check ──────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
  });

  // ── API Routes ────────────────────────────────────────────
  const prefix = env.API_PREFIX;
  app.use(`${prefix}/auth`, authRouter);
  app.use(`${prefix}/timesheet`, timesheetRouter);
  app.use(`${prefix}/worktypes`, worktypeRouter);
  app.use(`${prefix}/employees`, employeesRouter);
  app.use(`${prefix}/projects`, projectsRouter);
  app.use(`${prefix}/leave`, leaveRouter);
  app.use(`${prefix}/analytics`, analyticsRouter);
  app.use(`${prefix}/ai`, aiRouter);

  // ── Error handling ────────────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
