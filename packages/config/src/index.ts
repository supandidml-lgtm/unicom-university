import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';

const environmentFile = findEnvironmentFile();

if (environmentFile) {
  loadDotenv({ path: environmentFile, override: false });
}

const nodeEnvironmentSchema = z.enum(['development', 'test', 'production']).default('development');
const logLevelSchema = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info');
const booleanEnvironmentSchema = z.enum(['true', 'false']).transform((value) => value === 'true');
const materialStorageProviderSchema = z.enum(['local', 's3']).default('local');
const aiProviderSchema = z.enum(['disabled', 'openai_compatible', 'test_fake']).default('disabled');
const aiFakeProviderModeSchema = z
  .enum(['valid', 'partial', 'malformed', 'failure'])
  .default('valid');
const emailProviderSchema = z.enum(['disabled', 'test', 'smtp']).default('disabled');
const emailTestProviderModeSchema = z
  .enum(['success', 'transient_once', 'permanent_failure'])
  .default('success');
const commaSeparatedOriginsSchema = z.string().trim().min(1).max(4_096).optional();
const base64KeySchema = z
  .string()
  .trim()
  .refine((value) => {
    try {
      const decoded = Buffer.from(value, 'base64');
      return decoded.length === 32 && decoded.toString('base64') === value;
    } catch {
      return false;
    }
  }, 'must be a base64-encoded 32-byte key.');

const baseSchema = z.object({
  NODE_ENV: nodeEnvironmentSchema,
  APP_NAME: z.string().trim().min(1).default('UNICOM UNIVERSITY'),
  APP_ENV: z.string().trim().min(1).default('development'),
  LOG_LEVEL: logLevelSchema,
});

