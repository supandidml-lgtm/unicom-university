-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuthSecurityEventType" ADD VALUE 'PARTICIPANT_CREATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'PARTICIPANT_UPDATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'PARTICIPANT_DISABLED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'PARTICIPANT_REACTIVATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'PARTICIPANT_INVITATION_REISSUED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'TRAINER_CREATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'TRAINER_UPDATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'TRAINER_DISABLED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'TRAINER_REACTIVATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'TRAINER_INVITATION_REISSUED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'STAFF_PROFILE_ACCESS_DENIED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'STAFF_NIK_VIEWED';

-- CreateTable
CREATE TABLE "StaffProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "normalizedPhone" TEXT NOT NULL,
    "encryptedNik" TEXT NOT NULL,
    "nikFingerprint" TEXT NOT NULL,
    "nikFirst4" TEXT NOT NULL,
    "nikLast4" TEXT NOT NULL,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_userId_key" ON "StaffProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_nikFingerprint_key" ON "StaffProfile"("nikFingerprint");

-- CreateIndex
CREATE INDEX "StaffProfile_createdByUserId_idx" ON "StaffProfile"("createdByUserId");

-- CreateIndex
CREATE INDEX "StaffProfile_normalizedPhone_idx" ON "StaffProfile"("normalizedPhone");

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
