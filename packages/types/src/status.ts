/**
 * Account Statuses
 * Strictly according to MASTER PRD §14
 */
export enum AccountStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
  PENDING_ACTIVATION = "PENDING_ACTIVATION",
}

/**
 * Training Assignment Statuses
 * Strictly according to MASTER PRD §23
 */
export enum TrainingAssignmentStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
}

/**
 * Learning Content & Course Statuses
 * Strictly according to MASTER PRD §29
 */
export enum LearningStatus {
  LOCKED = "LOCKED",
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

/**
 * Exam Statuses
 * Strictly according to MASTER PRD §29
 */
export enum ExamStatus {
  LOCKED = "LOCKED",
  AVAILABLE = "AVAILABLE",
  IN_PROGRESS = "IN_PROGRESS",
  PASSED = "PASSED",
  FAILED = "FAILED",
}