const apiSchema = baseSchema.extend({
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection URL.'),
  REDIS_HOST: z.string().trim().min(1, 'REDIS_HOST is required.'),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535),
  REDIS_PASSWORD: z.string().optional(),
  WEB_ORIGIN: z.string().url('WEB_ORIGIN must be an absolute URL.'),
  CORS_ALLOWED_ORIGINS: commaSeparatedOriginsSchema,
  AUTH_INVITATION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(72),
  AUTH_SESSION_IDLE_MINUTES: z.coerce.number().int().min(5).max(10_080).default(480),
  AUTH_SESSION_ABSOLUTE_HOURS: z.coerce.number().int().min(1).max(720).default(168),
  AUTH_LOGIN_MAX_FAILURES: z.coerce.number().int().min(1).max(20).default(5),
  AUTH_LOGIN_WINDOW_MINUTES: z.coerce.number().int().min(1).max(1_440).default(15),
  AUTH_LOGIN_IP_MAX_FAILURES: z.coerce.number().int().min(5).max(200).default(50),
  AUTH_COOKIE_NAME: z.string().trim().min(1).max(128).default('unicom_session'),
  AUTH_RATE_LIMIT_SECRET: z
    .string()
    .min(32, 'AUTH_RATE_LIMIT_SECRET must be at least 32 characters.'),
  AUTH_TRUST_PROXY: booleanEnvironmentSchema.default('false'),
  API_JSON_BODY_LIMIT_KB: z.coerce.number().int().min(16).max(10_240).default(1_024),
  WEB_PUBLIC_URL: z.string().url('WEB_PUBLIC_URL must be an absolute URL.'),
  PROFILE_PII_ENCRYPTION_KEY: base64KeySchema,
  PROFILE_NIK_HMAC_KEY: base64KeySchema,
  TRAINING_MAX_PLANNED_WEEKS: z.coerce.number().int().min(1).max(520).default(104),
  MATERIAL_STORAGE_PROVIDER: materialStorageProviderSchema,
  MATERIAL_STORAGE_LOCAL_PATH: z.string().trim().min(1).default('../unicom-private-materials'),
  MATERIAL_S3_ENDPOINT: z.string().url().optional(),
  MATERIAL_S3_REGION: z.string().trim().min(1).default('us-east-1'),
  MATERIAL_S3_BUCKET: z.string().trim().min(3).max(63).optional(),
  MATERIAL_S3_ACCESS_KEY_ID: z.string().trim().min(1).optional(),
  MATERIAL_S3_SECRET_ACCESS_KEY: z.string().trim().min(1).optional(),
  MATERIAL_MAX_VIDEO_MB: z.coerce.number().int().min(1).max(2_048).default(250),
  MATERIAL_MAX_DOCUMENT_MB: z.coerce.number().int().min(1).max(200).default(25),
  MATERIAL_MAX_IMAGE_MB: z.coerce.number().int().min(1).max(100).default(10),
  MATERIAL_MALWARE_SCAN_ENABLED: booleanEnvironmentSchema.default('true'),
  CLAMAV_HOST: z.string().trim().min(1).default('localhost'),
  CLAMAV_PORT: z.coerce.number().int().min(1).max(65535).default(3310),
  CLAMAV_SCAN_TIMEOUT_SECONDS: z.coerce.number().int().min(5).max(300).default(60),
  LEARNING_VIDEO_REQUIRED_COVERAGE_PERCENT: z.coerce.number().min(80).max(100).default(98),
  LEARNING_VIDEO_HEARTBEAT_SECONDS: z.coerce.number().int().min(2).max(60).default(5),
  LEARNING_VIDEO_MAX_PLAYBACK_RATE: z.coerce.number().min(0.5).max(4).default(2),
  LEARNING_DOCUMENT_MIN_DWELL_SECONDS: z.coerce.number().int().min(5).max(3_600).default(60),
  LEARNING_IMAGE_MIN_DWELL_SECONDS: z.coerce.number().int().min(5).max(3_600).default(20),
  LEARNING_ACTIVITY_SESSION_TTL_MINUTES: z.coerce.number().int().min(1).max(240).default(30),
  LEARNING_ACTIVITY_MIN_EVENT_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(250)
    .max(10_000)
    .default(1_000),
  EXAM_DEFAULT_PASSING_SCORE_PERCENT: z.coerce.number().int().min(0).max(100).default(75),
  AI_PROVIDER: aiProviderSchema,
  AI_FAKE_PROVIDER_MODE: aiFakeProviderModeSchema,
  AI_API_KEY: z.string().min(1).optional(),
  AI_BASE_URL: z.string().url().optional(),
  AI_MODEL: z.string().trim().min(1).max(160).default('gpt-4.1-mini'),
  AI_GENERATION_MAX_QUESTIONS_PER_JOB: z.coerce.number().int().min(1).max(100).default(20),
  AI_GENERATION_MAX_SOURCE_CHARS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(2_000_000)
    .default(120_000),
  AI_MAX_ACTIVE_JOBS_PER_USER: z.coerce.number().int().min(1).max(20).default(3),
  AI_GENERATION_REQUESTS_PER_MINUTE: z.coerce.number().int().min(1).max(60).default(10),
  AI_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
  AI_GENERATION_JOB_TIMEOUT_SECONDS: z.coerce.number().int().min(5).max(900).default(120),
  REPORT_EXPORT_MAX_ROWS: z.coerce.number().int().min(1).max(50_000).default(5_000),
  REPORTING_TIMEZONE: z.string().trim().min(1).max(64).default('Asia/Jakarta'),
  EMAIL_PROVIDER: emailProviderSchema,
  EMAIL_TEST_PROVIDER_MODE: emailTestProviderModeSchema,
  EMAIL_FROM_ADDRESS: z.string().email().optional(),
  EMAIL_FROM_NAME: z.string().trim().min(1).max(128).default('UNICOM UNIVERSITY'),
  EMAIL_REPLY_TO: z.string().email().optional(),
  SMTP_HOST: z.string().trim().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: booleanEnvironmentSchema.default('false'),
  SMTP_USERNAME: z.string().trim().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  EMAIL_DELIVERY_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  EMAIL_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
  SMTP_TIMEOUT_SECONDS: z.coerce.number().int().min(5).max(300).default(30),
  STORAGE_OPERATION_TIMEOUT_SECONDS: z.coerce.number().int().min(5).max(300).default(60),
  WORKER_JOB_LEASE_SECONDS: z.coerce.number().int().min(60).max(3_600).default(1_200),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(250).max(10_000).default(1_000),
  WORKER_HEALTH_LOG_INTERVAL_SECONDS: z.coerce.number().int().min(5).max(3_600).default(60),
  OPERATIONAL_DELIVERY_RETENTION_DAYS: z.coerce.number().int().min(7).max(3_650).default(90),
  AUTH_PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(240).default(30),
  AUTH_INVITATION_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(15).max(86_400).default(60),
  AUTH_RECOVERY_MAX_REQUESTS: z.coerce.number().int().min(1).max(50).default(5),
  AUTH_RECOVERY_WINDOW_MINUTES: z.coerce.number().int().min(1).max(1_440).default(15),
});

