/**
 * env.ts — Environment variable validation and export.
 *
 * Parsed once at startup using Zod. If any required variable is missing or
 * invalid the process exits immediately with a descriptive error — fail-fast
 * prevents partially-configured servers from running in production.
 *
 * Usage: import { env } from './lib/env.js'
 */

import { z } from 'zod';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.union([z.coerce.number(), z.string()]).default(3001),

  // Frontend origin — used for CORS allowlist
  CLIENT_URL: z.string().url().default('http://localhost:5173'),

  // MS SQL Server connection
  DB_SERVER: z.string().min(1, 'DB_SERVER is required'),
  DB_PORT: z.coerce.number().default(1433),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),
  DB_ENCRYPT: z.coerce.boolean().default(false),
  DB_TRUST_SERVER_CERTIFICATE: z.coerce.boolean().default(true),

  // Authentication — per ADR-002 (JWT in httpOnly cookie)
  // Must be at least 32 characters to be cryptographically meaningful.
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

  // AI advisor — per ADR-003
  AI_PROVIDER: z.enum(['anthropic', 'ollama']).default('anthropic'),
  AI_API_KEY: z.string().optional(),
  OLLAMA_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('llama3.2'),
});

export type Env = z.infer<typeof envSchema>;

// ---------------------------------------------------------------------------
// .env loader — tsx does not auto-load dotenv; we parse it manually.
// Only sets variables that are not already in process.env (env vars from
// the OS / Docker always take precedence over the file).
// ---------------------------------------------------------------------------

function loadDotEnv(): void {
  try {
    // resolve relative to this compiled file (server/dist/lib/env.js -> server/.env)
    // process.cwd() is unreliable under iisnode (may point to C:\Windows\System32)
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
    // .env not present — acceptable in production where env vars are injected
    // by the OS / container orchestrator.
  }
}

loadDotEnv();

// ---------------------------------------------------------------------------
// Parse & export — fail fast if validation fails
// ---------------------------------------------------------------------------

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Intentional console.error here: logger is not yet initialised at this
  // point in the startup sequence, and we need to tell the operator what
  // went wrong before calling process.exit(1).
  // eslint-disable-next-line no-console
  console.error('Invalid environment variables — server cannot start:');
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env: Env = parsed.data;
