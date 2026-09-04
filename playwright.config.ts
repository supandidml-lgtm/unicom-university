import { defineConfig, devices } from '@playwright/test';

const e2eEnvironment = {
  NODE_ENV: 'test',
  APP_NAME: 'UNICOM UNIVERSITY',
  APP_ENV: 'test',
  LOG_LEVEL: 'fatal',
  API_PORT: '4000',
  DATABASE_URL: 'postgresql://unicom_app:change-me-local@localhost:5432/unicom_test?schema=public',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  WEB_ORIGIN: 'http://localhost:3000',
  WEB_PUBLIC_URL: 'http://localhost:3000',
  NEXT_PUBLIC_API_BASE_URL: 'http://localhost:4000',
  AUTH_INVITATION_TTL_HOURS: '72',
  AUTH_SESSION_IDLE_MINUTES: '480',
  AUTH_SESSION_ABSOLUTE_HOURS: '168',
  AUTH_LOGIN_MAX_FAILURES: '3',
  AUTH_LOGIN_WINDOW_MINUTES: '15',
  AUTH_LOGIN_IP_MAX_FAILURES: '10',
  AUTH_COOKIE_NAME: 'unicom_e2e_session',
  AUTH_RATE_LIMIT_SECRET: 'e2e-test-rate-limit-secret-that-is-long-enough-12345',
  PROFILE_PII_ENCRYPTION_KEY: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
  PROFILE_NIK_HMAC_KEY: 'ZmVkY2JhOTg3NjU0MzIxMGZlZGNiYTk4NzY1NDMyMTA=',
  TRAINING_MAX_PLANNED_WEEKS: '104',
  LEARNING_DOCUMENT_MIN_DWELL_SECONDS: '5',
  LEARNING_IMAGE_MIN_DWELL_SECONDS: '5',
  AI_PROVIDER: 'test_fake',
  AI_FAKE_PROVIDER_MODE: 'valid',
  AUTH_TRUST_PROXY: 'false',
};

Object.assign(process.env, e2eEnvironment);

export default defineConfig({
  testDir: './apps/api/e2e',
  globalSetup: './apps/api/e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @unicom/api dev',
      url: 'http://localhost:4000/health/ready',
      timeout: 180_000,
      reuseExistingServer: process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === 'true',
      env: { ...process.env, ...e2eEnvironment },
    },
    {
      command: 'pnpm --filter @unicom/web dev',
      url: 'http://localhost:3000/login',
      timeout: 180_000,
      reuseExistingServer: process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === 'true',
      env: { ...process.env, ...e2eEnvironment },
    },
  ],
});
