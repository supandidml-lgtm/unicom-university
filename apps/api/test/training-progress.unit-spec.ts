import { describe, expect, it } from 'vitest';
import {
  averageBasisPoints,
  finiteExamIsExhausted,
  progressStatus,
  requirementUnitProgress,
} from '../src/modules/training-progress/training-progress.calculator.js';

describe('REQUIREMENT_UNIT_V1 progress calculation', () => {
  it('averages material contributions with deterministic floor rounding', () => {
    expect(averageBasisPoints([10_000, 5_000, 0])).toBe(5_000);
    expect(averageBasisPoints([10_000, 0, 0])).toBe(3_333);
  });

  it('uses Exam PASS as a unit rather than an Exam score', () => {
    expect(requirementUnitProgress([5_000], [false])).toBe(2_500);
    expect(requirementUnitProgress([10_000], [true])).toBe(10_000);
  });

  it('keeps empty categories at zero and protects zero total requirements', () => {
    expect(averageBasisPoints([])).toBe(0);
    expect(requirementUnitProgress([], [])).toBe(0);
    expect(progressStatus(0, 0, 0)).toBe('EMPTY');
  });

  it('derives week states from the same requirement-unit arithmetic', () => {
    expect(progressStatus(2, 0, 0)).toBe('NOT_STARTED');
    expect(progressStatus(2, 1, 5_000)).toBe('IN_PROGRESS');
    expect(progressStatus(2, 2, 10_000)).toBe('COMPLETED');
  });

  it('only exhausts a finite unpassed Exam after all allowed submitted attempts', () => {
    expect(finiteExamIsExhausted(2, 1, false)).toBe(false);
    expect(finiteExamIsExhausted(2, 2, false)).toBe(true);
    expect(finiteExamIsExhausted(2, 2, true)).toBe(false);
    expect(finiteExamIsExhausted(null, 99, false)).toBe(false);
  });
});
