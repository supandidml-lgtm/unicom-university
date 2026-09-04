-- CreateEnum
CREATE TYPE "ExamQuestionOrigin" AS ENUM ('MANUAL', 'AI_GENERATED');

-- CreateEnum
CREATE TYPE "AiQuestionGenerationJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaterialSourceExtractionStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED', 'UNSUPPORTED');

-- CreateEnum
CREATE TYPE "MaterialSourceLocatorType" AS ENUM ('PDF_PAGE', 'DOCUMENT_SECTION', 'SPREADSHEET_RANGE', 'VIDEO_TIMESTAMP', 'IMAGE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuthSecurityEventType" ADD VALUE 'AI_QUESTION_GENERATION_REQUESTED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'AI_QUESTION_GENERATION_COMPLETED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'AI_QUESTION_GENERATION_PARTIAL';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'AI_QUESTION_GENERATION_FAILED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'AI_QUESTION_GENERATION_CANCELLED';
ALTER TYPE "AuthSecurityEventType" ADD VALUE 'AI_QUESTION_DRAFT_CREATED';

-- AlterTable
ALTER TABLE "ExamQuestion" ADD COLUMN     "aiGenerationJobId" UUID,
ADD COLUMN     "origin" "ExamQuestionOrigin" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "AiQuestionGenerationJob" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "curriculumVersionId" UUID NOT NULL,
    "requestedByUserId" UUID NOT NULL,
    "status" "AiQuestionGenerationJobStatus" NOT NULL DEFAULT 'QUEUED',
    "requestedQuestionCount" INTEGER NOT NULL,
    "requestedQuestionTypes" JSONB NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "promptVersion" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "createdQuestionCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCandidateCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiQuestionGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiQuestionGenerationJobMaterial" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiQuestionGenerationJobMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialSourceExtraction" (
    "id" UUID NOT NULL,
    "fileAssetId" UUID NOT NULL,
    "sourceType" "MaterialType" NOT NULL,
    "status" "MaterialSourceExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "extractorVersion" TEXT NOT NULL,
    "extractedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialSourceExtraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialSourceChunk" (
    "id" UUID NOT NULL,
    "extractionId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "locatorType" "MaterialSourceLocatorType" NOT NULL,
    "locator" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialSourceChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionSourceReference" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "sourceChunkId" UUID,
    "locatorType" "MaterialSourceLocatorType" NOT NULL,
    "pageNumber" INTEGER,
    "startMs" INTEGER,
    "endMs" INTEGER,
    "sheetName" TEXT,
    "cellRange" TEXT,
    "sectionLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionSourceReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiQuestionGenerationJob_status_nextAttemptAt_idx" ON "AiQuestionGenerationJob"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "AiQuestionGenerationJob_requestedByUserId_status_idx" ON "AiQuestionGenerationJob"("requestedByUserId", "status");

-- CreateIndex
CREATE INDEX "AiQuestionGenerationJob_examId_createdAt_idx" ON "AiQuestionGenerationJob"("examId", "createdAt");

-- CreateIndex
CREATE INDEX "AiQuestionGenerationJobMaterial_materialId_idx" ON "AiQuestionGenerationJobMaterial"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "AiQuestionGenerationJobMaterial_jobId_materialId_key" ON "AiQuestionGenerationJobMaterial"("jobId", "materialId");

-- CreateIndex
CREATE INDEX "MaterialSourceExtraction_status_idx" ON "MaterialSourceExtraction"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialSourceExtraction_fileAssetId_extractorVersion_key" ON "MaterialSourceExtraction"("fileAssetId", "extractorVersion");

-- CreateIndex
CREATE INDEX "MaterialSourceChunk_extractionId_locatorType_idx" ON "MaterialSourceChunk"("extractionId", "locatorType");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialSourceChunk_extractionId_sequence_key" ON "MaterialSourceChunk"("extractionId", "sequence");

-- CreateIndex
CREATE INDEX "QuestionSourceReference_questionId_idx" ON "QuestionSourceReference"("questionId");

-- CreateIndex
CREATE INDEX "QuestionSourceReference_materialId_sourceChunkId_idx" ON "QuestionSourceReference"("materialId", "sourceChunkId");

-- CreateIndex
CREATE INDEX "ExamQuestion_aiGenerationJobId_idx" ON "ExamQuestion"("aiGenerationJobId");

-- AddForeignKey
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_aiGenerationJobId_fkey" FOREIGN KEY ("aiGenerationJobId") REFERENCES "AiQuestionGenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiQuestionGenerationJob" ADD CONSTRAINT "AiQuestionGenerationJob_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiQuestionGenerationJob" ADD CONSTRAINT "AiQuestionGenerationJob_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiQuestionGenerationJob" ADD CONSTRAINT "AiQuestionGenerationJob_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiQuestionGenerationJobMaterial" ADD CONSTRAINT "AiQuestionGenerationJobMaterial_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AiQuestionGenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiQuestionGenerationJobMaterial" ADD CONSTRAINT "AiQuestionGenerationJobMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "LearningMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialSourceExtraction" ADD CONSTRAINT "MaterialSourceExtraction_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialSourceChunk" ADD CONSTRAINT "MaterialSourceChunk_extractionId_fkey" FOREIGN KEY ("extractionId") REFERENCES "MaterialSourceExtraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSourceReference" ADD CONSTRAINT "QuestionSourceReference_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ExamQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSourceReference" ADD CONSTRAINT "QuestionSourceReference_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "LearningMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSourceReference" ADD CONSTRAINT "QuestionSourceReference_sourceChunkId_fkey" FOREIGN KEY ("sourceChunkId") REFERENCES "MaterialSourceChunk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
