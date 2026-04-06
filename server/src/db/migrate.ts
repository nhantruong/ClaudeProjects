/**
 * migrate.ts — Database migration runner.
 *
 * Usage:
 *   npx tsx src/db/migrate.ts
 *   npm run db:migrate          (from server/)
 *
 * Reads migration files from src/db/migrations/*.sql in filename order.
 * Tracks applied migrations in the schema_migrations table.
 * Safe to run multiple times — already-applied migrations are skipped.
 *
 * Environment variables are read from server/.env (same file used by the
 * Express server). Variables already in process.env take precedence so that
 * CI / Docker environments can inject values without a .env file.
 */

import { readdir, readFile } from 'fs/promises';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import sql from 'mssql';

// ---------------------------------------------------------------------------
// .env loader — mirrors the logic in src/lib/env.ts.
// The migrate script runs standalone (outside the Express app), so we cannot
// import env.ts directly (it calls process.exit on validation failure and
// requires all server-only variables such as SESSION_SECRET).
// ---------------------------------------------------------------------------

function loadDotEnv(): void {
  try {
    // __dirname is dist/db/ when compiled, or src/db/ when run via tsx.
    // Either way, ../../.env resolves to server/.env.
    const envPath = resolve(__dirname, '../../.env');
    const contents = readFileSync(envPath, 'utf-8');
    for (const line of contents.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed
        .slice(eqIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // .env not present — acceptable when env vars are injected by the OS or CI.
  }
}

loadDotEnv();

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MIGRATIONS_DIR = join(__dirname, 'migrations');

const config: sql.config = {
  server: process.env['DB_SERVER'] ?? 'localhost',
  port: Number(process.env['DB_PORT'] ?? 1433),
  database: process.env['DB_NAME'] ?? '',
  user: process.env['DB_USER'] ?? '',
  password: process.env['DB_PASSWORD'] ?? '',
  options: {
    encrypt: process.env['DB_ENCRYPT'] === 'true',
    trustServerCertificate: process.env['DB_TRUST_SERVER_CERTIFICATE'] !== 'false',
    enableArithAbort: true,
  },
};

// ---------------------------------------------------------------------------
// Ensure tracking table — inlined so the runner works on a fresh database
// before 006_schema_migrations.sql has been manually applied.
// ---------------------------------------------------------------------------

const ENSURE_TABLE_SQL = `
IF NOT EXISTS (
  SELECT 1 FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[schema_migrations]') AND type = N'U'
)
BEGIN
  CREATE TABLE schema_migrations (
    id         INT           NOT NULL IDENTITY(1,1) PRIMARY KEY,
    filename   NVARCHAR(255) NOT NULL,
    applied_at DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_schema_migrations_filename UNIQUE (filename)
  );
END
`;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Connecting to database...');

  if (!process.env['DB_NAME']) {
    console.error('Error: DB_NAME environment variable is not set.');
    console.error('Ensure server/.env exists with DB_* variables, or set them in the environment.');
    process.exit(1);
  }

  const pool = await sql.connect(config);

  try {
    // Ensure the tracking table exists before querying it.
    await pool.request().query(ENSURE_TABLE_SQL);

    // Fetch already-applied migration filenames.
    const appliedResult = await pool
      .request()
      .query<{ filename: string }>('SELECT filename FROM schema_migrations ORDER BY filename ASC');
    const applied = new Set(appliedResult.recordset.map((r) => r.filename));

    // Discover migration files, sorted lexicographically (001_ < 002_ < ...).
    const allFiles = await readdir(MIGRATIONS_DIR);
    const migrationFiles = allFiles.filter((f) => f.endsWith('.sql')).sort();

    console.log(
      `Found ${migrationFiles.length} migration file(s), ${applied.size} already applied.\n`,
    );

    let ran = 0;
    let skipped = 0;

    for (const filename of migrationFiles) {
      if (applied.has(filename)) {
        console.log(`  Skip   ${filename}`);
        skipped++;
        continue;
      }

      const filePath = join(MIGRATIONS_DIR, filename);
      const sqlText = await readFile(filePath, 'utf-8');

      process.stdout.write(`  Run    ${filename} ... `);

      try {
        // Split on GO batch separators — the mssql driver does not understand GO
        // natively; each batch must be sent as a separate query.
        const batches = sqlText
          .split(/^\s*GO\s*$/im)
          .filter((b) => b.trim().length > 0);

        for (const batch of batches) {
          await pool.request().query(batch);
        }

        // Record the migration as applied.
        await pool
          .request()
          .input('filename', sql.NVarChar(255), filename)
          .query('INSERT INTO schema_migrations (filename) VALUES (@filename)');

        console.log('done');
        ran++;
      } catch (err) {
        console.log('FAILED');
        console.error(
          `\nError applying ${filename}:`,
          err instanceof Error ? err.message : String(err),
        );
        console.error('Migration halted. Fix the error and re-run — already-applied migrations will be skipped.');
        process.exit(1);
      }
    }

    console.log(`\nMigration complete: ${ran} run, ${skipped} skipped.`);
  } finally {
    await pool.close();
  }
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
