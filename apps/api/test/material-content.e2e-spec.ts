import type { INestApplication } from '@nestjs/common';
import {
  FileAssetStatus,
  MaterialType,
  prisma,
  seedAuthorizationData,
  SystemRoleCode,
  UserStatus,
} from '@unicom/database';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/application.js';
import { PasswordService } from '../src/modules/auth/password.service.js';

const password = 'material-content-test-password';
const prefix = 'material-content-test-';

describe('participant material content isolation', () => {
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

  it('returns only the exact bound version and blocks cross-participant material IDOR', async () => {
    const [owner, stranger] = await Promise.all([createUser('owner'), createUser('stranger')]);
    const brand = await prisma.brand.create({
      data: { code: 'MAT_CONTENT_TEST', name: 'Material content test' },
    });
    const curriculum = await prisma.curriculum.create({
      data: {
        brandId: brand.id,
        code: 'MAT_TEST',
        name: 'Material test',
        createdByUserId: owner.id,
      },
    });
    const version = await prisma.curriculumVersion.create({
      data: {
        curriculumId: curriculum.id,
        versionNumber: 1,
        status: 'PUBLISHED',
        createdByUserId: owner.id,
      },
    });
    const week = await prisma.curriculumWeek.create({
      data: { curriculumVersionId: version.id, weekNumber: 1, title: 'Week 1' },
    });
    const module = await prisma.curriculumModule.create({
      data: { curriculumWeekId: week.id, code: 'MODULE_1', name: 'Module 1', sortOrder: 0 },
    });
    const asset = await prisma.fileAsset.create({
      data: {
        storageProvider: 'local',
        storageKey: 'materials/11111111-1111-4111-8111-111111111111',
        originalFileName: 'handbook.pdf',
        mimeType: 'application/pdf',
        detectedExtension: '.pdf',
        sizeBytes: 8,
        sha256: 'a'.repeat(64),
        status: FileAssetStatus.READY,
        createdByUserId: owner.id,
      },
    });
    const material = await prisma.learningMaterial.create({
      data: {
        curriculumModuleId: module.id,
        type: MaterialType.PDF,
        title: 'Handbook',
        sortOrder: 0,
        fileAssetId: asset.id,
        createdByUserId: owner.id,
      },
    });
    const enrollment = await prisma.trainingEnrollment.create({
      data: {
        participantUserId: owner.id,
        brandId: brand.id,
        plannedWeekCount: 1,
        assignedByUserId: owner.id,
        curriculumVersionId: version.id,
      },
    });
    const [ownerSession, strangerSession] = await Promise.all([
      login(owner.email),
      login(stranger.email),
    ]);

    const ownContent = await request(app.getHttpServer())
      .get(`/api/v1/my-training/enrollments/${enrollment.id}/content`)
      .set('Cookie', ownerSession)
      .expect(200);
    expect(ownContent.body.weeks[0].modules[0].materials).toMatchObject([
      { id: material.id, title: 'Handbook' },
    ]);
    await request(app.getHttpServer())
      .get(`/api/v1/my-training/enrollments/${enrollment.id}/content`)
      .set('Cookie', strangerSession)
      .expect(403);
    await request(app.getHttpServer())
      .get(`/api/v1/materials/${material.id}/content`)
      .set('Cookie', strangerSession)
      .expect(403);
  });

  async function createUser(label: string) {
    const email = `${prefix}${label}@example.test`;
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
    const role = await prisma.role.findUniqueOrThrow({ where: { code: SystemRoleCode.Trainee } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
    return user;
  }
  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const value = Array.isArray(response.headers['set-cookie'])
      ? response.headers['set-cookie'][0]
      : response.headers['set-cookie'];
    return (value as string).split(';')[0] as string;
  }
  async function cleanup(): Promise<void> {
    const users = await prisma.user.findMany({
      where: { normalizedEmail: { startsWith: prefix } },
      select: { id: true },
    });
    const userIds = users.map(({ id }) => id);
    await prisma.trainingEnrollment.deleteMany({ where: { brand: { code: 'MAT_CONTENT_TEST' } } });
    await prisma.curriculumVersion.deleteMany({
      where: { curriculum: { brand: { code: 'MAT_CONTENT_TEST' } } },
    });
    await prisma.curriculum.deleteMany({ where: { brand: { code: 'MAT_CONTENT_TEST' } } });
    await prisma.fileAsset.deleteMany({ where: { createdByUserId: { in: userIds } } });
    await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.brand.deleteMany({ where: { code: 'MAT_CONTENT_TEST' } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
});
