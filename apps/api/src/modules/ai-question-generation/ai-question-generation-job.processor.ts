import { Inject, Injectable } from '@nestjs/common';
import {
  AiQuestionGenerationJobStatus,
  AuthSecurityEventType,
  ExamQuestionOrigin,
  ExamQuestionStatus,
  prisma,
} from '@unicom/database';
import { locatorFields, validateAiQuestionCandidates } from './ai-question-candidate.validation.js';
import {
  DisabledAiQuestionGenerationProvider,
  DeterministicFakeAiQuestionGenerationProvider,
  OpenAiCompatibleQuestionGenerationProvider,
} from './ai-question-generation.provider.js';
import { MaterialSourceExtractionService } from './material-source-extraction.service.js';
import { loadApiEnvironment } from '@unicom/config';

const MAX_PROVIDER_ATTEMPTS = 3;

@Injectable()
export class AiQuestionGenerationJobProcessor {
  private readonly environment = loadApiEnvironment();

  constructor(
    @Inject(MaterialSourceExtractionService)
    private readonly sourceExtraction: MaterialSourceExtractionService,
    @Inject(DisabledAiQuestionGenerationProvider)
    private readonly disabledProvider: DisabledAiQuestionGenerationProvider,
    @Inject(OpenAiCompatibleQuestionGenerationProvider)
    private readonly openAiProvider: OpenAiCompatibleQuestionGenerationProvider,
    @Inject(DeterministicFakeAiQuestionGenerationProvider)
    private readonly fakeProvider: DeterministicFakeAiQuestionGenerationProvider,
  ) {}

