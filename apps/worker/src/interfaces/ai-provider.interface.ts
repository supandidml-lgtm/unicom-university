import { QuestionType, QuestionDifficulty } from "@unicom/types";

export interface GenerateQuestionsOptions {
  materialId: string;
  materialVersion: number;
  materialType: "PDF" | "VIDEO";
  sourceContentText: string;
  sourceChunks: Array<{
    chunkId: string;
    text: string;
    pageNumber?: number;
    timestampStartSeconds?: number;
    timestampEndSeconds?: number;
  }>;
  requestedQuestionCount: number;
  allowedQuestionTypes: QuestionType[];
  difficultyDistribution?: {
    easyPercentage: number;
    mediumPercentage: number;
    hardPercentage: number;
  };
}

export interface GeneratedQuestionCandidate {
  questionText: string;
  questionType: QuestionType;
  difficulty: QuestionDifficulty;
  options: Array<{
    optionText: string;
    isCorrect: boolean;
  }>;
  sourceGrounding: {
    materialId: string;
    materialVersion: number;
    sourceChunkId: string;
    pageNumber?: number;
    timestampStartSeconds?: number;
    timestampEndSeconds?: number;
    excerptSnippet: string;
  };
  confidenceScore: number;
}

export interface AIProviderResult {
  success: boolean;
  questions: GeneratedQuestionCandidate[];
  rawProviderMetadata?: Record<string, unknown>;
  errorCode?: "INSUFFICIENT_SOURCE" | "PROVIDER_TIMEOUT" | "VALIDATION_FAILED" | "UNKNOWN";
  errorMessage?: string;
}

export interface IAIProvider {
  readonly providerName: string;
  generateQuestions(options: GenerateQuestionsOptions): Promise<AIProviderResult>;
}
