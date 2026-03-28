import { env } from './config/env.js';
import { connectDatabases, closeDatabases } from './config/database.js';
import { logger } from './config/logger.js';
import { createApp } from './app.js';
import { startAllJobs } from './jobs/scheduler.js';

async function main(): Promise<void> {
  // Connect databases
  await connectDatabases();

  // Start HTTP server
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 BIM Timesheet API running on http://localhost:${env.PORT}${env.API_PREFIX}`);
    logger.info(`   Environment: ${env.NODE_ENV}`);
    logger.info(`   AI Insights: ${env.AI_ENABLED ? '✅ enabled' : '❌ disabled'}`);
  });

  // Start scheduled jobs
  if (env.NODE_ENV !== 'test') {
    startAllJobs();
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully...`);
    server.close(async () => {
      await closeDatabases();
      logger.info('Server closed');
      process.exit(0);
    });

    // Force exit after 10s
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception:', err);
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
