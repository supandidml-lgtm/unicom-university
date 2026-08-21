/**
 * Asynchronous Background Job Statuses & Contracts
 * Strictly according to MASTER PRD §106
 */
export enum JobStatus {
  QUEUED = "QUEUED",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  RETRYING = "RETRYING",
}

export enum JobType {
  AI_EXAM_GENERATION = "AI_EXAM_GENERATION",
  MEDIA_TRANSCRIPTION = "MEDIA_TRANSCRIPTION",
  PDF_PROCESSING = "PDF_PROCESSING",
  REPORT_EXPORT = "REPORT_EXPORT",
}

export interface JobRecord<TPayload = unknown, TResult = unknown> {
  id: string;
  type: JobType;
  status: JobStatus;
  payload: TPayload;
  result?: TResult;
  errorMessage?: string;
  attemptsCount: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
