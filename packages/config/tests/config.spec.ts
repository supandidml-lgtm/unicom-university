import { describe, it, expect } from "vitest";
import {
  DOMAIN_DEFAULTS,
  calculateOverallProgress,
  calculatePassRate,
} from "../src/index";

describe("Domain Defaults & Formula Integrity", () => {
  it("should have correct PRD default weights (60% Course / 40% Exam)", () => {
    expect(DOMAIN_DEFAULTS.WEIGHTS.COURSE_PROGRESS_WEIGHT).toBe(0.60);
    expect(DOMAIN_DEFAULTS.WEIGHTS.EXAM_PROGRESS_WEIGHT).toBe(0.40);
  });

  it("should have correct PRD default thresholds (80 Passing Score, 98% Video)", () => {
    expect(DOMAIN_DEFAULTS.EXAM.DEFAULT_PASSING_SCORE).toBe(80);
    expect(DOMAIN_DEFAULTS.COMPLETION_THRESHOLDS.VIDEO_UNIQUE_COVERAGE_RATIO).toBe(0.98);
    expect(DOMAIN_DEFAULTS.COMPLETION_THRESHOLDS.PDF_PAGE_COVERAGE_RATIO).toBe(1.00);
  });

  it("should accurately calculate overall progress using default weights", () => {
    // 75% course + 55% exam = (75 * 0.6) + (55 * 0.4) = 45 + 22 = 67%
    const progress = calculateOverallProgress(75, 55);
    expect(progress).toBe(67);

    // 100% course + 100% exam = 100%
    expect(calculateOverallProgress(100, 100)).toBe(100);

    // 0% course + 0% exam = 0%
    expect(calculateOverallProgress(0, 0)).toBe(0);
  });

  it("should bound calculated progress within 0% to 100%", () => {
    expect(calculateOverallProgress(-20, 50)).toBe(20);
    expect(calculateOverallProgress(150, 120)).toBe(100);
  });

  it("should accurately calculate pass rate percentage", () => {
    expect(calculatePassRate(3, 3)).toBe(100);
    expect(calculatePassRate(2, 3)).toBe(66.7);
    expect(calculatePassRate(0, 5)).toBe(0);
    expect(calculatePassRate(0, 0)).toBe(0);
  });
});
