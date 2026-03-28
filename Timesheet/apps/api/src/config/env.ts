import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  API_PREFIX: z.string().default('/api/v1'),

  // BIMdb
  BIM_DB_SERVER: z.string(),
  BIM_DB_PORT: z.coerce.number().default(1433),
  BIM_DB_NAME: z.string(),
  BIM_DB_USER: z.string(),
  BIM_DB_PASSWORD: z.string(),
  BIM_DB_ENCRYPT: z.coerce.boolean().default(false),
  BIM_DB_TRUST_CERT: z.coerce.boolean().default(true),
  BIM_DB_POOL_MAX: z.coerce.number().default(10),
  BIM_DB_POOL_MIN: z.coerce.number().default(2),

  // DMCdb
  DMC_DB_SERVER: z.string(),
  DMC_DB_PORT: z.coerce.number().default(1433),
  DMC_DB_NAME: z.string(),
  DMC_DB_USER: z.string(),
  DMC_DB_PASSWORD: z.string(),
  DMC_DB_ENCRYPT: z.coerce.boolean().default(false),
  DMC_DB_TRUST_CERT: z.coerce.boolean().default(true),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_ENABLED: z.coerce.boolean().default(false),

  // AI
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().default('claude-sonnet-4-6'),
  AI_ENABLED: z.coerce.boolean().default(false),
  AI_MAX_TOKENS: z.coerce.number().default(4096),
  AI_RATE_LIMIT_PER_HOUR: z.coerce.number().default(20),

  CLIENT_URL: z.string().default('http://localhost:5173'),
  TZ: z.string().default('Asia/Ho_Chi_Minh'),
});

// Load .env manually for dev (tsx doesn't auto-load)
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadDotEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const contents = readFileSync(envPath, 'utf-8');
    for (const line of contents.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // .env not found — OK in production
  }
}

loadDotEnv();

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
