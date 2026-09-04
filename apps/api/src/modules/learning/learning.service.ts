import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { loadApiEnvironment } from '@unicom/config';
import {
  AuthSecurityEventType,
  FileAssetStatus,
  LearningActivitySessionType,
  LearningMaterialProgressStatus,
  prisma,
  SystemRoleCode,
  UserStatus,
} from '@unicom/database';
import type { Prisma } from '@unicom/database';
import type { MaterialType } from '@unicom/database';
import type { AuthRequestContext, SafeAuthenticatedUser } from '../auth/auth.types.js';
import { AuthSecurityEventService } from '../auth/auth-security-event.service.js';
import { AuthorizationService } from '../auth/authorization.service.js';
import { BrandAuthorizationService } from '../brands/brand-authorization.service.js';
import { TrainingProgressService } from '../training-progress/training-progress.service.js';
import type { AcknowledgeMaterialDto } from './dto/acknowledge-material.dto.js';
import type { DocumentPageDto } from './dto/document-page.dto.js';
import type { VideoHeartbeatDto } from './dto/video-heartbeat.dto.js';
import {
  MaterialCompletionPolicyService,
  type CoverageRange,
  type PageCoverage,
} from './material-completion-policy.service.js';

@Injectable()
export class LearningService {
  private readonly environment = loadApiEnvironment();

  constructor(
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(BrandAuthorizationService)
    private readonly brandAuthorization: BrandAuthorizationService,
    @Inject(AuthSecurityEventService) private readonly securityEvents: AuthSecurityEventService,
    @Inject(MaterialCompletionPolicyService)
    private readonly policy: MaterialCompletionPolicyService,
    @Inject(TrainingProgressService) private readonly trainingProgress: TrainingProgressService,
  ) {}

  async start(
    enrollmentId: string,
    materialId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const access = await this.assertOwnMaterial(enrollmentId, materialId, actor, context);
    const strategy = this.policy.strategyFor(access.material.type);
    if (strategy === 'VIDEO' && !access.material.fileAsset.durationMs)
      throw new BadRequestException('Trusted video metadata is not ready.');
    if (strategy === 'PAGINATED' && !access.material.fileAsset.pageCount)
      throw new BadRequestException('Trusted document metadata is not ready.');
    const now = new Date();
    const progress = await prisma.learningMaterialProgress.upsert({
      where: { enrollmentId_materialId: { enrollmentId, materialId } },
      create: {
        enrollmentId,
        materialId,
        status: LearningMaterialProgressStatus.IN_PROGRESS,
        startedAt: now,
        lastActivityAt: now,
      },
      update: { lastActivityAt: now },
    });
    const session = await prisma.learningActivitySession.create({
      data: {
        userId: actor.id,
        enrollmentId,
        materialId,
        type: this.sessionType(strategy),
        expiresAt: new Date(
          now.getTime() + this.environment.LEARNING_ACTIVITY_SESSION_TTL_MINUTES * 60_000,
        ),
      },
    });
    await this.trainingProgress.refreshEnrollmentLifecycle(enrollmentId, actor, context);
    return {
      activitySessionId: session.id,
      expiresAt: session.expiresAt,
      progress: this.progressView(progress),
      policy: this.policy.safeMetadata(
        access.material.type,
        access.material.fileAsset.durationMs,
        access.material.fileAsset.pageCount,
      ),
    };
  }

