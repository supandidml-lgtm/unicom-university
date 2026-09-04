import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { seedAuthorizationData, SystemRoleCode } from '@unicom/database';
import { e2ePrisma as prisma } from './test-database.js';

const password = 'staff-e2e-password';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('Trainer provisions a Participant with safe invitation delivery status and no browser secrets', async ({
  page,
}) => {
  await seedAuthorizationData(prisma);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const trainer = await createActiveTrainer(suffix);
  const participantEmail = `staff-e2e-participant-${suffix}@example.test`;

  try {
    await page.goto('/login');
    await page.getByLabel('Email').fill(trainer.email);
    await page.locator('input#password').fill(password);
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page).toHaveURL(/\/authenticated$/);
    await page.getByRole('link', { name: 'My participants' }).click();
    await expect(page.getByRole('heading', { name: 'Participant Management' })).toBeVisible();
    await page.getByLabel('Full Name *').fill('E2E Participant');
    await page.getByLabel('Phone Number *').fill('0812-3456-7890');
    await page.getByLabel('NIK *').fill('3174123456789099');
    await page.getByLabel('Email *').fill(participantEmail);
    await page.getByRole('button', { name: 'Create Participant' }).click();
    await expect(page.getByText('NIK: 3174********9099 · Status: INVITED')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Invitation delivery status' })).toContainText(
      'Invitation delivery is queued.',
    );
    await expect(page.getByText(/activation link is delivered only/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy Activation Link' })).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);

    const hasSensitiveStorage = await page.evaluate(() => {
      const sensitive = /token|session|password|credential/i;
      return [localStorage, sessionStorage].some((storage) =>
        Array.from({ length: storage.length }, (_, index) => storage.key(index)).some(
          (key) => key !== null && sensitive.test(key),
        ),
      );
    });
    expect(hasSensitiveStorage).toBe(false);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  } finally {
    await prisma.user.deleteMany({
      where: { normalizedEmail: { contains: suffix.toLowerCase() } },
    });
  }
});

async function createActiveTrainer(suffix: string) {
  const email = `staff-e2e-trainer-${suffix}@example.test`;
  const role = await prisma.role.findUniqueOrThrow({ where: { code: SystemRoleCode.Trainer } });
  return prisma.user.create({
    data: {
      email,
      normalizedEmail: email,
      passwordHash: await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 4_096,
        timeCost: 1,
        parallelism: 1,
      }),
      status: 'ACTIVE',
      activatedAt: new Date(),
      emailVerifiedAt: new Date(),
      userRoles: { create: { roleId: role.id } },
    },
  });
}
