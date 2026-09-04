import type { INestApplication } from '@nestjs/common';
import {
  ExamQuestionStatus,
  ExamQuestionType,
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

const password = 'exam-engine-test-password';
const prefix = 'exam-engine-test-';
const brandCode = 'EXAM_ENGINE_TEST';

describe('exam engine authorization, snapshot, gating, and deterministic scoring', () => {
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

  it('gates start, hides answer keys, prevents IDOR, and scores an immutable snapshot idempotently', async () => {
    const participant = await createUser('participant', SystemRoleCode.Trainee);
    const other = await createUser('other', SystemRoleCode.Trainee);
    const trainer = await createUser('trainer', SystemRoleCode.Trainer);
    const fixture = await createFixture(participant.id, other.id);
    await prisma.userBrandAccess.create({ data: { userId: trainer.id, brandId: fixture.brandId } });
    const [participantSession, otherSession, trainerSession] = await Promise.all([
      login(participant.email),
      login(other.email),
      login(trainer.email),
    ]);

    await start(fixture.enrollmentId, fixture.examId, participantSession).expect(403);
    await prisma.learningMaterialProgress.create({
      data: {
        enrollmentId: fixture.enrollmentId,
        materialId: fixture.materialId,
        status: LearningMaterialProgressStatus.COMPLETED,
        progressBasisPoints: 10_000,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });
    const [started, resumed] = await Promise.all([
      start(fixture.enrollmentId, fixture.examId, participantSession).expect(201),
      start(fixture.enrollmentId, fixture.examId, participantSession).expect(201),
    ]);
    expect(started.body.status).toBe('IN_PROGRESS');
    expect(resumed.body.id).toBe(started.body.id);
    expect(
      await prisma.examAttempt.count({
        where: {
          enrollmentId: fixture.enrollmentId,
          examId: fixture.examId,
          status: 'IN_PROGRESS',
        },
      }),
    ).toBe(1);
    expect(JSON.stringify(started.body)).not.toContain('isCorrect');
    expect(JSON.stringify(started.body)).not.toContain('correctOption');
    const question = started.body.questions[0] as { id: string; options: { id: string }[] };
    await saveAnswer(
      started.body.id as string,
      question.id,
      [fixture.foreignOptionId],
      participantSession,
    ).expect(400);
    await saveAnswer(
      started.body.id as string,
      question.id,
      [question.options[0]!.id],
      otherSession,
    ).expect(403);
    await saveAnswer(
      started.body.id as string,
      question.id,
      [question.options[0]!.id],
      participantSession,
    ).expect(200);
    const firstSubmit = await submit(started.body.id as string, participantSession).expect(201);
    expect(firstSubmit.body).toMatchObject({
      status: 'SUBMITTED',
      scoreBasisPoints: 10_000,
      passed: true,
    });
    const duplicateSubmit = await submit(started.body.id as string, participantSession).expect(201);
    expect(duplicateSubmit.body).toMatchObject({ scoreBasisPoints: 10_000, passed: true });
    expect(JSON.stringify(duplicateSubmit.body)).not.toContain('isCorrect');

    await request(app.getHttpServer())
      .get(`/api/v1/exams/${fixture.examId}/results`)
      .set('Cookie', trainerSession.cookie)
      .expect(200);
    await prisma.userBrandAccess.delete({
      where: { userId_brandId: { userId: trainer.id, brandId: fixture.brandId } },
    });
    await request(app.getHttpServer())
      .get(`/api/v1/exams/${fixture.examId}/results`)
      .set('Cookie', trainerSession.cookie)
      .expect(403);
  });

  async function createFixture(participantId: string, otherId: string) {
    const brand = await prisma.brand.create({
      data: { code: brandCode, name: 'Exam engine test' },
    });
    const curriculum = await prisma.curriculum.create({
      data: { brandId: brand.id, code: 'EXAM', name: 'Exam', createdByUserId: participantId },
    });
    const version = await prisma.curriculumVersion.create({
      data: {
        curriculumId: curriculum.id,
        versionNumber: 1,
        status: 'PUBLISHED',
        createdByUserId: participantId,
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
        storageKey: `exam/${randomUUID()}`,
        originalFileName: 'guide.pdf',
        mimeType: 'application/pdf',
        detectedExtension: '.pdf',
        sizeBytes: 8,
        sha256: 'a'.repeat(64),
        status: FileAssetStatus.READY,
        createdByUserId: participantId,
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
        createdByUserId: participantId,
      },
    });
    const exam = await prisma.exam.create({
      data: {
        curriculumVersionId: version.id,
        curriculumWeekId: week.id,
        code: 'WEEK_ONE',
        title: 'Week one exam',
        passingScoreBasisPoints: 7_500,
        maxAttempts: 2,
        createdByUserId: participantId,
        questions: {
          create: [
            {
              type: ExamQuestionType.SINGLE_CHOICE,
              prompt: 'Correct answer?',
              sortOrder: 1,
              points: 1,
              status: ExamQuestionStatus.APPROVED,
              approvedByUserId: participantId,
              approvedAt: new Date(),
              options: {
                create: [
                  { text: 'Correct', sortOrder: 1, isCorrect: true },
                  { text: 'Wrong', sortOrder: 2, isCorrect: false },
                ],
              },
            },
          ],
        },
      },
      include: { questions: { include: { options: true } } },
    });
    const foreignExam = await prisma.exam.create({
      data: {
        curriculumVersionId: version.id,
        curriculumWeekId: week.id,
        code: 'FOREIGN',
        title: 'Foreign',
        passingScoreBasisPoints: 0,
        questions: {
          create: [
            {
              type: ExamQuestionType.SINGLE_CHOICE,
              prompt: 'Other',
              sortOrder: 1,
              points: 1,
              options: {
                create: [
                  { text: 'X', sortOrder: 1, isCorrect: true },
                  { text: 'Y', sortOrder: 2, isCorrect: false },
                ],
              },
            },
          ],
        },
      },
      include: { questions: { include: { options: true } } },
    });
    const [enrollment, otherEnrollment] = await Promise.all([
      prisma.trainingEnrollment.create({
        data: {
          participantUserId: participantId,
          brandId: brand.id,
          plannedWeekCount: 1,
          curriculumVersionId: version.id,
        },
      }),
      prisma.trainingEnrollment.create({
        data: {
          participantUserId: otherId,
          brandId: brand.id,
          plannedWeekCount: 1,
          curriculumVersionId: version.id,
        },
      }),
    ]);
    return {
      brandId: brand.id,
      enrollmentId: enrollment.id,
      otherEnrollmentId: otherEnrollment.id,
      examId: exam.id,
      materialId: material.id,
      foreignOptionId: foreignExam.questions[0]!.options[0]!.id,
    };
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
    return { cookie: raw.split(';')[0] as string, csrfToken: response.body.csrfToken as string };
  }
  function start(
    enrollmentId: string,
    examId: string,
    session: { cookie: string; csrfToken: string },
  ) {
    return request(app.getHttpServer())
      .post(`/api/v1/my-training/enrollments/${enrollmentId}/exams/${examId}/start`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({});
  }
  function saveAnswer(
    attemptId: string,
    questionId: string,
    selectedOptionIds: string[],
    session: { cookie: string; csrfToken: string },
  ) {
    return request(app.getHttpServer())
      .put(`/api/v1/exam-attempts/${attemptId}/answers/${questionId}`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ selectedOptionIds });
  }
  function submit(attemptId: string, session: { cookie: string; csrfToken: string }) {
    return request(app.getHttpServer())
      .post(`/api/v1/exam-attempts/${attemptId}/submit`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({});
  }
  async function cleanup() {
    const users = await prisma.user.findMany({
      where: { normalizedEmail: { startsWith: prefix } },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    await prisma.examAttempt.deleteMany({
      where: { exam: { curriculumVersion: { curriculum: { brand: { code: brandCode } } } } },
    });
    await prisma.examQuestion.deleteMany({
      where: { exam: { curriculumVersion: { curriculum: { brand: { code: brandCode } } } } },
    });
    await prisma.exam.deleteMany({
      where: { curriculumVersion: { curriculum: { brand: { code: brandCode } } } },
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
