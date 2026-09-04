import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import {
  FileAssetStatus,
  MaterialType,
  seedAuthorizationData,
  SystemRoleCode,
  UserStatus,
} from '@unicom/database';
import { e2ePrisma as prisma } from './test-database.js';

const apiBaseUrl = 'http://localhost:4000';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('participant UI confirms acknowledgement only after server dwell and reloads completion', async ({
  page,
}) => {
  await seedAuthorizationData(prisma);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const password = `learning-${randomUUID()}`;
  const fixture = await createFixture(suffix, password);
  try {
    await login(page, fixture.email, password);
    await page.goto(`/my-training/${fixture.enrollmentId}`);
    await expect(page.getByRole('heading', { name: 'Learning materials' })).toBeVisible();
    await expect(page.getByText('Status: NOT STARTED · 0.00%').first()).toBeVisible();
    await page.getByRole('button', { name: 'I have read this material' }).click();
    await expect(page.getByText('Activity was not accepted.', { exact: true })).toBeVisible();
    const activity = await prisma.learningActivitySession.findFirstOrThrow({
      where: { enrollmentId: fixture.enrollmentId, materialId: fixture.materialId },
      orderBy: { createdAt: 'desc' },
    });
    await prisma.learningActivitySession.update({
      where: { id: activity.id },
      data: { startedAt: new Date(Date.now() - 6_000) },
    });
    await page.getByRole('button', { name: 'I have read this material' }).click();
    await expect(page.getByText('Status: COMPLETED · 100.00%')).toBeVisible();
    await page.reload();
    await expect(page.getByText('Status: COMPLETED · 100.00%')).toBeVisible();
  } finally {
    await cleanup(suffix);
  }
});

test('browser activity rejects a Video forward jump and completes progressive PDF reading', async ({
  page,
}) => {
  await seedAuthorizationData(prisma);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const password = `learning-${randomUUID()}`;
  const fixture = await createFixture(suffix, password);
  try {
    await login(page, fixture.email, password);
    const firstVideo = await browserPost(
      page,
      `/api/v1/my-training/enrollments/${fixture.enrollmentId}/materials/${fixture.videoId}/activity-sessions`,
      {},
    );
    expect(firstVideo.status).toBe(201);
    // Keep the elapsed interval far below the attempted jump. This verifies the
    // forward-seek guard without depending on process scheduling during E2E runs.
    await ageSession(firstVideo.body.activitySessionId, { lastEventAt: 1_000 });
    await browserPost(page, `/api/v1/learning/materials/${fixture.videoId}/video/heartbeat`, {
      activitySessionId: firstVideo.body.activitySessionId,
      sequence: 1,
      currentTimeMs: 1_000,
      playing: true,
      ended: false,
      visibility: 'visible',
      playbackRate: 1,
    });
    await ageSession(firstVideo.body.activitySessionId, { lastEventAt: 6_000 });
    const jump = await browserPost(
      page,
      `/api/v1/learning/materials/${fixture.videoId}/video/heartbeat`,
      {
        activitySessionId: firstVideo.body.activitySessionId,
        sequence: 2,
        currentTimeMs: 9_000,
        playing: true,
        ended: false,
        visibility: 'visible',
        playbackRate: 1,
      },
    );
    expect(jump.body.progressPercent).toBeLessThan(20);

    const pdf = await browserPost(
      page,
      `/api/v1/my-training/enrollments/${fixture.enrollmentId}/materials/${fixture.pdfId}/activity-sessions`,
      {},
    );
    expect(pdf.status).toBe(201);
    let pageEvent = { status: 0, body: {} as { status?: string } };
    for (let sequence = 1; sequence <= 6; sequence += 1) {
      await ageSession(pdf.body.activitySessionId, { lastEventAt: 6_000 });
      pageEvent = await browserPost(
        page,
        `/api/v1/learning/materials/${fixture.pdfId}/document/page`,
        {
          activitySessionId: pdf.body.activitySessionId,
          sequence,
          pageNumber: sequence % 2 === 1 ? 2 : 1,
        },
      );
      expect(pageEvent.status).toBe(201);
    }
    expect(pageEvent.body.status).toBe('COMPLETED');
  } finally {
    await cleanup(suffix);
  }
});