const workerSchema = baseSchema.extend({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection URL.'),
  REDIS_HOST: z.string().trim().min(1, 'REDIS_HOST is required.'),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535),
  REDIS_PASSWORD: z.string().optional(),
  AI_PROVIDER: aiProviderSchema,
  AI_FAKE_PROVIDER_MODE: aiFakeProviderModeSchema,
  AI_API_KEY: z.string().min(1).optional(),
  AI_BASE_URL: z.string().url().optional(),
  AI_MODEL: z.string().trim().min(1).max(160).default('gpt-4.1-mini'),
  AI_GENERATION_MAX_QUESTIONS_PER_JOB: z.coerce.number().int().min(1).max(100).default(20),
  AI_GENERATION_MAX_SOURCE_CHARS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(2_000_000)
    .default(120_000),
  AI_MAX_ACTIVE_JOBS_PER_USER: z.coerce.number().int().min(1).max(20).default(3),
  AI_GENERATION_REQUESTS_PER_MINUTE: z.coerce.number().int().min(1).max(60).default(10),
  AI_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
  AI_GENERATION_JOB_TIMEOUT_SECONDS: z.coerce.number().int().min(5).max(900).default(120),
  REPORT_EXPORT_MAX_ROWS: z.coerce.number().int().min(1).max(50_000).default(5_000),
  REPORTING_TIMEZONE: z.string().trim().min(1).max(64).default('Asia/Jakarta'),
  EMAIL_PROVIDER: emailProviderSchema,
  EMAIL_TEST_PROVIDER_MODE: emailTestProviderModeSchema,
  EMAIL_FROM_ADDRESS: z.string().email().optional(),
  EMAIL_FROM_NAME: z.string().trim().min(1).max(128).default('UNICOM UNIVERSITY'),
  EMAIL_REPLY_TO: z.string().email().optional(),
  SMTP_HOST: z.string().trim().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: booleanEnvironmentSchema.default('false'),
  SMTP_USERNAME: z.string().trim().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  EMAIL_DELIVERY_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  EMAIL_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
  SMTP_TIMEOUT_SECONDS: z.coerce.number().int().min(5).max(300).default(30),
  STORAGE_OPERATION_TIMEOUT_SECONDS: z.coerce.number().int().min(5).max(300).default(60),
  WORKER_JOB_LEASE_SECONDS: z.coerce.number().int().min(60).max(3_600).default(1_200),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(250).max(10_000).default(1_000),
  WORKER_HEALTH_LOG_INTERVAL_SECONDS: z.coerce.number().int().min(5).max(3_600).default(60),
  AUTH_PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(240).default(30),
  AUTH_INVITATION_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(15).max(86_400).default(60),
  AUTH_RECOVERY_MAX_REQUESTS: z.coerce.number().int().min(1).max(50).default(5),
  AUTH_RECOVERY_WINDOW_MINUTES: z.coerce.number().int().min(1).max(1_440).default(15),
});

export type ApiEnvironment = z.infer<typeof apiSchema>;
export type WorkerEnvironment = z.infer<typeof workerSchema>;

