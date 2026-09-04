-- CreateEnum
CREATE TYPE "BrandStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuthSecurityEventType" ADD VALUE 'BRAND_CREATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'BRAND_UPDATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'BRAND_ARCHIVED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'BRAND_REACTIVATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'BRAND_ACCESS_ASSIGNED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'BRAND_ACCESS_REMOVED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'BRAND_ACCESS_DENIED';

-- CreateTable
CREATE TABLE "Brand" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "BrandStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "createdByUserId" UUID,
    "updatedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBrandAccess" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBrandAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_code_key" ON "Brand"("code");

-- CreateIndex
CREATE INDEX "Brand_status_idx" ON "Brand"("status");

-- CreateIndex
CREATE INDEX "UserBrandAccess_brandId_idx" ON "UserBrandAccess"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBrandAccess_userId_brandId_key" ON "UserBrandAccess"("userId", "brandId");

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBrandAccess" ADD CONSTRAINT "UserBrandAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBrandAccess" ADD CONSTRAINT "UserBrandAccess_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBrandAccess" ADD CONSTRAINT "UserBrandAccess_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
