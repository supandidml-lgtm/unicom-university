import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthSecurityEventType,
  BrandStatus,
  CurriculumVersionStatus,
  EnrollmentStatus,
  prisma,
  SystemRoleCode,
  UserStatus,
} from '@unicom/database';
import { loadApiEnvironment } from '@unicom/config';
import type { AuthRequestContext, SafeAuthenticatedUser } from '../auth/auth.types.js';
import { AuthSecurityEventService } from '../auth/auth-security-event.service.js';
import { AuthorizationService } from '../auth/authorization.service.js';
import { BrandAuthorizationService } from '../brands/brand-authorization.service.js';
import { NotificationService } from '../notifications/notification.service.js';
import type {
  CreateEnrollmentsDto,
  EnrollmentAssignmentDto,
} from './dto/create-enrollments.dto.js';
import type { EnrollmentListQueryDto } from './dto/enrollment-list-query.dto.js';
import type { UpdateEnrollmentDto } from './dto/update-enrollment.dto.js';
import type { BindCurriculumVersionDto } from './dto/bind-curriculum-version.dto.js';

const activeEnrollmentStatuses: EnrollmentStatus[] = [
  EnrollmentStatus.NOT_STARTED,
  EnrollmentStatus.IN_PROGRESS,
  EnrollmentStatus.SUSPENDED,
];

@Injectable()
export class EnrollmentService {
  constructor(
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(BrandAuthorizationService)
    private readonly brandAuthorization: BrandAuthorizationService,
    @Inject(AuthSecurityEventService) private readonly securityEvents: AuthSecurityEventService,
    @Inject(NotificationService) private readonly notifications: NotificationService,
  ) {}

