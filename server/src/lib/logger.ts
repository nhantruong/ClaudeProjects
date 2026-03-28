/**
 * logger.ts — Structured logger singleton.
 *
 * Uses Winston. In production: JSON output for log aggregation tools.
 * In development: colorised, human-readable format.
 *
 * Usage: import logger from './lib/logger.js'
 *        logger.info('Server started', { port: 3001 });
 *        logger.error('Query failed', { err });
 *
 * Rules:
 *  - Never use console.log/warn/error in application code — use this logger.
 *  - Never log passwords, secrets, tokens, or PII.
 *  - Always include relevant context in the metadata object (second argument).
 */

import winston from 'winston';
import { env } from './env.js';

const isProduction = env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    isProduction
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `${String(timestamp)} [${String(level)}]: ${String(message)}${metaStr}`;
          }),
        ),
  ),
  transports: [
    new winston.transports.Console(),
    ...(isProduction
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
});

export default logger;
