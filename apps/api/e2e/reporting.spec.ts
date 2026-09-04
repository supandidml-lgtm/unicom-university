import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import {
  EnrollmentStatus,
  seedAuthorizationData,
  SystemRoleCode,
  UserStatus,
} from '@unicom/database';
import { e2ePrisma as prisma } from './test-database.js';

const password = 'reporting-e2e-password';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('Trainer sees only scoped operational reporting and the secure export control', async ({
  page,
}) => {
  // Next development-mode route compilation on Windows can exceed the shared 60-second browser default.
  test.setTimeout(120_000);
  await seedAuthorizationData(prisma);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase();
  const fixture = await createFixture(suffix);
  try {
    await loginAs(page, fixture.trainerEmail);
    await test.step('Trainer sees only the scoped dashboard', async () => {
      await page.goto('/trainer/dashboard');
      await expect(page.getByRole('heading', { name: 'Trainer Dashboard' })).toBeVisible();
      await expect(page.getByText(fixture.brandACode, { exact: false })).toBeVisible();
      await expect(page.getByText(fixture.brandBCode, { exact: false })).toHaveCount(0);
    });
    await test.step('Trainer sees only the scoped report and export control', async () => {
      await page.goto('/trainer/reports/participants');
      await page.setViewportSize({ width: 375, height: 800 });
      await expect(
        page.getByRole('heading', { name: 'Participant Training Report' }),
      ).toBeVisible();
      await expect(page.getByText(fixture.participantAName)).toBeVisible();
      await expect(page.getByText(fixture.participantBName)).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Export Excel' })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Report pagination' })).toBeVisible();
    });
    await test.step('Super Administrator sees the global management dashboard', async () => {
      await page.context().clearCookies();
      await loginAs(page, fixture.administratorEmail);
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto('/admin/dashboard');
      await expect(page.getByRole('heading', { name: 'Management Dashboard' })).toBeVisible();
      await expect(page.getByText(fixture.brandACode, { exact: false })).toBeVisible();
      await expect(page.getByText(fixture.brandBCode, { exact: false })).toBeVisible();
    });
  } finally {
    await cleanup(suffix);
  }
});

async function createFixture(suffix: string) {
  const trainerEmail = `report-e2e-trainer-${suffix.toLowerCase()}@example.test`;
  const administratorEmail = `report-e2e-admin-${suffix.toLowerCase()}@example.test`;
  await createUser(administratorEmail, 'Administrator', SystemRoleCode.SuperAdministrator);
  const trainer = await createUser(trainerEmail, 'Trainer', SystemRoleCode.Trainer);
  const participantA = await createUser(
    `report-e2e-a-${suffix.toLowerCase()}@example.test`,
    'Scoped Participant',
    SystemRoleCode.Trainee,
  );
  const participantB = await createUser(
    `report-e2e-b-${suffix.toLowerCase()}@example.test`,
    'Foreign Participant',
    SystemRoleCode.Trainee,
  );
  const brandAName = 'Scoped Reporting Brand';
  const brandBName = 'Foreign Reporting Brand';
  const brandACode = `REPORT_E2E_A_${suffix}`;
  const brandBCode = `REPORT_E2E_B_${suffix}`;
  const brandA = await prisma.brand.create({
    data: { code: brandACode, name: brandAName },
  });
  const brandB = await prisma.brand.create({
    data: { code: brandBCode, name: brandBName },
  });
  await prisma.userBrandAccess.create({ data: { userId: trainer.id, brandId: brandA.id } });
  await prisma.trainingEnrollment.createMany({
    data: [
      {
        participantUserId: participantA.id,
        brandId: brandA.id,
        plannedWeekCount: 1,
        status: EnrollmentStatus.IN_PROGRESS,
      },
      {
        participantUserId: participantB.id,
        brandId: brandB.id,
        plannedWeekCount: 1,
        status: EnrollmentStatus.COMPLETED,
      },
    ],
  });
  return {
    administratorEmail,
    trainerEmail,
    participantAName: 'Scoped Participant',
    participantBName: 'Foreign Participant',
    brandACode,
    brandBCode,
    brandAName,
    brandBName,
  };
}
async function loginAs(page: Page, email: string) {
  const login = await page.request.post('http://localhost:4000/api/v1/auth/login', {
    data: { email, password },
  });
  expect(login.ok()).toBe(true);
  const setCookie = login.headers()['set-cookie'];
  if (!setCookie) throw new Error('Login did not return a session cookie.');
  const [name, value] = setCookie.split(';', 1)[0]!.split('=', 2);
  await page
    .context()
    .addCookies([{ name: name!, value: value!, domain: 'localhost', path: '/', httpOnly: true }]);
}
async function createUser(email: string, fullName: string, roleCode: string) {
  const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
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
      userRoles: { create: { roleId: role.id } },
    },
  });
  await prisma.staffProfile.create({
    data: {
      userId: user.id,
      fullName,
      phoneNumber: '+6281212345678',
      normalizedPhone: '6281212345678',
      encryptedNik: 'not-returned',
      nikFingerprint: randomUUID(),
      nikFirst4: '1234',
      nikLast4: '5678',
    },
  });
  return user;
}
async function cleanup(suffix: string) {
  const brands = await prisma.brand.findMany({
    where: { code: { contains: suffix } },
    select: { id: true },
  });
  const users = await prisma.user.findMany({
    where: { normalizedEmail: { contains: suffix.toLowerCase() } },
    select: { id: true },
  });
  const ids = users.map((user) => user.id);
  await prisma.trainingEnrollment.deleteMany({
    where: {
      OR: [
        { participantUserId: { in: ids } },
        { brandId: { in: brands.map((brand) => brand.id) } },
      ],
    },
  });
  await prisma.userBrandAccess.deleteMany({
    where: { OR: [{ userId: { in: ids } }, { brandId: { in: brands.map((brand) => brand.id) } }] },
  });
  await prisma.authSecurityEvent.deleteMany({ where: { userId: { in: ids } } });
  await prisma.authSession.deleteMany({ where: { userId: { in: ids } } });
  await prisma.staffProfile.deleteMany({ where: { userId: { in: ids } } });
  await prisma.userRole.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.brand.deleteMany({ where: { id: { in: brands.map((brand) => brand.id) } } });
}
