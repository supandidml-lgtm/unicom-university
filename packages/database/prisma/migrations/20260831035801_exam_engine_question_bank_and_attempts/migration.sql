-- CreateEnum
CREATE TYPE "ExamQuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE');

-- CreateEnum
CREATE TYPE "ExamQuestionStatus" AS ENUM ('DRAFT', 'APPROVED');

-- CreateEnum
CREATE TYPE "ExamAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'INVALIDATED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuthSecurityEventType" ADD VALUE 'EXAM_CREATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'EXAM_UPDATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'EXAM_QUESTION_CREATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'EXAM_QUESTION_UPDATED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'EXAM_QUESTION_APPROVED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'EXAM_QUESTION_REMOVED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'EXAM_ATTEMPT_STARTED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'EXAM_ATTEMPT_SUBMITTED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'EXAM_ATTEMPT_ACCESS_DENIED';

-- CreateTable
CREATE TABLE "Exam" (
    "id" UUID NOT NULL,
    "curriculumVersionId" UUID NOT NULL,
    "curriculumWeekId" UUID NOT NULL,
    "curriculumModuleId" UUID,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "passingScoreBasisPoints" INTEGER NOT NULL,
    "maxAttempts" INTEGER,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamQuestion" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "type" "ExamQuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "explanation" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "status" "ExamQuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedByUserId" UUID,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamQuestionOption" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamQuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAttempt" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "participantUserId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "ExamAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "passingScoreBasisPoints" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "scorePoints" INTEGER,
    "maxPoints" INTEGER,
    "scoreBasisPoints" INTEGER,
    "passed" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAttemptQuestion" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "sourceQuestionId" UUID NOT NULL,
    "prompt" TEXT NOT NULL,
    "type" "ExamQuestionType" NOT NULL,
    "points" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamAttemptQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAttemptQuestionOption" (
    "id" UUID NOT NULL,
    "attemptQuestionId" UUID NOT NULL,
    "sourceOptionId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamAttemptQuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAttemptAnswer" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "attemptQuestionId" UUID NOT NULL,
    "selectedOptionIds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamAttemptAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Exam_curriculumVersionId_idx" ON "Exam"("curriculumVersionId");

-- CreateIndex
CREATE INDEX "Exam_curriculumModuleId_idx" ON "Exam"("curriculumModuleId");

-- CreateIndex
CREATE UNIQUE INDEX "Exam_curriculumWeekId_code_key" ON "Exam"("curriculumWeekId", "code");

-- CreateIndex
CREATE INDEX "ExamQuestion_examId_sortOrder_idx" ON "ExamQuestion"("examId", "sortOrder");

-- CreateIndex
CREATE INDEX "ExamQuestionOption_questionId_idx" ON "ExamQuestionOption"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamQuestionOption_questionId_sortOrder_key" ON "ExamQuestionOption"("questionId", "sortOrder");

-- CreateIndex
CREATE INDEX "ExamAttempt_participantUserId_createdAt_idx" ON "ExamAttempt"("participantUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ExamAttempt_examId_submittedAt_idx" ON "ExamAttempt"("examId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExamAttempt_enrollmentId_examId_attemptNumber_key" ON "ExamAttempt"("enrollmentId", "examId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ExamAttemptQuestion_attemptId_sourceQuestionId_key" ON "ExamAttemptQuestion"("attemptId", "sourceQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamAttemptQuestion_attemptId_sortOrder_key" ON "ExamAttemptQuestion"("attemptId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ExamAttemptQuestionOption_attemptQuestionId_sourceOptionId_key" ON "ExamAttemptQuestionOption"("attemptQuestionId", "sourceOptionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamAttemptQuestionOption_attemptQuestionId_sortOrder_key" ON "ExamAttemptQuestionOption"("attemptQuestionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ExamAttemptAnswer_attemptQuestionId_key" ON "ExamAttemptAnswer"("attemptQuestionId");

-- CreateIndex
CREATE INDEX "ExamAttemptAnswer_attemptId_idx" ON "ExamAttemptAnswer"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamAttemptAnswer_attemptId_attemptQuestionId_key" ON "ExamAttemptAnswer"("attemptId", "attemptQuestionId");

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_curriculumWeekId_fkey" FOREIGN KEY ("curriculumWeekId") REFERENCES "CurriculumWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_curriculumModuleId_fkey" FOREIGN KEY ("curriculumModuleId") REFERENCES "CurriculumModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamQuestionOption" ADD CONSTRAINT "ExamQuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ExamQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "TrainingEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_participantUserId_fkey" FOREIGN KEY ("participantUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttemptQuestion" ADD CONSTRAINT "ExamAttemptQuestion_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttemptQuestionOption" ADD CONSTRAINT "ExamAttemptQuestionOption_attemptQuestionId_fkey" FOREIGN KEY ("attemptQuestionId") REFERENCES "ExamAttemptQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttemptAnswer" ADD CONSTRAINT "ExamAttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttemptAnswer" ADD CONSTRAINT "ExamAttemptAnswer_attemptQuestionId_fkey" FOREIGN KEY ("attemptQuestionId") REFERENCES "ExamAttemptQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
