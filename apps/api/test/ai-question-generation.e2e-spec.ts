import type { INestApplication } from '@nestjs/common';
import {
  AiQuestionGenerationJobStatus,
  CurriculumVersionStatus,
  ExamQuestionOrigin,
  ExamQuestionStatus,
  FileAssetStatus,
  MaterialSourceExtractionStatus,
  MaterialSourceLocatorType,
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
import { AiQuestionGenerationJobProcessor } from '../src/modules/ai-question-generation/ai-question-generation-job.processor.js';
import { PasswordService } from '../src/modules/auth/password.service.js';

const prefix = 'ai-question-test-';
const brandCode = 'AI_QUESTION_TEST';
const password = 'ai-question-test-password';

describe('AI question generation authoring boundary', () => {
  let app: INestApplication;
  let passwords: PasswordService;
  let processor: AiQuestionGenerationJobProcessor;

  beforeAll(async () => {
    const application = await createApiApplication();
    app = application.app;
    await app.init();
    passwords = app.get(PasswordService);
    processor = app.get(AiQuestionGenerationJobProcessor);
  });
  beforeEach(async () => {
    await cleanup();
    await seedAuthorizationData(prisma);
    process.env['AI_FAKE_PROVIDER_MODE'] = 'valid';
  });
  afterAll(async () => {
    await cleanup();
    await app.close();
    await prisma.$disconnect();
  });

  it('creates only grounded Draft AI questions and preserves assessment/progress state', async () => {
    const trainer = await createUser('trainer', SystemRoleCode.Trainer);
    const trainee = await createUser('trainee', SystemRoleCode.Trainee);
    const fixture = await createFixture(trainer.id);
    await prisma.userBrandAccess.create({ data: { userId: trainer.id, brandId: fixture.brandId } });
    const [trainerSession, traineeSession] = await Promise.all([
      login(trainer.email),
      login(trainee.email),
    ]);

    await request(app.getHttpServer())
      .post(`/api/v1/exams/${fixture.examId}/ai-generation-jobs`)
      .set('Cookie', traineeSession.cookie)
      .set('X-CSRF-Token', traineeSession.csrfToken)
      .send(requestBody([fixture.materialId]))
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/exams/${fixture.examId}/ai-generation-jobs`)
      .set('Cookie', trainerSession.cookie)
      .set('X-CSRF-Token', trainerSession.csrfToken)
      .send(requestBody([fixture.materialId]))
      .expect(201);
    expect(
      (await prisma.aiQuestionGenerationJob.findFirstOrThrow({ where: { examId: fixture.examId } }))
        .provider,
    ).toBe('test_fake');
    await processor.processNext();

    const job = await prisma.aiQuestionGenerationJob.findFirstOrThrow({
      where: { examId: fixture.examId },
    });
    expect(job.status, job.errorCode ?? undefined).toBe(AiQuestionGenerationJobStatus.COMPLETED);
    const question = await prisma.examQuestion.findFirstOrThrow({
      where: { aiGenerationJobId: job.id },
      include: { sourceReferences: true },
    });
    expect(question).toMatchObject({
      origin: ExamQuestionOrigin.AI_GENERATED,
      status: ExamQuestionStatus.DRAFT,
    });
    expect(question.sourceReferences).toHaveLength(1);
    expect(question.sourceReferences[0]).toMatchObject({
      materialId: fixture.materialId,
      pageNumber: 5,
    });
    expect(await prisma.examAttempt.count()).toBe(0);
    expect(await prisma.learningMaterialProgress.count()).toBe(0);
  });

  it('rejects cross-version Material injection and never auto-approves', async () => {
    const trainer = await createUser('trainer', SystemRoleCode.Trainer);
    const fixture = await createFixture(trainer.id);
    await prisma.userBrandAccess.create({ data: { userId: trainer.id, brandId: fixture.brandId } });
    const session = await login(trainer.email);
    await request(app.getHttpServer())
      .post(`/api/v1/exams/${fixture.examId}/ai-generation-jobs`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send(requestBody([fixture.foreignMaterialId]))
      .expect(400);
    expect(await prisma.aiQuestionGenerationJob.count()).toBe(0);
  });

  function requestBody(materialIds: string[]) {
    return {
      materialIds,
      questionCount: 1,
      questionTypes: { singleChoice: 1, multipleChoice: 0, trueFalse: 0 },
    };
  }

  async function createFixture(actorId: string) {
    const brand = await prisma.brand.create({
      data: { code: brandCode, name: 'AI question test' },
    });
    const curriculum = await prisma.curriculum.create({
      data: { brandId: brand.id, code: 'AI', name: 'AI curriculum', createdByUserId: actorId },
    });
    const version = await prisma.curriculumVersion.create({
      data: {
        curriculumId: curriculum.id,
        versionNumber: 1,
        status: CurriculumVersionStatus.DRAFT,
      },
    });
    const week = await prisma.curriculumWeek.create({
      data: { curriculumVersionId: version.id, weekNumber: 1, title: 'Week one' },
    });
    const module = await prisma.curriculumModule.create({
      data: { curriculumWeekId: week.id, code: 'MODULE', name: 'Module', sortOrder: 1 },
    });
    const materialId = await materialWithChunk(module.id, actorId, 'source');
    const exam = await prisma.exam.create({
      data: {
        curriculumVersionId: version.id,
        curriculumWeekId: week.id,
        code: 'AI_EXAM',
        title: 'AI Exam',
        passingScoreBasisPoints: 7_500,
      },
    });
    const foreignVersion = await prisma.curriculumVersion.create({
      data: {
        curriculumId: curriculum.id,
        versionNumber: 2,
        status: CurriculumVersionStatus.DRAFT,
      },
    });
    const foreignWeek = await prisma.curriculumWeek.create({
      data: { curriculumVersionId: foreignVersion.id, weekNumber: 1, title: 'Other' },
    });
    const foreignModule = await prisma.curriculumModule.create({
      data: { curriculumWeekId: foreignWeek.id, code: 'OTHER', name: 'Other', sortOrder: 1 },
    });
    const foreignMaterialId = await materialWithChunk(foreignModule.id, actorId, 'foreign');
    return { brandId: brand.id, examId: exam.id, materialId, foreignMaterialId };
  }

  async function materialWithChunk(moduleId: string, actorId: string, label: string) {
    const asset = await prisma.fileAsset.create({
      data: {
        storageProvider: 'local',
        storageKey: `materials/${randomUUID()}`,
        originalFileName: `${label}.pdf`,
        mimeType: 'application/pdf',
        detectedExtension: '.pdf',
        sizeBytes: 10,
        sha256: randomUUID().replaceAll('-', '').repeat(2).slice(0, 64),
        status: FileAssetStatus.READY,
        createdByUserId: actorId,
      },
    });
    const material = await prisma.learningMaterial.create({
      data: {
        curriculumModuleId: moduleId,
        type: MaterialType.PDF,
        title: label,
        sortOrder: 1,
        fileAssetId: asset.id,
      },
    });
    const extraction = await prisma.materialSourceExtraction.create({
      data: {
        fileAssetId: asset.id,
        sourceType: MaterialType.PDF,
        extractorVersion: 'SOURCE_EXTRACTION_V1',
        status: MaterialSourceExtractionStatus.READY,
        extractedAt: new Date(),
      },
    });
    await prisma.materialSourceChunk.create({
      data: {
        extractionId: extraction.id,
        sequence: 1,
        content: 'Safe source fact.',
        locatorType: MaterialSourceLocatorType.PDF_PAGE,
        locator: { pageNumber: 5 },
      },
    });
    return material.id;
  }

  async function createUser(label: string, roleCode: string) {
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
    const cookie = (
      Array.isArray(response.headers['set-cookie'])
        ? response.headers['set-cookie'][0]
        : response.headers['set-cookie']
    ) as string;
    return { cookie: cookie.split(';')[0]!, csrfToken: response.body.csrfToken as string };
  }

  async function cleanup() {
    const users = await prisma.user.findMany({
      where: { normalizedEmail: { startsWith: prefix } },
      select: { id: true },
    });
    const ids = users.map((user) => user.id);
    await prisma.aiQuestionGenerationJob.deleteMany({
      where: { exam: { curriculumVersion: { curriculum: { brand: { code: brandCode } } } } },
    });
    await prisma.examQuestion.deleteMany({
      where: { exam: { curriculumVersion: { curriculum: { brand: { code: brandCode } } } } },
    });
    await prisma.exam.deleteMany({
      where: { curriculumVersion: { curriculum: { brand: { code: brandCode } } } },
    });
    await prisma.materialSourceExtraction.deleteMany({
      where: { fileAsset: { createdByUserId: { in: ids } } },
    });
    await prisma.curriculumVersion.deleteMany({
      where: { curriculum: { brand: { code: brandCode } } },
    });
    await prisma.curriculum.deleteMany({ where: { brand: { code: brandCode } } });
    await prisma.fileAsset.deleteMany({ where: { createdByUserId: { in: ids } } });
    await prisma.userBrandAccess.deleteMany({ where: { userId: { in: ids } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: ids } } });
    await prisma.authSession.deleteMany({ where: { userId: { in: ids } } });
    await prisma.brand.deleteMany({ where: { code: brandCode } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
});
