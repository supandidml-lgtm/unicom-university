import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthSecurityEventType,
  CurriculumVersionStatus,
  EnrollmentStatus,
  ExamAttemptStatus,
  ExamQuestionStatus,
  LearningMaterialProgressStatus,
  prisma,
  SystemRoleCode,
  UserStatus,
} from '@unicom/database';
import type { Prisma } from '@unicom/database';
import type { AuthRequestContext, SafeAuthenticatedUser } from '../auth/auth.types.js';
import { AuthSecurityEventService } from '../auth/auth-security-event.service.js';
import { BrandAuthorizationService } from '../brands/brand-authorization.service.js';
import { NotificationService } from '../notifications/notification.service.js';
import { CertificateService } from '../certificates/certificate.service.js';
import {
  averageBasisPoints,
  clampBasisPoints,
  finiteExamIsExhausted,
  progressStatus,
  requirementUnitProgress,
} from './training-progress.calculator.js';

const BASIS_POINTS_MAX = 10_000;

type ProgressDatabase = Prisma.TransactionClient;

@Injectable()
export class TrainingProgressService {
  constructor(
    @Inject(BrandAuthorizationService)
    private readonly brandAuthorization: BrandAuthorizationService,
    @Inject(AuthSecurityEventService) private readonly securityEvents: AuthSecurityEventService,
    @Inject(NotificationService) private readonly notifications: NotificationService,
    @Inject(CertificateService) private readonly certificates: CertificateService,
  ) {}

  async calculateEnrollmentProgress(enrollmentId: string) {
    return prisma.$transaction((tx) => this.calculate(tx, enrollmentId));
  }

  async calculateWeekProgress(enrollmentId: string, weekId: string) {
    const progress = await this.calculateEnrollmentProgress(enrollmentId);
    const week = progress.weeks.find((item) => item.id === weekId);
    if (!week) throw new NotFoundException('Curriculum week is not part of this Enrollment.');
    return week;
  }

  async calculateCourseProgress(enrollmentId: string) {
    const progress = await this.calculateEnrollmentProgress(enrollmentId);
    return {
      courseProgressBasisPoints: progress.courseProgressBasisPoints,
      requiredMaterialCount: progress.requiredMaterialCount,
      completedMaterialCount: progress.completedMaterialCount,
      noMaterialRequired: progress.noMaterialRequired,
    };
  }

  async calculateExamProgress(enrollmentId: string) {
    const progress = await this.calculateEnrollmentProgress(enrollmentId);
    return {
      examProgressBasisPoints: progress.examProgressBasisPoints,
      requiredExamCount: progress.requiredExamCount,
      passedExamCount: progress.passedExamCount,
      noExamRequired: progress.noExamRequired,
    };
  }

