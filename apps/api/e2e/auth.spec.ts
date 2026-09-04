/// <reference lib="dom" />

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { e2ePrisma as prisma } from './test-database.js';

const apiBaseUrl = 'http://localhost:4000';
const password = 'e2e-secure-password';
const sessionCookieName = 'unicom_e2e_session';

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('invitation activation and session lifecycle are secure in the browser', async ({
  page,
  request,
}) => {
  const email = `e2e-auth-${randomUUID()}@example.test`;
  const token = randomBytes(32).toString('base64url');
  const user = await prisma.user.create({
    data: { email, normalizedEmail: email },
  });
  await prisma.invitationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  try {
    await page.goto(`/activate?token=${encodeURIComponent(token)}`);
    await expect(page).toHaveURL(/\/activate$/);
    await expect(page.getByLabel('Password baru')).toBeVisible();
    await expect(page.getByLabel('Konfirmasi password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aktifkan akun' })).toBeEnabled();

    await page.getByLabel('Password baru').fill(password);
    await page.getByLabel('Konfirmasi password').fill(`${password}-mismatch`);
    await page.getByRole('button', { name: 'Aktifkan akun' }).click();
    await expect(page.locator('form [role="alert"]')).toHaveText(
      'Konfirmasi password tidak cocok.',
    );

    await page.getByLabel('Konfirmasi password').fill(password);
    await page.getByRole('button', { name: 'Aktifkan akun' }).click();
    await expect(page.getByRole('status')).toContainText('Akun berhasil diaktivasi.');

    const invitation = await prisma.invitationToken.findUniqueOrThrow({
      where: { tokenHash: hashToken(token) },
    });
    expect(invitation.usedAt).not.toBeNull();

    await page.goto(`/activate?token=${encodeURIComponent(token)}`);
    await expect(page.getByLabel('Password baru')).toBeVisible();
    await page.getByLabel('Password baru').fill(password);
    await page.getByLabel('Konfirmasi password').fill(password);
    await page.getByRole('button', { name: 'Aktifkan akun' }).click();
    await expect(page.locator('form [role="alert"]')).toHaveText(
      'Tautan aktivasi tidak valid atau telah kedaluwarsa.',
    );

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.locator('input#password').fill(password);
    await page.locator('input#password').press('Enter');
    await expect(page).toHaveURL(/\/authenticated$/);
    await expect(page.getByText(`Email: ${email}`)).toBeVisible();

    const sessionCookie = (await page.context().cookies(apiBaseUrl)).find(
      (cookie) => cookie.name === sessionCookieName,
    );
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(sessionCookie?.sameSite).toBe('Lax');
    expect(sessionCookie?.path).toBe('/');
    expect(sessionCookie?.secure).toBe(false);

    const hasCredentialInWebStorage = await page.evaluate(() => {
      const sensitiveKey = /session|token|jwt|password|credential/i;
      const storageContainsCredential = (storage: Storage): boolean =>
        Array.from({ length: storage.length }, (_, index) => storage.key(index)).some(
          (key) => key !== null && sensitiveKey.test(key),
        );
      return storageContainsCredential(localStorage) || storageContainsCredential(sessionStorage);
    });
    expect(hasCredentialInWebStorage).toBe(false);

    await page.reload();
    await expect(page.getByText(`Email: ${email}`)).toBeVisible();

    const csrfFailureStatus = await page.evaluate(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      return response.status;
    }, apiBaseUrl);
    expect(csrfFailureStatus).toBe(403);

    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login$/);

    const replay = await request.get(`${apiBaseUrl}/api/v1/auth/me`, {
      headers: { Cookie: `${sessionCookieName}=${sessionCookie?.value ?? ''}` },
    });
    expect(replay.status()).toBe(401);

    await page.getByLabel('Email').fill(`unknown-${randomUUID()}@example.test`);
    await page.locator('input#password').fill(password);
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page.locator('form [role="alert"]')).toHaveText(
      'Email atau password tidak valid.',
    );

    await page.getByLabel('Email').fill(email);
    await page.locator('input#password').fill(`${password}-wrong`);
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page.locator('form [role="alert"]')).toHaveText(
      'Email atau password tidak valid.',
    );
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test.describe('mobile accessibility smoke', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('login and activation inputs have labels and fit a narrow viewport', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Masuk' })).toBeVisible();
    expect(await page.evaluate(() => document.body.scrollWidth <= window.innerWidth)).toBe(true);

    await page.goto('/activate');
    await expect(page.getByLabel('Password baru')).toBeVisible();
    await expect(page.getByLabel('Konfirmasi password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aktifkan akun' })).toBeVisible();
    expect(await page.evaluate(() => document.body.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
