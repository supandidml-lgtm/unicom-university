import { PrismaClient } from '@unicom/database';

// Playwright fixtures must never infer the development database from a local .env file.
const e2eDatabaseUrl =
  'postgresql://unicom_app:change-me-local@localhost:5432/unicom_test?schema=public';

export const e2ePrisma = new PrismaClient({
  datasources: { db: { url: e2eDatabaseUrl } },
});
