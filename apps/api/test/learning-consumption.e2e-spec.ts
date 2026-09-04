import type { INestApplication } from '@nestjs/common';
import {
  FileAssetStatus,
  LearningMaterialProgressStatus,
  MaterialType,
  prisma,
  seedAuthorizationData,
  SystemRoleCode,
  UserStatus,
} from '@unicom/database';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/application.js';
import { PasswordService } from '../src/modules/auth/password.service.js';

const password = 'learning-consumption-test-password';
const prefix = 'learning-consumption-test-';
const brandCode = 'LEARNING_CONSUMPTION_TEST';

describe('server-verified learning consumption', () => {
  let app: INestApplication;
  let passwords: PasswordService;

  beforeAll(async () => {
    const application = await createApiApplication();
    app = application.app;
    await app.init();
    passwords = app.get(PasswordService);
  });
  beforeEach(async () => {
    await cleanup();
    await seedAuthorizationData(prisma);
  });
  afterAll(async () => {
    await cleanup();
    await app.close();
    await prisma.$disconnect();
  });

  it('derives monotonic video, PDF, and acknowledgement completion on the server', async () => {
    const owner = await createUser('owner', SystemRoleCode.Trainee);
    const stranger = await createUser('stranger', SystemRoleCode.Trainee);
    const trainer = await createUser('trainer', SystemRoleCode.Trainer);
    const fixture = await createFixture(owner.id);
    await prisma.userBrandAccess.create({ data: { userId: trainer.id, brandId: fixture.brandId } });
    const [ownerSession, strangerSession, trainerSession] = await Promise.all([
      login(owner.email),
      login(stranger.email),
      login(trainer.email),
    ]);

    const videoSession = await start(fixture.enrollmentId, fixture.videoId, ownerSession);
    await ageSession(videoSession.activitySessionId, { lastEventAt: 6_000 });
    const inProgress = await heartbeat(
      fixture.videoId,
      ownerSession,
      videoSession.activitySessionId,
      1,
      1_000,
      false,
    );
    expect(inProgress.body).toMatchObject({ status: LearningMaterialProgressStatus.IN_PROGRESS });
    await ageSession(videoSession.activitySessionId, { lastEventAt: 6_000 });
    const forwardJump = await heartbeat(
      fixture.videoId,
      ownerSession,
      videoSession.activitySessionId,
      2,
      9_000,
      false,
    );
    expect(forwardJump.body.progressPercent).toBeLessThan(20);
    await ageSession(videoSession.activitySessionId, { lastEventAt: 6_000 });
    await heartbeat(
      fixture.videoId,
      ownerSession,
      videoSession.activitySessionId,
      3,
      10_000,
      true,
    ).expect(201);
    const incomplete = await progress(fixture.enrollmentId, ownerSession);
    expect(
      incomplete.body.items.find(
        (item: { material: { id: string } }) => item.material.id === fixture.videoId,
      ),
    ).toMatchObject({ status: 'IN_PROGRESS' });

    const completingVideoSession = await start(fixture.enrollmentId, fixture.videoId, ownerSession);
    await ageSession(completingVideoSession.activitySessionId, { lastEventAt: 6_000 });
    const completingFirstBeat = await heartbeat(
      fixture.videoId,
      ownerSession,
      completingVideoSession.activitySessionId,
      1,
      5_000,
      false,
    );
    expect(completingFirstBeat.status, JSON.stringify(completingFirstBeat.body)).toBe(201);
    await ageSession(completingVideoSession.activitySessionId, { lastEventAt: 6_000 });
    const completeVideo = await heartbeat(
      fixture.videoId,
      ownerSession,
      completingVideoSession.activitySessionId,
      2,
      10_000,
      true,
    ).expect(201);
    expect(completeVideo.body).toMatchObject({ status: 'COMPLETED', progressPercent: 100 });
    await ageSession(completingVideoSession.activitySessionId, { lastEventAt: 6_000 });
    await heartbeat(
      fixture.videoId,
      ownerSession,
      completingVideoSession.activitySessionId,
      2,
      10_000,
      true,
    ).expect(409);
    await heartbeat(
      fixture.videoId,
      strangerSession,
      completingVideoSession.activitySessionId,
      3,
      10_000,
      true,
    ).expect(403);

    const documentSession = await start(fixture.enrollmentId, fixture.pdfId, ownerSession);
    await ageSession(documentSession.activitySessionId, { lastEventAt: 61_000 });
    const finalOnly = await documentPage(
      fixture.pdfId,
      ownerSession,
      documentSession.activitySessionId,
      1,
      2,
    ).expect(201);
    expect(finalOnly.body).toMatchObject({ status: 'IN_PROGRESS' });
    let completePdf = finalOnly;
    for (let sequence = 2; sequence <= 6; sequence += 1) {
      await ageSession(documentSession.activitySessionId, { lastEventAt: 61_000 });
      completePdf = await documentPage(
        fixture.pdfId,
        ownerSession,
        documentSession.activitySessionId,
        sequence,
        sequence % 2 === 0 ? 1 : 2,
      ).expect(201);
    }
    expect(completePdf.body).toMatchObject({ status: 'COMPLETED', progressPercent: 100 });

    const acknowledgementSession = await start(fixture.enrollmentId, fixture.imageId, ownerSession);
    await acknowledge(
      fixture.imageId,
      ownerSession,
      acknowledgementSession.activitySessionId,
    ).expect(400);
    await ageSession(acknowledgementSession.activitySessionId, { startedAt: 61_000 });
    const acknowledged = await acknowledge(
      fixture.imageId,
      ownerSession,
      acknowledgementSession.activitySessionId,
    ).expect(201);
    expect(acknowledged.body).toMatchObject({ status: 'COMPLETED', progressPercent: 100 });
    await acknowledge(
      fixture.imageId,
      ownerSession,
      acknowledgementSession.activitySessionId,
    ).expect(201);

    await request(app.getHttpServer())
      .post(
        `/api/v1/my-training/enrollments/${fixture.enrollmentId}/materials/${fixture.videoId}/activity-sessions`,
      )
      .set('Cookie', trainerSession.cookie)
      .set('X-CSRF-Token', trainerSession.csrfToken)
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .get(`/api/v1/enrollments/${fixture.enrollmentId}/material-progress`)
      .set('Cookie', trainerSession.cookie)
      .expect(200);
    await prisma.userBrandAccess.delete({
      where: { userId_brandId: { userId: trainer.id, brandId: fixture.brandId } },
    });
    await request(app.getHttpServer())
      .get(`/api/v1/enrollments/${fixture.enrollmentId}/material-progress`)
      .set('Cookie', trainerSession.cookie)
      .expect(403);
  });

  async function createFixture(ownerId: string) {
    const brand = await prisma.brand.create({
      data: { code: brandCode, name: 'Learning consumption test' },
    });
    const curriculum = await prisma.curriculum.create({
      data: { brandId: brand.id, code: 'LEARN', name: 'Learning', createdByUserId: ownerId },
    });
    const version = await prisma.curriculumVersion.create({
      data: {
        curriculumId: curriculum.id,
        versionNumber: 1,
        status: 'PUBLISHED',
        createdByUserId: ownerId,
      },
    });
    const week = await prisma.curriculumWeek.create({
      data: { curriculumVersionId: version.id, weekNumber: 1, title: 'Week 1' },
    });
    const module = await prisma.curriculumModule.create({
      data: { curriculumWeekId: week.id, code: 'MODULE', name: 'Module', sortOrder: 0 },
    });
    const [videoAsset, pdfAsset, imageAsset] = await Promise.all([
      asset(ownerId, 'video.mp4', 'video/mp4', '.mp4', { durationMs: 10_000 }),
      asset(ownerId, 'guide.pdf', 'application/pdf', '.pdf', { pageCount: 2 }),
      asset(ownerId, 'image.png', 'image/png', '.png', {}),
    ]);
    const [video, pdf, image] = await Promise.all([
      prisma.learningMaterial.create({
        data: {
          curriculumModuleId: module.id,
          type: MaterialType.VIDEO,
          title: 'Video',
          sortOrder: 0,
          fileAssetId: videoAsset.id,
          createdByUserId: ownerId,
        },
      }),
      prisma.learningMaterial.create({
        data: {
          curriculumModuleId: module.id,
          type: MaterialType.PDF,
          title: 'PDF',
          sortOrder: 1,
          fileAssetId: pdfAsset.id,
          createdByUserId: ownerId,
        },
      }),
      prisma.learningMaterial.create({
        data: {
          curriculumModuleId: module.id,
          type: MaterialType.IMAGE,
          title: 'Image',
          sortOrder: 2,
          fileAssetId: imageAsset.id,
          createdByUserId: ownerId,
        },
      }),
    ]);
    await prisma.curriculumVersion.findUniqueOrThrow({ where: { id: version.id } });
    const enrollment = await prisma.trainingEnrollment.create({
      data: {
        participantUserId: ownerId,
        brandId: brand.id,
        plannedWeekCount: 1,
        curriculumVersionId: version.id,
      },
    });
    return {
      brandId: brand.id,
      enrollmentId: enrollment.id,
      videoId: video.id,
      pdfId: pdf.id,
      imageId: image.id,
    };
  }

  async function asset(
    userId: string,
    name: string,
    mimeType: string,
    extension: string,
    metadata: { durationMs?: number; pageCount?: number },
  ) {
    return prisma.fileAsset.create({
      data: {
        storageProvider: 'local',
        storageKey: `materials/${randomUUID()}`,
        originalFileName: name,
        mimeType,
        detectedExtension: extension,
        sizeBytes: 8,
        sha256: 'a'.repeat(64),
        status: FileAssetStatus.READY,
        createdByUserId: userId,
        ...metadata,
      },
    });
  }
  async function createUser(label: string, roleCode: SystemRoleCode) {
    const email = `${prefix}${label}-${randomUUID()}@example.test`;
    const user = await prisma.user.create({
      data: {
        email,
        normalizedEmail: email,
        passwordHash: await passwords.hash(password),
        status: UserStatus.ACTIVE,
        activatedAt: new Date(),
        emailVerifiedAt: new Date(),
      },
    });
    const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
    return user;
  }
  async function login(email: string) {
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
  async function start(
    enrollmentId: string,
    materialId: string,
    session: { cookie: string; csrfToken: string },
  ) {
    return (
      await request(app.getHttpServer())
        .post(
          `/api/v1/my-training/enrollments/${enrollmentId}/materials/${materialId}/activity-sessions`,
        )
        .set('Cookie', session.cookie)
        .set('X-CSRF-Token', session.csrfToken)
        .send({})
        .expect(201)
    ).body as { activitySessionId: string };
  }
  function heartbeat(
    materialId: string,
    session: { cookie: string; csrfToken: string },
    activitySessionId: string,
    sequence: number,
    currentTimeMs: number,
    ended: boolean,
  ) {
    return request(app.getHttpServer())
      .post(`/api/v1/learning/materials/${materialId}/video/heartbeat`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({
        activitySessionId,
        sequence,
        currentTimeMs,
        playing: true,
        ended,
        visibility: 'visible',
        playbackRate: 1,
      });
  }
  function documentPage(
    materialId: string,
    session: { cookie: string; csrfToken: string },
    activitySessionId: string,
    sequence: number,
    pageNumber: number,
  ) {
    return request(app.getHttpServer())
      .post(`/api/v1/learning/materials/${materialId}/document/page`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ activitySessionId, sequence, pageNumber });
  }
  function acknowledge(
    materialId: string,
    session: { cookie: string; csrfToken: string },
    activitySessionId: string,
  ) {
    return request(app.getHttpServer())
      .post(`/api/v1/learning/materials/${materialId}/acknowledge`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ activitySessionId });
  }
  function progress(enrollmentId: string, session: { cookie: string }) {
    return request(app.getHttpServer())
      .get(`/api/v1/my-training/enrollments/${enrollmentId}/material-progress`)
      .set('Cookie', session.cookie)
      .expect(200);
  }
  async function ageSession(id: string, values: { lastEventAt?: number; startedAt?: number }) {
    const now = new Date();
    await prisma.learningActivitySession.update({
      where: { id },
      data: {
        ...(values.lastEventAt
          ? { lastEventAt: new Date(now.getTime() - values.lastEventAt) }
          : {}),
        ...(values.startedAt ? { startedAt: new Date(now.getTime() - values.startedAt) } : {}),
      },
    });
  }
  async function cleanup() {
    const users = await prisma.user.findMany({
      where: { normalizedEmail: { startsWith: prefix } },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    await prisma.learningActivitySession.deleteMany({
      where: { enrollment: { brand: { code: brandCode } } },
    });
    await prisma.learningMaterialProgress.deleteMany({
      where: { enrollment: { brand: { code: brandCode } } },
    });
    await prisma.trainingEnrollment.deleteMany({ where: { brand: { code: brandCode } } });
    await prisma.curriculumVersion.deleteMany({
      where: { curriculum: { brand: { code: brandCode } } },
    });
    await prisma.curriculum.deleteMany({ where: { brand: { code: brandCode } } });
    await prisma.fileAsset.deleteMany({ where: { createdByUserId: { in: userIds } } });
    await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userBrandAccess.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.brand.deleteMany({ where: { code: brandCode } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
});
