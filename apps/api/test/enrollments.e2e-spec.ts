import type { INestApplication } from '@nestjs/common';
import {
  EnrollmentStatus,
  prisma,
  seedAuthorizationData,
  SystemRoleCode,
  UserStatus,
} from '@unicom/database';
import { loadApiEnvironment } from '@unicom/config';
import { createClient, type RedisClientType } from 'redis';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/application.js';
import { PasswordService } from '../src/modules/auth/password.service.js';
import { StaffProfileCrypto } from '../src/modules/staff/staff-profile.crypto.js';

const password = 'enrollment-test-password';
const prefix = 'enroll-test-';

describe('training enrollment authorization and lifecycle', () => {
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
    const users = await prisma.user.findMany({
      where: { normalizedEmail: { startsWith: prefix } },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    await prisma.trainingEnrollment.deleteMany({ where: { participantUserId: { in: userIds } } });
    await prisma.userBrandAccess.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.brand.deleteMany({ where: { code: { startsWith: 'ENROLL_TEST_' } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await seedAuthorizationData(prisma);
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { normalizedEmail: { startsWith: prefix } },
      select: { id: true },
    });
    await prisma.trainingEnrollment.deleteMany({
      where: { participantUserId: { in: users.map((user) => user.id) } },
    });
    await prisma.userBrandAccess.deleteMany({
      where: { userId: { in: users.map((user) => user.id) } },
    });
    await prisma.brand.deleteMany({ where: { code: { startsWith: 'ENROLL_TEST_' } } });
    await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
    await redis.disconnect();
    await app.close();
  });

  it('creates multi-Brand enrollment atomically and permits cancellation then retraining', async () => {
    const administrator = await createUser(
      'admin',
      SystemRoleCode.SuperAdministrator,
      UserStatus.ACTIVE,
    );
    const participant = await createUser(
      'invited-participant',
      SystemRoleCode.Trainee,
      UserStatus.INVITED,
      administrator.id,
    );
    const [brandA, brandB] = await createBrands(administrator.id);
    if (!brandA || !brandB) throw new Error('Expected test Brands.');
    const session = await login(administrator.email);

    const created = await request(app.getHttpServer())
      .post(`/api/v1/participants/${participant.id}/enrollments`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({
        enrollments: [
          { brandId: brandA.id, plannedWeekCount: 4 },
          { brandId: brandB.id, plannedWeekCount: 2 },
        ],
      })
      .expect(201);
    expect(created.body.items).toHaveLength(2);
    expect(created.body.items.map((item: { status: string }) => item.status)).toEqual([
      'NOT_STARTED',
      'NOT_STARTED',
    ]);

    await request(app.getHttpServer())
      .post(`/api/v1/participants/${participant.id}/enrollments`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ enrollments: [{ brandId: brandA.id, plannedWeekCount: 4 }] })
      .expect(409);
    await request(app.getHttpServer())
      .patch(`/api/v1/enrollments/${created.body.items[0].id as string}`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ plannedWeekCount: 6 })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/enrollments/${created.body.items[0].id as string}/cancel`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .expect(201);
    const reenrolled = await request(app.getHttpServer())
      .post(`/api/v1/participants/${participant.id}/enrollments`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ enrollments: [{ brandId: brandA.id, plannedWeekCount: 3 }] })
      .expect(201);
    expect(reenrolled.body.items[0]).toMatchObject({ status: 'NOT_STARTED', plannedWeekCount: 3 });
  });

  it('requires Trainer ownership plus Brand scope and rolls back unauthorized bulk input', async () => {
    const administrator = await createUser(
      'admin-scope',
      SystemRoleCode.SuperAdministrator,
      UserStatus.ACTIVE,
    );
    const trainer = await createUser('trainer-owner', SystemRoleCode.Trainer, UserStatus.ACTIVE);
    const foreignTrainer = await createUser(
      'trainer-foreign',
      SystemRoleCode.Trainer,
      UserStatus.ACTIVE,
    );
    const participant = await createUser(
      'owned-participant',
      SystemRoleCode.Trainee,
      UserStatus.ACTIVE,
      trainer.id,
    );
    const foreignParticipant = await createUser(
      'foreign-participant',
      SystemRoleCode.Trainee,
      UserStatus.ACTIVE,
      foreignTrainer.id,
    );
    const [brandA, brandB] = await createBrands(administrator.id);
    if (!brandA || !brandB) throw new Error('Expected test Brands.');
    await prisma.userBrandAccess.create({
      data: { userId: trainer.id, brandId: brandA.id, createdByUserId: administrator.id },
    });
    const session = await login(trainer.email);

    await request(app.getHttpServer())
      .post(`/api/v1/participants/${participant.id}/enrollments`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({
        enrollments: [
          { brandId: brandA.id, plannedWeekCount: 4 },
          { brandId: brandB.id, plannedWeekCount: 2 },
        ],
      })
      .expect(403);
    expect(
      await prisma.trainingEnrollment.count({ where: { participantUserId: participant.id } }),
    ).toBe(0);
    await prisma.trainingEnrollment.create({
      data: {
        participantUserId: foreignParticipant.id,
        brandId: brandB.id,
        plannedWeekCount: 4,
        assignedByUserId: administrator.id,
      },
    });
    const outOfScopeList = await request(app.getHttpServer())
      .get(`/api/v1/enrollments?brandId=${brandB.id}`)
      .set('Cookie', session.cookie)
      .expect(200);
    expect(outOfScopeList.body.items).toEqual([]);
    await request(app.getHttpServer())
      .post(`/api/v1/participants/${foreignParticipant.id}/enrollments`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ enrollments: [{ brandId: brandA.id, plannedWeekCount: 4 }] })
      .expect(403);

    const created = await request(app.getHttpServer())
      .post(`/api/v1/participants/${participant.id}/enrollments`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ enrollments: [{ brandId: brandA.id, plannedWeekCount: 4 }] })
      .expect(201);
    await prisma.userBrandAccess.delete({
      where: { userId_brandId: { userId: trainer.id, brandId: brandA.id } },
    });
    await request(app.getHttpServer())
      .get(`/api/v1/enrollments/${created.body.items[0].id as string}`)
      .set('Cookie', session.cookie)
      .expect(403);
  });

  it('extends Trainer read visibility through active scoped enrollment but keeps profile mutation ownership-only', async () => {
    const administrator = await createUser(
      'admin-visibility',
      SystemRoleCode.SuperAdministrator,
      UserStatus.ACTIVE,
    );
    const owner = await createUser(
      'trainer-owner-visibility',
      SystemRoleCode.Trainer,
      UserStatus.ACTIVE,
    );
    const observer = await createUser(
      'trainer-observer',
      SystemRoleCode.Trainer,
      UserStatus.ACTIVE,
    );
    const participant = await createUser(
      'shared-participant',
      SystemRoleCode.Trainee,
      UserStatus.ACTIVE,
      owner.id,
    );
    const [brand] = await createBrands(administrator.id);
    if (!brand) throw new Error('Expected a test Brand.');
    await prisma.trainingEnrollment.create({
      data: {
        participantUserId: participant.id,
        brandId: brand.id,
        plannedWeekCount: 4,
        assignedByUserId: administrator.id,
      },
    });
    await prisma.userBrandAccess.create({
      data: { userId: observer.id, brandId: brand.id, createdByUserId: administrator.id },
    });
    const session = await login(observer.email);

    await request(app.getHttpServer())
      .get(`/api/v1/participants/${participant.id}`)
      .set('Cookie', session.cookie)
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/v1/participants/${participant.id}`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ fullName: 'Must Not Update' })
      .expect(403);
    await prisma.userRole.deleteMany({
      where: { userId: observer.id, role: { code: SystemRoleCode.Trainer } },
    });
    await request(app.getHttpServer())
      .get(`/api/v1/participants/${participant.id}`)
      .set('Cookie', session.cookie)
      .expect(403);
  });

  it('allows a Trainee to read only own assignments and enforces concurrent active uniqueness', async () => {
    const administrator = await createUser(
      'admin-self',
      SystemRoleCode.SuperAdministrator,
      UserStatus.ACTIVE,
    );
    const participant = await createUser(
      'self-participant',
      SystemRoleCode.Trainee,
      UserStatus.ACTIVE,
      administrator.id,
    );
    const otherParticipant = await createUser(
      'other-participant',
      SystemRoleCode.Trainee,
      UserStatus.ACTIVE,
      administrator.id,
    );
    const [brandA, brandB] = await createBrands(administrator.id);
    if (!brandA || !brandB) throw new Error('Expected test Brands.');
    const adminSession = await login(administrator.email);
    const participantSession = await login(participant.email);
    const payload = { enrollments: [{ brandId: brandA.id, plannedWeekCount: 4 }] };
    const [left, right] = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/v1/participants/${participant.id}/enrollments`)
        .set('Cookie', adminSession.cookie)
        .set('X-CSRF-Token', adminSession.csrfToken)
        .send(payload),
      request(app.getHttpServer())
        .post(`/api/v1/participants/${participant.id}/enrollments`)
        .set('Cookie', adminSession.cookie)
        .set('X-CSRF-Token', adminSession.csrfToken)
        .send(payload),
    ]);
    expect([left.status, right.status].sort()).toEqual([201, 409]);
    const other = await prisma.trainingEnrollment.create({
      data: {
        participantUserId: otherParticipant.id,
        brandId: brandB.id,
        plannedWeekCount: 2,
        assignedByUserId: administrator.id,
      },
    });
    await request(app.getHttpServer())
      .get('/api/v1/my-training/enrollments')
      .set('Cookie', participantSession.cookie)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/enrollments/${other.id}`)
      .set('Cookie', participantSession.cookie)
      .expect(403);
    await prisma.trainingEnrollment.update({
      where: { id: other.id },
      data: { status: EnrollmentStatus.IN_PROGRESS },
    });
    await request(app.getHttpServer())
      .patch(`/api/v1/enrollments/${other.id}`)
      .set('Cookie', adminSession.cookie)
      .set('X-CSRF-Token', adminSession.csrfToken)
      .send({ plannedWeekCount: 9 })
      .expect(400);
  });

  async function createUser(
    label: string,
    roleCode: SystemRoleCode,
    status: UserStatus,
    createdByUserId?: string,
  ) {
    const email = `${prefix}${label}-${Math.random().toString(36).slice(2)}@example.test`;
    const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    const user = await prisma.user.create({
      data: {
        email,
        normalizedEmail: email,
        passwordHash: await passwordService.hash(password),
        status,
        ...(status === UserStatus.ACTIVE
          ? { activatedAt: new Date(), emailVerifiedAt: new Date() }
          : {}),
        userRoles: { create: { roleId: role.id } },
      },
    });
    if (roleCode === SystemRoleCode.Trainee) {
      const nik =
        `3174123456${String(Math.floor(Math.random() * 10_000_000)).padStart(6, '0')}`.slice(0, 16);
      const crypto = new StaffProfileCrypto();
      await prisma.staffProfile.create({
        data: {
          userId: user.id,
          ...(createdByUserId ? { createdByUserId } : {}),
          fullName: label,
          phoneNumber: '+6281234567890',
          normalizedPhone: '+6281234567890',
          encryptedNik: crypto.encryptNik(nik),
          nikFingerprint: crypto.fingerprintNik(nik),
          nikFirst4: nik.slice(0, 4),
          nikLast4: nik.slice(-4),
        },
      });
    }
    return user;
  }

  async function createBrands(actorId: string) {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    return Promise.all(
      ['A', 'B'].map((part) =>
        prisma.brand.create({
          data: {
            code: `ENROLL_TEST_${part}_${suffix}`,
            name: `Enrollment Brand ${part}`,
            createdByUserId: actorId,
          },
        }),
      ),
    );
  }

  async function login(email: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const cookies = response.headers['set-cookie'];
    const cookie = Array.isArray(cookies) ? cookies[0] : undefined;
    if (!cookie) throw new Error('Expected a session cookie.');
    return { cookie, csrfToken: response.body.csrfToken as string };
  }
});
