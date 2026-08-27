import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().default("http://localhost:3000"),
  SANDBOX_ORIGIN: z.string().default("http://localhost:3001"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
  ENCRYPTION_KEY: z.string().min(32),
  STORAGE_ENDPOINT: z.string().min(1),
  STORAGE_REGION: z.string().default("us-east-1"),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_ACCESS_KEY: z.string().min(1),
  STORAGE_SECRET_KEY: z.string().min(1),
  STORAGE_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  PUBLIC_STORAGE_URL: z.string().optional(),
  AI_BASE_URL: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("gpt-4.1-mini"),
  AI_FAST_MODEL: z.string().default("gpt-4.1-nano"),
  AI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  AI_MODERATION_MODEL: z.string().default("omni-moderation-latest"),
  AI_TRANSCRIPTION_BASE_URL: z.string().optional(),
  AI_TRANSCRIPTION_API_KEY: z.string().optional(),
  AI_TRANSCRIPTION_MODEL: z.string().default("whisper-1"),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().default(30_000),
  AI_MAX_CONCURRENCY: z.coerce.number().default(4),
  AI_CONTEXT_WINDOW: z.coerce.number().default(32_000),
  AI_SUPPORTS_JSON_SCHEMA: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  AI_PROVIDER_NAME: z.string().default("openai-compatible"),
  MODERATION_MODE: z.enum(["strict", "standard", "permissive"]).default("standard"),
  CLAMAV_HOST: z.string().optional(),
  CLAMAV_PORT: z.coerce.number().default(3310),
  SCANNER_MODE: z.enum(["clamav", "stub"]).default("stub"),
  RATE_LIMIT_ANON_PER_MIN: z.coerce.number().default(60),
  RATE_LIMIT_USER_PER_MIN: z.coerce.number().default(180),
  AI_DAILY_TOKEN_BUDGET: z.coerce.number().default(250_000),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(12).optional(),
  ADMIN_BOOTSTRAP_HANDLE: z.string().default("oriel-admin"),
  LOG_LEVEL: z.string().default("info"),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  FEATURE_COMMENTS: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(flattened)}`);
  }
  cached = parsed.data;
  return cached;
}

export function isAiConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.AI_BASE_URL && env.AI_API_KEY);
}