  async processNext(): Promise<boolean> {
    await this.recoverExpiredLease();
    const job = await prisma.aiQuestionGenerationJob.findFirst({
      where: {
        status: AiQuestionGenerationJobStatus.QUEUED,
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!job) return false;
    const claimed = await prisma.aiQuestionGenerationJob.updateMany({
      where: { id: job.id, status: AiQuestionGenerationJobStatus.QUEUED },
      data: {
        status: AiQuestionGenerationJobStatus.PROCESSING,
        startedAt: new Date(),
        nextAttemptAt: null,
        attemptCount: { increment: 1 },
      },
    });
    if (claimed.count !== 1) return true;
    try {
      const materialIds = (
        await prisma.aiQuestionGenerationJobMaterial.findMany({
          where: { jobId: job.id },
          select: { materialId: true },
        })
      ).map((material) => material.materialId);
      const chunks = await this.sourceExtraction.readyChunks(
        materialIds,
        this.environment.AI_GENERATION_MAX_SOURCE_CHARS,
      );
      if (chunks.length === 0) return this.fail(job.id, 'NO_GROUNDED_QUESTIONS');
      const provider =
        this.environment.AI_PROVIDER === 'openai_compatible'
          ? this.openAiProvider
          : this.environment.AI_PROVIDER === 'test_fake'
            ? this.fakeProvider
            : this.disabledProvider;
      const response = await provider.generateQuestions({
        jobId: job.id,
        questionCount: job.requestedQuestionCount,
        questionTypes: job.requestedQuestionTypes as {
          singleChoice: number;
          multipleChoice: number;
          trueFalse: number;
        },
        sourceChunks: chunks,
      });
      const current = await prisma.aiQuestionGenerationJob.findUniqueOrThrow({
        where: { id: job.id },
      });
      if (current.status === AiQuestionGenerationJobStatus.CANCELLED) return true;
      const chunkById = new Map(chunks.map((chunk) => [chunk.id, chunk]));
      const validation = validateAiQuestionCandidates(response, new Set(chunkById.keys()));
      const existing = await prisma.examQuestion.findMany({
        where: { examId: job.examId },
        select: { prompt: true },
      });
      const existingPrompts = new Set(
        existing.map((question) => question.prompt.trim().toLocaleLowerCase()),
      );
      const candidates = validation.valid
        .filter((candidate) => !existingPrompts.has(candidate.prompt.toLocaleLowerCase()))
        .slice(0, job.requestedQuestionCount);
      if (candidates.length === 0) return this.fail(job.id, 'NO_GROUNDED_QUESTIONS');
      const persisted = await prisma.$transaction(async (transaction) => {
        const status = await transaction.aiQuestionGenerationJob.findUniqueOrThrow({
          where: { id: job.id },
          select: { status: true },
        });
        if (status.status === AiQuestionGenerationJobStatus.CANCELLED) return null;
        const last = await transaction.examQuestion.aggregate({
          where: { examId: job.examId },
          _max: { sortOrder: true },
        });
        let created = 0;
        for (const [index, candidate] of candidates.entries()) {
          const question = await transaction.examQuestion.create({
            data: {
              examId: job.examId,
              aiGenerationJobId: job.id,
              origin: ExamQuestionOrigin.AI_GENERATED,
              status: ExamQuestionStatus.DRAFT,
              type: candidate.type,
              prompt: candidate.prompt,
              explanation: candidate.explanation,
              points: 1,
              sortOrder: (last._max.sortOrder ?? 0) + index + 1,
              options: {
                create: candidate.options.map((option, optionIndex) => ({
                  text: option.text,
                  isCorrect: option.isCorrect,
                  sortOrder: optionIndex + 1,
                })),
              },
            },
          });
          for (const sourceChunkId of candidate.sourceChunkIds) {
            const source = chunkById.get(sourceChunkId);
            if (!source) continue;
            const fields = locatorFields(source.locatorType, source.locator);
            await transaction.questionSourceReference.create({
              data: {
                questionId: question.id,
                materialId: source.materialId,
                sourceChunkId,
                locatorType: source.locatorType,
                ...fields,
              },
            });
          }
          await transaction.authSecurityEvent.create({
            data: {
              eventType: AuthSecurityEventType.AI_QUESTION_DRAFT_CREATED,
              userId: job.requestedByUserId,
              metadata: { jobId: job.id, questionId: question.id },
            },
          });
          created += 1;
        }
        const rejected = validation.rejected + (validation.valid.length - candidates.length);
        const complete = created === job.requestedQuestionCount && rejected === 0;
        await transaction.aiQuestionGenerationJob.update({
          where: { id: job.id },
          data: {
            status: complete
              ? AiQuestionGenerationJobStatus.COMPLETED
              : AiQuestionGenerationJobStatus.PARTIAL,
            completedAt: new Date(),
            createdQuestionCount: created,
            rejectedCandidateCount: rejected,
          },
        });
        await transaction.authSecurityEvent.create({
          data: {
            eventType: complete
              ? AuthSecurityEventType.AI_QUESTION_GENERATION_COMPLETED
              : AuthSecurityEventType.AI_QUESTION_GENERATION_PARTIAL,
            userId: job.requestedByUserId,
            metadata: {
              jobId: job.id,
              createdQuestionCount: created,
              rejectedCandidateCount: rejected,
            },
          },
        });
        return created;
      });
      return persisted !== null;
    } catch (error) {
      const code =
        error instanceof Error && error.name === 'AbortError'
          ? 'AI_TIMEOUT'
          : error instanceof Error && error.message === 'AI provider output is malformed.'
            ? 'INVALID_PROVIDER_OUTPUT'
            : 'AI_PROVIDER_UNAVAILABLE';
      return this.fail(job.id, code);
    }
  }

  private async fail(jobId: string, errorCode: string) {
    const job = await prisma.aiQuestionGenerationJob.findUnique({ where: { id: jobId } });
    if (!job || job.status === AiQuestionGenerationJobStatus.CANCELLED) return true;
    const retryable = errorCode === 'AI_TIMEOUT' || errorCode === 'AI_PROVIDER_UNAVAILABLE';
    if (retryable && job.attemptCount < MAX_PROVIDER_ATTEMPTS) {
      // 2s then 4s: bounded exponential backoff. A cancelled job cannot be requeued.
      const retryAt = new Date(Date.now() + 2 ** job.attemptCount * 1_000);
      const requeued = await prisma.aiQuestionGenerationJob.updateMany({
        where: { id: jobId, status: AiQuestionGenerationJobStatus.PROCESSING },
        data: { status: AiQuestionGenerationJobStatus.QUEUED, nextAttemptAt: retryAt, errorCode },
      });
      return requeued.count === 1;
    }
    await prisma.$transaction(async (transaction) => {
      await transaction.aiQuestionGenerationJob.update({
        where: { id: jobId },
        data: { status: AiQuestionGenerationJobStatus.FAILED, failedAt: new Date(), errorCode },
      });
      await transaction.authSecurityEvent.create({
        data: {
          eventType: AuthSecurityEventType.AI_QUESTION_GENERATION_FAILED,
          userId: job.requestedByUserId,
          metadata: { jobId, failureCode: errorCode },
        },
      });
    });
    return true;
  }

  private async recoverExpiredLease(): Promise<void> {
    const now = new Date();
    const expiredBefore = new Date(
      now.getTime() - this.environment.WORKER_JOB_LEASE_SECONDS * 1_000,
    );
    await prisma.aiQuestionGenerationJob.updateMany({
      where: {
        status: AiQuestionGenerationJobStatus.PROCESSING,
        startedAt: { lt: expiredBefore },
      },
      data: {
        status: AiQuestionGenerationJobStatus.QUEUED,
        startedAt: null,
        nextAttemptAt: now,
        errorCode: 'WORKER_LEASE_EXPIRED',
      },
    });
  }
}
