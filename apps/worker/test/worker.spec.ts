import { describe, it, expect } from "vitest";
import { AiExamGenerationJobHandler } from "../src/handlers/ai-exam-generation.handler";
import { MediaProcessingJobHandler } from "../src/handlers/media-processing.handler";
import { PdfProcessingJobHandler } from "../src/handlers/pdf-processing.handler";
import { JobType, JobStatus, QuestionType } from "@unicom/types";

describe("Worker Handlers & Processor Contracts (PRD §106 & §107)", () => {
  it("should initialize AiExamGenerationJobHandler with correct JobType", () => {
    const handler = new AiExamGenerationJobHandler();
    expect(handler.jobType).toBe(JobType.AI_EXAM_GENERATION);
  });

  it("should process AI exam job with mock fallback", async () => {
    const handler = new AiExamGenerationJobHandler();
    const result = await handler.process({
      jobId: "job-123",
      type: JobType.AI_EXAM_GENERATION,
      payload: {
        materialId: "mat-1",
        materialVersion: 1,
        materialType: "PDF",
        sourceContentText: "Sample training text",
        sourceChunks: [],
        requestedQuestionCount: 5,
        allowedQuestionTypes: [QuestionType.MULTIPLE_CHOICE],
      },
      attemptNumber: 1,
      maxAttempts: 3,
    });

    expect(result.status).toBe(JobStatus.COMPLETED);
    expect(result.result).toBeDefined();
  });

  it("should initialize media and PDF handlers", () => {
    const mediaHandler = new MediaProcessingJobHandler();
    const pdfHandler = new PdfProcessingJobHandler();

    expect(mediaHandler.jobType).toBe(JobType.MEDIA_TRANSCRIPTION);
    expect(pdfHandler.jobType).toBe(JobType.PDF_PROCESSING);
  });
});
