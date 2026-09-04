import { BadRequestException } from '@nestjs/common';
import { ExamQuestionType } from '@unicom/database';
import { describe, expect, it } from 'vitest';
import {
  assertQuestionStructure,
  scoreBasisPoints,
  selectedSetIsCorrect,
} from '../src/modules/exams/exam-scoring.service.js';

describe('deterministic objective exam scoring', () => {
  const options = [
    { id: 'a', isCorrect: true },
    { id: 'b', isCorrect: false },
    { id: 'c', isCorrect: true },
  ];

  it('enforces objective question structural rules', () => {
    expect(() =>
      assertQuestionStructure({ type: ExamQuestionType.SINGLE_CHOICE, points: 1, options }),
    ).toThrow(BadRequestException);
    expect(() =>
      assertQuestionStructure({
        type: ExamQuestionType.MULTIPLE_CHOICE,
        points: 1,
        options: options.map((option) => ({ ...option, isCorrect: true })),
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      assertQuestionStructure({
        type: ExamQuestionType.TRUE_FALSE,
        points: 1,
        options: options.slice(0, 2),
      }),
    ).not.toThrow();
  });

  it('uses exact-set scoring with deterministic floor basis points', () => {
    const question = { type: ExamQuestionType.MULTIPLE_CHOICE, points: 3, options };
    expect(selectedSetIsCorrect(question, ['a', 'c'])).toBe(true);
    expect(selectedSetIsCorrect(question, ['a'])).toBe(false);
    expect(selectedSetIsCorrect(question, ['a', 'b', 'c'])).toBe(false);
    expect(scoreBasisPoints(2, 3)).toBe(6_666);
    expect(scoreBasisPoints(3, 3)).toBe(10_000);
  });
});
