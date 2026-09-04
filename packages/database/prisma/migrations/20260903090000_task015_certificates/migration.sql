-- CreateEnum
CREATE TYPE "TrainingCertificateStatus" AS ENUM ('ISSUED', 'REVOKED');

-- CreateEnum
CREATE TYPE "CertificatePdfStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "FileAssetPurpose" AS ENUM ('LEARNING_MATERIAL', 'CERTIFICATE');

-- AlterEnum
ALTER TYPE "NotificationDeliveryType" ADD VALUE 'CERTIFICATE_READY';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'CERTIFICATE_ISSUED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'CERTIFICATE_PDF_GENERATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'CERTIFICATE_PDF_FAILED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'CERTIFICATE_DOWNLOADED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'CERTIFICATE_REVOKED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'CERTIFICATE_READY_NOTIFICATION_QUEUED';

-- AlterTable
ALTER TABLE "FileAsset" ADD COLUMN "purpose" "FileAssetPurpose" NOT NULL DEFAULT 'LEARNING_MATERIAL';

-- CreateTable
CREATE TABLE "TrainingCertificate" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "participantUserId" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "curriculumVersionId" UUID NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "status" "TrainingCertificateStatus" NOT NULL DEFAULT 'ISSUED',
    "templateVersion" TEXT NOT NULL,
    "participantNameSnapshot" TEXT NOT NULL,
    "brandNameSnapshot" TEXT NOT NULL,
    "curriculumNameSnapshot" TEXT NOT NULL,
    "curriculumVersionSnapshot" TEXT NOT NULL,
    "completionDateSnapshot" TIMESTAMP(3) NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedByUserId" UUID,
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" UUID,
    "revocationReason" TEXT,
    "pdfFileAssetId" UUID,
    "pdfStatus" "CertificatePdfStatus" NOT NULL DEFAULT 'PENDING',
    "pdfFailureCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrainingCertificate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrainingCertificate_enrollmentId_key" ON "TrainingCertificate"("enrollmentId");
CREATE UNIQUE INDEX "TrainingCertificate_certificateNumber_key" ON "TrainingCertificate"("certificateNumber");
CREATE UNIQUE INDEX "TrainingCertificate_pdfFileAssetId_key" ON "TrainingCertificate"("pdfFileAssetId");
CREATE INDEX "TrainingCertificate_participantUserId_idx" ON "TrainingCertificate"("participantUserId");
CREATE INDEX "TrainingCertificate_brandId_idx" ON "TrainingCertificate"("brandId");
CREATE INDEX "TrainingCertificate_status_idx" ON "TrainingCertificate"("status");
CREATE INDEX "TrainingCertificate_issuedAt_idx" ON "TrainingCertificate"("issuedAt");

ALTER TABLE "TrainingCertificate" ADD CONSTRAINT "TrainingCertificate_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "TrainingEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrainingCertificate" ADD CONSTRAINT "TrainingCertificate_participantUserId_fkey" FOREIGN KEY ("participantUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrainingCertificate" ADD CONSTRAINT "TrainingCertificate_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrainingCertificate" ADD CONSTRAINT "TrainingCertificate_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrainingCertificate" ADD CONSTRAINT "TrainingCertificate_issuedByUserId_fkey" FOREIGN KEY ("issuedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TrainingCertificate" ADD CONSTRAINT "TrainingCertificate_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TrainingCertificate" ADD CONSTRAINT "TrainingCertificate_pdfFileAssetId_fkey" FOREIGN KEY ("pdfFileAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
