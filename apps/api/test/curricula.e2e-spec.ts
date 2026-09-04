import type { INestApplication } from '@nestjs/common';
import {
  AuthSecurityEventType,
  CurriculumVersionStatus,
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

const password = 'curriculum-test-password';
const emailPrefix = 'curriculum-test-';
const brandPrefix = 'CURRICULUM_TEST_';

describe('curriculum versioning, scoped operations, and enrollment binding', () => {
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
    await cleanup();
    await seedAuthorizationData(prisma);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
    await redis.quit();
    await prisma.$disconnect();
  });

  it('enforces Brand scope, draft immutability, safe version lifecycle, and exact enrollment binding', async () => {
    const administrator = await createUser('administrator', SystemRoleCode.SuperAdministrator);
    const trainer = await createUser('trainer', SystemRoleCode.Trainer);
    const participant = await createUser('participant', SystemRoleCode.Trainee);
    const [brandA, brandB] = await Promise.all([
      prisma.brand.create({ data: { code: `${brandPrefix}A`, name: 'Curriculum Test A' } }),
      prisma.brand.create({ data: { code: `${brandPrefix}B`, name: 'Curriculum Test B' } }),
    ]);
    await prisma.userBrandAccess.create({ data: { userId: trainer.id, brandId: brandA.id } });
    const trainerSession = await login(trainer.email);

    await request(app.getHttpServer())
      .post('/api/v1/curricula')
      .set('Cookie', trainerSession.cookie)
      .set('X-CSRF-Token', trainerSession.csrfToken)
      .send({ brandId: brandB.id, code: 'OUT_OF_SCOPE', name: 'Out of scope' })
      .expect(403);
    const curriculumResponse = await request(app.getHttpServer())
      .post('/api/v1/curricula')
      .set('Cookie', trainerSession.cookie)
      .set('X-CSRF-Token', trainerSession.csrfToken)
      .send({ brandId: brandA.id, code: 'ONBOARDING', name: 'Onboarding', status: 'ARCHIVED' })
      .expect(400);
    expect(curriculumResponse.body).toMatchObject({});
    const created = await request(app.getHttpServer())
      .post('/api/v1/curricula')
      .set('Cookie', trainerSession.cookie)
      .set('X-CSRF-Token', trainerSession.csrfToken)
      .send({ brandId: brandA.id, code: 'ONBOARDING', name: 'Onboarding' })
      .expect(201);
    const curriculumId = created.body.id as string;

    await request(app.getHttpServer())
      .get(`/api/v1/curricula/${curriculumId}`)
      .set('Cookie', trainerSession.cookie)
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/v1/curricula/${curriculumId}/archive`)
      .set('Cookie', trainerSession.cookie)
      .set('X-CSRF-Token', trainerSession.csrfToken)
      .expect(403);

    const versions = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .post(`/api/v1/curricula/${curriculumId}/versions`)
          .set('Cookie', trainerSession.cookie)
          .set('X-CSRF-Token', trainerSession.csrfToken)
          .send({})
          .expect(201),
      ),
    );
    const [firstVersionResponse] = [...versions].sort(
      (left, right) => left.body.versionNumber - right.body.versionNumber,
    );
    if (!firstVersionResponse) throw new Error('Expected a created Curriculum version.');
    const firstVersion = firstVersionResponse.body as { id: string; versionNumber: number };
    expect(versions.map((item) => item.body.versionNumber).sort()).toEqual([1, 2]);

    const firstWeek = await addWeek(firstVersion.id, 1, 'Foundations', trainerSession);
    const thirdWeek = await addWeek(firstVersion.id, 3, 'Practice', trainerSession);
    await request(app.getHttpServer())
      .post(`/api/v1/curriculum-versions/${firstVersion.id}/publish`)
      .set('Cookie', trainerSession.cookie)
      .set('X-CSRF-Token', trainerSession.csrfToken)
      .expect(400);
    const secondWeek = await addWeek(firstVersion.id, 2, 'Application', trainerSession);
    await request(app.getHttpServer())
      .put(`/api/v1/curriculum-versions/${firstVersion.id}/weeks/order`)
      .set('Cookie', trainerSession.cookie)
      .set('X-CSRF-Token', trainerSession.csrfToken)
      .send({ ids: [thirdWeek, secondWeek, firstWeek] })
      .expect(200);
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/curriculum-versions/${firstVersion.id}`)
      .set('Cookie', trainerSession.cookie)
      .expect(200);
    expect(detail.body.weeks.map((week: { weekNumber: number }) => week.weekNumber)).toEqual([
      1, 2, 3,
    ]);
    await request(app.getHttpServer())
      .post(`/api/v1/curriculum-versions/${firstVersion.id}/publish`)
      .set('Cookie', trainerSession.cookie)
      .set('X-CSRF-Token', trainerSession.csrfToken)
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/curriculum-weeks/${firstWeek}`)
      .set('Cookie', trainerSession.cookie)
      .set('X-CSRF-Token', trainerSession.csrfToken)
      .send({ title: 'This must remain immutable' })
      .expect(400);

    const clone = await request(app.getHttpServer())
      .post(`/api/v1/curricula/${curriculumId}/versions`)
      .set('Cookie', trainerSession.cookie)
      .set('X-CSRF-Token', trainerSession.csrfToken)
      .send({ cloneFromVersionId: firstVersion.id })
      .expect(201);
    const publishedVersionId = clone.body.id as string;
    expect(clone.body).toMatchObject({ status: CurriculumVersionStatus.DRAFT, weekCount: 3 });
    await request(app.getHttpServer())
      .post(`/api/v1/curriculum-versions/${publishedVersionId}/publish`)
      .set('Cookie', trainerSession.cookie)
      .set('X-CSRF-Token', trainerSession.csrfToken)
      .expect(201);
    await expect(
      prisma.curriculumVersion.findUniqueOrThrow({ where: { id: firstVersion.id } }),
    ).resolves.toMatchObject({ status: CurriculumVersionStatus.RETIRED });
    await expect(
      prisma.authSecurityEvent.findFirstOrThrow({
        where: { eventType: AuthSecurityEventType.CURRICULUM_VERSION_RETIRED },
      }),
    ).resolves.toBeDefined();

    const enrollment = await prisma.trainingEnrollment.create({
      data: {
        participantUserId: participant.id,
        brandId: brandA.id,
        plannedWeekCount: 3,
        assignedByUserId: administrator.id,
      },
    });
    await request(app.getHttpServer())
      .patch(`/api/v1/enrollments/${enrollment.id}/curriculum-version`)
      .set('Cookie', trainerSession.cookie)
      .set('X-CSRF-Token', trainerSession.csrfToken)
      .send({ curriculumVersionId: firstVersion.id })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/api/v1/enrollments/${enrollment.id}/curriculum-version`)
      .set('Cookie', trainerSession.cookie)
      .set('X-CSRF-Token', trainerSession.csrfToken)
      .send({ curriculumVersionId: publishedVersionId })
      .expect(200)
      .expect(({ body }) => expect(body.curriculumVersionId).toBe(publishedVersionId));
    await prisma.trainingEnrollment.update({
      where: { id: enrollment.id },
      data: { status: EnrollmentStatus.IN_PROGRESS },
    });
    await request(app.getHttpServer())
      .patch(`/api/v1/enrollments/${enrollment.id}/curriculum-version`)
      .set('Cookie', trainerSession.cookie)
      .set('X-CSRF-Token', trainerSession.csrfToken)
      .send({ curriculumVersionId: publishedVersionId })
      .expect(400);

    await prisma.userBrandAccess.delete({
      where: { userId_brandId: { userId: trainer.id, brandId: brandA.id } },
    });
    await request(app.getHttpServer())
      .get(`/api/v1/curriculum-versions/${publishedVersionId}`)
      .set('Cookie', trainerSession.cookie)
      .expect(403);
  });

  async function addWeek(
    versionId: string,
    weekNumber: number,
    title: string,
    session: { cookie: string; csrfToken: string },
  ): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/curriculum-versions/${versionId}/weeks`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ weekNumber, title })
      .expect(201);
    return response.body.id as string;
  }

  async function createUser(label: string, roleCode: SystemRoleCode) {
    const email = `${emailPrefix}${label}@example.test`;
    const user = await prisma.user.create({
      data: {
        email,
        normalizedEmail: email,
        passwordHash: await passwordService.hash(password),
        status: UserStatus.ACTIVE,
        activatedAt: new Date(),
        emailVerifiedAt: new Date(),
      },
    });
    const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
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

  async function cleanup(): Promise<void> {
    const users = await prisma.user.findMany({
      where: { normalizedEmail: { startsWith: emailPrefix } },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    await prisma.trainingEnrollment.deleteMany({
      where: { brand: { code: { startsWith: brandPrefix } } },
    });
    await prisma.curriculumVersion.deleteMany({
      where: { curriculum: { brand: { code: { startsWith: brandPrefix } } } },
    });
    await prisma.curriculum.deleteMany({ where: { brand: { code: { startsWith: brandPrefix } } } });
    await prisma.userBrandAccess.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.brand.deleteMany({ where: { code: { startsWith: brandPrefix } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
});
