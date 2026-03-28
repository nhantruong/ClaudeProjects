/**
 * db.ts — MS SQL Server connection pool singleton.
 *
 * Raphael uses a single database. Call connectDb() once at startup; then call
 * getDb() anywhere you need the pool, or use the typed query() helper.
 *
 * Migration files live in server/src/db/migrations/ and are managed by
 * @database-expert. They must be applied manually against the MS SQL Server
 * instance before starting the server for the first time.
 *
 * SECURITY: All queries MUST use parameterised inputs — never concatenate
 * user-supplied values into SQL strings. The query() helper enforces this
 * pattern by accepting a named-parameter map. Raw pool.request() usage in
 * model files must also always call request.input() — never string-format SQL.
 */

import sql from 'mssql';
import { env } from './env.js';
import logger from './logger.js';

// ---------------------------------------------------------------------------
// Pool configuration
// ---------------------------------------------------------------------------

const dbConfig: sql.config = {
  server: env.DB_SERVER,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  options: {
    encrypt: env.DB_ENCRYPT,
    trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30_000,
  },
  requestTimeout: 30_000,
};

// ---------------------------------------------------------------------------
// Pool singleton
// ---------------------------------------------------------------------------

let pool: sql.ConnectionPool | null = null;

/**
 * connectDb — initialises the connection pool.
 * Must be awaited once during server startup before any requests are served.
 */
export async function connectDb(): Promise<void> {
  try {
    pool = await new sql.ConnectionPool(dbConfig).connect();
    logger.info('Connected to MS SQL Server', { database: env.DB_NAME, server: env.DB_SERVER });
  } catch (err) {
    logger.error('Database connection failed', { err });
    throw err;
  }
}

/**
 * getDb — returns the active connection pool.
 * Throws if connectDb() has not been called yet.
 */
export function getDb(): sql.ConnectionPool {
  if (!pool) {
    throw new Error('Database pool not initialised. Call connectDb() before getDb().');
  }
  return pool;
}

/**
 * closeDb — closes the pool gracefully.
 * Called during SIGTERM / SIGINT shutdown.
 */
export async function closeDb(): Promise<void> {
  await pool?.close();
  pool = null;
  logger.info('Database pool closed');
}

// ---------------------------------------------------------------------------
// Typed query helper
// ---------------------------------------------------------------------------

/**
 * QueryInput — a single named parameter passed to query().
 *
 * @example
 *   query('SELECT * FROM users WHERE id = @id', {
 *     id: { type: sql.Int, value: userId },
 *   })
 */
export interface QueryInput {
  type: sql.ISqlTypeFactory;
  value: unknown;
}

/**
 * query — executes a parameterised SQL query and returns typed rows.
 *
 * SECURITY: Always use named parameters via the `inputs` map — never build
 * SQL strings with user-supplied values.
 *
 * @param sqlText - The SQL string with named parameters, e.g. `WHERE id = @id`
 * @param inputs  - Map of parameter name → { type, value }
 * @returns Array of typed result rows
 */
export async function query<T = Record<string, unknown>>(
  sqlText: string,
  inputs?: Record<string, QueryInput>,
): Promise<T[]> {
  const db = getDb();
  const request = db.request();

  if (inputs) {
    for (const [name, { type, value }] of Object.entries(inputs)) {
      request.input(name, type, value);
    }
  }

  const result = await request.query<T>(sqlText);
  return result.recordset;
}

// Re-export the sql namespace so model files can reference sql.Int, sql.NVarChar, etc.
export { sql };
