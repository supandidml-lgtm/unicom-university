import { JobType, JobStatus } from "@unicom/types";
import {
  IJobProcessor,
  JobExecutionContext,
  JobExecutionResult,
} from "../interfaces/job-processor.interface.js";
import { IMediaProcessor } from "../interfaces/media-processor.interface.js";

export interface MediaProcessingJobPayload {
  materialId: string;
  materialVersion: number;
  filePath: string;
}

export class MediaProcessingJobHandler implements IJobProcessor<MediaProcessingJobPayload> {
  readonly jobType = JobType.MEDIA_TRANSCRIPTION;

  constructor(private readonly mediaProcessor?: IMediaProcessor) {}

  async process(
    context: JobExecutionContext<MediaProcessingJobPayload>,
  ): Promise<JobExecutionResult> {
    console.log(`[Worker] Processing Media Transcription job ${context.jobId}`);

    return {
      status: JobStatus.COMPLETED,
      result: {
        materialId: context.payload.materialId,
        materialVersion: context.payload.materialVersion,
        transcribed: true,
      },
    };
  }
}
