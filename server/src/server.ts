/**
 * server.ts — Application entry point.
 *
 * Startup sequence:
 *   1. Parse and validate environment variables (env.ts — fail-fast on error)
 *   2. Connect to MS SQL Server database pool
 *   3. Create the Express application
 *   4. Start listening on PORT
 *   5. Register graceful shutdown handlers (SIGTERM, SIGINT)
 *   6. Register safety-net handlers (uncaughtException, unhandledRejection)
 */

import { env } from './lib/env.js';
import { connectDb, closeDb } from './lib/db.js';
import logger from './lib/logger.js';
import { createApp } from './app.js';

async function main(): Promise<void> {
  // 1. Connect to the database (fail-fast — no point starting the HTTP server
  //    if we cannot reach the database)
  await connectDb();

  // 2. Create and configure the Express application
  const app = createApp();

  // 3. Start listening
  const server = app.listen(env.PORT, () => {
    logger.info(`Raphael API running on http://localhost:${env.PORT}`, {
      environment: env.NODE_ENV,
      aiProvider: env.AI_PROVIDER,
    });
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────
  // On SIGTERM / SIGINT: stop accepting new connections, wait for in-flight
  // requests to finish, close the DB pool, then exit cleanly.

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down gracefully`);

    server.close(async () => {
      await closeDb();
      logger.info('Server closed — goodbye');
      process.exit(0);
    });

    // Force-kill after 10 s if connections are still open
    setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  // ── Safety-net handlers ────────────────────────────────────────────────
  // These should never fire in normal operation. If they do, something has
  // gone very wrong and we must exit so the process manager can restart.

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception — exiting', { err });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection — exiting', { reason });
    process.exit(1);
  });
}

main().catch((err) => {
  // Logger may not be initialised yet at this point (e.g., env validation
  // fails before logger is set up). Fall back to console.error.
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});
