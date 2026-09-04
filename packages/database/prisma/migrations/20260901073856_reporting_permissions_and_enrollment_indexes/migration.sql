-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuthSecurityEventType" ADD VALUE 'REPORT_EXPORT_REQUESTED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'REPORT_EXPORT_COMPLETED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'REPORT_EXPORT_FAILED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'REPORT_EXPORT_DOWNLOADED';

-- CreateIndex
CREATE INDEX "TrainingEnrollment_status_startedAt_idx" ON "TrainingEnrollment"("status", "startedAt");

-- CreateIndex
CREATE INDEX "TrainingEnrollment_status_completedAt_idx" ON "TrainingEnrollment"("status", "completedAt");
