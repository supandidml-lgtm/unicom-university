import type { INestApplication } from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadApiEnvironment } from '@unicom/config';
import { AuthSecurityEventType, prisma } from '@unicom/database';
import { createApiApplication } from '../src/application.js';
import { generateOpaqueToken, hashOpaqueToken } from '../src/modules/auth/auth.crypto.js';
import { PasswordService } from '../src/modules/auth/password.service.js';
import { sessionCookieOptions } from '../src/modules/auth/session-cookie.js';

const password = 'secure-password-for-tests';

describe('authentication foundation', () => {
  let app: INestApplication;
  let passwordService: PasswordService;
  let redis: RedisClientType;

  beforeAll(async () => {
    const environment = loadApiEnvironment();
    redis = createClient({
      socket: { host: environment.REDIS_HOST, port: environment.REDIS_PORT },
    });
    await redis.connect();
    const application = await createApiApplication();
    app = application.app;
    await app.init();
    passwordService = app.get(PasswordService);
  });

  beforeEach(async () => {
    await prisma.authSecurityEvent.deleteMany();
    await prisma.authSession.deleteMany();
    await prisma.invitationToken.deleteMany();
    await prisma.user.deleteMany();
    const keys: string[] = [];
    for await (const result of redis.scanIterator({ MATCH: 'auth:login:test:*' })) {
      keys.push(...result);
    }
    if (keys.length > 0) {
      await redis.sendCommand(['DEL', ...keys]);
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (redis?.isOpen) {
      await redis.quit();
    }
    await prisma.$disconnect();
  });

  it('activates a valid invitation atomically and rejects replay', async () => {
    const { token, user } = await createInvitation('invited@example.com');

    await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token, password, confirmPassword: password })
      .expect(204);

    const activated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(activated.status).toBe('ACTIVE');
    expect(activated.passwordHash).toContain('$argon2id$');
    expect(activated.activatedAt).not.toBeNull();
    expect(
      await prisma.invitationToken.findUniqueOrThrow({
        where: { tokenHash: hashOpaqueToken(token) },
      }),
    ).toMatchObject({ usedAt: expect.any(Date) });

    const replay = await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token, password, confirmPassword: password })
      .expect(400);
    expect(replay.body.message).toBe('Invalid or expired invitation token.');
  });

  it('rejects expired invitations and invited accounts cannot login', async () => {
    const { token } = await createInvitation('expired@example.com', new Date(Date.now() - 1_000));
    await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token, password, confirmPassword: password })
      .expect(400);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'expired@example.com', password })
      .expect(401);
    expect(response.body.message).toBe('Invalid email or password.');
  });

  it('uses generic login failures for unknown, wrong-password, suspended, and disabled accounts', async () => {
    await createActiveUser('active@example.com');
    await createActiveUser('suspended@example.com', 'SUSPENDED');
    await createActiveUser('disabled@example.com', 'DISABLED');

    const cases = [
      { email: 'unknown@example.com', password },
      { email: 'active@example.com', password: 'wrong-password' },
      { email: 'suspended@example.com', password },
      { email: 'disabled@example.com', password },
    ];
    for (const input of cases) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(input)
        .expect(401);
      expect(response.body.message).toBe('Invalid email or password.');
    }
  });

  it('creates only a hashed opaque session, supports /me, and revokes it at logout', async () => {
    const user = await createActiveUser('login@example.com');
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ' LOGIN@example.com ', password })
      .expect(200);

    const setCookie = login.headers['set-cookie'];
    const rawCookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie) as string;
    const cookie = rawCookie.split(';')[0] as string;
    const rawToken = cookie.split('=')[1] as string;
    expect(rawCookie).toContain('HttpOnly');
    expect(rawCookie).toContain('SameSite=Lax');
    expect(rawCookie).toContain('Path=/');
    expect(login.body).toEqual({
      user: { id: user.id, email: user.email, status: 'ACTIVE' },
      csrfToken: expect.any(String),
    });

    const session = await prisma.authSession.findFirstOrThrow({ where: { userId: user.id } });
    expect(session.tokenHash).toBe(hashOpaqueToken(rawToken));
    expect(session.tokenHash).not.toContain(rawToken);

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookie)
      .expect(200);
    expect(me.body.user).toEqual({
      id: user.id,
      email: user.email,
      status: 'ACTIVE',
      roles: [],
      permissions: [],
    });
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', login.body.csrfToken)
      .expect(204);
    await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', cookie).expect(401);

    const events = await prisma.authSecurityEvent.findMany({ where: { userId: user.id } });
    expect(events.map((event) => event.eventType)).toEqual(
      expect.arrayContaining([
        AuthSecurityEventType.LOGIN_SUCCESS,
        AuthSecurityEventType.SESSION_CREATED,
        AuthSecurityEventType.SESSION_REVOKED,
        AuthSecurityEventType.LOGOUT,
      ]),
    );
  });

  it('rejects an expired server-side session and creates an expiration event', async () => {
    const user = await createActiveUser('expired-session@example.com');
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: user.email, password })
      .expect(200);
    const expiredSetCookie = login.headers['set-cookie'];
    const cookie = (
      Array.isArray(expiredSetCookie) ? expiredSetCookie[0] : expiredSetCookie
    )?.split(';')[0] as string;
    await prisma.authSession.updateMany({
      where: { userId: user.id },
      data: { idleExpiresAt: new Date(0) },
    });

    await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', cookie).expect(401);
    await expect(
      prisma.authSecurityEvent.findFirstOrThrow({
        where: { eventType: 'SESSION_EXPIRED', userId: user.id },
      }),
    ).resolves.toBeDefined();
  });

  it('rate limits without exposing account existence', async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password })
        .expect(401);
    }
    const rateLimited = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password })
      .expect(401);
    expect(rateLimited.body.message).toBe('Invalid email or password.');
    await expect(
      prisma.authSecurityEvent.findFirstOrThrow({ where: { eventType: 'LOGIN_RATE_LIMITED' } }),
    ).resolves.toBeDefined();
  });

  it('uses secure production cookie attributes', () => {
    const options = sessionCookieOptions({ ...loadApiEnvironment(), NODE_ENV: 'production' });
    expect(options).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
  });

  async function createActiveUser(
    email: string,
    status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED' = 'ACTIVE',
  ) {
    return prisma.user.create({
      data: {
        email,
        normalizedEmail: email.toLowerCase(),
        passwordHash: await passwordService.hash(password),
        status,
        ...(status === 'ACTIVE' ? { activatedAt: new Date(), emailVerifiedAt: new Date() } : {}),
      },
    });
  }

  async function createInvitation(email: string, expiresAt = new Date(Date.now() + 3_600_000)) {
    const user = await prisma.user.create({
      data: { email, normalizedEmail: email.toLowerCase() },
    });
    const token = generateOpaqueToken();
    await prisma.invitationToken.create({
      data: { userId: user.id, tokenHash: hashOpaqueToken(token), expiresAt },
    });
    return { token, user };
  }
});
