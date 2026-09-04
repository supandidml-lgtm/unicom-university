import { prisma, seedAuthorizationData } from '../src/index.js';

try {
  await seedAuthorizationData(prisma);
  console.info('System roles and permissions seeded.');
} finally {
  await prisma.$disconnect();
}
