import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { seedAuthorizationData, SystemRoleCode } from '@unicom/database';
import { e2ePrisma as prisma } from './test-database.js';

const password = 'brand-e2e-password';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('Super Administrator manages Brand lifecycle while Trainer sees only assigned Brand scope', async ({
  page,
}) => {
  await seedAuthorizationData(prisma);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase();
  const superAdministrator = await createActiveUser(`super-${suffix}`);
  const trainer = await createActiveUser(`trainer-${suffix}`, SystemRoleCode.Trainer);
  const superRole = await prisma.role.findUniqueOrThrow({
    where: { code: SystemRoleCode.SuperAdministrator },
  });
  await prisma.userRole.create({ data: { userId: superAdministrator.id, roleId: superRole.id } });
  const assignedBrand = await prisma.brand.create({
    data: {
      code: `FIRST_${suffix}`,
      name: 'Assigned Brand',
      createdByUserId: superAdministrator.id,
    },
  });
  const hiddenBrand = await prisma.brand.create({
    data: {
      code: `SECOND_${suffix}`,
      name: 'Hidden Brand',
      createdByUserId: superAdministrator.id,
    },
  });
  await prisma.userBrandAccess.create({
    data: { userId: trainer.id, brandId: assignedBrand.id, createdByUserId: superAdministrator.id },
  });
  const managedCode = `MANAGED_${suffix}`;

  try {
    await page.goto('/login');
    await page.getByLabel('Email').fill(superAdministrator.email);
    await page.locator('input#password').fill(password);
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page).toHaveURL(/\/authenticated$/);
    await page.getByRole('link', { name: 'Brand management' }).click();
    await expect(page.getByRole('heading', { name: 'Brand Management' })).toBeVisible();
    await page.getByLabel('Brand Code *').fill(managedCode);
    await page.getByLabel('Brand Name *').fill('Managed Brand');
    await page.getByRole('button', { name: 'Create Brand' }).click();
    await expect(page.getByRole('button', { name: `Archive ${managedCode}` })).toBeVisible();
    await page.getByRole('button', { name: `Edit ${managedCode}` }).click();
    await page.getByLabel('Brand Name *').last().fill('Managed Brand Updated');
    await page.getByRole('button', { name: 'Save Brand' }).click();
    await expect(page.getByText('Managed Brand Updated')).toBeVisible();
    await page.getByRole('button', { name: `Archive ${managedCode}` }).click();
    await expect(page.getByText(`${managedCode} · Status: ARCHIVED`)).toBeVisible();
    await page.getByRole('button', { name: `Reactivate ${managedCode}` }).click();
    await expect(page.getByText(`${managedCode} · Status: ACTIVE`)).toBeVisible();

    await page.goto('/authenticated');
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/login');
    await page.getByLabel('Email').fill(trainer.email);
    await page.locator('input#password').fill(password);
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page).toHaveURL(/\/authenticated$/);
    await page.getByRole('link', { name: 'Brand management' }).click();
    await expect(page.getByText(assignedBrand.code)).toBeVisible();
    await expect(page.getByText(hiddenBrand.code)).not.toBeVisible();
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByRole('heading', { name: 'Brand Management' })).toBeVisible();
    expect(
      await page.locator('main').evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    const responseStatus = await page.evaluate(async (brandId) => {
      const response = await fetch(`http://localhost:4000/api/v1/brands/${brandId}`, {
        credentials: 'include',
      });
      return response.status;
    }, hiddenBrand.id);
    expect(responseStatus).toBe(403);
  } finally {
    await prisma.userBrandAccess.deleteMany({ where: { userId: trainer.id } });
    await prisma.brand.deleteMany({ where: { id: { in: [assignedBrand.id, hiddenBrand.id] } } });
    await prisma.brand.deleteMany({ where: { code: managedCode } });
    await prisma.user.deleteMany({ where: { id: { in: [superAdministrator.id, trainer.id] } } });
  }
});

async function createActiveUser(prefix: string, roleCode?: SystemRoleCode) {
  const email = `e2e-brand-${prefix}@example.test`;
  const user = await prisma.user.create({
    data: {
      email,
      normalizedEmail: email.toLowerCase(),
      passwordHash: await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 4_096,
        timeCost: 1,
        parallelism: 1,
      }),
      status: 'ACTIVE',
      activatedAt: new Date(),
      emailVerifiedAt: new Date(),
    },
  });
  if (roleCode) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  }
  return user;
}