  async videoHeartbeat(
    materialId: string,
    dto: VideoHeartbeatDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const session = await this.assertSession(
      dto.activitySessionId,
      materialId,
      actor,
      context,
      'VIDEO',
    );
    const response = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const current = await tx.learningActivitySession.findUniqueOrThrow({
        where: { id: session.id },
      });
      await this.assertFreshEvent(current, dto.sequence, now, actor, context);
      const durationMs = session.material.fileAsset.durationMs;
      if (!durationMs) throw new BadRequestException('Trusted video metadata is not ready.');
      if (dto.playbackRate > this.policy.maximumPlaybackRate())
        throw new BadRequestException('Playback rate is not permitted.');
      const previousPosition = current.lastPositionMs ?? 0;
      const elapsedMs = Math.max(0, now.getTime() - current.lastEventAt.getTime());
      const positionMs = Math.min(durationMs, Math.trunc(dto.currentTimeMs));
      const continuous =
        dto.playing &&
        dto.visibility === 'visible' &&
        positionMs >= previousPosition &&
        positionMs - previousPosition <=
          elapsedMs * dto.playbackRate + this.policy.heartbeatGraceMs();
      const changed = await tx.learningActivitySession.updateMany({
        where: { id: current.id, lastSequence: { lt: dto.sequence } },
        data: { lastSequence: dto.sequence, lastEventAt: now, lastPositionMs: positionMs },
      });
      if (changed.count !== 1) throw new ConflictException('Learning activity event was replayed.');
      const progress = await this.progressFor(tx, session.enrollmentId, materialId, now);
      if (progress.status === LearningMaterialProgressStatus.COMPLETED)
        return this.progressView(progress);
      const ranges = continuous
        ? this.policy.mergeRanges(
            this.videoRanges(progress.videoCoverage),
            {
              startMs: previousPosition,
              endMs: positionMs,
            },
            durationMs,
          )
        : this.videoRanges(progress.videoCoverage);
      const result = this.policy.videoResult(ranges, durationMs, positionMs, dto.ended);
      const updated = await tx.learningMaterialProgress.update({
        where: { id: progress.id },
        data: {
          status: result.completed
            ? LearningMaterialProgressStatus.COMPLETED
            : LearningMaterialProgressStatus.IN_PROGRESS,
          progressBasisPoints: Math.max(progress.progressBasisPoints, result.progressBasisPoints),
          videoCoverage: { ranges } as unknown as Prisma.InputJsonValue,
          lastVerifiedPositionMs: positionMs,
          lastActivityAt: now,
          ...(result.completed ? { completedAt: now, progressBasisPoints: 10_000 } : {}),
        },
      });
      if (result.completed) await this.recordCompletion(tx, session, actor, context, now);
      return this.progressView(updated);
    });
    await this.trainingProgress.refreshEnrollmentLifecycle(session.enrollmentId, actor, context);
    return response;
  }

  async documentPage(
    materialId: string,
    dto: DocumentPageDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const session = await this.assertSession(
      dto.activitySessionId,
      materialId,
      actor,
      context,
      'PAGINATED',
    );
    const response = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const current = await tx.learningActivitySession.findUniqueOrThrow({
        where: { id: session.id },
      });
      await this.assertFreshEvent(current, dto.sequence, now, actor, context);
      const pageCount = session.material.fileAsset.pageCount;
      if (!pageCount) throw new BadRequestException('Trusted document metadata is not ready.');
      if (dto.pageNumber > pageCount)
        throw new BadRequestException('Page number is outside the document.');
      const changed = await tx.learningActivitySession.updateMany({
        where: { id: current.id, lastSequence: { lt: dto.sequence } },
        data: { lastSequence: dto.sequence, lastEventAt: now },
      });
      if (changed.count !== 1) throw new ConflictException('Learning activity event was replayed.');
      const progress = await this.progressFor(tx, session.enrollmentId, materialId, now);
      if (progress.status === LearningMaterialProgressStatus.COMPLETED)
        return this.progressView(progress);
      const coverage = this.policy.mergePages(
        this.pages(progress.pageCoverage),
        dto.pageNumber,
        pageCount,
      );
      const elapsed = Math.min(
        this.policy.maxDwellCreditMs(),
        Math.max(0, now.getTime() - current.lastEventAt.getTime()),
      );
      const dwellMs = Math.min(3_600_000, progress.accumulatedDwellMs + elapsed);
      const result = this.policy.documentResult(coverage, pageCount, dwellMs);
      const updated = await tx.learningMaterialProgress.update({
        where: { id: progress.id },
        data: {
          status: result.completed
            ? LearningMaterialProgressStatus.COMPLETED
            : LearningMaterialProgressStatus.IN_PROGRESS,
          progressBasisPoints: Math.max(progress.progressBasisPoints, result.progressBasisPoints),
          pageCoverage: coverage as unknown as Prisma.InputJsonValue,
          accumulatedDwellMs: dwellMs,
          lastActivityAt: now,
          ...(result.completed ? { completedAt: now, progressBasisPoints: 10_000 } : {}),
        },
      });
      if (result.completed) await this.recordCompletion(tx, session, actor, context, now);
      return this.progressView(updated);
    });
    await this.trainingProgress.refreshEnrollmentLifecycle(session.enrollmentId, actor, context);
    return response;
  }

  async acknowledge(
    materialId: string,
    dto: AcknowledgeMaterialDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const session = await this.assertSession(
      dto.activitySessionId,
      materialId,
      actor,
      context,
      'ACKNOWLEDGEMENT',
    );
    const response = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const progress = await this.progressFor(tx, session.enrollmentId, materialId, now);
      if (progress.status === LearningMaterialProgressStatus.COMPLETED)
        return this.progressView(progress);
      const current = await tx.learningActivitySession.findUniqueOrThrow({
        where: { id: session.id },
      });
      if (current.expiresAt <= now || current.revokedAt)
        throw new ForbiddenException('Learning activity session expired.');
      const dwellMs = Math.min(3_600_000, Math.max(0, now.getTime() - current.startedAt.getTime()));
      if (dwellMs < this.policy.minimumDwellMs(session.material.type))
        throw new BadRequestException('Minimum verified reading time has not elapsed.');
      const updated = await tx.learningMaterialProgress.update({
        where: { id: progress.id },
        data: {
          status: LearningMaterialProgressStatus.COMPLETED,
          progressBasisPoints: 10_000,
          accumulatedDwellMs: Math.max(progress.accumulatedDwellMs, dwellMs),
          lastActivityAt: now,
          completedAt: now,
        },
      });
      await this.recordCompletion(tx, session, actor, context, now);
      return this.progressView(updated);
    });
    await this.trainingProgress.refreshEnrollmentLifecycle(session.enrollmentId, actor, context);
    return response;
  }

  async selfProgress(
    enrollmentId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    await this.assertOwnEnrollment(enrollmentId, actor, context);
    return this.progressList(enrollmentId);
  }

  async scopedProgress(
    enrollmentId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const enrollment = await prisma.trainingEnrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) throw new NotFoundException('Training enrollment not found.');
    await this.brandAuthorization.assertBrandAccess(actor, enrollment.brandId, context);
    return this.progressList(enrollmentId);
  }

  private async progressList(enrollmentId: string) {
    const rows = await prisma.learningMaterialProgress.findMany({
      where: { enrollmentId },
      include: { material: { select: { id: true, title: true, type: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return {
      enrollmentId,
      items: rows.map((row) => ({ material: row.material, ...this.progressView(row) })),
    };
  }

  private async assertOwnMaterial(
    enrollmentId: string,
    materialId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    if (actor.status !== UserStatus.ACTIVE || !(await this.isActiveTrainee(actor))) {
      await this.recordSecurity(
        AuthSecurityEventType.LEARNING_ACTIVITY_SCOPE_DENIED,
        actor,
        context,
        {
          enrollmentId,
          materialId,
          outcome: 'inactive_trainee',
        },
      );
      throw new ForbiddenException('Learning activity is not permitted.');
    }
    const [enrollment, material] = await Promise.all([
      prisma.trainingEnrollment.findUnique({ where: { id: enrollmentId } }),
      prisma.learningMaterial.findUnique({
        where: { id: materialId },
        include: {
          fileAsset: true,
          curriculumModule: {
            include: {
              curriculumWeek: {
                include: { curriculumVersion: { select: { status: true } } },
              },
            },
          },
        },
      }),
    ]);
    if (
      !enrollment ||
      enrollment.participantUserId !== actor.id ||
      enrollment.status === 'CANCELLED' ||
      enrollment.status === 'SUSPENDED' ||
      !enrollment.curriculumVersionId ||
      !material ||
      material.fileAsset.status !== FileAssetStatus.READY ||
      material.curriculumModule.curriculumWeek.curriculumVersionId !==
        enrollment.curriculumVersionId ||
      !['PUBLISHED', 'RETIRED'].includes(
        material.curriculumModule.curriculumWeek.curriculumVersion.status,
      )
    ) {
      await this.recordSecurity(
        AuthSecurityEventType.LEARNING_ACTIVITY_SCOPE_DENIED,
        actor,
        context,
        {
          enrollmentId,
          materialId,
          outcome: 'scope_denied',
        },
      );
      throw new ForbiddenException('Learning material access denied.');
    }
    return { enrollment, material };
  }

  private async assertOwnEnrollment(
    enrollmentId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const enrollment = await prisma.trainingEnrollment.findUnique({ where: { id: enrollmentId } });
    if (
      !enrollment ||
      enrollment.participantUserId !== actor.id ||
      enrollment.status === 'CANCELLED' ||
      enrollment.status === 'SUSPENDED'
    ) {
      await this.recordSecurity(
        AuthSecurityEventType.LEARNING_ACTIVITY_SCOPE_DENIED,
        actor,
        context,
        {
          enrollmentId,
          outcome: 'scope_denied',
        },
      );
      throw new ForbiddenException('Learning enrollment access denied.');
    }
    return enrollment;
  }

  private async assertSession(
    sessionId: string,
    materialId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
    expected: 'VIDEO' | 'PAGINATED' | 'ACKNOWLEDGEMENT',
  ) {
    const session = await prisma.learningActivitySession.findUnique({
      where: { id: sessionId },
      include: { material: { include: { fileAsset: true } }, enrollment: true },
    });
    if (
      !session ||
      session.userId !== actor.id ||
      session.materialId !== materialId ||
      session.type !== this.sessionType(expected) ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      await this.recordSecurity(
        AuthSecurityEventType.LEARNING_ACTIVITY_SCOPE_DENIED,
        actor,
        context,
        {
          materialId,
          outcome: 'invalid_session',
        },
      );
      throw new ForbiddenException('Learning activity session is invalid.');
    }
    await this.assertOwnMaterial(session.enrollmentId, materialId, actor, context);
    return session;
  }

  private async assertFreshEvent(
    session: { lastSequence: number; lastEventAt: Date },
    sequence: number,
    now: Date,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    if (sequence <= session.lastSequence) {
      await this.recordSecurity(
        AuthSecurityEventType.LEARNING_ACTIVITY_SEQUENCE_REPLAY,
        actor,
        context,
        {
          outcome: 'sequence_replay',
        },
      );
      throw new ConflictException('Learning activity event was replayed.');
    }
    if (
      now.getTime() - session.lastEventAt.getTime() <
      this.environment.LEARNING_ACTIVITY_MIN_EVENT_INTERVAL_MS
    ) {
      await this.recordSecurity(AuthSecurityEventType.LEARNING_ACTIVITY_REJECTED, actor, context, {
        outcome: 'rate_limited',
      });
      throw new HttpException(
        'Learning activity events are arriving too quickly.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async progressFor(
    tx: Prisma.TransactionClient,
    enrollmentId: string,
    materialId: string,
    now: Date,
  ) {
    return tx.learningMaterialProgress.upsert({
      where: { enrollmentId_materialId: { enrollmentId, materialId } },
      create: {
        enrollmentId,
        materialId,
        status: LearningMaterialProgressStatus.IN_PROGRESS,
        startedAt: now,
        lastActivityAt: now,
      },
      update: {},
    });
  }

  private async recordCompletion(
    tx: Prisma.TransactionClient,
    session: {
      enrollmentId: string;
      materialId: string;
      material: { type: MaterialType };
      enrollment: { brandId: string; curriculumVersionId: string | null };
    },
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
    completedAt: Date,
  ) {
    await tx.authSecurityEvent.create({
      data: {
        eventType: AuthSecurityEventType.LEARNING_MATERIAL_COMPLETED,
        userId: actor.id,
        requestId: context.requestId,
        metadata: {
          participantUserId: actor.id,
          enrollmentId: session.enrollmentId,
          materialId: session.materialId,
          brandId: session.enrollment.brandId,
          curriculumVersionId: session.enrollment.curriculumVersionId,
          materialType: session.material.type,
          completedAt: completedAt.toISOString(),
        },
      },
    });
  }

  private progressView(progress: {
    materialId: string;
    status: LearningMaterialProgressStatus;
    progressBasisPoints: number;
    startedAt: Date | null;
    completedAt: Date | null;
  }) {
    return {
      materialId: progress.materialId,
      status: progress.status,
      progressPercent: progress.progressBasisPoints / 100,
      startedAt: progress.startedAt,
      completedAt: progress.completedAt,
    };
  }

  private videoRanges(value: unknown): CoverageRange[] {
    if (!this.isObject(value) || !Array.isArray(value['ranges'])) return [];
    return value['ranges'].flatMap((entry) =>
      this.isObject(entry) &&
      typeof entry['startMs'] === 'number' &&
      typeof entry['endMs'] === 'number'
        ? [{ startMs: entry['startMs'], endMs: entry['endMs'] }]
        : [],
    );
  }

  private pages(value: unknown): PageCoverage {
    if (!this.isObject(value) || !Array.isArray(value['pages']))
      return { pages: [], finalReached: false };
    return {
      pages: value['pages'].filter((page): page is number => typeof page === 'number'),
      finalReached: value['finalReached'] === true,
    };
  }

  private sessionType(strategy: 'VIDEO' | 'PAGINATED' | 'ACKNOWLEDGEMENT') {
    return strategy === 'VIDEO'
      ? LearningActivitySessionType.VIDEO
      : strategy === 'PAGINATED'
        ? LearningActivitySessionType.PAGINATED
        : LearningActivitySessionType.ACKNOWLEDGEMENT;
  }

  private async isActiveTrainee(actor: SafeAuthenticatedUser): Promise<boolean> {
    const context = await this.authorization.getUserAuthorizationContext(actor);
    return context.roles.some((role) => role.code === SystemRoleCode.Trainee);
  }

  private async recordSecurity(
    eventType: AuthSecurityEventType,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
    metadata: Record<string, string>,
  ) {
    await this.securityEvents.record(eventType, context, actor.id, metadata);
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
