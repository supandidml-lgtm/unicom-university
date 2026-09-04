import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadApiEnvironment } from '@unicom/config';
import { createApiApplication } from '../src/application.js';

const validEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: 'test',
  APP_NAME: 'UNICOM UNIVERSITY',
  APP_ENV: 'test',
  LOG_LEVEL: 'fatal',
  API_PORT: '4000',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/unicom_test?schema=public',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  WEB_ORIGIN: 'http://localhost:3000',
  AUTH_INVITATION_TTL_HOURS: '72',
  AUTH_SESSION_IDLE_MINUTES: '480',
  AUTH_SESSION_ABSOLUTE_HOURS: '168',
  AUTH_LOGIN_MAX_FAILURES: '3',
  AUTH_LOGIN_WINDOW_MINUTES: '15',
  AUTH_LOGIN_IP_MAX_FAILURES: '10',
  AUTH_COOKIE_NAME: 'unicom_test_session',
  AUTH_RATE_LIMIT_SECRET: 'test-only-rate-limit-secret-that-is-long-enough-12345',
  AUTH_TRUST_PROXY: 'false',
};

const validProductionEnvironment: NodeJS.ProcessEnv = {
  ...validEnvironment,
  NODE_ENV: 'production',
  APP_ENV: 'production',
  DATABASE_URL: 'postgresql://unicom:strong-production-password@database.example.test:5432/unicom',
  WEB_ORIGIN: 'https://app.example.test',
  WEB_PUBLIC_URL: 'https://app.example.test',
  CORS_ALLOWED_ORIGINS: 'https://app.example.test,https://admin.example.test',
  AUTH_RATE_LIMIT_SECRET: 'prod-rate-limit-secret-genuinely-unique-9876543210',
  PROFILE_PII_ENCRYPTION_KEY: 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=',
  PROFILE_NIK_HMAC_KEY: 'Hh0cGxoZGBcWFRQTEhEQDw4NDAsKCQgHBgUEAwIBAAA=',
  MATERIAL_STORAGE_PROVIDER: 's3',
  MATERIAL_S3_ENDPOINT: 'https://storage.example.test',
  MATERIAL_S3_BUCKET: 'unicom-private-assets',
  MATERIAL_S3_ACCESS_KEY_ID: 'production-access-key',
  MATERIAL_S3_SECRET_ACCESS_KEY: 'production-storage-secret',
};

describe('API foundation', () => {
  let app: INestApplication;

  beforeEach(async () => {
    Object.assign(process.env, validEnvironment);
    const application = await createApiApplication();
    app = application.app;
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('boots and exposes a safe health response', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body).toMatchObject({ status: 'ok', service: 'api', environment: 'test' });
    expect(response.headers['x-request-id']).toMatch(/^[a-zA-Z0-9-]{8,128}$/);
  });

  it('sets production-safe browser headers and rejects unknown browser origins', async () => {
    const allowed = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', validEnvironment['WEB_ORIGIN']!)
      .expect(200);
    expect(allowed.headers['access-control-allow-origin']).toBe(validEnvironment['WEB_ORIGIN']);
    expect(allowed.headers['content-security-policy']).toContain("default-src 'self'");
    expect(allowed.headers['x-content-type-options']).toBe('nosniff');
    expect(allowed.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(allowed.headers['referrer-policy']).toBe('no-referrer');

    const rejected = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'https://untrusted.example.test')
      .expect(403);
    expect(rejected.body).toMatchObject({ message: 'Origin is not allowed.' });
  });

  it('returns a consistent response for an unknown route', async () => {
    const response = await request(app.getHttpServer()).get('/unknown-route').expect(404);

    expect(response.body).toMatchObject({ statusCode: 404, requestId: expect.any(String) });
  });

  it('reports readiness when isolated test infrastructure is available', async () => {
    const response = await request(app.getHttpServer()).get('/health/ready').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'api',
      environment: 'test',
    });
  });

  it('fails readiness closed when Redis is unavailable', async () => {
    process.env['REDIS_PORT'] = '6399';

    await request(app.getHttpServer()).get('/health/ready').expect(503);

    process.env['REDIS_PORT'] = validEnvironment['REDIS_PORT'];
  });

  it('rejects missing required infrastructure configuration', () => {
    const invalidEnvironment = { ...validEnvironment };
    delete invalidEnvironment['DATABASE_URL'];

    expect(() => loadApiEnvironment(invalidEnvironment)).toThrow(
      'Invalid application configuration',
    );
  });

  it('rejects unsafe production configuration before startup', () => {
    expect(() =>
      loadApiEnvironment({
        ...validProductionEnvironment,
        CORS_ALLOWED_ORIGINS: '*',
      }),
    ).toThrow('CORS_ALLOWED_ORIGINS');
    expect(() =>
      loadApiEnvironment({
        ...validProductionEnvironment,
        AUTH_RATE_LIMIT_SECRET: 'replace-with-a-production-secret-that-is-not-real',
      }),
    ).toThrow('AUTH_RATE_LIMIT_SECRET');
    expect(() =>
      loadApiEnvironment({
        ...validProductionEnvironment,
        MATERIAL_S3_ENDPOINT: 'http://storage.example.test',
      }),
    ).toThrow('object storage must use HTTPS');
  });
});
