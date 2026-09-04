import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { loadApiEnvironment } from '@unicom/config';
import {
  AuthSecurityEventType,
  CurriculumVersionStatus,
  ExamAttemptStatus,
  ExamQuestionStatus,
  ExamQuestionType,
  FileAssetStatus,
  LearningMaterialProgressStatus,
  prisma,
  SystemRoleCode,
  UserStatus,
} from '@unicom/database';
import type { AuthRequestContext, SafeAuthenticatedUser } from '../auth/auth.types.js';
import { AuthSecurityEventService } from '../auth/auth-security-event.service.js';
import { BrandAuthorizationService } from '../brands/brand-authorization.service.js';
import { TrainingProgressService } from '../training-progress/training-progress.service.js';
import type {
  CreateExamDto,
  CreateExamQuestionDto,
  OrderExamQuestionsDto,
  SaveExamAnswerDto,
  UpdateExamDto,
  UpdateExamQuestionDto,
} from './dto/exam.dto.js';
import { ExamScoringService } from './exam-scoring.service.js';

const authoringExamInclude = {
  curriculumVersion: { include: { curriculum: { include: { brand: true } } } },
  curriculumWeek: true,
  curriculumModule: true,
  questions: {
    include: {
      options: { orderBy: { sortOrder: 'asc' } },
      sourceReferences: {
        include: { material: { select: { id: true, title: true } }, sourceChunk: true },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  },
} as const;

const attemptInclude = {
  questions: {
    include: {
      options: { orderBy: { sortOrder: 'asc' } },
      answer: true,
    },
    orderBy: { sortOrder: 'asc' },
  },
} as const;

@Injectable()
export class ExamService {
  constructor(
    @Inject(BrandAuthorizationService)
    private readonly brandAuthorization: BrandAuthorizationService,
    @Inject(AuthSecurityEventService) private readonly securityEvents: AuthSecurityEventService,
    @Inject(ExamScoringService) private readonly scoring: ExamScoringService,
    @Inject(TrainingProgressService) private readonly trainingProgress: TrainingProgressService,
  ) {}

  async listWeek(weekId: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const week = await prisma.curriculumWeek.findUnique({
      where: { id: weekId },
      include: { curriculumVersion: { include: { curriculum: true } } },
    });
    if (!week) throw new NotFoundException('Curriculum week not found.');
    await this.brandAuthorization.assertBrandAccess(
      actor,
      week.curriculumVersion.curriculum.brandId,
      context,
    );
    const exams = await prisma.exam.findMany({
      where: { curriculumWeekId: weekId },
      include: authoringExamInclude,
      orderBy: { code: 'asc' },
    });
    return { items: exams.map((exam) => this.authoringView(exam)) };
  }

  async get(examId: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const exam = await this.findAuthoringExam(examId);
    await this.assertAuthoringScope(exam, actor, context);
    return this.authoringView(exam);
  }

  async create(
    weekId: string,
    dto: CreateExamDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const week = await this.assertDraftWeek(weekId, actor, context);
    if (dto.curriculumModuleId) {
      const module = await prisma.curriculumModule.findFirst({
        where: { id: dto.curriculumModuleId, curriculumWeekId: week.id },
      });
      if (!module) throw new BadRequestException('Exam module must belong to its Curriculum week.');
    }
    try {
      const exam = await prisma.exam.create({
        data: {
          curriculumVersionId: week.curriculumVersionId,
          curriculumWeekId: week.id,
          ...(dto.curriculumModuleId ? { curriculumModuleId: dto.curriculumModuleId } : {}),
          code: dto.code.trim().toUpperCase(),
          title: dto.title.trim(),
          ...(dto.description === undefined ? {} : { description: dto.description.trim() }),
          passingScoreBasisPoints:
            dto.passingScoreBasisPoints ??
            loadApiEnvironment().EXAM_DEFAULT_PASSING_SCORE_PERCENT * 100,
          ...(dto.maxAttempts === undefined ? {} : { maxAttempts: dto.maxAttempts }),
          createdByUserId: actor.id,
        },
        include: authoringExamInclude,
      });
      await this.record(AuthSecurityEventType.EXAM_CREATED, actor, context, {
        examId: exam.id,
        curriculumVersionId: exam.curriculumVersionId,
        brandId: week.curriculumVersion.curriculum.brandId,
      });
      return this.authoringView(exam);
    } catch (error) {
      if (this.isUnique(error))
        throw new ConflictException('Exam code already exists in this week.');
      throw error;
    }
  }

  async update(
    examId: string,
    dto: UpdateExamDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const exam = await this.findAuthoringExam(examId);
    await this.assertDraftExam(exam, actor, context);
    if (
      dto.title === undefined &&
      dto.description === undefined &&
      dto.passingScoreBasisPoints === undefined &&
      dto.maxAttempts === undefined
    )
      throw new BadRequestException('At least one mutable Exam field is required.');
    const updated = await prisma.exam.update({
      where: { id: examId },
      data: {
        ...(dto.title === undefined ? {} : { title: dto.title.trim() }),
        ...(dto.description === undefined ? {} : { description: dto.description.trim() }),
        ...(dto.passingScoreBasisPoints === undefined
          ? {}
          : { passingScoreBasisPoints: dto.passingScoreBasisPoints }),
        ...(dto.maxAttempts === undefined ? {} : { maxAttempts: dto.maxAttempts }),
      },
      include: authoringExamInclude,
    });
    await this.record(AuthSecurityEventType.EXAM_UPDATED, actor, context, {
      examId,
      curriculumVersionId: exam.curriculumVersionId,
      brandId: exam.curriculumVersion.curriculum.brandId,
    });
    return this.authoringView(updated);
  }

  async createQuestion(
    examId: string,
    dto: CreateExamQuestionDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const exam = await this.findAuthoringExam(examId);
    await this.assertDraftExam(exam, actor, context);
    const last = await prisma.examQuestion.aggregate({
      where: { examId },
      _max: { sortOrder: true },
    });
    const question = await prisma.examQuestion.create({
      data: {
        examId,
        type: dto.type,
        prompt: dto.prompt.trim(),
        ...(dto.explanation === undefined ? {} : { explanation: dto.explanation.trim() }),
        points: dto.points ?? 1,
        sortOrder: (last._max.sortOrder ?? 0) + 1,
        options: {
          create: dto.options.map((option, index) => ({
            text: option.text.trim(),
            isCorrect: option.isCorrect,
            sortOrder: index + 1,
          })),
        },
      },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
    await this.record(AuthSecurityEventType.EXAM_QUESTION_CREATED, actor, context, {
      examId,
      curriculumVersionId: exam.curriculumVersionId,
      brandId: exam.curriculumVersion.curriculum.brandId,
    });
    return question;
  }

  async updateQuestion(
    questionId: string,
    dto: UpdateExamQuestionDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const question = await this.findQuestion(questionId);
    const exam = await this.findAuthoringExam(question.examId);
    await this.assertDraftExam(exam, actor, context);
    if (
      dto.type === undefined &&
      dto.prompt === undefined &&
      dto.explanation === undefined &&
      dto.points === undefined &&
      dto.options === undefined
    )
      throw new BadRequestException('At least one mutable Question field is required.');
    const updated = await prisma.$transaction(async (tx) => {
      if (dto.options) await tx.examQuestionOption.deleteMany({ where: { questionId } });
      return tx.examQuestion.update({
        where: { id: questionId },
        data: {
          ...(dto.type === undefined ? {} : { type: dto.type }),
          ...(dto.prompt === undefined ? {} : { prompt: dto.prompt.trim() }),
          ...(dto.explanation === undefined
            ? {}
            : { explanation: dto.explanation === null ? null : dto.explanation.trim() }),
          ...(dto.points === undefined ? {} : { points: dto.points }),
          status: ExamQuestionStatus.DRAFT,
          approvedByUserId: null,
          approvedAt: null,
          ...(dto.options
            ? {
                options: {
                  create: dto.options.map((option, index) => ({
                    text: option.text.trim(),
                    isCorrect: option.isCorrect,
                    sortOrder: index + 1,
                  })),
                },
              }
            : {}),
        },
        include: { options: { orderBy: { sortOrder: 'asc' } } },
      });
    });
    await this.record(AuthSecurityEventType.EXAM_QUESTION_UPDATED, actor, context, {
      examId: exam.id,
      curriculumVersionId: exam.curriculumVersionId,
      brandId: exam.curriculumVersion.curriculum.brandId,
    });
    return updated;
  }

  async removeQuestion(
    questionId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const question = await this.findQuestion(questionId);
    const exam = await this.findAuthoringExam(question.examId);
    await this.assertDraftExam(exam, actor, context);
    await prisma.examQuestion.delete({ where: { id: questionId } });
    await this.record(AuthSecurityEventType.EXAM_QUESTION_REMOVED, actor, context, {
      examId: exam.id,
      curriculumVersionId: exam.curriculumVersionId,
      brandId: exam.curriculumVersion.curriculum.brandId,
    });
  }

  async approveQuestion(
    questionId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const question = await this.findQuestion(questionId);
    const exam = await this.findAuthoringExam(question.examId);
    await this.assertDraftExam(exam, actor, context);
    this.assertQuestionDefinition(question);
    const approved = await prisma.examQuestion.update({
      where: { id: questionId },
      data: {
        status: ExamQuestionStatus.APPROVED,
        approvedByUserId: actor.id,
        approvedAt: new Date(),
      },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
    await this.record(AuthSecurityEventType.EXAM_QUESTION_APPROVED, actor, context, {
      examId: exam.id,
      curriculumVersionId: exam.curriculumVersionId,
      brandId: exam.curriculumVersion.curriculum.brandId,
    });
    return approved;
  }

  async reorderQuestions(
    examId: string,
    dto: OrderExamQuestionsDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const exam = await this.findAuthoringExam(examId);
    await this.assertDraftExam(exam, actor, context);
    const existing = exam.questions.map((question) => question.id);
    if (
      existing.length !== dto.ids.length ||
      new Set(dto.ids).size !== dto.ids.length ||
      dto.ids.some((id) => !existing.includes(id))
    )
      throw new BadRequestException('Order must contain every current question exactly once.');
    await prisma.$transaction(
      dto.ids.map((id, index) =>
        prisma.examQuestion.update({ where: { id }, data: { sortOrder: index + 1 } }),
      ),
    );
    return this.get(examId, actor, context);
  }

  async listSelfExams(
    enrollmentId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const enrollment = await this.assertParticipantEnrollment(enrollmentId, actor, context);
    if (!enrollment.curriculumVersionId) return { items: [] };
    const version = await prisma.curriculumVersion.findUnique({
      where: { id: enrollment.curriculumVersionId },
    });
    if (
      !version ||
      (version.status !== CurriculumVersionStatus.PUBLISHED &&
        version.status !== CurriculumVersionStatus.RETIRED)
    )
      return { items: [] };
    const exams = await prisma.exam.findMany({
      where: { curriculumVersionId: version.id },
      include: { curriculumWeek: true, curriculumModule: true },
      orderBy: [{ curriculumWeek: { weekNumber: 'asc' } }, { code: 'asc' }],
    });
    const attempts = await prisma.examAttempt.findMany({
      where: { enrollmentId, examId: { in: exams.map((exam) => exam.id) } },
      orderBy: { attemptNumber: 'asc' },
    });
    return {
      items: await Promise.all(
        exams.map(async (exam) => {
          const gate = await this.materialGate(enrollmentId, exam.id);
          const history = attempts.filter((attempt) => attempt.examId === exam.id);
          const active = history.find(
            (attempt) => attempt.status === ExamAttemptStatus.IN_PROGRESS,
          );
          return {
            id: exam.id,
            code: exam.code,
            title: exam.title,
            description: exam.description,
            weekNumber: exam.curriculumWeek.weekNumber,
            module: exam.curriculumModule
              ? {
                  id: exam.curriculumModule.id,
                  code: exam.curriculumModule.code,
                  name: exam.curriculumModule.name,
                }
              : null,
            available: gate.complete,
            lockedReason: gate.complete
              ? null
              : 'Complete all required materials before starting this exam.',
            activeAttemptId: active?.id ?? null,
            attempts: history.map((attempt) => this.historyView(attempt)),
          };
        }),
      ),
    };
  }

  async start(
    enrollmentId: string,
    examId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const enrollment = await this.assertParticipantEnrollment(enrollmentId, actor, context);
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          include: { options: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!exam || exam.curriculumVersionId !== enrollment.curriculumVersionId) {
      await this.denied(actor, context, {
        enrollmentId,
        examId,
        reason: 'enrollment_version_scope',
      });
      throw new ForbiddenException('Access denied.');
    }
    const version = await prisma.curriculumVersion.findUnique({
      where: { id: exam.curriculumVersionId },
    });
    if (
      !version ||
      (version.status !== CurriculumVersionStatus.PUBLISHED &&
        version.status !== CurriculumVersionStatus.RETIRED)
    )
      throw new BadRequestException('Exam is not available for this enrollment.');
    this.assertReadiness(exam);
    const gate = await this.materialGate(enrollmentId, examId);
    if (!gate.complete) {
      await this.denied(actor, context, { enrollmentId, examId, reason: 'materials_incomplete' });
      throw new ForbiddenException('Complete all required materials before starting this exam.');
    }
    let created = false;
    let attempt;
    try {
      attempt = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${enrollmentId}:${examId}`}))`;
        const active = await tx.examAttempt.findFirst({
          where: { enrollmentId, examId, status: ExamAttemptStatus.IN_PROGRESS },
          include: attemptInclude,
        });
        if (active) return active;
        const used = await tx.examAttempt.count({ where: { enrollmentId, examId } });
        if (exam.maxAttempts !== null && used >= exam.maxAttempts)
          throw new ConflictException('The maximum number of attempts has been reached.');
        created = true;
        return tx.examAttempt.create({
          data: {
            examId,
            enrollmentId,
            participantUserId: actor.id,
            attemptNumber: used + 1,
            passingScoreBasisPoints: exam.passingScoreBasisPoints,
            questions: {
              create: exam.questions.map((question) => ({
                sourceQuestionId: question.id,
                prompt: question.prompt,
                type: question.type,
                points: question.points,
                sortOrder: question.sortOrder,
                options: {
                  create: question.options.map((option) => ({
                    sourceOptionId: option.id,
                    text: option.text,
                    sortOrder: option.sortOrder,
                    isCorrect: option.isCorrect,
                  })),
                },
              })),
            },
          },
          include: attemptInclude,
        });
      });
    } catch (error) {
      if (!this.isUnique(error)) throw error;
      const active = await prisma.examAttempt.findFirst({
        where: { enrollmentId, examId, status: ExamAttemptStatus.IN_PROGRESS },
        include: attemptInclude,
      });
      if (!active) throw new ConflictException('Unable to resume the in-progress attempt.');
      attempt = active;
    }
    if (created) {
      await this.record(AuthSecurityEventType.EXAM_ATTEMPT_STARTED, actor, context, {
        participantUserId: actor.id,
        enrollmentId,
        examId,
        attemptId: attempt.id,
        attemptNumber: attempt.attemptNumber,
      });
    }
    await this.trainingProgress.refreshEnrollmentLifecycle(enrollmentId, actor, context);
    return this.attemptView(attempt);
  }

  async saveAnswer(
    attemptId: string,
    attemptQuestionId: string,
    dto: SaveExamAnswerDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const attempt = await this.ownAttempt(attemptId, actor, context);
    if (attempt.status !== ExamAttemptStatus.IN_PROGRESS)
      throw new BadRequestException('Submitted attempts cannot be changed.');
    const question = await prisma.examAttemptQuestion.findFirst({
      where: { id: attemptQuestionId, attemptId },
      include: { options: true },
    });
    if (!question) throw new NotFoundException('Attempt question not found.');
    this.assertAnswerSelection(question, dto.selectedOptionIds);
    if (dto.selectedOptionIds.length === 0) {
      await prisma.examAttemptAnswer.deleteMany({ where: { attemptId, attemptQuestionId } });
      return { attemptId, attemptQuestionId, selectedOptionIds: [], saved: true };
    }
    await prisma.examAttemptAnswer.upsert({
      where: { attemptId_attemptQuestionId: { attemptId, attemptQuestionId } },
      update: { selectedOptionIds: dto.selectedOptionIds },
      create: { attemptId, attemptQuestionId, selectedOptionIds: dto.selectedOptionIds },
    });
    return { attemptId, attemptQuestionId, selectedOptionIds: dto.selectedOptionIds, saved: true };
  }

  async submit(attemptId: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    await this.ownAttempt(attemptId, actor, context);
    const submitted = await prisma.$transaction(async (tx) => {
      const attempt = await tx.examAttempt.findUnique({
        where: { id: attemptId },
        include: attemptInclude,
      });
      if (!attempt) throw new NotFoundException('Exam attempt not found.');
      if (attempt.participantUserId !== actor.id) throw new ForbiddenException('Access denied.');
      if (attempt.status === ExamAttemptStatus.SUBMITTED) return attempt;
      if (attempt.status !== ExamAttemptStatus.IN_PROGRESS)
        throw new BadRequestException('Exam attempt cannot be submitted.');
      const maxPoints = attempt.questions.reduce((sum, question) => sum + question.points, 0);
      const scorePoints = attempt.questions.reduce((sum, question) => {
        const answer = question.answer;
        const selected =
          answer && Array.isArray(answer.selectedOptionIds)
            ? answer.selectedOptionIds.filter((id): id is string => typeof id === 'string')
            : [];
        return this.scoring.selectedSetIsCorrect(question, selected) ? sum + question.points : sum;
      }, 0);
      const score = this.scoring.scoreBasisPoints(scorePoints, maxPoints);
      const passed = score >= attempt.passingScoreBasisPoints;
      const result = await tx.examAttempt.update({
        where: { id: attemptId },
        data: {
          status: ExamAttemptStatus.SUBMITTED,
          submittedAt: new Date(),
          scorePoints,
          maxPoints,
          scoreBasisPoints: score,
          passed,
        },
        include: attemptInclude,
      });
      await tx.authSecurityEvent.create({
        data: {
          eventType: AuthSecurityEventType.EXAM_ATTEMPT_SUBMITTED,
          userId: actor.id,
          requestId: context.requestId,
          metadata: {
            participantUserId: actor.id,
            enrollmentId: result.enrollmentId,
            examId: result.examId,
            attemptId: result.id,
            attemptNumber: result.attemptNumber,
            scoreBasisPoints: score,
            passed,
          },
        },
      });
      return result;
    });
    await this.trainingProgress.refreshEnrollmentLifecycle(submitted.enrollmentId, actor, context);
    return this.attemptView(submitted);
  }

  async history(enrollmentId: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    await this.assertParticipantEnrollment(enrollmentId, actor, context);
    const attempts = await prisma.examAttempt.findMany({
      where: { enrollmentId, participantUserId: actor.id },
      orderBy: [{ startedAt: 'desc' }, { attemptNumber: 'desc' }],
    });
    return { items: attempts.map((attempt) => this.historyView(attempt)) };
  }

  async results(examId: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const exam = await this.findAuthoringExam(examId);
    await this.assertAuthoringScope(exam, actor, context);
    const attempts = await prisma.examAttempt.findMany({
      where: { examId, status: ExamAttemptStatus.SUBMITTED },
      include: { participant: { include: { staffProfile: true } } },
      orderBy: [{ submittedAt: 'desc' }, { attemptNumber: 'desc' }],
    });
    return {
      items: attempts.map((attempt) => ({
        ...this.historyView(attempt),
        participant: {
          id: attempt.participantUserId,
          name: attempt.participant.staffProfile?.fullName ?? attempt.participant.email,
        },
      })),
    };
  }

  private async assertDraftWeek(
    weekId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const week = await prisma.curriculumWeek.findUnique({
      where: { id: weekId },
      include: { curriculumVersion: { include: { curriculum: true } } },
    });
    if (!week) throw new NotFoundException('Curriculum week not found.');
    await this.brandAuthorization.assertBrandAccess(
      actor,
      week.curriculumVersion.curriculum.brandId,
      context,
    );
    if (week.curriculumVersion.status !== CurriculumVersionStatus.DRAFT)
      throw new BadRequestException('Published or retired assessment definitions are immutable.');
    return week;
  }

  private async findAuthoringExam(examId: string) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: authoringExamInclude,
    });
    if (!exam) throw new NotFoundException('Exam not found.');
    return exam;
  }

  private async findQuestion(questionId: string) {
    const question = await prisma.examQuestion.findUnique({
      where: { id: questionId },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!question) throw new NotFoundException('Exam question not found.');
    return question;
  }

  private async assertAuthoringScope(
    exam: Awaited<ReturnType<ExamService['findAuthoringExam']>>,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    await this.brandAuthorization.assertBrandAccess(
      actor,
      exam.curriculumVersion.curriculum.brandId,
      context,
    );
  }

  private async assertDraftExam(
    exam: Awaited<ReturnType<ExamService['findAuthoringExam']>>,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    await this.assertAuthoringScope(exam, actor, context);
    if (exam.curriculumVersion.status !== CurriculumVersionStatus.DRAFT)
      throw new BadRequestException('Published or retired assessment definitions are immutable.');
  }

  private assertQuestionDefinition(question: {
    type: ExamQuestionType;
    points: number;
    options: { id: string; text: string; isCorrect: boolean }[];
  }) {
    this.scoring.assertQuestionStructure(question);
    if (question.type === ExamQuestionType.TRUE_FALSE) {
      const values = question.options.map((option) => option.text.trim().toUpperCase());
      if (new Set(values).size !== 2 || !values.includes('TRUE') || !values.includes('FALSE'))
        throw new BadRequestException('True/false options must be exactly TRUE and FALSE.');
    }
  }

  private assertReadiness(exam: { passingScoreBasisPoints: number; questions: unknown[] }) {
    if (
      !Number.isInteger(exam.passingScoreBasisPoints) ||
      exam.passingScoreBasisPoints < 0 ||
      exam.passingScoreBasisPoints > 10_000
    )
      throw new BadRequestException('Exam passing threshold is invalid.');
    if (exam.questions.length === 0)
      throw new BadRequestException('Exam requires at least one approved question.');
    for (const item of exam.questions) {
      const question = item as {
        status: ExamQuestionStatus;
        type: ExamQuestionType;
        points: number;
        options: { id: string; text: string; isCorrect: boolean }[];
      };
      if (question.status !== ExamQuestionStatus.APPROVED)
        throw new BadRequestException('Every Exam question must be approved.');
      this.assertQuestionDefinition(question);
    }
  }

  private async assertParticipantEnrollment(
    enrollmentId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const enrollment = await prisma.trainingEnrollment.findUnique({ where: { id: enrollmentId } });
    const participant = await prisma.user.findUnique({
      where: { id: actor.id },
      include: { userRoles: { include: { role: true } } },
    });
    const activeTrainee =
      participant?.status === UserStatus.ACTIVE &&
      participant.userRoles.some(
        (assignment) => assignment.role.code === SystemRoleCode.Trainee && assignment.role.isActive,
      );
    if (
      !enrollment ||
      enrollment.participantUserId !== actor.id ||
      !activeTrainee ||
      enrollment.status === 'CANCELLED' ||
      enrollment.status === 'SUSPENDED'
    ) {
      await this.denied(actor, context, { enrollmentId, reason: 'participant_enrollment_scope' });
      throw new ForbiddenException('Access denied.');
    }
    return enrollment;
  }

  private async materialGate(enrollmentId: string, examId: string) {
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exam not found.');
    const materials = await prisma.learningMaterial.findMany({
      where: {
        curriculumModule: {
          curriculumWeekId: exam.curriculumWeekId,
          ...(exam.curriculumModuleId ? { id: exam.curriculumModuleId } : {}),
        },
        fileAsset: { status: FileAssetStatus.READY },
      },
      select: { id: true },
    });
    if (materials.length === 0) return { complete: true, requiredCount: 0, completedCount: 0 };
    const completedCount = await prisma.learningMaterialProgress.count({
      where: {
        enrollmentId,
        materialId: { in: materials.map((material) => material.id) },
        status: LearningMaterialProgressStatus.COMPLETED,
      },
    });
    return {
      complete: completedCount === materials.length,
      requiredCount: materials.length,
      completedCount,
    };
  }

  private async ownAttempt(
    attemptId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException('Exam attempt not found.');
    if (attempt.participantUserId !== actor.id) {
      await this.denied(actor, context, {
        attemptId,
        examId: attempt.examId,
        reason: 'attempt_owner',
      });
      throw new ForbiddenException('Access denied.');
    }
    return attempt;
  }

  private assertAnswerSelection(
    question: { type: ExamQuestionType; options: { id: string }[] },
    selectedOptionIds: string[],
  ) {
    if (new Set(selectedOptionIds).size !== selectedOptionIds.length)
      throw new BadRequestException('An option may be selected only once.');
    if (selectedOptionIds.some((id) => !question.options.some((option) => option.id === id)))
      throw new BadRequestException('Selected option does not belong to this question.');
    if (selectedOptionIds.length === 0) return;
    if (
      (question.type === ExamQuestionType.SINGLE_CHOICE ||
        question.type === ExamQuestionType.TRUE_FALSE) &&
      selectedOptionIds.length !== 1
    )
      throw new BadRequestException('This question accepts exactly one option.');
  }

  private authoringView(exam: Awaited<ReturnType<ExamService['findAuthoringExam']>>) {
    const ready = this.isReady(exam);
    return {
      id: exam.id,
      curriculumVersionId: exam.curriculumVersionId,
      curriculumWeekId: exam.curriculumWeekId,
      curriculumModuleId: exam.curriculumModuleId,
      code: exam.code,
      title: exam.title,
      description: exam.description,
      passingScoreBasisPoints: exam.passingScoreBasisPoints,
      maxAttempts: exam.maxAttempts,
      readiness: ready,
      questions: exam.questions.map((question) => ({
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        explanation: question.explanation,
        sortOrder: question.sortOrder,
        points: question.points,
        status: question.status,
        origin: question.origin,
        approvedAt: question.approvedAt,
        options: question.options.map((option) => ({
          id: option.id,
          text: option.text,
          sortOrder: option.sortOrder,
          isCorrect: option.isCorrect,
        })),
        sourceReferences: question.sourceReferences.map((reference) => ({
          id: reference.id,
          material: reference.material,
          sourceChunkId: reference.sourceChunkId,
          locatorType: reference.locatorType,
          pageNumber: reference.pageNumber,
          startMs: reference.startMs,
          endMs: reference.endMs,
          sheetName: reference.sheetName,
          cellRange: reference.cellRange,
          sectionLabel: reference.sectionLabel,
          excerpt: reference.sourceChunk?.content ?? null,
        })),
      })),
    };
  }

  private isReady(exam: Awaited<ReturnType<ExamService['findAuthoringExam']>>) {
    try {
      this.assertReadiness(exam);
      return { ready: true, reason: null };
    } catch (error) {
      return {
        ready: false,
        reason: error instanceof Error ? error.message : 'Exam is not ready.',
      };
    }
  }

  private attemptView(attempt: Awaited<ReturnType<typeof prisma.examAttempt.findFirst>> & {}) {
    if (!attempt) throw new NotFoundException('Exam attempt not found.');
    const detailed = attempt as Awaited<ReturnType<typeof prisma.examAttempt.findFirst>> & {
      questions?: {
        id: string;
        prompt: string;
        type: ExamQuestionType;
        points: number;
        sortOrder: number;
        options: { id: string; text: string; sortOrder: number }[];
        answer: { selectedOptionIds: unknown } | null;
      }[];
    };
    return {
      id: detailed.id,
      examId: detailed.examId,
      enrollmentId: detailed.enrollmentId,
      attemptNumber: detailed.attemptNumber,
      status: detailed.status,
      startedAt: detailed.startedAt,
      submittedAt: detailed.submittedAt,
      ...(detailed.status === ExamAttemptStatus.SUBMITTED
        ? {
            scorePoints: detailed.scorePoints,
            maxPoints: detailed.maxPoints,
            scoreBasisPoints: detailed.scoreBasisPoints,
            scorePercent:
              detailed.scoreBasisPoints === null ? null : detailed.scoreBasisPoints / 100,
            passed: detailed.passed,
          }
        : {}),
      questions: (detailed.questions ?? []).map((question) => ({
        id: question.id,
        prompt: question.prompt,
        type: question.type,
        points: question.points,
        sortOrder: question.sortOrder,
        options: question.options.map((option) => ({
          id: option.id,
          text: option.text,
          sortOrder: option.sortOrder,
        })),
        selectedOptionIds: Array.isArray(question.answer?.selectedOptionIds)
          ? question.answer.selectedOptionIds.filter((id): id is string => typeof id === 'string')
          : [],
      })),
    };
  }

  private historyView(attempt: {
    id: string;
    examId: string;
    attemptNumber: number;
    status: ExamAttemptStatus;
    startedAt: Date;
    submittedAt: Date | null;
    scorePoints: number | null;
    maxPoints: number | null;
    scoreBasisPoints: number | null;
    passed: boolean | null;
  }) {
    return {
      id: attempt.id,
      examId: attempt.examId,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      ...(attempt.status === ExamAttemptStatus.SUBMITTED
        ? {
            scorePoints: attempt.scorePoints,
            maxPoints: attempt.maxPoints,
            scoreBasisPoints: attempt.scoreBasisPoints,
            scorePercent: attempt.scoreBasisPoints === null ? null : attempt.scoreBasisPoints / 100,
            passed: attempt.passed,
          }
        : {}),
    };
  }

  private record(
    type: AuthSecurityEventType,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
    metadata: Record<string, string | number | boolean>,
  ) {
    return this.securityEvents.record(type, context, actor.id, metadata);
  }

  private denied(
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
    metadata: Record<string, string | number | boolean>,
  ) {
    return this.record(AuthSecurityEventType.EXAM_ATTEMPT_ACCESS_DENIED, actor, context, metadata);
  }

  private isUnique(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
