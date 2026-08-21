import { LearningStatus } from "./status";

export interface WatchedVideoSegment {
  startSeconds: number;
  endSeconds: number;
}

export interface VideoHeartbeatPayload {
  materialId: string;
  materialVersion: number;
  sessionId: string;
  currentPosition: number;
  duration: number;
  isPlaying: boolean;
  playbackSpeed: number;
  sequenceNumber: number;
}

export interface PdfPageProgressPayload {
  materialId: string;
  materialVersion: number;
  sessionId: string;
  pageNumber: number;
  totalPages: number;
  activeReadingTimeSeconds: number;
  isAtDocumentEnd: boolean;
}

export interface MaterialProgress {
  materialId: string;
  materialVersion: number;
  status: LearningStatus;
  percentage: number;
  watchedSegments?: WatchedVideoSegment[];
  pagesViewed?: number[];
  totalPages?: number;
  lastPositionSeconds?: number;
  completedAt?: string;
  updatedAt: string;
}

export interface CourseProgress {
  courseId: string;
  status: LearningStatus;
  percentage: number;
  completedMaterialsCount: number;
  totalRequiredMaterialsCount: number;
  updatedAt: string;
}

export interface WeekProgress {
  weekId: string;
  weekNumber: number;
  percentage: number;
  completedCoursesCount: number;
  totalCoursesCount: number;
  isExamPassed: boolean;
  updatedAt: string;
}

export interface TrainingOverallProgress {
  assignmentId: string;
  courseProgressPercentage: number;
  examProgressPercentage: number;
  overallProgressPercentage: number;
  averageScore?: number;
  passRatePercentage?: number;
  updatedAt: string;
}
