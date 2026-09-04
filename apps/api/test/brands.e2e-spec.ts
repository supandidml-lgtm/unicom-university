import type { INestApplication } from '@nestjs/common';
import {
  AuthSecurityEventType,
  BrandStatus,
  prisma,
  seedAuthorizationData,
  SystemRoleCode,
} from '@unicom/database';
import { loadApiEnvironment } from '@unicom/config';
import { createClient, type RedisClientType } from 'redis';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/application.js';
import { PasswordService } from '../src/modules/auth/password.service.js';

const password = 'brand-scope-test-password';

describe('Brand management and Brand-scoped authorization', () => {
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
    const keys: string[] = [];
    for await (const result of redis.scanIterator({ MATCH: 'auth:login:test:*' })) {
      keys.push(...result);
    }
    if (keys.length > 0) {
      await redis.sendCommand(['DEL', ...keys]);
    }
    await prisma.authSecurityEvent.deleteMany();
    await prisma.authSession.deleteMany();
    await prisma.invitationToken.deleteMany();
    await prisma.userBrandAccess.deleteMany();
    await prisma.brand.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.user.deleteMany();
    await seedAuthorizationData(prisma);
  });

  afterAll(async () => {
    await app.close();
    await redis.quit();
    await prisma.$disconnect();
  });

  it('allows only Super Administrators to manage Brands and blocks mutation mass assignment', async () => {
    await request(app.getHttpServer()).get('/api/v1/brands').expect(401);
    const trainee = await createActiveUser('trainee@example.test', SystemRoleCode.Trainee);
    const traineeSession = await login(trainee.email);
    await request(app.getHttpServer())
      .get('/api/v1/brands')
      .set('Cookie', traineeSession.cookie)
      .expect(403);

    const administrator = await createActiveUser(
      'administrator@example.test',
      SystemRoleCode.SuperAdministrator,
    );
    const session = await login(administrator.email);
    await request(app.getHttpServer())
      .post('/api/v1/brands')
      .set('Cookie', session.cookie)
      .send({ code: 'NO_CSRF', name: 'No CSRF' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/brands')
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ code: 'MANAGED', name: 'Managed', status: 'ARCHIVED' })
      .expect(400);

    const created = await request(app.getHttpServer())
      .post('/api/v1/brands')
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ code: 'XIAOMI', name: 'Xiaomi', description: 'Initial Brand.' })
      .expect(201);
    expect(created.body).toMatchObject({ code: 'XIAOMI', status: BrandStatus.ACTIVE });
    await request(app.getHttpServer())
      .get('/api/v1/brands?pageSize=100')
      .set('Cookie', session.cookie)
      .expect(200)
      .expect(({ body }) =>
        expect(body.items.map((brand: { code: string }) => brand.code)).toContain('XIAOMI'),
      );
    await request(app.getHttpServer())
      .patch(`/api/v1/brands/${created.body.id}`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ code: 'CHANGED' })
      .expect(400);
    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/brands/${created.body.id}`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ name: 'Xiaomi Indonesia', description: 'Updated Brand.' })
      .expect(200);
    expect(updated.body.name).toBe('Xiaomi Indonesia');

    await request(app.getHttpServer())
      .patch(`/api/v1/brands/${created.body.id}/archive`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe(BrandStatus.ARCHIVED));
    await request(app.getHttpServer())
      .patch(`/api/v1/brands/${created.body.id}/reactivate`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe(BrandStatus.ACTIVE));
    await expect(
      prisma.authSecurityEvent.findFirstOrThrow({
        where: { eventType: AuthSecurityEventType.BRAND_REACTIVATED },
      }),
    ).resolves.toBeDefined();
  });

  it('filters Trainer Brand lists server-side and blocks cross-Brand IDOR immediately', async () => {
    const administrator = await createActiveUser(
      'administrator@example.test',
      SystemRoleCode.SuperAdministrator,
    );
    const trainer = await createActiveUser('trainer@example.test', SystemRoleCode.Trainer);
    const administratorSession = await login(administrator.email);
    const trainerSession = await login(trainer.email);
    const [firstBrand, secondBrand] = await Promise.all([
      createBrand(administratorSession, 'XIAOMI', 'Xiaomi'),
      createBrand(administratorSession, 'MULTIBRAND', 'Multibrand'),
    ]);

    await request(app.getHttpServer())
      .get('/api/v1/brands')
      .set('Cookie', trainerSession.cookie)
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
    await request(app.getHttpServer())
      .post(`/api/v1/users/${trainer.id}/brand-access`)
      .set('Cookie', administratorSession.cookie)
      .set('X-CSRF-Token', administratorSession.csrfToken)
      .send({ brandId: firstBrand.id })
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/v1/brands')
      .set('Cookie', trainerSession.cookie)
      .expect(200)
      .expect(({ body }) =>
        expect(body.items.map((brand: { code: string }) => brand.code)).toEqual(['XIAOMI']),
      );
    await request(app.getHttpServer())
      .get(`/api/v1/brands/${firstBrand.id}`)
      .set('Cookie', trainerSession.cookie)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/brands/${secondBrand.id}`)
      .set('Cookie', trainerSession.cookie)
      .expect(403);
    await expect(
      prisma.authSecurityEvent.findFirstOrThrow({
        where: { eventType: AuthSecurityEventType.BRAND_ACCESS_DENIED },
      }),
    ).resolves.toMatchObject({ userId: trainer.id });

    await request(app.getHttpServer())
      .delete(`/api/v1/users/${trainer.id}/brand-access/${firstBrand.id}`)
      .set('Cookie', administratorSession.cookie)
      .set('X-CSRF-Token', administratorSession.csrfToken)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/api/v1/brands/${firstBrand.id}`)
      .set('Cookie', trainerSession.cookie)
      .expect(403);
  });

  it('rejects non-Trainer or archived Brand assignments and ignores stale access after role removal', async () => {
    const administrator = await createActiveUser(
      'administrator@example.test',
      SystemRoleCode.SuperAdministrator,
    );
    const trainer = await createActiveUser('trainer@example.test', SystemRoleCode.Trainer);
    const trainee = await createActiveUser('trainee@example.test', SystemRoleCode.Trainee);
    const administratorSession = await login(administrator.email);
    const trainerSession = await login(trainer.email);
    const brand = await createBrand(administratorSession, 'XIAOMI', 'Xiaomi');
    await request(app.getHttpServer())
      .post(`/api/v1/users/${trainee.id}/brand-access`)
      .set('Cookie', administratorSession.cookie)
      .set('X-CSRF-Token', administratorSession.csrfToken)
      .send({ brandId: brand.id })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/api/v1/brands/${brand.id}/archive`)
      .set('Cookie', administratorSession.cookie)
      .set('X-CSRF-Token', administratorSession.csrfToken)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/users/${trainer.id}/brand-access`)
      .set('Cookie', administratorSession.cookie)
      .set('X-CSRF-Token', administratorSession.csrfToken)
      .send({ brandId: brand.id })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/api/v1/brands/${brand.id}/reactivate`)
      .set('Cookie', administratorSession.cookie)
      .set('X-CSRF-Token', administratorSession.csrfToken)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/users/${trainer.id}/brand-access`)
      .set('Cookie', administratorSession.cookie)
      .set('X-CSRF-Token', administratorSession.csrfToken)
      .send({ brandId: brand.id })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/users/${trainer.id}/brand-access`)
      .set('Cookie', administratorSession.cookie)
      .set('X-CSRF-Token', administratorSession.csrfToken)
      .send({ brandId: brand.id })
      .expect(201);
    const accessList = await request(app.getHttpServer())
      .get(`/api/v1/users/${trainer.id}/brand-access`)
      .set('Cookie', administratorSession.cookie)
      .expect(200);
    expect(accessList.body).toHaveLength(1);
    await request(app.getHttpServer())
      .patch(`/api/v1/brands/${brand.id}/archive`)
      .set('Cookie', administratorSession.cookie)
      .set('X-CSRF-Token', administratorSession.csrfToken)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/brands/${brand.id}`)
      .set('Cookie', trainerSession.cookie)
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/v1/brands/${brand.id}/reactivate`)
      .set('Cookie', administratorSession.cookie)
      .set('X-CSRF-Token', administratorSession.csrfToken)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/brands/${brand.id}`)
      .set('Cookie', trainerSession.cookie)
      .expect(200);
    const trainerRole = await prisma.role.findUniqueOrThrow({
      where: { code: SystemRoleCode.Trainer },
    });
    await request(app.getHttpServer())
      .delete(`/api/v1/users/${trainer.id}/roles/${trainerRole.id}`)
      .set('Cookie', administratorSession.cookie)
      .set('X-CSRF-Token', administratorSession.csrfToken)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/api/v1/brands/${brand.id}`)
      .set('Cookie', trainerSession.cookie)
      .expect(403);
  });

  async function createActiveUser(email: string, roleCode?: SystemRoleCode) {
    const user = await prisma.user.create({
      data: {
        email,
        normalizedEmail: email,
        passwordHash: await passwordService.hash(password),
        status: 'ACTIVE',
        activatedAt: new Date(),
        emailVerifiedAt: new Date(),
      },
    });
    if (roleCode) {
      const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
      await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
    }
    return user;
  }

  async function login(email: string): Promise<{ cookie: string; csrfToken: string }> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const rawCookie = (
      Array.isArray(response.headers['set-cookie'])
        ? response.headers['set-cookie'][0]
        : response.headers['set-cookie']
    ) as string;
    return {
      cookie: rawCookie.split(';')[0] as string,
      csrfToken: response.body.csrfToken as string,
    };
  }

  async function createBrand(
    session: { cookie: string; csrfToken: string },
    code: string,
    name: string,
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/brands')
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ code, name })
      .expect(201);
    return response.body as { id: string; code: string };
  }
});
