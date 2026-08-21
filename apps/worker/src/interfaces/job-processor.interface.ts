import { JobStatus, JobType } from "@unicom/types";

export interface JobExecutionContext<TPayload = unknown> {
  jobId: string;
  type: JobType;
  payload: TPayload;
  attemptNumber: number;
  maxAttempts: number;
}

export interface JobExecutionResult<TResult = unknown> {
  status: JobStatus;
  result?: TResult;
  errorMessage?: string;
}

export interface IJobProcessor<TPayload = unknown, TResult = unknown> {
  readonly jobType: JobType;
  process(context: JobExecutionContext<TPayload>): Promise<JobExecutionResult<TResult>>;
}
