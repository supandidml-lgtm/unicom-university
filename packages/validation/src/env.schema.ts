import { z } from "zod";

/**
 * Common Environment Variable Schema
 */
export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  APP_NAME: z.string().default("Unicom University"),
  APP_VERSION: z.string().default("1.0.0"),
});

/**
 * Backend API Environment Schema
 */
export const apiEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(4000),
  
  DATABASE_HOST: z.string().min(1).default("localhost"),
  DATABASE_PORT: z.coerce.number().default(5432),
  DATABASE_USER: z.string().min(1).default("unicom_admin"),
  DATABASE_PASSWORD: z.string().min(1).default("test_password"),
  DATABASE_NAME: z.string().min(1).default("unicom_university"),
  DATABASE_SCHEMA: z.string().default("public"),
  DATABASE_SSL: z.coerce.boolean().default(false),
  DATABASE_URL: z.string().url().optional(),

  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),

  JWT_SECRET: z.string().min(16).default("super_secret_jwt_key_that_is_at_least_32_characters_long_for_dev"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  JWT_REFRESH_SECRET: z.string().min(16).default("super_secret_jwt_refresh_key_at_least_32_characters_dev"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  SESSION_COOKIE_NAME: z.string().default("unicom_session"),
  SESSION_SECRET: z.string().min(16).default("session_secret_key_that_is_at_least_32_characters_dev"),

  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:3000,http://127.0.0.1:3000"),
  RATE_LIMIT_TTL: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
});

/**
 * Frontend Web Environment Schema
 */
export const webEnvSchema = baseEnvSchema.extend({
  WEB_PORT: z.coerce.number().default(3000),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:4000/api/v1"),
});

/**
 * Worker Service Environment Schema
 */
export const workerEnvSchema = baseEnvSchema.extend({
  WORKER_PORT: z.coerce.number().default(4001),
  
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379/0"),

  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_ENDPOINT: z.string().default("http://localhost:9000"),
  STORAGE_REGION: z.string().default("us-east-1"),
  STORAGE_BUCKET: z.string().default("unicom-materials"),
  STORAGE_ACCESS_KEY: z.string().default("local_access_key"),
  STORAGE_SECRET_KEY: z.string().default("local_secret_key"),

  AI_PROVIDER: z.enum(["mock", "gemini", "openai", "anthropic", "custom"]).default("mock"),
  AI_API_KEY: z.string().default("mock_api_key_for_development"),
  AI_MODEL_NAME: z.string().default("gemini-1.5-pro"),
  AI_TEMPERATURE: z.coerce.number().default(0.2),
  AI_MAX_TOKENS: z.coerce.number().default(4096),
  AI_TIMEOUT_MS: z.coerce.number().default(60000),

  TRANSCRIPTION_PROVIDER: z.enum(["local", "whisper", "assemblyai", "google_speech"]).default("local"),
  TEMP_UPLOAD_DIR: z.string().default("./temp_uploads"),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type WebEnv = z.infer<typeof webEnvSchema>;
export type WorkerEnv = z.infer<typeof workerEnvSchema>;

/**
 * Validates environment variables against a given Zod schema
 */
export function validateEnv<T extends z.ZodTypeAny>(
  schema: T,
  rawEnv: Record<string, unknown> = process.env,
): z.infer<T> {
  const result = schema.safeParse(rawEnv);
  if (!result.success) {
    const errorDetails = result.error.format();
    console.error("❌ Environment validation error:", JSON.stringify(errorDetails, null, 2));
    throw new Error(`Environment validation failed: ${result.error.message}`);
  }
  return result.data;
}
