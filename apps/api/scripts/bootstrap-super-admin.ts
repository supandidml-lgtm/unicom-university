import { loadApiEnvironment } from '@unicom/config';
import { prisma } from '@unicom/database';
import { PasswordService } from '../src/modules/auth/password.service.js';
import { SuperAdminBootstrapService } from '../src/modules/authorization/super-admin-bootstrap.service.js';

const productionConfirmation = 'BOOTSTRAP_SUPER_ADMIN';

async function main(): Promise<void> {
  loadApiEnvironment();
  const email = process.env['ADMIN_BOOTSTRAP_EMAIL'];
  const password = process.env['ADMIN_BOOTSTRAP_PASSWORD'];
  const confirmPassword = process.env['ADMIN_BOOTSTRAP_CONFIRM_PASSWORD'];
  if (!email || !password || !confirmPassword) {
    throw new Error(
      'Set ADMIN_BOOTSTRAP_EMAIL, ADMIN_BOOTSTRAP_PASSWORD, and ADMIN_BOOTSTRAP_CONFIRM_PASSWORD.',
    );
  }
  const service = new SuperAdminBootstrapService(new PasswordService());
  await service.bootstrap({
    email,
    password,
    confirmPassword,
    productionConfirmed: process.env['ADMIN_BOOTSTRAP_CONFIRM'] === productionConfirmation,
  });
  console.info('Super Administrator bootstrap completed.');
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Super Administrator bootstrap failed.';
  console.error(message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
