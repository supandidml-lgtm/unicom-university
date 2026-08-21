import { ExamStatus } from "./status";

export enum QuestionType {
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  MULTIPLE_ANSWER = "MULTIPLE_ANSWER",
  TRUE_FALSE = "TRUE_FALSE",
}

export enum QuestionDifficulty {
  EASY = "EASY",
  MEDIUM = "MEDIUM",
  HARD = "HARD",
}

export interface QuestionOption {
  id: string;
  optionText: string;
  displayOrder: number;
}

export interface QuestionSourceGrounding {
  materialId: string;
  materialVersion: number;
  sourceChunkId?: string;
  pageNumber?: number;
  timestampStartSeconds?: number;
  timestampEndSeconds?: number;
  excerptSnippet?: string;
}

export interface ExamQuestion {
  id: string;
  examVersionId: string;
  questionText: string;
  questionType: QuestionType;
  difficulty: QuestionDifficulty;
  options: QuestionOption[];
  sourceGrounding?: QuestionSourceGrounding;
}

export interface ExamSubmissionAnswer {
  questionId: string;
  selectedOptionIds: string[];
}

export interface ExamSubmissionPayload {
  attemptId: string;
  examVersionId: string;
  submissionTimestamp: string;
  answers: ExamSubmissionAnswer[];
}

export interface ExamAttemptResult {
  attemptId: string;
  examId: string;
  examVersionId: string;
  attemptNumber: number;
  totalQuestions: number;
  correctQuestionsCount: number;
  score: number;
  passingScore: number;
  status: ExamStatus;
  startedAt: string;
  submittedAt: string;
}
