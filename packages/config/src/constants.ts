/**
 * Centralized Domain Constants & Defaults
 * Strictly according to MASTER PRD §49, §58, §60, §67, §158
 */

export const DOMAIN_DEFAULTS = {
  /**
   * Overall Training Progress Weights
   * Default: Course 60%, Exam 40% (PRD §49)
   */
  WEIGHTS: {
    COURSE_PROGRESS_WEIGHT: 0.60,
    EXAM_PROGRESS_WEIGHT: 0.40,
  },

  /**
   * Passing Score Threshold
   * Default: 80 out of 100 (PRD §67)
   */
  EXAM: {
    DEFAULT_PASSING_SCORE: 80,
    DEFAULT_MAX_ATTEMPTS: 2,
    DEFAULT_DURATION_MINUTES: 30,
    DEFAULT_QUESTION_COUNT: 10,
    DEFAULT_DIFFICULTY_DISTRIBUTION: {
      EASY_PERCENTAGE: 20,
      MEDIUM_PERCENTAGE: 50,
      HARD_PERCENTAGE: 30,
    },
  },

  /**
   * Media Completion Thresholds
   * Default: Video 98% unique watched segments (PRD §35)
   * Default: PDF 100% required page exposure (PRD §42)
   */
  COMPLETION_THRESHOLDS: {
    VIDEO_UNIQUE_COVERAGE_RATIO: 0.98,
    PDF_PAGE_COVERAGE_RATIO: 1.00,
    PDF_MINIMUM_ENGAGEMENT_SECONDS_PER_PAGE: 5,
    DEFAULT_PLAYBACK_SPEED: 1.0,
  },

  /**
   * Pagination Defaults
   */
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  /**
   * Security & Rate Limiting Defaults
   */
  SECURITY: {
    BCRYPT_SALT_ROUNDS: 12,
    MAX_LOGIN_ATTEMPTS: 5,
    LOGIN_LOCKOUT_DURATION_MINUTES: 15,
    SESSION_EXPIRATION_HOURS: 24,
    SIGNED_URL_EXPIRATION_SECONDS: 3600,
  },
} as const;

/**
 * Calculates overall training progress using authoritative formula:
 * Overall Progress = (Course Progress * Course Weight) + (Exam Progress * Exam Weight)
 */
export function calculateOverallProgress(
  courseProgressPercentage: number,
  examProgressPercentage: number,
  courseWeight = DOMAIN_DEFAULTS.WEIGHTS.COURSE_PROGRESS_WEIGHT,
  examWeight = DOMAIN_DEFAULTS.WEIGHTS.EXAM_PROGRESS_WEIGHT,
): number {
  const boundedCourse = Math.min(100, Math.max(0, courseProgressPercentage));
  const boundedExam = Math.min(100, Math.max(0, examProgressPercentage));
  
  const raw = (boundedCourse * courseWeight) + (boundedExam * examWeight);
  return Math.min(100, Math.max(0, Math.round(raw * 100) / 100));
}

/**
 * Calculates pass rate percentage:
 * Pass Rate = (Passed Required Exams / Submitted Required Exams) * 100
 */
export function calculatePassRate(
  passedExamsCount: number,
  submittedExamsCount: number,
): number {
  if (submittedExamsCount <= 0) return 0;
  const rate = (passedExamsCount / submittedExamsCount) * 100;
  return Math.min(100, Math.max(0, Math.round(rate * 10) / 10));
}
