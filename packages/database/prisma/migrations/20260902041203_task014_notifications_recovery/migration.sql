-- CreateEnum
CREATE TYPE "NotificationDeliveryType" AS ENUM ('PARTICIPANT_INVITATION', 'TRAINER_INVITATION', 'PASSWORD_RESET', 'TRAINING_ASSIGNED', 'TRAINING_COMPLETED');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('QUEUED', 'PROCESSING', 'DELIVERED', 'FAILED', 'DISABLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuthSecurityEventType" ADD VALUE 'PASSWORD_RESET_REQUESTED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'PASSWORD_RESET_COMPLETED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'PASSWORD_RESET_REJECTED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'PASSWORD_RESET_RATE_LIMITED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'INVITATION_DELIVERY_QUEUED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'INVITATION_DELIVERY_DELIVERED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'INVITATION_DELIVERY_FAILED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'NOTIFICATION_DELIVERY_FAILED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'TRAINING_ASSIGNED_NOTIFICATION_QUEUED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'TRAINING_COMPLETED_NOTIFICATION_QUEUED';

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" UUID NOT NULL,
    "type" "NotificationDeliveryType" NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "recipientUserId" UUID,
    "recipientEmail" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "correlationEntityId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDelivery_idempotencyKey_key" ON "NotificationDelivery"("idempotencyKey");

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_nextAttemptAt_idx" ON "NotificationDelivery"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_recipientUserId_createdAt_idx" ON "NotificationDelivery"("recipientUserId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_type_createdAt_idx" ON "NotificationDelivery"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