function parseEnvironment<TSchema extends z.ZodType>(
  schema: TSchema,
  environment: NodeJS.ProcessEnv,
) {
  const result = schema.safeParse(environment);

  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid application configuration. ${message}`);
  }

  const value = result.data as z.infer<TSchema>;
  if (
    'NODE_ENV' in value &&
    value.NODE_ENV === 'production' &&
    'WEB_PUBLIC_URL' in value &&
    typeof value.WEB_PUBLIC_URL === 'string' &&
    !value.WEB_PUBLIC_URL.startsWith('https://')
  ) {
    throw new Error(
      'Invalid application configuration. WEB_PUBLIC_URL must use HTTPS in production.',
    );
  }
  if ('AI_PROVIDER' in value && value.AI_PROVIDER === 'test_fake' && value.NODE_ENV !== 'test') {
    throw new Error(
      'Invalid application configuration. AI_PROVIDER=test_fake is allowed only in test.',
    );
  }
  if (
    'EMAIL_PROVIDER' in value &&
    value.EMAIL_PROVIDER === 'test' &&
    value.NODE_ENV === 'production'
  ) {
    throw new Error(
      'Invalid application configuration. EMAIL_PROVIDER=test is not allowed in production.',
    );
  }
  if (
    'EMAIL_TEST_PROVIDER_MODE' in value &&
    value.EMAIL_TEST_PROVIDER_MODE !== 'success' &&
    value.NODE_ENV === 'production'
  ) {
    throw new Error(
      'Invalid application configuration. Email test-provider behavior is not allowed in production.',
    );
  }
  if (
    'EMAIL_PROVIDER' in value &&
    value.EMAIL_PROVIDER === 'smtp' &&
    (!value.EMAIL_FROM_ADDRESS || !value.SMTP_HOST || !value.SMTP_USERNAME || !value.SMTP_PASSWORD)
  ) {
    throw new Error(
      'Invalid application configuration. EMAIL_PROVIDER=smtp requires sender address and SMTP credentials.',
    );
  }
  if (
    'AI_PROVIDER' in value &&
    value.AI_PROVIDER === 'openai_compatible' &&
    (!value.AI_API_KEY || !value.AI_BASE_URL)
  ) {
    throw new Error(
      'Invalid application configuration. AI_PROVIDER=openai_compatible requires AI_API_KEY and AI_BASE_URL.',
    );
  }
  if (
    'NODE_ENV' in value &&
    value.NODE_ENV === 'production' &&
    'MATERIAL_STORAGE_PROVIDER' in value &&
    value.MATERIAL_STORAGE_PROVIDER === 's3' &&
    (!value.MATERIAL_S3_ENDPOINT ||
      !value.MATERIAL_S3_BUCKET ||
      !value.MATERIAL_S3_ACCESS_KEY_ID ||
      !value.MATERIAL_S3_SECRET_ACCESS_KEY)
  ) {
    throw new Error(
      'Invalid application configuration. Production S3 material storage requires endpoint, bucket, and credentials.',
    );
  }
  if (
    'NODE_ENV' in value &&
    value.NODE_ENV === 'production' &&
    'MATERIAL_STORAGE_PROVIDER' in value &&
    value.MATERIAL_STORAGE_PROVIDER === 'local'
  ) {
    throw new Error(
      'Invalid application configuration. Production requires private object storage.',
    );
  }
  if (
    'NODE_ENV' in value &&
    value.NODE_ENV === 'production' &&
    'MATERIAL_MALWARE_SCAN_ENABLED' in value &&
    !value.MATERIAL_MALWARE_SCAN_ENABLED
  ) {
    throw new Error(
      'Invalid application configuration. Production malware scanning cannot be disabled.',
    );
  }
  validateOperationalSafety(value, environment);
  return value;
}

/**
 * Builds the credentialed-browser allowlist. WEB_ORIGIN is retained as the safe
 * development/test default; production must explicitly declare every origin.
 */
export function corsAllowedOrigins(environment: ApiEnvironment): readonly string[] {
  const raw = environment.CORS_ALLOWED_ORIGINS ?? environment.WEB_ORIGIN;
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function validateOperationalSafety(
  value: ApiEnvironment | WorkerEnvironment,
  source: NodeJS.ProcessEnv,
): void {
  if (value.WORKER_JOB_LEASE_SECONDS <= value.AI_GENERATION_JOB_TIMEOUT_SECONDS) {
    throw new Error(
      'Invalid application configuration. WORKER_JOB_LEASE_SECONDS must exceed AI_GENERATION_JOB_TIMEOUT_SECONDS.',
    );
  }
  if (value.NODE_ENV !== 'production') return;

  if (value.APP_ENV !== 'production') {
    throw new Error('Invalid application configuration. APP_ENV must be production in production.');
  }
  if (containsUnsafePlaceholderFromUrl(value.DATABASE_URL)) {
    throw new Error('Invalid application configuration. DATABASE_URL is not production-safe.');
  }
  if ('PROFILE_PII_ENCRYPTION_KEY' in value) {
    if (containsUnsafePlaceholder(value.AUTH_RATE_LIMIT_SECRET)) {
      throw new Error(
        'Invalid application configuration. AUTH_RATE_LIMIT_SECRET is not production-safe.',
      );
    }
    if (
      !hasKeyEntropy(value.PROFILE_PII_ENCRYPTION_KEY) ||
      !hasKeyEntropy(value.PROFILE_NIK_HMAC_KEY)
    ) {
      throw new Error(
        'Invalid application configuration. Production encryption keys are not safe.',
      );
    }
    if (!source['CORS_ALLOWED_ORIGINS']) {
      throw new Error(
        'Invalid application configuration. CORS_ALLOWED_ORIGINS is required in production.',
      );
    }
    const origins = corsAllowedOrigins(value);
    if (
      origins.length === 0 ||
      origins.some((origin) => origin === '*' || !isHttpsOrigin(origin)) ||
      new Set(origins).size !== origins.length
    ) {
      throw new Error(
        'Invalid application configuration. CORS_ALLOWED_ORIGINS must be unique HTTPS origins.',
      );
    }
    if (!isHttpsOrigin(value.WEB_ORIGIN)) {
      throw new Error(
        'Invalid application configuration. WEB_ORIGIN must use HTTPS in production.',
      );
    }
    if (value.EMAIL_PROVIDER === 'smtp' && !value.SMTP_SECURE) {
      throw new Error('Invalid application configuration. SMTP_SECURE must be true in production.');
    }
    if (
      value.MATERIAL_STORAGE_PROVIDER === 's3' &&
      (!value.MATERIAL_S3_ENDPOINT || !value.MATERIAL_S3_ENDPOINT.startsWith('https://'))
    ) {
      throw new Error(
        'Invalid application configuration. Production object storage must use HTTPS.',
      );
    }
  }
}

function isHttpsOrigin(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === 'https:' && parsed.pathname === '/' && !parsed.search && !parsed.hash
    );
  } catch {
    return false;
  }
}

function containsUnsafePlaceholder(value: string): boolean {
  return /(change[ _-]?me|replace|placeholder|example|test[ _-]?only|local[ _-]?development)/i.test(
    value,
  );
}

function containsUnsafePlaceholderFromUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return containsUnsafePlaceholder(url.username) || containsUnsafePlaceholder(url.password);
  } catch {
    return true;
  }
}

function hasKeyEntropy(value: string): boolean {
  const decoded = Buffer.from(value, 'base64');
  return new Set(decoded).size > 1;
}

export function loadApiEnvironment(environment: NodeJS.ProcessEnv = process.env): ApiEnvironment {
  return parseEnvironment(apiSchema, environment);
}

export function loadWorkerEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): WorkerEnvironment {
  return parseEnvironment(workerSchema, environment);
}

function findEnvironmentFile(startDirectory: string = process.cwd()): string | undefined {
  let directory = resolve(startDirectory);

  while (true) {
    const candidate = resolve(directory, '.env');
    if (existsSync(candidate)) {
      return candidate;
    }

    const parentDirectory = dirname(directory);
    if (parentDirectory === directory) {
      return undefined;
    }

    directory = parentDirectory;
  }
}