  async refreshEnrollmentLifecycle(
    enrollmentId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    let completed = false;
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "TrainingEnrollment" WHERE "id" = ${enrollmentId}::uuid FOR UPDATE`;
      const progress = await this.calculate(tx, enrollmentId);
      const next = this.determineEnrollmentLifecycle(progress);
      if (next === progress.status) return;
      if (
        progress.status === EnrollmentStatus.CANCELLED ||
        progress.status === EnrollmentStatus.SUSPENDED ||
        progress.status === EnrollmentStatus.COMPLETED
      ) {
        return;
      }

      const now = new Date();
      const update = await tx.trainingEnrollment.updateMany({
        where: {
          id: enrollmentId,
          status: {
            in: [
              EnrollmentStatus.NOT_STARTED,
              EnrollmentStatus.IN_PROGRESS,
              EnrollmentStatus.FAILED,
            ],
          },
        },
        data: {
          status: next,
          ...(next === EnrollmentStatus.IN_PROGRESS ||
          next === EnrollmentStatus.FAILED ||
          next === EnrollmentStatus.COMPLETED
            ? { startedAt: progress.startedAt ?? now }
            : {}),
          ...(next === EnrollmentStatus.COMPLETED
            ? { completedAt: progress.completedAt ?? now }
            : {}),
        },
      });
      if (update.count !== 1) return;
      completed = next === EnrollmentStatus.COMPLETED;

      const eventType =
        next === EnrollmentStatus.COMPLETED
          ? AuthSecurityEventType.TRAINING_ENROLLMENT_COMPLETED
          : next === EnrollmentStatus.FAILED
            ? AuthSecurityEventType.TRAINING_ENROLLMENT_FAILED
            : AuthSecurityEventType.TRAINING_ENROLLMENT_STARTED;
      await tx.authSecurityEvent.create({
        data: {
          eventType,
          userId: actor.id,
          requestId: context.requestId,
          metadata: {
            participantUserId: progress.participantUserId,
            enrollmentId,
            brandId: progress.brand.id,
            curriculumVersionId: progress.curriculumVersionId,
            ...(next === EnrollmentStatus.FAILED
              ? { failureReason: 'REQUIRED_EXAM_ATTEMPTS_EXHAUSTED' }
              : {}),
            ...(next === EnrollmentStatus.IN_PROGRESS || next === EnrollmentStatus.FAILED
              ? { startedAt: (progress.startedAt ?? now).toISOString() }
              : {}),
            ...(next === EnrollmentStatus.COMPLETED
              ? { completedAt: (progress.completedAt ?? now).toISOString() }
              : {}),
          },
        },
      });
    });
    if (completed) {
      await this.notifications.queueTrainingCompleted(enrollmentId, context.requestId);
      try {
        await this.certificates.ensureCertificateForCompletedEnrollment(enrollmentId, actor.id);
      } catch {
        /* certificate failure never changes completion */
      }
    }
    return this.calculateEnrollmentProgress(enrollmentId);
  }

  async selfProgress(
    enrollmentId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const progress = await this.calculateEnrollmentProgress(enrollmentId);
    await this.assertSelf(progress.participantUserId, enrollmentId, actor, context);
    return progress;
  }

  async dashboard(actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    await this.assertActiveTrainee(actor, context);
    const enrollments = await prisma.trainingEnrollment.findMany({
      where: { participantUserId: actor.id },
      select: { id: true },
      orderBy: [{ assignedAt: 'desc' }, { id: 'asc' }],
    });
    const items = await Promise.all(
      enrollments.map((enrollment) => this.calculateEnrollmentProgress(enrollment.id)),
    );
    return { progressPolicy: 'REQUIREMENT_UNIT_V1', items };
  }

  async participantProgress(
    participantUserId: string,
    enrollmentId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const progress = await this.calculateEnrollmentProgress(enrollmentId);
    if (progress.participantUserId !== participantUserId) {
      await this.recordDenied(actor, context, {
        enrollmentId,
        participantUserId,
        reason: 'participant_mismatch',
      });
      throw new ForbiddenException('Access denied.');
    }
    try {
      await this.brandAuthorization.assertBrandAccess(actor, progress.brand.id, context);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        await this.recordDenied(actor, context, {
          enrollmentId,
          participantUserId,
          brandId: progress.brand.id,
          reason: 'brand_scope',
        });
      }
      throw error;
    }
    return progress;
  }

  private async calculate(tx: ProgressDatabase, enrollmentId: string) {
    const enrollment = await tx.trainingEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        brand: true,
        curriculumVersion: {
          include: {
            weeks: {
              orderBy: { weekNumber: 'asc' },
              include: {
                modules: {
                  orderBy: { sortOrder: 'asc' },
                  include: { materials: { include: { fileAsset: true } } },
                },
              },
            },
            exams: { include: { questions: true } },
          },
        },
      },
    });
    if (!enrollment) throw new NotFoundException('Training enrollment not found.');

    if (
      !enrollment.curriculumVersion ||
      (enrollment.curriculumVersion.status !== CurriculumVersionStatus.PUBLISHED &&
        enrollment.curriculumVersion.status !== CurriculumVersionStatus.RETIRED)
    ) {
      return this.emptyProgress(enrollment, 'NO_BOUND_CURRICULUM_VERSION');
    }

    const version = enrollment.curriculumVersion;
    const allMaterials = version.weeks.flatMap((week) =>
      week.modules.flatMap((module) =>
        module.materials
          .filter((material) => material.fileAsset.status === 'READY')
          .map((material) => ({ ...material, weekId: week.id })),
      ),
    );
    const allExams = version.exams.filter((exam) => this.isParticipantAvailableExam(exam));
    const [materialProgressRows, attempts] = await Promise.all([
      tx.learningMaterialProgress.findMany({
        where: { enrollmentId, materialId: { in: allMaterials.map((material) => material.id) } },
      }),
      tx.examAttempt.findMany({
        where: {
          enrollmentId,
          participantUserId: enrollment.participantUserId,
          examId: { in: allExams.map((exam) => exam.id) },
        },
        orderBy: [{ submittedAt: 'desc' }, { attemptNumber: 'desc' }],
      }),
    ]);
    const materialProgress = new Map(materialProgressRows.map((row) => [row.materialId, row]));
    const attemptsByExam = new Map<string, typeof attempts>();
    for (const attempt of attempts) {
      attemptsByExam.set(attempt.examId, [...(attemptsByExam.get(attempt.examId) ?? []), attempt]);
    }

    const materialContribution = (materialId: string) => {
      const row = materialProgress.get(materialId);
      if (!row || row.status === LearningMaterialProgressStatus.NOT_STARTED) return 0;
      return row.status === LearningMaterialProgressStatus.COMPLETED
        ? BASIS_POINTS_MAX
        : clampBasisPoints(row.progressBasisPoints);
    };
    const passedExam = (examId: string) =>
      (attemptsByExam.get(examId) ?? []).some(
        (attempt) => attempt.status === ExamAttemptStatus.SUBMITTED && attempt.passed === true,
      );
    const materialComplete = (materialId: string) =>
      materialContribution(materialId) === BASIS_POINTS_MAX;
    const courseProgressBasisPoints = averageBasisPoints(
      allMaterials.map((material) => materialContribution(material.id)),
    );
    const examProgressBasisPoints = averageBasisPoints(
      allExams.map((exam) => (passedExam(exam.id) ? BASIS_POINTS_MAX : 0)),
    );
    const overallProgressBasisPoints = requirementUnitProgress(
      allMaterials.map((material) => materialContribution(material.id)),
      allExams.map((exam) => passedExam(exam.id)),
    );
    const weeks = version.weeks.map((week) => {
      const materials = allMaterials.filter((material) => material.weekId === week.id);
      const exams = allExams.filter((exam) => exam.curriculumWeekId === week.id);
      const course = averageBasisPoints(
        materials.map((material) => materialContribution(material.id)),
      );
      const exam = averageBasisPoints(
        exams.map((item) => (passedExam(item.id) ? BASIS_POINTS_MAX : 0)),
      );
      const overall = requirementUnitProgress(
        materials.map((material) => materialContribution(material.id)),
        exams.map((item) => passedExam(item.id)),
      );
      const requirementCount = materials.length + exams.length;
      const completedMaterialCount = materials.filter((material) =>
        materialComplete(material.id),
      ).length;
      const passedExamCount = exams.filter((item) => passedExam(item.id)).length;
      return {
        id: week.id,
        weekNumber: week.weekNumber,
        title: week.title,
        courseProgressBasisPoints: course,
        examProgressBasisPoints: exam,
        overallProgressBasisPoints: overall,
        requiredMaterialCount: materials.length,
        completedMaterialCount,
        requiredExamCount: exams.length,
        passedExamCount,
        noMaterialRequired: materials.length === 0,
        noExamRequired: exams.length === 0,
        status: progressStatus(requirementCount, completedMaterialCount + passedExamCount, overall),
        exams: exams.map((item) => this.examSummary(item, attemptsByExam.get(item.id) ?? [])),
      };
    });
    const completedMaterialCount = allMaterials.filter((material) =>
      materialComplete(material.id),
    ).length;
    const passedExamCount = allExams.filter((exam) => passedExam(exam.id)).length;
    const requirementCount = allMaterials.length + allExams.length;
    const exhaustedExam = allExams.some((exam) =>
      this.isExhausted(exam, attemptsByExam.get(exam.id) ?? []),
    );

    return {
      enrollmentId: enrollment.id,
      participantUserId: enrollment.participantUserId,
      curriculumVersionId: enrollment.curriculumVersionId,
      brand: { id: enrollment.brand.id, code: enrollment.brand.code, name: enrollment.brand.name },
      status: enrollment.status,
      startedAt: enrollment.startedAt,
      completedAt: enrollment.completedAt,
      plannedWeekCount: enrollment.plannedWeekCount,
      progressPolicy: 'REQUIREMENT_UNIT_V1' as const,
      overallProgressBasisPoints,
      courseProgressBasisPoints,
      examProgressBasisPoints,
      requiredMaterialCount: allMaterials.length,
      completedMaterialCount,
      requiredExamCount: allExams.length,
      passedExamCount,
      noMaterialRequired: allMaterials.length === 0,
      noExamRequired: allExams.length === 0,
      completionBlockedReason:
        requirementCount === 0
          ? 'NO_TRAINING_REQUIREMENTS'
          : exhaustedExam
            ? 'REQUIRED_EXAM_ATTEMPTS_EXHAUSTED'
            : null,
      hasLegitimateActivity:
        materialProgressRows.some(
          (row) => row.status !== LearningMaterialProgressStatus.NOT_STARTED,
        ) || attempts.length > 0,
      hasExhaustedRequiredExam: exhaustedExam,
      allRequirementsComplete:
        requirementCount > 0 &&
        completedMaterialCount === allMaterials.length &&
        passedExamCount === allExams.length,
      weeks,
    };
  }

  private emptyProgress(
    enrollment: {
      id: string;
      participantUserId: string;
      curriculumVersionId: string | null;
      brand: { id: string; code: string; name: string };
      status: EnrollmentStatus;
      startedAt: Date | null;
      completedAt: Date | null;
      plannedWeekCount: number;
    },
    completionBlockedReason: string,
  ) {
    return {
      enrollmentId: enrollment.id,
      participantUserId: enrollment.participantUserId,
      curriculumVersionId: enrollment.curriculumVersionId,
      brand: { id: enrollment.brand.id, code: enrollment.brand.code, name: enrollment.brand.name },
      status: enrollment.status,
      startedAt: enrollment.startedAt,
      completedAt: enrollment.completedAt,
      plannedWeekCount: enrollment.plannedWeekCount,
      progressPolicy: 'REQUIREMENT_UNIT_V1' as const,
      overallProgressBasisPoints: 0,
      courseProgressBasisPoints: 0,
      examProgressBasisPoints: 0,
      requiredMaterialCount: 0,
      completedMaterialCount: 0,
      requiredExamCount: 0,
      passedExamCount: 0,
      noMaterialRequired: true,
      noExamRequired: true,
      completionBlockedReason,
      hasLegitimateActivity: false,
      hasExhaustedRequiredExam: false,
      allRequirementsComplete: false,
      weeks: [],
    };
  }

  private determineEnrollmentLifecycle(progress: {
    status: EnrollmentStatus;
    allRequirementsComplete: boolean;
    hasExhaustedRequiredExam: boolean;
    hasLegitimateActivity: boolean;
  }): EnrollmentStatus {
    if (
      progress.status === EnrollmentStatus.CANCELLED ||
      progress.status === EnrollmentStatus.SUSPENDED ||
      progress.status === EnrollmentStatus.COMPLETED
    ) {
      return progress.status;
    }
    if (progress.allRequirementsComplete) return EnrollmentStatus.COMPLETED;
    if (progress.hasExhaustedRequiredExam) return EnrollmentStatus.FAILED;
    return progress.hasLegitimateActivity
      ? EnrollmentStatus.IN_PROGRESS
      : EnrollmentStatus.NOT_STARTED;
  }

  private isParticipantAvailableExam(exam: {
    questions: { status: ExamQuestionStatus }[];
  }): boolean {
    return (
      exam.questions.length > 0 &&
      exam.questions.every((question) => question.status === ExamQuestionStatus.APPROVED)
    );
  }

  private isExhausted(
    exam: { id: string; maxAttempts: number | null },
    attempts: { status: ExamAttemptStatus; passed: boolean | null }[],
  ): boolean {
    return finiteExamIsExhausted(
      exam.maxAttempts,
      attempts.filter((attempt) => attempt.status === ExamAttemptStatus.SUBMITTED).length,
      attempts.some(
        (attempt) => attempt.status === ExamAttemptStatus.SUBMITTED && attempt.passed === true,
      ),
    );
  }

  private examSummary(
    exam: { id: string; code: string; title: string; maxAttempts: number | null },
    attempts: {
      status: ExamAttemptStatus;
      scoreBasisPoints: number | null;
      passed: boolean | null;
      submittedAt: Date | null;
    }[],
  ) {
    const submitted = attempts.filter((attempt) => attempt.status === ExamAttemptStatus.SUBMITTED);
    const latest = submitted[0] ?? null;
    const scores = submitted
      .map((attempt) => attempt.scoreBasisPoints)
      .filter((score): score is number => score !== null);
    return {
      id: exam.id,
      code: exam.code,
      title: exam.title,
      passed: submitted.some((attempt) => attempt.passed === true),
      latestScoreBasisPoints: latest?.scoreBasisPoints ?? null,
      bestScoreBasisPoints: scores.length ? Math.max(...scores) : null,
      latestResult: latest?.passed === true ? 'PASS' : latest?.passed === false ? 'FAIL' : null,
      attemptsUsed: submitted.length,
      maxAttempts: exam.maxAttempts,
    };
  }

  private async assertSelf(
    participantUserId: string,
    enrollmentId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    if (participantUserId !== actor.id) {
      await this.recordDenied(actor, context, { enrollmentId, reason: 'enrollment_owner' });
      throw new ForbiddenException('Access denied.');
    }
    await this.assertActiveTrainee(actor, context, enrollmentId);
  }

  private async assertActiveTrainee(
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
    enrollmentId?: string,
  ) {
    const participant = await prisma.user.findUnique({
      where: { id: actor.id },
      include: { userRoles: { include: { role: true } } },
    });
    if (
      !participant ||
      participant.status !== UserStatus.ACTIVE ||
      !participant.userRoles.some(
        (assignment) => assignment.role.code === SystemRoleCode.Trainee && assignment.role.isActive,
      )
    ) {
      await this.recordDenied(actor, context, {
        ...(enrollmentId ? { enrollmentId } : {}),
        reason: 'inactive_trainee',
      });
      throw new ForbiddenException('Access denied.');
    }
  }

  private async recordDenied(
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
    metadata: Record<string, string>,
  ) {
    await this.securityEvents.record(
      AuthSecurityEventType.TRAINING_PROGRESS_ACCESS_DENIED,
      context,
      actor.id,
      metadata,
    );
  }
}
