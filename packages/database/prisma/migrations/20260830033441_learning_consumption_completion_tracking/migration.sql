-- CreateEnum
CREATE TYPE "LearningMaterialProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LearningActivitySessionType" AS ENUM ('VIDEO', 'PAGINATED', 'ACKNOWLEDGEMENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuthSecurityEventType" ADD VALUE 'LEARNING_MATERIAL_COMPLETED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'LEARNING_ACTIVITY_REJECTED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'LEARNING_ACTIVITY_SEQUENCE_REPLAY';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'LEARNING_ACTIVITY_SCOPE_DENIED';

-- AlterTable
ALTER TABLE "FileAsset" ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "pageCount" INTEGER;

-- CreateTable
CREATE TABLE "LearningMaterialProgress" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "status" "LearningMaterialProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progressBasisPoints" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "videoCoverage" JSONB,
    "pageCoverage" JSONB,
    "accumulatedDwellMs" INTEGER NOT NULL DEFAULT 0,
    "lastVerifiedPositionMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningMaterialProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningActivitySession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "type" "LearningActivitySessionType" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "lastPositionMs" INTEGER,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningActivitySession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningMaterialProgress_enrollmentId_status_idx" ON "LearningMaterialProgress"("enrollmentId", "status");

-- CreateIndex
CREATE INDEX "LearningMaterialProgress_materialId_idx" ON "LearningMaterialProgress"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningMaterialProgress_enrollmentId_materialId_key" ON "LearningMaterialProgress"("enrollmentId", "materialId");

-- CreateIndex
CREATE INDEX "LearningActivitySession_userId_expiresAt_idx" ON "LearningActivitySession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "LearningActivitySession_enrollmentId_materialId_idx" ON "LearningActivitySession"("enrollmentId", "materialId");

-- AddForeignKey
ALTER TABLE "LearningMaterialProgress" ADD CONSTRAINT "LearningMaterialProgress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "TrainingEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningMaterialProgress" ADD CONSTRAINT "LearningMaterialProgress_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "LearningMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningActivitySession" ADD CONSTRAINT "LearningActivitySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningActivitySession" ADD CONSTRAINT "LearningActivitySession_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "TrainingEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningActivitySession" ADD CONSTRAINT "LearningActivitySession_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "LearningMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
