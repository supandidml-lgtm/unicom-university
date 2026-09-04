-- CreateEnum
CREATE TYPE "CurriculumStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CurriculumVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuthSecurityEventType" ADD VALUE 'CURRICULUM_CREATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'CURRICULUM_UPDATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'CURRICULUM_ARCHIVED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'CURRICULUM_VERSION_CREATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'CURRICULUM_VERSION_CLONED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'CURRICULUM_VERSION_PUBLISHED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'CURRICULUM_VERSION_RETIRED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'CURRICULUM_WEEK_CREATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'CURRICULUM_WEEK_UPDATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'CURRICULUM_WEEK_REMOVED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'CURRICULUM_WEEK_REORDERED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'CURRICULUM_MODULE_CREATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'CURRICULUM_MODULE_UPDATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'CURRICULUM_MODULE_REMOVED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'CURRICULUM_MODULE_REORDERED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'TRAINING_ENROLLMENT_CURRICULUM_BOUND';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'TRAINING_ENROLLMENT_CURRICULUM_CHANGED';

-- AlterTable
ALTER TABLE "TrainingEnrollment" ADD COLUMN     "curriculumVersionId" UUID;

-- CreateTable
CREATE TABLE "Curriculum" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CurriculumStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Curriculum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumVersion" (
    "id" UUID NOT NULL,
    "curriculumId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "CurriculumVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" UUID,
    "publishedByUserId" UUID,
    "publishedAt" TIMESTAMP(3),
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumWeek" (
    "id" UUID NOT NULL,
    "curriculumVersionId" UUID NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumModule" (
    "id" UUID NOT NULL,
    "curriculumWeekId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumModule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Curriculum_brandId_status_idx" ON "Curriculum"("brandId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Curriculum_brandId_code_key" ON "Curriculum"("brandId", "code");

-- CreateIndex
CREATE INDEX "CurriculumVersion_curriculumId_status_idx" ON "CurriculumVersion"("curriculumId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumVersion_curriculumId_versionNumber_key" ON "CurriculumVersion"("curriculumId", "versionNumber");

-- CreateIndex
CREATE INDEX "CurriculumWeek_curriculumVersionId_weekNumber_idx" ON "CurriculumWeek"("curriculumVersionId", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumWeek_curriculumVersionId_weekNumber_key" ON "CurriculumWeek"("curriculumVersionId", "weekNumber");

-- CreateIndex
CREATE INDEX "CurriculumModule_curriculumWeekId_sortOrder_idx" ON "CurriculumModule"("curriculumWeekId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumModule_curriculumWeekId_code_key" ON "CurriculumModule"("curriculumWeekId", "code");

-- CreateIndex
CREATE INDEX "TrainingEnrollment_curriculumVersionId_idx" ON "TrainingEnrollment"("curriculumVersionId");

-- AddForeignKey
ALTER TABLE "TrainingEnrollment" ADD CONSTRAINT "TrainingEnrollment_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Curriculum" ADD CONSTRAINT "Curriculum_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Curriculum" ADD CONSTRAINT "Curriculum_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumVersion" ADD CONSTRAINT "CurriculumVersion_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "Curriculum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumVersion" ADD CONSTRAINT "CurriculumVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumVersion" ADD CONSTRAINT "CurriculumVersion_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumWeek" ADD CONSTRAINT "CurriculumWeek_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumModule" ADD CONSTRAINT "CurriculumModule_curriculumWeekId_fkey" FOREIGN KEY ("curriculumWeekId") REFERENCES "CurriculumWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;
