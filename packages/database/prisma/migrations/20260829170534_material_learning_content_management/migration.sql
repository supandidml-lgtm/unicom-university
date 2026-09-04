-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('VIDEO', 'PDF', 'IMAGE', 'DOCUMENT', 'SPREADSHEET');

-- CreateEnum
CREATE TYPE "FileAssetStatus" AS ENUM ('UPLOADING', 'QUARANTINED', 'READY', 'REJECTED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuthSecurityEventType" ADD VALUE 'MATERIAL_CREATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'MATERIAL_UPDATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'MATERIAL_REMOVED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'MATERIAL_REORDERED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'MATERIAL_FILE_REPLACED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'FILE_ASSET_UPLOADED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'FILE_ASSET_READY';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'FILE_ASSET_REJECTED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'MATERIAL_ACCESS_DENIED';

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" UUID NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "detectedExtension" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "status" "FileAssetStatus" NOT NULL DEFAULT 'UPLOADING',
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningMaterial" (
    "id" UUID NOT NULL,
    "curriculumModuleId" UUID NOT NULL,
    "type" "MaterialType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "fileAssetId" UUID NOT NULL,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FileAsset_storageKey_key" ON "FileAsset"("storageKey");

-- CreateIndex
CREATE INDEX "FileAsset_createdByUserId_idx" ON "FileAsset"("createdByUserId");

-- CreateIndex
CREATE INDEX "LearningMaterial_curriculumModuleId_sortOrder_idx" ON "LearningMaterial"("curriculumModuleId", "sortOrder");

-- CreateIndex
CREATE INDEX "LearningMaterial_fileAssetId_idx" ON "LearningMaterial"("fileAssetId");

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningMaterial" ADD CONSTRAINT "LearningMaterial_curriculumModuleId_fkey" FOREIGN KEY ("curriculumModuleId") REFERENCES "CurriculumModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningMaterial" ADD CONSTRAINT "LearningMaterial_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningMaterial" ADD CONSTRAINT "LearningMaterial_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
