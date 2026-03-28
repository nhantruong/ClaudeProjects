import sql from 'mssql';
import { env } from './env.js';
import { logger } from './logger.js';

// ============================================================
// Two connection pools — one per database
// ============================================================

const bimDbConfig: sql.config = {
  server: env.BIM_DB_SERVER,
  port: env.BIM_DB_PORT,
  database: env.BIM_DB_NAME,
  user: env.BIM_DB_USER,
  password: env.BIM_DB_PASSWORD,
  options: {
    encrypt: env.BIM_DB_ENCRYPT,
    trustServerCertificate: env.BIM_DB_TRUST_CERT,
    enableArithAbort: true,
  },
  pool: {
    max: env.BIM_DB_POOL_MAX,
    min: env.BIM_DB_POOL_MIN,
    idleTimeoutMillis: 30_000,
  },
  requestTimeout: 30_000,
};

const dmcDbConfig: sql.config = {
  server: env.DMC_DB_SERVER,
  port: env.DMC_DB_PORT,
  database: env.DMC_DB_NAME,
  user: env.DMC_DB_USER,
  password: env.DMC_DB_PASSWORD,
  options: {
    encrypt: env.DMC_DB_ENCRYPT,
    trustServerCertificate: env.DMC_DB_TRUST_CERT,
    enableArithAbort: true,
  },
  pool: { max: 10, min: 2, idleTimeoutMillis: 30_000 },
  requestTimeout: 30_000,
};

let bimPool: sql.ConnectionPool | null = null;
let dmcPool: sql.ConnectionPool | null = null;

export async function connectDatabases(): Promise<void> {
  try {
    bimPool = await new sql.ConnectionPool(bimDbConfig).connect();
    logger.info(`✅ Connected to BIMdb (${env.BIM_DB_NAME})`);

    dmcPool = await new sql.ConnectionPool(dmcDbConfig).connect();
    logger.info(`✅ Connected to DMCdb (${env.DMC_DB_NAME})`);
  } catch (err) {
    logger.error('❌ Database connection failed:', err);
    throw err;
  }
}

export function getBimDb(): sql.ConnectionPool {
  if (!bimPool) throw new Error('BIMdb pool not initialized. Call connectDatabases() first.');
  return bimPool;
}

export function getDmcDb(): sql.ConnectionPool {
  if (!dmcPool) throw new Error('DMCdb pool not initialized. Call connectDatabases() first.');
  return dmcPool;
}

export async function closeDatabases(): Promise<void> {
  await bimPool?.close();
  await dmcPool?.close();
  logger.info('Database pools closed');
}

// ============================================================
// Generic typed query helper
// ============================================================
export async function bimQuery<T = Record<string, unknown>>(
  query: string,
  params?: Record<string, sql.ITypedColumnMetaData & { value: unknown }>
): Promise<T[]> {
  const pool = getBimDb();
  const request = pool.request();
  if (params) {
    for (const [name, { type, value }] of Object.entries(params)) {
      request.input(name, type as sql.ISqlTypeFactory, value);
    }
  }
  const result = await request.query(query);
  return result.recordset as T[];
}

export async function dmcQuery<T = Record<string, unknown>>(
  query: string,
  params?: Record<string, { type: sql.ISqlTypeFactory; value: unknown }>
): Promise<T[]> {
  const pool = getDmcDb();
  const request = pool.request();
  if (params) {
    for (const [name, { type, value }] of Object.entries(params)) {
      request.input(name, type, value);
    }
  }
  const result = await request.query(query);
  return result.recordset as T[];
}

export { sql };
