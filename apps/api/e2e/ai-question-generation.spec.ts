import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  CurriculumVersionStatus,
  FileAssetStatus,
  MaterialSourceExtractionStatus,
  MaterialSourceLocatorType,
  MaterialType,
  seedAuthorizationData,
  SystemRoleCode,
  UserStatus,
} from '@unicom/database';
import { e2ePrisma as prisma } from './test-database.js';

const password = 'ai-e2e-password';
const execute = promisify(exec);

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('scoped Trainer generates, reviews, approves, and regenerates grounded Draft questions', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await seedAuthorizationData(prisma);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase();
  const fixture = await createFixture(suffix);
  try {
    await page.goto('/login');
    await page.getByLabel('Email').fill(fixture.email);
    await page.locator('input#password').fill(password);
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page).toHaveURL(/\/authenticated$/);
    await page.goto('/admin/curricula');
    await expect(page.getByText(fixture.examTitle)).toBeVisible();

    await submitGeneration(page, fixture.materialTitle);
    await expect(page.getByText('AI job: QUEUED')).toBeVisible();
    await processNextJob();
    await page.reload();

    const firstQuestion = page.getByText(/Generated grounded question 1/).first();
    await expect(firstQuestion).toBeVisible();
    await expect(page.getByText('AI Generated')).toHaveCount(1);
    await expect(page.getByText('Source evidence:')).toBeVisible();
    await expect(
      page.getByRole('link', { name: `Open source evidence from ${fixture.materialTitle}` }),
    ).toHaveAttribute('href', /#page=5$/);
    await page.getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByText('Question approved.')).toBeVisible();

    await submitGeneration(page, fixture.materialTitle);
    await processNextJob();
    await page.reload();
    await expect(page.getByText('AI Generated')).toHaveCount(2);
    await expect(page.getByText(/Generated grounded question 1/).first()).toBeVisible();
    await expect(page.getByText('APPROVED').first()).toBeVisible();
  } finally {
    await cleanup(suffix);
  }
});

async function submitGeneration(page: Page, materialTitle: string) {
  await page.getByRole('checkbox', { name: new RegExp(materialTitle) }).check();
  await page.getByLabel('Single choice').fill('1');
  await page.getByLabel('Multiple choice').fill('0');
  await page.getByLabel('True / False').fill('0');
  await page.getByRole('button', { name: 'Generate draft questions' }).click();
}

async function processNextJob() {
  await execute('pnpm --filter @unicom/api exec tsx e2e/process-ai-job.ts', {
    cwd: process.cwd(),
    env: process.env,
    windowsHide: true,
  });
}

async function createFixture(suffix: string) {
  const email = `ai-e2e-${suffix.toLowerCase()}@example.test`;
  const trainerRole = await prisma.role.findUniqueOrThrow({
    where: { code: SystemRoleCode.Trainer },
  });
  const trainer = await prisma.user.create({
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
      userRoles: { create: { roleId: trainerRole.id } },
    },
  });
  const brand = await prisma.brand.create({
    data: { code: `AI_E2E_${suffix}`, name: 'AI E2E Brand' },
  });
  await prisma.userBrandAccess.create({ data: { userId: trainer.id, brandId: brand.id } });
  const curriculum = await prisma.curriculum.create({
    data: {
      brandId: brand.id,
      code: `AI_E2E_${suffix}`,
      name: 'AI E2E Curriculum',
      createdByUserId: trainer.id,
    },
  });
  const version = await prisma.curriculumVersion.create({
    data: { curriculumId: curriculum.id, versionNumber: 1, status: CurriculumVersionStatus.DRAFT },
  });
  const week = await prisma.curriculumWeek.create({
    data: { curriculumVersionId: version.id, weekNumber: 1, title: 'AI Week' },
  });
  const module = await prisma.curriculumModule.create({
    data: { curriculumWeekId: week.id, code: 'AI_MODULE', name: 'AI Module', sortOrder: 1 },
  });
  const asset = await prisma.fileAsset.create({
    data: {
      storageProvider: 'local',
      storageKey: `materials/${randomUUID()}`,
      originalFileName: 'source.pdf',
      mimeType: 'application/pdf',
      detectedExtension: '.pdf',
      sizeBytes: 12,
      sha256: randomUUID().replaceAll('-', '').repeat(2).slice(0, 64),
      status: FileAssetStatus.READY,
      createdByUserId: trainer.id,
    },
  });
  const materialTitle = 'AI E2E Source';
  await prisma.learningMaterial.create({
    data: {
      curriculumModuleId: module.id,
      type: MaterialType.PDF,
      title: materialTitle,
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
      content: 'Verified page five source fact.',
      locatorType: MaterialSourceLocatorType.PDF_PAGE,
      locator: { pageNumber: 5 },
    },
  });
  const examTitle = 'AI E2E Exam';
  await prisma.exam.create({
    data: {
      curriculumVersionId: version.id,
      curriculumWeekId: week.id,
      code: 'AI_E2E_EXAM',
      title: examTitle,
      passingScoreBasisPoints: 7_500,
    },
  });
  return { email, materialTitle, examTitle };
}

async function cleanup(suffix: string) {
  const code = `AI_E2E_${suffix}`;
  const users = await prisma.user.findMany({
    where: { normalizedEmail: { contains: suffix.toLowerCase() } },
    select: { id: true },
  });
  const ids = users.map((user) => user.id);
  await prisma.aiQuestionGenerationJob.deleteMany({
    where: { exam: { curriculumVersion: { curriculum: { code } } } },
  });
  await prisma.examQuestion.deleteMany({
    where: { exam: { curriculumVersion: { curriculum: { code } } } },
  });
  await prisma.exam.deleteMany({ where: { curriculumVersion: { curriculum: { code } } } });
  await prisma.materialSourceExtraction.deleteMany({
    where: { fileAsset: { createdByUserId: { in: ids } } },
  });
  await prisma.curriculumVersion.deleteMany({ where: { curriculum: { code } } });
  await prisma.curriculum.deleteMany({ where: { code } });
  await prisma.fileAsset.deleteMany({ where: { createdByUserId: { in: ids } } });
  await prisma.userBrandAccess.deleteMany({ where: { userId: { in: ids } } });
  await prisma.authSession.deleteMany({ where: { userId: { in: ids } } });
  await prisma.userRole.deleteMany({ where: { userId: { in: ids } } });
  await prisma.brand.deleteMany({ where: { code } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}