async function createFixture(suffix: string, password: string) {
  const email = `learning-${suffix}@example.test`;
  const traineeRole = await prisma.role.findUniqueOrThrow({
    where: { code: SystemRoleCode.Trainee },
  });
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
      userRoles: { create: { roleId: traineeRole.id } },
    },
  });
  const brand = await prisma.brand.create({
    data: { code: `E2E_LEARNING_${suffix}`, name: `E2E Learning ${suffix}` },
  });
  const curriculum = await prisma.curriculum.create({
    data: {
      brandId: brand.id,
      code: `LEARN_${suffix}`,
      name: 'Learning E2E',
      createdByUserId: user.id,
    },
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
    data: { curriculumWeekId: week.id, code: 'MODULE', name: 'Module', sortOrder: 0 },
  });
  const [imageAsset, videoAsset, pdfAsset] = await Promise.all([
    asset(user.id, 'image.png', 'image/png', '.png', {}),
    asset(user.id, 'video.mp4', 'video/mp4', '.mp4', { durationMs: 10_000 }),
    asset(user.id, 'guide.pdf', 'application/pdf', '.pdf', { pageCount: 2 }),
  ]);
  const [material, video, pdf] = await Promise.all([
    prisma.learningMaterial.create({
      data: {
        curriculumModuleId: module.id,
        type: MaterialType.IMAGE,
        title: 'E2E Image',
        sortOrder: 0,
        fileAssetId: imageAsset.id,
        createdByUserId: user.id,
      },
    }),
    prisma.learningMaterial.create({
      data: {
        curriculumModuleId: module.id,
        type: MaterialType.VIDEO,
        title: 'E2E Video',
        sortOrder: 1,
        fileAssetId: videoAsset.id,
        createdByUserId: user.id,
      },
    }),
    prisma.learningMaterial.create({
      data: {
        curriculumModuleId: module.id,
        type: MaterialType.PDF,
        title: 'E2E PDF',
        sortOrder: 2,
        fileAssetId: pdfAsset.id,
        createdByUserId: user.id,
      },
    }),
  ]);
  const enrollment = await prisma.trainingEnrollment.create({
    data: {
      participantUserId: user.id,
      brandId: brand.id,
      plannedWeekCount: 1,
      curriculumVersionId: version.id,
    },
  });
  return {
    email,
    enrollmentId: enrollment.id,
    materialId: material.id,
    videoId: video.id,
    pdfId: pdf.id,
  };
}

async function asset(
  userId: string,
  originalFileName: string,
  mimeType: string,
  detectedExtension: string,
  metadata: { durationMs?: number; pageCount?: number },
) {
  const storageKey = `materials/${randomUUID()}`;
  const storagePath = resolve(process.cwd(), 'apps', 'unicom-private-materials', storageKey);
  await fs.mkdir(dirname(storagePath), { recursive: true, mode: 0o700 });
  await fs.writeFile(
    storagePath,
    detectedExtension === '.pdf'
      ? '%PDF-1.4\n%%EOF\n'
      : Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  return prisma.fileAsset.create({
    data: {
      storageProvider: 'local',
      storageKey,
      originalFileName,
      mimeType,
      detectedExtension,
      sizeBytes: 8,
      sha256: 'a'.repeat(64),
      status: FileAssetStatus.READY,
      createdByUserId: userId,
      ...metadata,
    },
  });
}

async function ageSession(id: string, values: { lastEventAt?: number }) {
  await prisma.learningActivitySession.update({
    where: { id },
    data: values.lastEventAt ? { lastEventAt: new Date(Date.now() - values.lastEventAt) } : {},
  });
}

async function browserPost(
  page: Page,
  path: string,
  body: object,
): Promise<{
  status: number;
  body: { activitySessionId: string; progressPercent?: number; status?: string };
}> {
  return page.evaluate(
    async ({ baseUrl, path, body }) => {
      const csrf = await fetch(`${baseUrl}/api/v1/auth/csrf`, { credentials: 'include' });
      const { csrfToken } = (await csrf.json()) as { csrfToken: string };
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify(body),
      });
      return {
        status: response.status,
        body: (await response.json()) as {
          activitySessionId: string;
          progressPercent?: number;
          status?: string;
        },
      };
    },
    { baseUrl: apiBaseUrl, path, body },
  );
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.locator('input#password').fill(password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page).toHaveURL(/\/authenticated$/);
}

async function cleanup(suffix: string) {
  const brandCode = `E2E_LEARNING_${suffix}`;
  const users = await prisma.user.findMany({
    where: { normalizedEmail: { contains: suffix.toLowerCase() } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);
  const assets = await prisma.fileAsset.findMany({
    where: { createdByUserId: { in: userIds } },
    select: { storageKey: true },
  });
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
  await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.brand.deleteMany({ where: { code: brandCode } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await Promise.all(
    assets.map(({ storageKey }) =>
      fs.rm(resolve(process.cwd(), 'apps', 'unicom-private-materials', storageKey), {
        force: true,
      }),
    ),
  );
}