  async createBulk(
    participantUserId: string,
    dto: CreateEnrollmentsDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    this.validateAssignments(dto.enrollments);
    await this.assertParticipantCreationScope(participantUserId, actor, context);
    for (const assignment of dto.enrollments) {
      const brand = await this.brandAuthorization.assertBrandAccess(
        actor,
        assignment.brandId,
        context,
      );
      if (brand.status !== BrandStatus.ACTIVE) {
        throw new BadRequestException('Archived Brands cannot receive new training enrollments.');
      }
    }

    try {
      const created = await prisma.$transaction(async (transaction) => {
        const existing = await transaction.trainingEnrollment.findMany({
          where: {
            participantUserId,
            brandId: { in: dto.enrollments.map((assignment) => assignment.brandId) },
            status: { in: activeEnrollmentStatuses },
          },
          select: { brandId: true },
        });
        if (existing.length > 0) {
          throw new ConflictException(
            'A current training enrollment already exists for this Participant and Brand.',
          );
        }
        const records = [];
        for (const assignment of dto.enrollments) {
          records.push(
            await transaction.trainingEnrollment.create({
              data: {
                participantUserId,
                brandId: assignment.brandId,
                plannedWeekCount: assignment.plannedWeekCount,
                assignedByUserId: actor.id,
              },
              include: { brand: true },
            }),
          );
        }
        await transaction.authSecurityEvent.createMany({
          data: records.map((record) => ({
            eventType: AuthSecurityEventType.TRAINING_ENROLLMENT_CREATED,
            userId: actor.id,
            requestId: context.requestId,
            metadata: {
              participantUserId,
              enrollmentId: record.id,
              brandId: record.brandId,
              brandCode: record.brand.code,
              plannedWeekCount: record.plannedWeekCount,
            },
          })),
        });
        await transaction.authSecurityEvent.create({
          data: {
            eventType: AuthSecurityEventType.TRAINING_ENROLLMENT_BULK_CREATED,
            userId: actor.id,
            requestId: context.requestId,
            metadata: { participantUserId, enrollmentCount: records.length },
          },
        });
        return records;
      });
      await this.notifications.queueTrainingAssigned(
        participantUserId,
        created.map((record) => record.id),
        context.requestId,
      );
      return { items: created.map((record) => this.view(record)) };
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        throw new ConflictException(
          'A current training enrollment already exists for this Participant and Brand.',
        );
      }
      throw error;
    }
  }

  async list(query: EnrollmentListQueryDto, actor: SafeAuthenticatedUser) {
    const superAdministrator = await this.authorization.isSuperAdministrator(actor);
    const accessibleBrandIds = superAdministrator
      ? undefined
      : await this.brandAuthorization.listAccessibleBrandIds(actor);
    const filteredBrandIds =
      accessibleBrandIds === undefined
        ? undefined
        : query.brandId
          ? accessibleBrandIds.filter((brandId) => brandId === query.brandId)
          : accessibleBrandIds;
    const page = this.paginationValue(query.page, 1, 'page');
    const pageSize = this.paginationValue(query.pageSize, 25, 'pageSize');
    const where = {
      ...(filteredBrandIds !== undefined
        ? { brandId: { in: filteredBrandIds } }
        : query.brandId
          ? { brandId: query.brandId }
          : {}),
      ...(query.participantUserId ? { participantUserId: query.participantUserId } : {}),
      ...(query.status ? { status: query.status as EnrollmentStatus } : {}),
    };
    const [total, records] = await prisma.$transaction([
      prisma.trainingEnrollment.count({ where }),
      prisma.trainingEnrollment.findMany({
        where,
        include: { brand: true },
        orderBy: [{ assignedAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { page, pageSize, total, items: records.map((record) => this.view(record)) };
  }

  async listForParticipant(
    participantUserId: string,
    query: EnrollmentListQueryDto,
    actor: SafeAuthenticatedUser,
  ) {
    const superAdministrator = await this.authorization.isSuperAdministrator(actor);
    const accessibleBrandIds = superAdministrator
      ? undefined
      : await this.brandAuthorization.listAccessibleBrandIds(actor);
    const page = this.paginationValue(query.page, 1, 'page');
    const pageSize = this.paginationValue(query.pageSize, 25, 'pageSize');
    const where = {
      participantUserId,
      ...(accessibleBrandIds ? { brandId: { in: accessibleBrandIds } } : {}),
      ...(query.status ? { status: query.status as EnrollmentStatus } : {}),
    };
    const [total, records] = await prisma.$transaction([
      prisma.trainingEnrollment.count({ where }),
      prisma.trainingEnrollment.findMany({
        where,
        include: { brand: true },
        orderBy: [{ assignedAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { page, pageSize, total, items: records.map((record) => this.view(record)) };
  }

  async get(enrollmentId: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const enrollment = await this.findEnrollment(enrollmentId);
    if (enrollment.participantUserId === actor.id) {
      return this.view(enrollment);
    }
    await this.assertEnrollmentBrandScope(enrollment, actor, context);
    return this.view(enrollment);
  }

  async update(
    enrollmentId: string,
    dto: UpdateEnrollmentDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    this.validateWeekCount(dto.plannedWeekCount);
    const enrollment = await this.findEnrollment(enrollmentId);
    await this.assertEnrollmentBrandScope(enrollment, actor, context);
    if (enrollment.status !== EnrollmentStatus.NOT_STARTED) {
      throw new BadRequestException(
        'Planned Week count can only be changed before training starts.',
      );
    }
    const updated = await prisma.trainingEnrollment.update({
      where: { id: enrollment.id },
      data: { plannedWeekCount: dto.plannedWeekCount },
      include: { brand: true },
    });
    await this.record(
      AuthSecurityEventType.TRAINING_ENROLLMENT_WEEK_COUNT_UPDATED,
      actor,
      context,
      {
        participantUserId: enrollment.participantUserId,
        enrollmentId: enrollment.id,
        brandId: enrollment.brandId,
        brandCode: enrollment.brand.code,
        previousPlannedWeekCount: enrollment.plannedWeekCount,
        newPlannedWeekCount: updated.plannedWeekCount,
      },
    );
    return this.view(updated);
  }

  async cancel(enrollmentId: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const enrollment = await this.findEnrollment(enrollmentId);
    await this.assertEnrollmentBrandScope(enrollment, actor, context);
    if (enrollment.status !== EnrollmentStatus.NOT_STARTED) {
      throw new BadRequestException('Only not-started training enrollments can be cancelled.');
    }
    const cancelled = await prisma.trainingEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: EnrollmentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledByUserId: actor.id,
      },
      include: { brand: true },
    });
    await this.record(AuthSecurityEventType.TRAINING_ENROLLMENT_CANCELLED, actor, context, {
      participantUserId: enrollment.participantUserId,
      enrollmentId: enrollment.id,
      brandId: enrollment.brandId,
      brandCode: enrollment.brand.code,
    });
    return this.view(cancelled);
  }

  async bindCurriculumVersion(
    enrollmentId: string,
    dto: BindCurriculumVersionDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const enrollment = await this.findEnrollment(enrollmentId);
    await this.assertEnrollmentBrandScope(enrollment, actor, context);
    if (enrollment.status !== EnrollmentStatus.NOT_STARTED)
      throw new BadRequestException('Curriculum binding can only change before training starts.');
    const version = await prisma.curriculumVersion.findUnique({
      where: { id: dto.curriculumVersionId },
      include: { curriculum: true, weeks: true },
    });
    if (!version) throw new NotFoundException('Curriculum version not found.');
    await this.brandAuthorization.assertBrandAccess(actor, version.curriculum.brandId, context);
    if (version.status !== CurriculumVersionStatus.PUBLISHED)
      throw new BadRequestException('Only published curriculum versions can be bound.');
    if (version.curriculum.brandId !== enrollment.brandId)
      throw new BadRequestException('Curriculum version does not match the Enrollment Brand.');
    if (version.weeks.length !== enrollment.plannedWeekCount)
      throw new BadRequestException(
        'Curriculum Week count does not match the planned training duration.',
      );
    const changed = enrollment.curriculumVersionId !== null;
    const updated = await prisma.trainingEnrollment.update({
      where: { id: enrollmentId },
      data: { curriculumVersionId: version.id },
      include: { brand: true },
    });
    await this.record(
      changed
        ? AuthSecurityEventType.TRAINING_ENROLLMENT_CURRICULUM_CHANGED
        : AuthSecurityEventType.TRAINING_ENROLLMENT_CURRICULUM_BOUND,
      actor,
      context,
      { enrollmentId, curriculumVersionId: version.id, brandId: enrollment.brandId },
    );
    return this.view(updated);
  }

  async listSelf(query: EnrollmentListQueryDto, actor: SafeAuthenticatedUser) {
    const page = this.paginationValue(query.page, 1, 'page');
    const pageSize = this.paginationValue(query.pageSize, 25, 'pageSize');
    const where = {
      participantUserId: actor.id,
      ...(query.status ? { status: query.status as EnrollmentStatus } : {}),
    };
    const [total, records] = await prisma.$transaction([
      prisma.trainingEnrollment.count({ where }),
      prisma.trainingEnrollment.findMany({
        where,
        include: { brand: true },
        orderBy: [{ assignedAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      page,
      pageSize,
      total,
      items: records.map((record) => this.selfView(record)),
    };
  }

  private async assertParticipantCreationScope(
    participantUserId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ): Promise<void> {
    const participant = await prisma.user.findFirst({
      where: {
        id: participantUserId,
        status: { in: [UserStatus.INVITED, UserStatus.ACTIVE] },
        staffProfile: { isNot: null },
        userRoles: { some: { role: { code: SystemRoleCode.Trainee, isActive: true } } },
      },
      include: { staffProfile: true },
    });
    if (!participant || !participant.staffProfile) {
      throw new BadRequestException(
        'Target must be an invited or active Participant with a staff profile.',
      );
    }
    if (await this.authorization.isSuperAdministrator(actor)) {
      return;
    }
    if (participant.staffProfile.createdByUserId === actor.id) {
      return;
    }
    await this.recordDenial(actor, context, { participantUserId, reason: 'participant_scope' });
    throw new ForbiddenException('Access denied.');
  }

  private async assertEnrollmentBrandScope(
    enrollment: Awaited<ReturnType<EnrollmentService['findEnrollment']>>,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ): Promise<void> {
    try {
      await this.brandAuthorization.assertBrandAccess(actor, enrollment.brandId, context);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        await this.recordDenial(actor, context, {
          participantUserId: enrollment.participantUserId,
          enrollmentId: enrollment.id,
          brandId: enrollment.brandId,
          reason: 'brand_scope',
        });
      }
      throw error;
    }
  }

  private async findEnrollment(enrollmentId: string) {
    const enrollment = await prisma.trainingEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { brand: true },
    });
    if (!enrollment) {
      throw new NotFoundException('Training enrollment not found.');
    }
    return enrollment;
  }

  private validateAssignments(assignments: EnrollmentAssignmentDto[]): void {
    if (!Array.isArray(assignments) || assignments.length === 0) {
      throw new BadRequestException('At least one Brand enrollment is required.');
    }
    if (new Set(assignments.map((assignment) => assignment.brandId)).size !== assignments.length) {
      throw new BadRequestException('Each Brand may be selected only once per enrollment request.');
    }
    for (const assignment of assignments) {
      this.validateWeekCount(assignment.plannedWeekCount);
    }
  }

  private validateWeekCount(value: unknown): asserts value is number {
    const maximum = loadApiEnvironment().TRAINING_MAX_PLANNED_WEEKS;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > maximum) {
      throw new BadRequestException(
        `plannedWeekCount must be a positive integer up to ${maximum}.`,
      );
    }
  }

  private view(record: {
    id: string;
    participantUserId: string;
    curriculumVersionId: string | null;
    plannedWeekCount: number;
    status: EnrollmentStatus;
    assignedAt: Date;
    updatedAt: Date;
    cancelledAt: Date | null;
    brand: { id: string; code: string; name: string; status: BrandStatus };
  }) {
    return {
      id: record.id,
      participantUserId: record.participantUserId,
      curriculumVersionId: record.curriculumVersionId,
      brand: {
        id: record.brand.id,
        code: record.brand.code,
        name: record.brand.name,
        status: record.brand.status,
      },
      plannedWeekCount: record.plannedWeekCount,
      status: record.status,
      assignedAt: record.assignedAt,
      updatedAt: record.updatedAt,
      cancelledAt: record.cancelledAt,
    };
  }

  private selfView(record: Parameters<EnrollmentService['view']>[0]) {
    const view = this.view(record);
    return {
      enrollmentId: view.id,
      brand: view.brand,
      plannedWeekCount: view.plannedWeekCount,
      status: view.status,
      assignedAt: view.assignedAt,
    };
  }

  private paginationValue(value: unknown, fallback: number, field: string): number {
    if (value === undefined) return fallback;
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      throw new BadRequestException(`${field} is invalid.`);
    }
    return parsed;
  }

  private async record(
    eventType: AuthSecurityEventType,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
    metadata: Record<string, string | number>,
  ) {
    await this.securityEvents.record(eventType, context, actor.id, metadata);
  }

  private async recordDenial(
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
    metadata: Record<string, string>,
  ) {
    await this.securityEvents.record(
      AuthSecurityEventType.TRAINING_ENROLLMENT_ACCESS_DENIED,
      context,
      actor.id,
      metadata,
    );
  }

  private isUniqueConstraint(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
