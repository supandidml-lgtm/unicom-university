import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { seedAuthorizationData, SystemRoleCode, UserStatus } from '@unicom/database';
import { StaffProfileCrypto } from '../src/modules/staff/staff-profile.crypto.js';
import { e2ePrisma as prisma } from './test-database.js';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('Trainer assigns multiple scoped Brands from the participant workflow', async ({ page }) => {
  await seedAuthorizationData(prisma);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const password = `e2e-${randomUUID()}`;
  const trainer = await createActiveUser(`trainer-${suffix}`, SystemRoleCode.Trainer, password);
  const participant = await createParticipant(
    `participant-${suffix}`,
    trainer.id,
    UserStatus.INVITED,
  );
  const [brandA, brandB] = await createBrands(suffix);
  await prisma.userBrandAccess.createMany({
    data: [
      { userId: trainer.id, brandId: brandA.id, createdByUserId: trainer.id },
      { userId: trainer.id, brandId: brandB.id, createdByUserId: trainer.id },
    ],
  });

  try {
    await login(page, trainer.email, password);
    await page.getByRole('link', { name: 'My participants' }).click();
    await page.getByRole('link', { name: 'Assign Training' }).click();
    await expect(page).toHaveURL(new RegExp(`/trainer/participants/${participant.id}/training$`));
    await page.getByLabel(`${brandA.name} (${brandA.code})`).check();
    await page.getByLabel(`${brandB.name} (${brandB.code})`).check();
    const weekInputs = page.getByLabel('Training Weeks *');
    await weekInputs.nth(0).fill('4');
    await weekInputs.nth(1).fill('2');
    await page.getByRole('button', { name: 'Assign Training' }).click();
    await expect(page.getByText(`Status: NOT_STARTED · Planned Duration: 4 Weeks`)).toBeVisible();
    await expect(page.getByText(`Status: NOT_STARTED · Planned Duration: 2 Weeks`)).toBeVisible();
    await expect(page.getByText(/^Progress:/i)).toHaveCount(0);
  } finally {
    await cleanup(suffix);
  }
});

test('Trainer browser request cannot inject an unassigned Brand and leaves no enrollment behind', async ({
  page,
}) => {
  await seedAuthorizationData(prisma);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const password = `e2e-${randomUUID()}`;
  const trainer = await createActiveUser(
    `scope-trainer-${suffix}`,
    SystemRoleCode.Trainer,
    password,
  );
  const participant = await createParticipant(
    `scope-participant-${suffix}`,
    trainer.id,
    UserStatus.ACTIVE,
  );
  const [brandA, brandB] = await createBrands(suffix);
  await prisma.userBrandAccess.create({
    data: { userId: trainer.id, brandId: brandA.id, createdByUserId: trainer.id },
  });

  try {
    await login(page, trainer.email, password);
    const result = await page.evaluate(
      async ({ participantId, allowedBrandId, forbiddenBrandId }) => {
        const csrfResponse = await fetch('http://localhost:4000/api/v1/auth/csrf', {
          credentials: 'include',
        });
        const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
        const response = await fetch(
          `http://localhost:4000/api/v1/participants/${participantId}/enrollments`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: JSON.stringify({
              enrollments: [
                { brandId: allowedBrandId, plannedWeekCount: 4 },
                { brandId: forbiddenBrandId, plannedWeekCount: 2 },
              ],
            }),
          },
        );
        return response.status;
      },
      { participantId: participant.id, allowedBrandId: brandA.id, forbiddenBrandId: brandB.id },
    );
    expect(result).toBe(403);
    expect(
      await prisma.trainingEnrollment.count({ where: { participantUserId: participant.id } }),
    ).toBe(0);
  } finally {
    await cleanup(suffix);
  }
});

