import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { loadApiEnvironment } from '@unicom/config';
import {
  AiQuestionGenerationJobStatus,
  AuthSecurityEventType,
  CurriculumVersionStatus,
  FileAssetStatus,
  prisma,
} from '@unicom/database';
import type { Prisma } from '@unicom/database';
import type { AuthRequestContext, SafeAuthenticatedUser } from '../auth/auth.types.js';
import { AuthSecurityEventService } from '../auth/auth-security-event.service.js';
import { BrandAuthorizationService } from '../brands/brand-authorization.service.js';
import type { CreateAiQuestionGenerationJobDto } from './dto/create-ai-question-generation-job.dto.js';
import { QUESTION_GENERATION_PROMPT_VERSION } from './ai-question-generation.provider.js';

@Injectable()
export class AiQuestionGenerationService {
  private readonly environment = loadApiEnvironment();

  constructor(
    @Inject(BrandAuthorizationService)
    private readonly brandAuthorization: BrandAuthorizationService,
    @Inject(AuthSecurityEventService) private readonly securityEvents: AuthSecurityEventService,
  ) {}

  async request(
    examId: string,
    dto: CreateAiQuestionGenerationJobDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    this.validateRequest(dto);
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { curriculumVersion: { include: { curriculum: true } } },
    });
    if (!exam) throw new NotFoundException('Exam not found.');
    if (exam.curriculumVersion.status !== CurriculumVersionStatus.DRAFT)
      throw new ConflictException('AI generation is allowed only for Draft curriculum versions.');
    await this.brandAuthorization.assertBrandAccess(
      actor,
      exam.curriculumVersion.curriculum.brandId,
      context,
    );
    const requestedInLastMinute = await prisma.aiQuestionGenerationJob.count({
      where: { requestedByUserId: actor.id, createdAt: { gte: new Date(Date.now() - 60_000) } },
    });
    if (requestedInLastMinute >= this.environment.AI_GENERATION_REQUESTS_PER_MINUTE)
      throw new HttpException(
        'AI generation request rate limit exceeded.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const active = await prisma.aiQuestionGenerationJob.count({
      where: {
        requestedByUserId: actor.id,
        status: {
          in: [AiQuestionGenerationJobStatus.QUEUED, AiQuestionGenerationJobStatus.PROCESSING],
        },
      },
    });
    if (active >= this.environment.AI_MAX_ACTIVE_JOBS_PER_USER)
      throw new ConflictException('Too many active AI generation jobs.');
    const materials = await prisma.learningMaterial.findMany({
      where: {
        id: { in: dto.materialIds },
        curriculumModule: {
          curriculumWeek: { curriculumVersionId: exam.curriculumVersionId },
        },
        fileAsset: { status: FileAssetStatus.READY },
      },
      select: { id: true },
    });
    if (materials.length !== dto.materialIds.length)
      throw new BadRequestException(
        'Every selected Material must be READY and belong to the exact Draft curriculum version.',
      );
    const provider = this.environment.AI_PROVIDER;
    const job = await prisma.$transaction(async (transaction) => {
      const created = await transaction.aiQuestionGenerationJob.create({
        data: {
          examId,
          curriculumVersionId: exam.curriculumVersionId,
          requestedByUserId: actor.id,
          requestedQuestionCount: dto.questionCount,
          requestedQuestionTypes: dto.questionTypes as unknown as Prisma.InputJsonValue,
          provider,
          model: provider === 'disabled' ? null : this.environment.AI_MODEL,
          promptVersion: QUESTION_GENERATION_PROMPT_VERSION,
          status:
            provider === 'disabled'
              ? AiQuestionGenerationJobStatus.FAILED
              : AiQuestionGenerationJobStatus.QUEUED,
          ...(provider === 'disabled' ? { failedAt: new Date(), errorCode: 'AI_DISABLED' } : {}),
          materials: { create: materials.map((material) => ({ materialId: material.id })) },
        },
        include: { materials: { select: { materialId: true } } },
      });
      await transaction.authSecurityEvent.create({
        data: {
          eventType: AuthSecurityEventType.AI_QUESTION_GENERATION_REQUESTED,
          userId: actor.id,
          requestId: context.requestId,
          metadata: { jobId: created.id, examId, materialCount: materials.length },
        },
      });
      if (provider === 'disabled') {
        await transaction.authSecurityEvent.create({
          data: {
            eventType: AuthSecurityEventType.AI_QUESTION_GENERATION_FAILED,
            userId: actor.id,
            requestId: context.requestId,
            metadata: { jobId: created.id, failureCode: 'AI_DISABLED' },
          },
        });
      }
      return created;
    });
    return this.view(job);
  }

  async list(examId: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { curriculumVersion: { include: { curriculum: true } } },
    });
    if (!exam) throw new NotFoundException('Exam not found.');
    await this.brandAuthorization.assertBrandAccess(
      actor,
      exam.curriculumVersion.curriculum.brandId,
      context,
    );
    const jobs = await prisma.aiQuestionGenerationJob.findMany({
      where: { examId },
      include: { materials: { select: { materialId: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { items: jobs.map((job) => this.view(job)) };
  }

  async eligibleMaterials(
    examId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { curriculumVersion: { include: { curriculum: true } } },
    });
    if (!exam) throw new NotFoundException('Exam not found.');
    if (exam.curriculumVersion.status !== CurriculumVersionStatus.DRAFT)
      throw new ConflictException('AI generation is allowed only for Draft curriculum versions.');
    await this.brandAuthorization.assertBrandAccess(
      actor,
      exam.curriculumVersion.curriculum.brandId,
      context,
    );
    const items = await prisma.learningMaterial.findMany({
      where: {
        curriculumModule: { curriculumWeek: { curriculumVersionId: exam.curriculumVersionId } },
        fileAsset: { status: FileAssetStatus.READY },
      },
      select: {
        id: true,
        title: true,
        type: true,
        curriculumModule: {
          select: { name: true, curriculumWeek: { select: { weekNumber: true } } },
        },
      },
      orderBy: [
        { curriculumModule: { curriculumWeek: { weekNumber: 'asc' } } },
        { sortOrder: 'asc' },
      ],
    });
    return {
      items: items.map((material) => ({
        id: material.id,
        title: material.title,
        type: material.type,
        weekNumber: material.curriculumModule.curriculumWeek.weekNumber,
        moduleName: material.curriculumModule.name,
      })),
    };
  }

  async cancel(jobId: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const job = await prisma.aiQuestionGenerationJob.findUnique({
      where: { id: jobId },
      include: { exam: { include: { curriculumVersion: { include: { curriculum: true } } } } },
    });
    if (!job) throw new NotFoundException('AI generation job not found.');
    await this.brandAuthorization.assertBrandAccess(
      actor,
      job.exam.curriculumVersion.curriculum.brandId,
      context,
    );
    if (
      job.status !== AiQuestionGenerationJobStatus.QUEUED &&
      job.status !== AiQuestionGenerationJobStatus.PROCESSING
    )
      throw new ConflictException('Only active AI generation jobs can be cancelled.');
    const updated = await prisma.aiQuestionGenerationJob.update({
      where: { id: jobId },
      data: { status: AiQuestionGenerationJobStatus.CANCELLED, cancelledAt: new Date() },
      include: { materials: { select: { materialId: true } } },
    });
    await this.securityEvents.record(
      AuthSecurityEventType.AI_QUESTION_GENERATION_CANCELLED,
      context,
      actor.id,
      {
        jobId,
      },
    );
    return this.view(updated);
  }

  private validateRequest(dto: CreateAiQuestionGenerationJobDto) {
    if (new Set(dto.materialIds).size !== dto.materialIds.length)
      throw new BadRequestException('Material IDs must be unique.');
    const total =
      dto.questionTypes.singleChoice +
      dto.questionTypes.multipleChoice +
      dto.questionTypes.trueFalse;
    if (total !== dto.questionCount)
      throw new BadRequestException('Question type counts must equal questionCount.');
    if (dto.questionCount > this.environment.AI_GENERATION_MAX_QUESTIONS_PER_JOB)
      throw new BadRequestException('Requested question count exceeds the configured maximum.');
  }

  private view(job: {
    id: string;
    examId: string;
    status: AiQuestionGenerationJobStatus;
    requestedQuestionCount: number;
    requestedQuestionTypes: unknown;
    provider: string;
    model: string | null;
    promptVersion: string;
    createdQuestionCount: number;
    rejectedCandidateCount: number;
    errorCode: string | null;
    createdAt: Date;
    startedAt?: Date | null;
    completedAt?: Date | null;
    failedAt?: Date | null;
    cancelledAt?: Date | null;
    materials: { materialId: string }[];
  }) {
    return {
      id: job.id,
      examId: job.examId,
      status: job.status,
      requestedQuestionCount: job.requestedQuestionCount,
      requestedQuestionTypes: job.requestedQuestionTypes,
      materialIds: job.materials.map((material) => material.materialId),
      provider: job.provider,
      model: job.model,
      promptVersion: job.promptVersion,
      createdQuestionCount: job.createdQuestionCount,
      rejectedCandidateCount: job.rejectedCandidateCount,
      errorCode: job.errorCode,
      createdAt: job.createdAt,
      startedAt: job.startedAt ?? null,
      completedAt: job.completedAt ?? null,
      failedAt: job.failedAt ?? null,
      cancelledAt: job.cancelledAt ?? null,
    };
  }
}
