import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import {
  ExamQuestionStatus,
  ExamQuestionType,
  FileAssetStatus,
  LearningMaterialProgressStatus,
  MaterialType,
  seedAuthorizationData,
  SystemRoleCode,
  UserStatus,
} from '@unicom/database';
import { e2ePrisma as prisma } from './test-database.js';

const password = 'exam-e2e-password';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('participant sees a locked exam, unlocks after verified material completion, and persists PASS', async ({
  page,
}) => {
  await seedAuthorizationData(prisma);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const fixture = await createFixture(suffix);
  try {
    await page.goto('/login');
    await page.getByLabel('Email').fill(fixture.email);
    await page.locator('input#password').fill(password);
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page).toHaveURL(/\/authenticated$/);
    await page.goto(`/my-training/${fixture.enrollmentId}`);
    await expect(page.getByText('Exam — Locked', { exact: false })).toBeVisible();

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
    await page.reload();
    await page.getByRole('button', { name: 'Start exam' }).click();
    await page.getByRole('radio', { name: 'Correct', exact: true }).check();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Submit exam' }).click();
    await expect(page.getByText('Result: PASS')).toBeVisible();
    await page.getByRole('button', { name: 'Back to exams' }).click();
    await page.reload();
    await expect(page.getByText('Attempt 1: 100% — PASS')).toBeVisible();
  } finally {
    await cleanup(suffix);
  }
});

async function createFixture(suffix: string) {
  const email = `exam-e2e-${suffix}@example.test`;
  const trainee = await prisma.role.findUniqueOrThrow({ where: { code: SystemRoleCode.Trainee } });
  const user = await prisma.user.create({
    data: {
      email,
      normalizedEmail: email,
      passwordHash: await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 4_096,
        timeCost: 1,
        parallelism: 1,
      }),
      status: UserStatus.ACTIVE,
      activatedAt: new Date(),
      emailVerifiedAt: new Date(),
      userRoles: { create: { roleId: trainee.id } },
    },
  });
  const brand = await prisma.brand.create({
    data: { code: `E2E_EXAM_${suffix}`, name: 'E2E Exam Brand' },
  });
  const curriculum = await prisma.curriculum.create({
    data: { brandId: brand.id, code: `EXAM_${suffix}`, name: 'E2E Exam', createdByUserId: user.id },
  });
  const version = await prisma.curriculumVersion.create({
    data: {
      curriculumId: curriculum.id,
      versionNumber: 1,
      status: 'PUBLISHED',
      createdByUserId: user.id,
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
      storageKey: `exam-e2e/${randomUUID()}`,
      originalFileName: 'image.png',
      mimeType: 'image/png',
      detectedExtension: '.png',
      sizeBytes: 8,
      sha256: 'a'.repeat(64),
      status: FileAssetStatus.READY,
      createdByUserId: user.id,
    },
  });
  const material = await prisma.learningMaterial.create({
    data: {
      curriculumModuleId: module.id,
      type: MaterialType.IMAGE,
      title: 'Required material',
      sortOrder: 1,
      fileAssetId: asset.id,
      createdByUserId: user.id,
    },
  });
  await prisma.exam.create({
    data: {
      curriculumVersionId: version.id,
      curriculumWeekId: week.id,
      code: 'EXAM_ONE',
      title: 'Final check',
      passingScoreBasisPoints: 7_500,
      createdByUserId: user.id,
      questions: {
        create: [
          {
            type: ExamQuestionType.SINGLE_CHOICE,
            prompt: 'Choose the correct answer',
            sortOrder: 1,
            points: 1,
            status: ExamQuestionStatus.APPROVED,
            approvedByUserId: user.id,
            approvedAt: new Date(),
            options: {
              create: [
                { text: 'Correct', sortOrder: 1, isCorrect: true },
                { text: 'Incorrect', sortOrder: 2, isCorrect: false },
              ],
            },
          },
        ],
      },
    },
  });
  const enrollment = await prisma.trainingEnrollment.create({
    data: {
      participantUserId: user.id,
      brandId: brand.id,
      plannedWeekCount: 1,
      curriculumVersionId: version.id,
    },
  });
  return { email, enrollmentId: enrollment.id, materialId: material.id };
}

async function cleanup(suffix: string) {
  const brandCode = `E2E_EXAM_${suffix}`;
  const users = await prisma.user.findMany({
    where: { normalizedEmail: { contains: suffix.toLowerCase() } },
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
  await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.brand.deleteMany({ where: { code: brandCode } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}
