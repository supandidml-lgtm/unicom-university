import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { seedAuthorizationData, SystemRoleCode } from '@unicom/database';
import { e2ePrisma as prisma } from './test-database.js';

const password = 'authorization-e2e-password';

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('Super Administrator can access authorization UI while a low-privilege user is denied', async ({
  page,
}) => {
  await seedAuthorizationData(prisma);
  const superAdministrator = await createActiveUser('super');
  const trainee = await createActiveUser('trainee', SystemRoleCode.Trainee);
  const superRole = await prisma.role.findUniqueOrThrow({
    where: { code: SystemRoleCode.SuperAdministrator },
  });
  await prisma.userRole.create({ data: { userId: superAdministrator.id, roleId: superRole.id } });

  try {
    await page.goto('/login');
    await page.getByLabel('Email').fill(superAdministrator.email);
    await page.locator('input#password').fill(password);
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page).toHaveURL(/\/authenticated$/);
    await page.getByRole('link', { name: 'Authorization access' }).click();
    await expect(
      page.getByRole('heading', { name: 'Authorization Foundation Ready' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Current Roles' })).toBeVisible();
    await expect(page.getByText('Super Administrator')).toBeVisible();
    await expect(page.getByText('roles.create')).toBeVisible();

    await page.context().clearCookies();
    await page.goto('/login');

    await page.getByLabel('Email').fill(trainee.email);
    await page.locator('input#password').fill(password);
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page).toHaveURL(/\/authenticated$/);
    await page.goto('/admin/access');
    await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible();
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: [superAdministrator.id, trainee.id] } } });
  }
});

async function createActiveUser(prefix: string, roleCode?: SystemRoleCode) {
  const email = `e2e-rbac-${prefix}-${randomUUID()}@example.test`;
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
