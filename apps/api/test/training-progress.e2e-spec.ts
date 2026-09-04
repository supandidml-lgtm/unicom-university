import type { INestApplication } from '@nestjs/common';
import {
  ExamAttemptStatus,
  ExamQuestionStatus,
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
import { TrainingProgressService } from '../src/modules/training-progress/training-progress.service.js';

const prefix = 'training-progress-test-';
const password = 'training-progress-test-password';

describe('training progress lifecycle and participant isolation', () => {
  let app: INestApplication;
  let passwords: PasswordService;
  let progress: TrainingProgressService;

  beforeAll(async () => {
    const application = await createApiApplication();
    app = application.app;
    await app.init();
    passwords = app.get(PasswordService);
    progress = app.get(TrainingProgressService);
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

  it('keeps Brand histories isolated and transitions only after trusted facts exist', async () => {
    const participant = await createUser('participant', SystemRoleCode.Trainee);
    const other = await createUser('other', SystemRoleCode.Trainee);
    const fixture = await createFixture(participant.id);
    const context = { requestId: randomUUID() };
    const actor = { id: participant.id, email: participant.email, status: UserStatus.ACTIVE };

    const initial = await progress.calculateEnrollmentProgress(fixture.primaryEnrollmentId);
    expect(initial).toMatchObject({
      status: 'NOT_STARTED',
      overallProgressBasisPoints: 0,
      courseProgressBasisPoints: 0,
      examProgressBasisPoints: 0,
      completionBlockedReason: null,
    });
    expect(
      (
        await prisma.trainingEnrollment.findUniqueOrThrow({
          where: { id: fixture.primaryEnrollmentId },
        })
      ).status,
    ).toBe('NOT_STARTED');

    await prisma.learningMaterialProgress.create({
      data: {
        enrollmentId: fixture.primaryEnrollmentId,
        materialId: fixture.primaryMaterialId,
        status: LearningMaterialProgressStatus.IN_PROGRESS,
        progressBasisPoints: 5_000,
        startedAt: new Date(),
      },
    });
    await progress.refreshEnrollmentLifecycle(fixture.primaryEnrollmentId, actor, context);
    const partial = await progress.calculateEnrollmentProgress(fixture.primaryEnrollmentId);
    expect(partial).toMatchObject({
      status: 'IN_PROGRESS',
      courseProgressBasisPoints: 5_000,
      examProgressBasisPoints: 0,
      overallProgressBasisPoints: 2_500,
    });
    expect(
      (await progress.calculateEnrollmentProgress(fixture.secondaryEnrollmentId))
        .overallProgressBasisPoints,
    ).toBe(0);

    await prisma.learningMaterialProgress.update({
      where: {
        enrollmentId_materialId: {
          enrollmentId: fixture.primaryEnrollmentId,
          materialId: fixture.primaryMaterialId,
        },
      },
      data: {
        status: LearningMaterialProgressStatus.COMPLETED,
        progressBasisPoints: 10_000,
        completedAt: new Date(),
      },
    });
    await prisma.examAttempt.create({
      data: {
        enrollmentId: fixture.primaryEnrollmentId,
        examId: fixture.primaryExamId,
        participantUserId: participant.id,
        attemptNumber: 1,
        status: ExamAttemptStatus.SUBMITTED,
        passingScoreBasisPoints: 7_500,
        submittedAt: new Date(),
        scorePoints: 1,
        maxPoints: 1,
        scoreBasisPoints: 10_000,
        passed: true,
      },
    });
    await Promise.all([
      progress.refreshEnrollmentLifecycle(fixture.primaryEnrollmentId, actor, context),
      progress.refreshEnrollmentLifecycle(fixture.primaryEnrollmentId, actor, context),
    ]);
    const completed = await progress.calculateEnrollmentProgress(fixture.primaryEnrollmentId);
    expect(completed).toMatchObject({
      status: 'COMPLETED',
      overallProgressBasisPoints: 10_000,
      completedAt: expect.any(Date),
    });

    const session = await login(participant.email);
    const dashboard = await request(app.getHttpServer())
      .get('/api/v1/my-training/dashboard')
      .set('Cookie', session.cookie)
      .expect(200);
    expect(dashboard.body.items).toHaveLength(2);
    expect(
      dashboard.body.items.find(
        (item: { enrollmentId: string }) => item.enrollmentId === fixture.primaryEnrollmentId,
      ),
    ).toMatchObject({ status: 'COMPLETED', overallProgressBasisPoints: 10_000 });
    const otherSession = await login(other.email);
    await request(app.getHttpServer())
      .get(`/api/v1/my-training/enrollments/${fixture.primaryEnrollmentId}/progress`)
      .set('Cookie', otherSession.cookie)
      .expect(403);
  });

  async function createFixture(participantUserId: string) {
    const primary = await createCurriculumChain('PRIMARY', participantUserId);
    const secondary = await createCurriculumChain('SECONDARY', participantUserId);
    const [primaryEnrollment, secondaryEnrollment] = await Promise.all([
      prisma.trainingEnrollment.create({
        data: {
          participantUserId,
          brandId: primary.brandId,
          plannedWeekCount: 1,
          curriculumVersionId: primary.versionId,
        },
      }),
      prisma.trainingEnrollment.create({
        data: {
          participantUserId,
          brandId: secondary.brandId,
          plannedWeekCount: 1,
          curriculumVersionId: secondary.versionId,
        },
      }),
    ]);
    return {
      primaryEnrollmentId: primaryEnrollment.id,
      secondaryEnrollmentId: secondaryEnrollment.id,
      primaryMaterialId: primary.materialId,
      primaryExamId: primary.examId,
    };
  }

  async function createCurriculumChain(label: string, creatorUserId: string) {
    const brand = await prisma.brand.create({
      data: { code: `${prefix}${label}-${randomUUID()}`, name: label },
    });
    const curriculum = await prisma.curriculum.create({
      data: {
        brandId: brand.id,
        code: `${prefix}${label}`,
        name: label,
        createdByUserId: creatorUserId,
      },
    });
    const version = await prisma.curriculumVersion.create({
      data: {
        curriculumId: curriculum.id,
        versionNumber: 1,
        status: 'PUBLISHED',
        createdByUserId: creatorUserId,
      },
    });
    const week = await prisma.curriculumWeek.create({
      data: { curriculumVersionId: version.id, weekNumber: 1, title: 'Week 1' },
    });
    const module = await prisma.curriculumModule.create({
      data: { curriculumWeekId: week.id, code: 'MODULE', name: 'Module', sortOrder: 1 },
    });
    const asset = await prisma.fileAsset.create({
      data: {
        storageProvider: 'local',
        storageKey: `progress/${randomUUID()}`,
        originalFileName: 'guide.pdf',
        mimeType: 'application/pdf',
        detectedExtension: '.pdf',
        sizeBytes: 8,
        sha256: randomUUID().replaceAll('-', '').padEnd(64, '0'),
        status: FileAssetStatus.READY,
        createdByUserId: creatorUserId,
        pageCount: 1,
      },
    });
    const material = await prisma.learningMaterial.create({
      data: {
        curriculumModuleId: module.id,
        type: MaterialType.PDF,
        title: 'Guide',
        sortOrder: 1,
        fileAssetId: asset.id,
        createdByUserId: creatorUserId,
      },
    });
    const exam = await prisma.exam.create({
      data: {
        curriculumVersionId: version.id,
        curriculumWeekId: week.id,
        code: 'FINAL',
        title: 'Final exam',
        passingScoreBasisPoints: 7_500,
        maxAttempts: 2,
        questions: {
          create: {
            type: 'SINGLE_CHOICE',
            prompt: 'Question',
            sortOrder: 1,
            points: 1,
            status: ExamQuestionStatus.APPROVED,
            options: { create: [{ text: 'Correct', sortOrder: 1, isCorrect: true }] },
          },
        },
      },
    });
    return { brandId: brand.id, versionId: version.id, materialId: material.id, examId: exam.id };
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
    const raw = (
      Array.isArray(response.headers['set-cookie'])
        ? response.headers['set-cookie'][0]
        : response.headers['set-cookie']
    ) as string;
    return { cookie: raw.split(';')[0] as string };
  }

  async function cleanup() {
    const users = await prisma.user.findMany({
      where: { normalizedEmail: { startsWith: prefix } },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    await prisma.examAttempt.deleteMany({
      where: { enrollment: { participantUserId: { in: userIds } } },
    });
    await prisma.learningMaterialProgress.deleteMany({
      where: { enrollment: { participantUserId: { in: userIds } } },
    });
    await prisma.trainingEnrollment.deleteMany({ where: { participantUserId: { in: userIds } } });
    await prisma.examQuestion.deleteMany({
      where: { exam: { curriculumVersion: { curriculum: { code: { startsWith: prefix } } } } },
    });
    await prisma.exam.deleteMany({
      where: { curriculumVersion: { curriculum: { code: { startsWith: prefix } } } },
    });
    await prisma.curriculumVersion.deleteMany({
      where: { curriculum: { code: { startsWith: prefix } } },
    });
    await prisma.curriculum.deleteMany({ where: { code: { startsWith: prefix } } });
    await prisma.brand.deleteMany({ where: { code: { startsWith: prefix } } });
    await prisma.fileAsset.deleteMany({ where: { createdByUserId: { in: userIds } } });
    await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
});
