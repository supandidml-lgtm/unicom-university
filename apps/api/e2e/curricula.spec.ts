import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { seedAuthorizationData, SystemRoleCode, UserStatus } from '@unicom/database';
import { e2ePrisma as prisma } from './test-database.js';

const password = 'curriculum-e2e-password';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('Administrator creates, edits, structures, and publishes a Brand-scoped curriculum', async ({
  page,
}) => {
  await seedAuthorizationData(prisma);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase();
  const administrator = await createAdministrator(suffix);
  const brand = await prisma.brand.create({
    data: { code: `E2E_CURRIC_${suffix}`, name: 'E2E Curriculum Brand' },
  });

  try {
    await page.goto('/login');
    await page.getByLabel('Email').fill(administrator.email);
    await page.locator('input#password').fill(password);
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page).toHaveURL(/\/authenticated$/);
    await page.getByRole('link', { name: 'Curriculum management' }).click();
    await expect(page.getByRole('heading', { name: 'Curriculum Management' })).toBeVisible();
    await page.getByLabel('Brand *').selectOption(brand.id);
    await page.getByLabel('Curriculum Code *').fill(`ONBOARD_${suffix}`);
    await page.getByLabel('Name *').fill('E2E Onboarding');
    await page.getByRole('button', { name: 'Create Curriculum' }).click();
    await expect(page.getByRole('heading', { name: 'E2E Onboarding' })).toBeVisible();
    await page.getByRole('button', { name: 'New draft version' }).click();
    await expect(page.getByText(/Version 1 DRAFT/)).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept('Introduction'));
    await page.getByRole('button', { name: 'Add next Week' }).click();
    await expect(page.getByText('Week 1: Introduction')).toBeVisible();
    let prompts = 0;
    page.on('dialog', (dialog) => {
      prompts += 1;
      void dialog.accept(prompts === 1 ? 'WELCOME' : 'Welcome Module');
    });
    await page.getByRole('button', { name: 'Add module' }).click();
    await expect(page.getByText('WELCOME — Welcome Module')).toBeVisible();
    page.removeAllListeners('dialog');

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText(/Version 1 PUBLISHED/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add next Week' })).toHaveCount(0);
  } finally {
    await prisma.trainingEnrollment.deleteMany({ where: { brandId: brand.id } });
    await prisma.curriculumVersion.deleteMany({ where: { curriculum: { brandId: brand.id } } });
    await prisma.curriculum.deleteMany({ where: { brandId: brand.id } });
    await prisma.brand.delete({ where: { id: brand.id } });
    await prisma.user.delete({ where: { id: administrator.id } });
  }
});

async function createAdministrator(suffix: string) {
  const email = `e2e-curriculum-admin-${suffix.toLowerCase()}@example.test`;
  const role = await prisma.role.findUniqueOrThrow({
    where: { code: SystemRoleCode.SuperAdministrator },
  });
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
      status: UserStatus.ACTIVE,
      activatedAt: new Date(),
      emailVerifiedAt: new Date(),
      userRoles: { create: { roleId: role.id } },
    },
  });
}
