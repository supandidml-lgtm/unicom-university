-- TASK-006: Participant learning assignment. This is deliberately separate from UserBrandAccess,
-- which remains Trainer authorization scope.
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'TRAINING_ENROLLMENT_CREATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'TRAINING_ENROLLMENT_BULK_CREATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'TRAINING_ENROLLMENT_WEEK_COUNT_UPDATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'TRAINING_ENROLLMENT_CANCELLED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'TRAINING_ENROLLMENT_ACCESS_DENIED';

CREATE TYPE "EnrollmentStatus" AS ENUM (
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'EXPIRED',
  'SUSPENDED',
  'CANCELLED'
);

CREATE TABLE "TrainingEnrollment" (
  "id" UUID NOT NULL,
  "participantUserId" UUID NOT NULL,
  "brandId" UUID NOT NULL,
  "plannedWeekCount" INTEGER NOT NULL,
  "status" "EnrollmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "assignedByUserId" UUID,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "cancelledAt" TIMESTAMP(3),
  "cancelledByUserId" UUID,
  CONSTRAINT "TrainingEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TrainingEnrollment_participantUserId_assignedAt_idx"
  ON "TrainingEnrollment"("participantUserId", "assignedAt");
CREATE INDEX "TrainingEnrollment_brandId_status_idx"
  ON "TrainingEnrollment"("brandId", "status");

-- Current runs must be unique under concurrency, while terminal historical runs may be retained and
-- re-enrolled. Prisma cannot express this PostgreSQL partial unique index in the schema.
CREATE UNIQUE INDEX "TrainingEnrollment_current_participant_brand_key"
  ON "TrainingEnrollment"("participantUserId", "brandId")
  WHERE "status" IN ('NOT_STARTED', 'IN_PROGRESS', 'SUSPENDED');

ALTER TABLE "TrainingEnrollment"
  ADD CONSTRAINT "TrainingEnrollment_participantUserId_fkey"
  FOREIGN KEY ("participantUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrainingEnrollment"
  ADD CONSTRAINT "TrainingEnrollment_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrainingEnrollment"
  ADD CONSTRAINT "TrainingEnrollment_assignedByUserId_fkey"
  FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TrainingEnrollment"
  ADD CONSTRAINT "TrainingEnrollment_cancelledByUserId_fkey"
  FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
