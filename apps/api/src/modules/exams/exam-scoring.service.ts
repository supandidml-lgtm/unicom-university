import { BadRequestException, Injectable } from '@nestjs/common';
import { ExamQuestionType } from '@unicom/database';

export interface ScorableOption {
  id: string;
  isCorrect: boolean;
}

export interface ScorableQuestion {
  type: ExamQuestionType;
  points: number;
  options: ScorableOption[];
}

export function assertQuestionStructure(question: ScorableQuestion): void {
  if (!Number.isInteger(question.points) || question.points < 1)
    throw new BadRequestException('Question points must be a positive integer.');
  if (question.options.length < 2)
    throw new BadRequestException('A question requires at least two options.');
  const correct = question.options.filter((option) => option.isCorrect).length;
  if (question.type === ExamQuestionType.SINGLE_CHOICE && correct !== 1)
    throw new BadRequestException('Single-choice questions require exactly one correct option.');
  if (question.type === ExamQuestionType.MULTIPLE_CHOICE) {
    if (correct < 1 || correct === question.options.length)
      throw new BadRequestException(
        'Multiple-choice questions require at least one correct option and one distractor.',
      );
  }
  if (question.type === ExamQuestionType.TRUE_FALSE) {
    const values = question.options.map((option) => option.id);
    if (values.length !== 2 || correct !== 1)
      throw new BadRequestException(
        'True/false questions require exactly two options and one answer.',
      );
  }
}

export function selectedSetIsCorrect(
  question: ScorableQuestion,
  selectedOptionIds: string[],
): boolean {
  const correct = question.options.filter((option) => option.isCorrect).map((option) => option.id);
  return (
    selectedOptionIds.length === correct.length &&
    new Set(selectedOptionIds).size === selectedOptionIds.length &&
    selectedOptionIds.every((id) => correct.includes(id))
  );
}

/** Scores are rounded down: floor(points-earned * 10,000 / max-points). */
export function scoreBasisPoints(scorePoints: number, maxPoints: number): number {
  if (!Number.isInteger(scorePoints) || !Number.isInteger(maxPoints) || maxPoints < 1)
    throw new BadRequestException('Exam snapshot has invalid point totals.');
  return Math.floor((scorePoints * 10_000) / maxPoints);
}

@Injectable()
export class ExamScoringService {
  assertQuestionStructure(question: ScorableQuestion): void {
    assertQuestionStructure(question);
  }

  selectedSetIsCorrect(question: ScorableQuestion, selectedOptionIds: string[]): boolean {
    return selectedSetIsCorrect(question, selectedOptionIds);
  }

  scoreBasisPoints(scorePoints: number, maxPoints: number): number {
    return scoreBasisPoints(scorePoints, maxPoints);
  }
}