test('Participant sees only own safe training assignments', async ({ page }) => {
  await seedAuthorizationData(prisma);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const password = `e2e-${randomUUID()}`;
  const participant = await createParticipant(
    `self-participant-${suffix}`,
    null,
    UserStatus.ACTIVE,
    password,
  );
  const otherParticipant = await createParticipant(
    `other-participant-${suffix}`,
    null,
    UserStatus.ACTIVE,
    `e2e-${randomUUID()}`,
  );
  const [brandA, brandB] = await createBrands(suffix);
  await prisma.trainingEnrollment.createMany({
    data: [
      { participantUserId: participant.id, brandId: brandA.id, plannedWeekCount: 4 },
      { participantUserId: participant.id, brandId: brandB.id, plannedWeekCount: 2 },
      { participantUserId: otherParticipant.id, brandId: brandA.id, plannedWeekCount: 9 },
    ],
  });

  try {
    await login(page, participant.email, password);
    await page.getByRole('navigation').getByRole('link', { name: 'My Training' }).click();
    await expect(page.getByRole('heading', { name: 'My Training' })).toBeVisible();
    await expect(page.getByText(brandA.name, { exact: true })).toBeVisible();
    await expect(page.getByText(brandB.name, { exact: true })).toBeVisible();
    await expect(page.getByText(`Brand: ${brandA.code}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Brand: ${brandB.code}`, { exact: true })).toBeVisible();
    await expect(page.getByText(/Planned duration: 4 weeks/i)).toBeVisible();
    await expect(page.getByText(/Planned duration: 2 weeks/i)).toBeVisible();
    await expect(page.getByText(/Planned duration: 9 weeks/i)).toHaveCount(0);
  } finally {
    await cleanup(suffix);
  }
});

async function createActiveUser(label: string, roleCode: SystemRoleCode, password: string) {
  const email = `${label}@example.test`;
  const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
  return prisma.user.create({
    data: {
      email,
      normalizedEmail: email,
      passwordHash: await hashPassword(password),
      status: UserStatus.ACTIVE,
      activatedAt: new Date(),
      emailVerifiedAt: new Date(),
      userRoles: { create: { roleId: role.id } },
    },
  });
}

async function createParticipant(
  label: string,
  createdByUserId: string | null,
  status: UserStatus,
  password = `e2e-${randomUUID()}`,
) {
  const user = await createActiveUser(label, SystemRoleCode.Trainee, password);
  const nik = `3174${randomUUID()
    .replaceAll(/[^0-9]/g, '')
    .padEnd(12, '0')
    .slice(0, 12)}`;
  const crypto = new StaffProfileCrypto();
  await prisma.user.update({
    where: { id: user.id },
    data:
      status === UserStatus.INVITED
        ? { status: UserStatus.INVITED, activatedAt: null, emailVerifiedAt: null }
        : {},
  });
  await prisma.staffProfile.create({
    data: {
      userId: user.id,
      ...(createdByUserId ? { createdByUserId } : {}),
      fullName: label,
      phoneNumber: '+6281234567890',
      normalizedPhone: '+6281234567890',
      encryptedNik: crypto.encryptNik(nik),
      nikFingerprint: crypto.fingerprintNik(nik),
      nikFirst4: nik.slice(0, 4),
      nikLast4: nik.slice(-4),
    },
  });
  return user;
}

async function createBrands(suffix: string) {
  const [brandA, brandB] = await Promise.all(
    ['A', 'B'].map((part) =>
      prisma.brand.create({
        data: {
          code: `E2E_ENROLL_${part}_${suffix}`,
          name: `E2E Enrollment Brand ${part}`,
        },
      }),
    ),
  );
  if (!brandA || !brandB) throw new Error('Expected two test Brands.');
  return [brandA, brandB] as const;
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.locator('input#password').fill(password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page).toHaveURL(/\/authenticated$/);
}

async function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 4_096,
    timeCost: 1,
    parallelism: 1,
  });
}

async function cleanup(suffix: string): Promise<void> {
  await prisma.trainingEnrollment.deleteMany({ where: { brand: { code: { contains: suffix } } } });
  await prisma.userBrandAccess.deleteMany({ where: { brand: { code: { contains: suffix } } } });
  await prisma.brand.deleteMany({ where: { code: { contains: suffix } } });
  await prisma.user.deleteMany({ where: { normalizedEmail: { contains: suffix.toLowerCase() } } });
}
