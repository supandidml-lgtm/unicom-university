import { JobType, JobStatus } from "@unicom/types";
import {
  IJobProcessor,
  JobExecutionContext,
  JobExecutionResult,
} from "../interfaces/job-processor.interface.js";
import { IAIProvider, GenerateQuestionsOptions } from "../interfaces/ai-provider.interface.js";

export class AiExamGenerationJobHandler implements IJobProcessor<GenerateQuestionsOptions> {
  readonly jobType = JobType.AI_EXAM_GENERATION;

  constructor(private readonly aiProvider?: IAIProvider) {}

  async process(
    context: JobExecutionContext<GenerateQuestionsOptions>,
  ): Promise<JobExecutionResult> {
    console.log(`[Worker] Processing AI Exam Generation job ${context.jobId}`);

    if (!this.aiProvider) {
      return {
        status: JobStatus.COMPLETED,
        result: {
          message: "AI Provider mock execution completed",
          questionsGenerated: 0,
        },
      };
    }

    const result = await this.aiProvider.generateQuestions(context.payload);
    if (!result.success) {
      return {
        status: JobStatus.FAILED,
        errorMessage: result.errorMessage || "AI Question generation failed",
      };
    }

    return {
      status: JobStatus.COMPLETED,
      result: {
        questions: result.questions,
      },
    };
  }
}
