import { PrismaClient } from '@prisma/client';

export type { Prisma } from '@prisma/client';

export {
  AuthSecurityEventType,
  AiQuestionGenerationJobStatus,
  BrandStatus,
  CurriculumStatus,
  CurriculumVersionStatus,
  CertificatePdfStatus,
  ExamAttemptStatus,
  ExamQuestionStatus,
  ExamQuestionOrigin,
  ExamQuestionType,
  FileAssetStatus,
  FileAssetPurpose,
  LearningActivitySessionType,
  LearningMaterialProgressStatus,
  MaterialType,
  MaterialSourceExtractionStatus,
  MaterialSourceLocatorType,
  NotificationDeliveryStatus,
  NotificationDeliveryType,
  EnrollmentStatus,
  TrainingCertificateStatus,
  PrismaClient,
  UserStatus,
} from '@prisma/client';
export * from './rbac.js';
export * from './seed.js';

const prismaGlobal = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = prismaGlobal.prisma ?? new PrismaClient();

if (process.env['NODE_ENV'] !== 'production') {
  prismaGlobal.prisma = prisma;
}

export async function verifyDatabaseConnection(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}
