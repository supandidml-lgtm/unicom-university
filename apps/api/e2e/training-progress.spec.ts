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

const password = 'training-progress-e2e-password';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('participant dashboard keeps Brand progress separate and reflects completed training', async ({
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
    await page.goto('/my-training');
    await expect(page.getByRole('heading', { name: 'Brand A' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Brand B' })).toBeVisible();
    const initialPrimaryCard = page
      .locator('li')
      .filter({ has: page.getByRole('heading', { name: 'Brand A' }) });
    const initialSecondaryCard = page
      .locator('li')
      .filter({ has: page.getByRole('heading', { name: 'Brand B' }) });
    await expect(initialPrimaryCard.getByText('Not started', { exact: true })).toBeVisible();
    await expect(initialSecondaryCard.getByText('Not started', { exact: true })).toBeVisible();

    await prisma.learningMaterialProgress.create({
      data: {
        enrollmentId: fixture.primaryEnrollmentId,
        materialId: fixture.primaryMaterialId,
        status: LearningMaterialProgressStatus.COMPLETED,
        progressBasisPoints: 10_000,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });
    await page.goto(`/my-training/${fixture.primaryEnrollmentId}`);
    await page.getByRole('button', { name: 'Start exam' }).click();
    await page.getByRole('radio', { name: 'Correct', exact: true }).check();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Submit exam' }).click();
    await expect(page.getByText('Result: PASS')).toBeVisible();
    await page.goto('/my-training');
    const completedCard = page
      .locator('li')
      .filter({ has: page.getByRole('heading', { name: 'Brand A' }) });
    await expect(completedCard.getByText('Completed', { exact: true })).toBeVisible();
    await expect(completedCard.getByText('Overall progress')).toBeVisible();
    const untouchedCard = page
      .locator('li')
      .filter({ has: page.getByRole('heading', { name: 'Brand B' }) });
    await expect(untouchedCard.getByText('Not started', { exact: true })).toBeVisible();
  } finally {
    await cleanup(suffix);
  }
});

async function createFixture(suffix: string) {
  const email = `training-progress-e2e-${suffix}@example.test`;
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
  const primary = await createEnrollmentContent('A', suffix, user.id, true);
  const secondary = await createEnrollmentContent('B', suffix, user.id, false);
  const [primaryEnrollment, secondaryEnrollment] = await Promise.all([
    prisma.trainingEnrollment.create({
      data: {
        participantUserId: user.id,
        brandId: primary.brandId,
        plannedWeekCount: 1,
        curriculumVersionId: primary.versionId,
      },
    }),
    prisma.trainingEnrollment.create({
      data: {
        participantUserId: user.id,
        brandId: secondary.brandId,
        plannedWeekCount: 1,
        curriculumVersionId: secondary.versionId,
      },
    }),
  ]);
  return {
    email,
    primaryEnrollmentId: primaryEnrollment.id,
    primaryMaterialId: primary.materialId,
    secondaryEnrollmentId: secondaryEnrollment.id,
  };
}

async function createEnrollmentContent(
  label: 'A' | 'B',
  suffix: string,
  creatorUserId: string,
  withExam: boolean,
) {
  const brand = await prisma.brand.create({
    data: { code: `E2E_PROGRESS_${label}_${suffix}`, name: `Brand ${label}` },
  });
  const curriculum = await prisma.curriculum.create({
    data: {
      brandId: brand.id,
      code: `PROGRESS_${label}_${suffix}`,
      name: `Brand ${label} curriculum`,
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
      storageKey: `progress-e2e/${randomUUID()}`,
      originalFileName: 'image.png',
      mimeType: 'image/png',
      detectedExtension: '.png',
      sizeBytes: 8,
      sha256: 'a'.repeat(64),
      status: FileAssetStatus.READY,
      createdByUserId: creatorUserId,
    },
  });
  const material = await prisma.learningMaterial.create({
    data: {
      curriculumModuleId: module.id,
      type: MaterialType.IMAGE,
      title: 'Required material',
      sortOrder: 1,
      fileAssetId: asset.id,
      createdByUserId: creatorUserId,
    },
  });
  if (withExam) {
    await prisma.exam.create({
      data: {
        curriculumVersionId: version.id,
        curriculumWeekId: week.id,
        code: 'FINAL',
        title: 'Final check',
        passingScoreBasisPoints: 7_500,
        createdByUserId: creatorUserId,
        questions: {
          create: [
            {
              type: ExamQuestionType.SINGLE_CHOICE,
              prompt: 'Choose the correct answer',
              sortOrder: 1,
              points: 1,
              status: ExamQuestionStatus.APPROVED,
              approvedByUserId: creatorUserId,
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
  }
  return { brandId: brand.id, versionId: version.id, materialId: material.id };
}

async function cleanup(suffix: string) {
  const brandCodes = [`E2E_PROGRESS_A_${suffix}`, `E2E_PROGRESS_B_${suffix}`];
  const users = await prisma.user.findMany({
    where: { normalizedEmail: { contains: suffix.toLowerCase() } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);
  await prisma.examAttempt.deleteMany({
    where: { enrollment: { brand: { code: { in: brandCodes } } } },
  });
  await prisma.examQuestion.deleteMany({
    where: { exam: { curriculumVersion: { curriculum: { brand: { code: { in: brandCodes } } } } } },
  });
  await prisma.exam.deleteMany({
    where: { curriculumVersion: { curriculum: { brand: { code: { in: brandCodes } } } } },
  });
  await prisma.learningMaterialProgress.deleteMany({
    where: { enrollment: { brand: { code: { in: brandCodes } } } },
  });
  await prisma.trainingEnrollment.deleteMany({ where: { brand: { code: { in: brandCodes } } } });
  await prisma.curriculumVersion.deleteMany({
    where: { curriculum: { brand: { code: { in: brandCodes } } } },
  });
  await prisma.curriculum.deleteMany({ where: { brand: { code: { in: brandCodes } } } });
  await prisma.fileAsset.deleteMany({ where: { createdByUserId: { in: userIds } } });
  await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.brand.deleteMany({ where: { code: { in: brandCodes } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}
