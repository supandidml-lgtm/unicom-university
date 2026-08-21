import { JobType, JobStatus } from "@unicom/types";
import {
  IJobProcessor,
  JobExecutionContext,
  JobExecutionResult,
} from "../interfaces/job-processor.interface.js";
import { IMediaProcessor } from "../interfaces/media-processor.interface.js";

export interface PdfProcessingJobPayload {
  materialId: string;
  materialVersion: number;
  filePath: string;
}

export class PdfProcessingJobHandler implements IJobProcessor<PdfProcessingJobPayload> {
  readonly jobType = JobType.PDF_PROCESSING;

  constructor(private readonly mediaProcessor?: IMediaProcessor) {}

  async process(
    context: JobExecutionContext<PdfProcessingJobPayload>,
  ): Promise<JobExecutionResult> {
    console.log(`[Worker] Processing PDF Extraction job ${context.jobId}`);

    return {
      status: JobStatus.COMPLETED,
      result: {
        materialId: context.payload.materialId,
        materialVersion: context.payload.materialVersion,
        pagesExtracted: 0,
      },
    };
  }
}
