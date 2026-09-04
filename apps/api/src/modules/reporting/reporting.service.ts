import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { loadApiEnvironment } from '@unicom/config';
import { AuthSecurityEventType, EnrollmentStatus, prisma, SystemRoleCode } from '@unicom/database';
import type { Prisma } from '@unicom/database';
import type { AuthRequestContext, SafeAuthenticatedUser } from '../auth/auth.types.js';
import { AuthSecurityEventService } from '../auth/auth-security-event.service.js';
import { AuthorizationService } from '../auth/authorization.service.js';
import { BrandAuthorizationService } from '../brands/brand-authorization.service.js';
import { TrainingProgressService } from '../training-progress/training-progress.service.js';
import type { ParticipantReportQueryDto } from './dto/participant-report-query.dto.js';
import {
  participantExportFilename,
  type ParticipantExportRow,
  ReportingExportService,
} from './reporting-export.service.js';

const eligibleCompletionStatuses: EnrollmentStatus[] = [
  EnrollmentStatus.NOT_STARTED,
  EnrollmentStatus.IN_PROGRESS,
  EnrollmentStatus.COMPLETED,
  EnrollmentStatus.FAILED,
  EnrollmentStatus.SUSPENDED,
];

type ReportRow = ParticipantExportRow & {
  participantUserId: string;
  enrollmentId: string;
  brandId: string;
  curriculumVersionId: string | null;
  inProgressMaterialCount: number;
  notStartedMaterialCount: number;
  latestExamScoreBasisPoints: number | null;
  bestExamScoreBasisPoints: number | null;
  submittedAttemptCount: number;
  weeks: unknown[];
};

@Injectable()
export class ReportingService {
  private readonly environment = loadApiEnvironment();

  constructor(
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(BrandAuthorizationService) private readonly brands: BrandAuthorizationService,
    @Inject(TrainingProgressService) private readonly progress: TrainingProgressService,
    @Inject(ReportingExportService) private readonly exportService: ReportingExportService,
    @Inject(AuthSecurityEventService) private readonly audit: AuthSecurityEventService,
  ) {}

  async participants(
    query: ParticipantReportQueryDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const scoped = await this.scope(query.brandId, actor, context);
    this.validateDates(query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const hasComputedFilter =
      query.minProgressBasisPoints !== undefined ||
      query.maxProgressBasisPoints !== undefined ||
      query.sort === 'overallProgress';
    const records = await prisma.trainingEnrollment.findMany({
      where: this.where(query, scoped.brandIds),
      include: reportInclude,
      orderBy: this.order(query),
      ...(hasComputedFilter
        ? { take: this.environment.REPORT_EXPORT_MAX_ROWS + 1 }
        : { skip: (page - 1) * pageSize, take: pageSize }),
    });
    if (hasComputedFilter && records.length > this.environment.REPORT_EXPORT_MAX_ROWS)
      throw new BadRequestException(
        'Progress-filtered report exceeds the safe reporting limit. Narrow the filters.',
      );
    const rows = (await Promise.all(records.map((record) => this.row(record))))
      .filter((row) => this.matchesProgress(row, query))
      .sort((left, right) => this.sortRows(left, right, query));
    const total = hasComputedFilter
      ? rows.length
      : await prisma.trainingEnrollment.count({ where: this.where(query, scoped.brandIds) });
    const paged = hasComputedFilter ? rows.slice((page - 1) * pageSize, page * pageSize) : rows;
    return { page, pageSize, total, progressPolicy: 'REQUIREMENT_UNIT_V1', items: paged };
  }

  async filterOptions(actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const scoped = await this.scope(undefined, actor, context);
    const brands = await prisma.brand.findMany({
      where: scoped.brandIds ? { id: { in: scoped.brandIds } } : {},
      select: { id: true, code: true, name: true, status: true },
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
    return { brands };
  }

  async enrollmentDetail(
    participantUserId: string,
    enrollmentId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const record = await prisma.trainingEnrollment.findUnique({
      where: { id: enrollmentId },
      include: reportInclude,
    });
    if (!record || record.participantUserId !== participantUserId)
      throw new NotFoundException('Training enrollment not found.');
    await this.scope(record.brandId, actor, context);
    const row = await this.row(record);
    return { ...row, weekSummary: row.weeks };
  }

  async brandSummary(
    query: ParticipantReportQueryDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const result = await this.participants(
      { ...query, page: 1, pageSize: this.environment.REPORT_EXPORT_MAX_ROWS },
      actor,
      context,
    );
    const summaries = new Map<string, ReportRow[]>();
    for (const row of result.items)
      summaries.set(row.brandId, [...(summaries.get(row.brandId) ?? []), row]);
    return {
      progressPolicy: 'REQUIREMENT_UNIT_V1',
      items: [...summaries.values()].map((rows) => this.brandMetrics(rows)),
    };
  }

  async dashboard(
    kind: 'admin' | 'trainer',
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const superAdmin = await this.brands.isSuperAdministrator(actor);
    if ((kind === 'admin') !== superAdmin) throw new ForbiddenException('Access denied.');
    const result = await this.participants(
      { page: 1, pageSize: this.environment.REPORT_EXPORT_MAX_ROWS },
      actor,
      context,
    );
    const rows = result.items;
    const activeStatuses: EnrollmentStatus[] = [
      EnrollmentStatus.NOT_STARTED,
      EnrollmentStatus.IN_PROGRESS,
      EnrollmentStatus.SUSPENDED,
    ];
    const active = rows.filter((row) =>
      activeStatuses.includes(row.enrollmentStatus as EnrollmentStatus),
    );
    return {
      scope: kind === 'admin' ? 'GLOBAL' : 'TRAINER_BRAND_SCOPED',
      progressPolicy: 'REQUIREMENT_UNIT_V1',
      totalActiveParticipants: new Set(active.map((row) => row.participantUserId)).size,
      activeEnrollments: active.length,
      completedEnrollments: rows.filter(
        (row) => row.enrollmentStatus === EnrollmentStatus.COMPLETED,
      ).length,
      failedEnrollments: rows.filter((row) => row.enrollmentStatus === EnrollmentStatus.FAILED)
        .length,
      averageOverallProgressBasisPoints: this.average(
        rows.map((row) => row.overallProgressBasisPoints),
      ),
      brands: this.groupBrands(rows),
      recentCompletions: rows
        .filter((row) => row.completedAt)
        .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
        .slice(0, 10),
      requiresAttention: rows
        .filter(
          (row) =>
            row.enrollmentStatus === EnrollmentStatus.FAILED ||
            (row.enrollmentStatus === EnrollmentStatus.NOT_STARTED && row.startedAt !== null) ||
            (row.startedAt && row.overallProgressBasisPoints < 2_500),
        )
        .slice(0, 20),
    };
  }

  async exportParticipants(
    query: ParticipantReportQueryDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const scoped = await this.scope(query.brandId, actor, context);
    this.validateDates(query);
    const records = await prisma.trainingEnrollment.findMany({
      where: this.where(query, scoped.brandIds),
      include: reportInclude,
      orderBy: this.order(query),
      take: this.environment.REPORT_EXPORT_MAX_ROWS + 1,
    });
    if (records.length > this.environment.REPORT_EXPORT_MAX_ROWS)
      throw new BadRequestException(
        `Export exceeds the ${this.environment.REPORT_EXPORT_MAX_ROWS}-row safety limit. Narrow the filters.`,
      );
    try {
      const rows = (await Promise.all(records.map((record) => this.row(record))))
        .filter((row) => this.matchesProgress(row, query))
        .sort((left, right) => this.sortRows(left, right, query));
      const buffer = await this.exportService.workbook(rows, {
        requestedBy: actor.email,
        filters: this.safeFilters(query),
      });
      await this.audit.record(AuthSecurityEventType.REPORT_EXPORT_REQUESTED, context, actor.id, {
        reportType: 'participants',
        rowCount: rows.length,
        brandFilter: query.brandId ?? 'ALL',
      });
      await this.audit.record(AuthSecurityEventType.REPORT_EXPORT_COMPLETED, context, actor.id, {
        reportType: 'participants',
        rowCount: rows.length,
        brandFilter: query.brandId ?? 'ALL',
      });
      return { buffer, filename: participantExportFilename(), rowCount: rows.length };
    } catch (error) {
      await this.audit.record(AuthSecurityEventType.REPORT_EXPORT_FAILED, context, actor.id, {
        reportType: 'participants',
        brandFilter: query.brandId ?? 'ALL',
      });
      throw error;
    }
  }

  async recordDownload(
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
    rowCount: number,
  ) {
    await this.audit.record(AuthSecurityEventType.REPORT_EXPORT_DOWNLOADED, context, actor.id, {
      reportType: 'participants',
      rowCount,
    });
  }

  private async scope(
    requestedBrandId: string | undefined,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    if (await this.brands.isSuperAdministrator(actor))
      return { brandIds: undefined as string[] | undefined };
    const authorization = await this.authorization.getUserAuthorizationContext(actor);
    if (!authorization.roles.some((role) => role.code === SystemRoleCode.Trainer))
      throw new ForbiddenException('Access denied.');
    if (requestedBrandId) await this.brands.assertBrandAccess(actor, requestedBrandId, context);
    return {
      brandIds: requestedBrandId
        ? [requestedBrandId]
        : await this.brands.listAccessibleBrandIds(actor),
    };
  }

  private where(
    query: ParticipantReportQueryDto,
    brandIds: string[] | undefined,
  ): Prisma.TrainingEnrollmentWhereInput {
    const search = query.search?.trim();
    const phone = search?.replace(/\D/g, '');
    const searchClauses: Prisma.UserWhereInput[] = search
      ? [
          { email: { contains: search, mode: 'insensitive' } },
          { staffProfile: { fullName: { contains: search, mode: 'insensitive' } } },
          ...(phone ? [{ staffProfile: { normalizedPhone: { contains: phone } } }] : []),
        ]
      : [];
    return {
      ...(brandIds
        ? { brandId: { in: brandIds } }
        : query.brandId
          ? { brandId: query.brandId }
          : {}),
      ...(query.curriculumVersionId ? { curriculumVersionId: query.curriculumVersionId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.startedFrom || query.startedTo
        ? {
            startedAt: {
              ...(query.startedFrom ? { gte: new Date(query.startedFrom) } : {}),
              ...(query.startedTo ? { lte: this.endOfDay(query.startedTo) } : {}),
            },
          }
        : {}),
      ...(query.completedFrom || query.completedTo
        ? {
            completedAt: {
              ...(query.completedFrom ? { gte: new Date(query.completedFrom) } : {}),
              ...(query.completedTo ? { lte: this.endOfDay(query.completedTo) } : {}),
            },
          }
        : {}),
      ...(search ? { participant: { OR: searchClauses } } : {}),
    };
  }

  private order(
    query: ParticipantReportQueryDto,
  ): Prisma.TrainingEnrollmentOrderByWithRelationInput[] {
    const direction = query.direction ?? 'desc';
    switch (query.sort) {
      case 'fullName':
        return [{ participant: { staffProfile: { fullName: direction } } }, { id: 'asc' }];
      case 'brand':
        return [{ brand: { name: direction } }, { id: 'asc' }];
      case 'status':
        return [{ status: direction }, { id: 'asc' }];
      case 'startedAt':
        return [{ startedAt: direction }, { id: 'asc' }];
      case 'completedAt':
        return [{ completedAt: direction }, { id: 'asc' }];
      default:
        return [{ assignedAt: direction }, { id: 'asc' }];
    }
  }

  private async row(
    record: Prisma.TrainingEnrollmentGetPayload<{ include: typeof reportInclude }>,
  ): Promise<ReportRow> {
    const progress = await this.progress.calculateEnrollmentProgress(record.id);
    const [materialCounts, attempts, latestMaterial] = await Promise.all([
      prisma.learningMaterialProgress.groupBy({
        by: ['status'],
        where: { enrollmentId: record.id },
        _count: { _all: true },
      }),
      prisma.examAttempt.findMany({
        where: { enrollmentId: record.id, status: 'SUBMITTED' },
        select: { scoreBasisPoints: true, submittedAt: true, startedAt: true },
      }),
      prisma.learningMaterialProgress.findFirst({
        where: { enrollmentId: record.id },
        orderBy: { lastActivityAt: 'desc' },
        select: { lastActivityAt: true },
      }),
    ]);
    const count = new Map(materialCounts.map((item) => [item.status, item._count._all]));
    const scores = attempts
      .map((attempt) => attempt.scoreBasisPoints)
      .filter((score): score is number => score !== null);
    const activity =
      [
        latestMaterial?.lastActivityAt,
        ...attempts.flatMap((attempt) => [attempt.startedAt, attempt.submittedAt]),
      ]
        .filter((date): date is Date => date !== null)
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    return {
      participantUserId: record.participantUserId,
      enrollmentId: record.id,
      brandId: record.brandId,
      curriculumVersionId: record.curriculumVersionId,
      fullName: record.participant.staffProfile?.fullName ?? record.participant.email,
      email: record.participant.email,
      phoneNumber: record.participant.staffProfile?.phoneNumber ?? '',
      maskedNik: this.maskedNik(record.participant.staffProfile),
      brandCode: record.brand.code,
      brandName: record.brand.name,
      enrollmentStatus: record.status,
      curriculumVersion: record.curriculumVersion
        ? `${record.curriculumVersion.curriculum.code} v${record.curriculumVersion.versionNumber}`
        : null,
      plannedWeekCount: record.plannedWeekCount,
      overallProgressBasisPoints: progress.overallProgressBasisPoints,
      materialProgressBasisPoints: progress.courseProgressBasisPoints,
      examProgressBasisPoints: progress.examProgressBasisPoints,
      completedMaterialCount: progress.completedMaterialCount,
      requiredMaterialCount: progress.requiredMaterialCount,
      passedExamCount: progress.passedExamCount,
      requiredExamCount: progress.requiredExamCount,
      inProgressMaterialCount: count.get('IN_PROGRESS') ?? 0,
      notStartedMaterialCount: Math.max(
        0,
        progress.requiredMaterialCount -
          progress.completedMaterialCount -
          (count.get('IN_PROGRESS') ?? 0),
      ),
      latestExamScoreBasisPoints: scores.at(0) ?? null,
      bestExamScoreBasisPoints: scores.length ? Math.max(...scores) : null,
      submittedAttemptCount: attempts.length,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      latestActivityAt: activity,
      weeks: progress.weeks,
    };
  }

  private groupBrands(rows: ReportRow[]) {
    const grouped = new Map<string, ReportRow[]>();
    for (const row of rows) grouped.set(row.brandId, [...(grouped.get(row.brandId) ?? []), row]);
    return [...grouped.values()].map((items) => this.brandMetrics(items));
  }
  private brandMetrics(rows: ReportRow[]) {
    const first = rows[0]!;
    const eligible = rows.filter((row) =>
      eligibleCompletionStatuses.includes(row.enrollmentStatus as EnrollmentStatus),
    );
    return {
      brandId: first.brandId,
      brandCode: first.brandCode,
      brandName: first.brandName,
      totalEnrollments: rows.length,
      notStarted: rows.filter((row) => row.enrollmentStatus === EnrollmentStatus.NOT_STARTED)
        .length,
      inProgress: rows.filter((row) => row.enrollmentStatus === EnrollmentStatus.IN_PROGRESS)
        .length,
      completed: rows.filter((row) => row.enrollmentStatus === EnrollmentStatus.COMPLETED).length,
      failed: rows.filter((row) => row.enrollmentStatus === EnrollmentStatus.FAILED).length,
      cancelled: rows.filter((row) => row.enrollmentStatus === EnrollmentStatus.CANCELLED).length,
      suspended: rows.filter((row) => row.enrollmentStatus === EnrollmentStatus.SUSPENDED).length,
      activeParticipantCount: new Set(
        rows
          .filter((row) =>
            (
              [
                EnrollmentStatus.NOT_STARTED,
                EnrollmentStatus.IN_PROGRESS,
                EnrollmentStatus.SUSPENDED,
              ] as EnrollmentStatus[]
            ).includes(row.enrollmentStatus as EnrollmentStatus),
          )
          .map((row) => row.participantUserId),
      ).size,
      averageOverallProgressBasisPoints: this.average(
        rows.map((row) => row.overallProgressBasisPoints),
      ),
      averageMaterialProgressBasisPoints: this.average(
        rows.map((row) => row.materialProgressBasisPoints),
      ),
      examPassCompletionRateBasisPoints: eligible.length
        ? Math.floor(
            (rows.filter(
              (row) => row.requiredExamCount === 0 || row.passedExamCount === row.requiredExamCount,
            ).length *
              10_000) /
              eligible.length,
          )
        : 0,
      completionRateBasisPoints: eligible.length
        ? Math.floor(
            (rows.filter((row) => row.enrollmentStatus === EnrollmentStatus.COMPLETED).length *
              10_000) /
              eligible.length,
          )
        : 0,
    };
  }
  private average(values: number[]) {
    return values.length
      ? Math.floor(values.reduce((sum, value) => sum + value, 0) / values.length)
      : 0;
  }
  private maskedNik(profile: { nikFirst4: string; nikLast4: string } | null) {
    return profile ? `${profile.nikFirst4}********${profile.nikLast4}` : '';
  }
  private matchesProgress(row: ReportRow, query: ParticipantReportQueryDto) {
    return (
      (query.minProgressBasisPoints === undefined ||
        row.overallProgressBasisPoints >= query.minProgressBasisPoints) &&
      (query.maxProgressBasisPoints === undefined ||
        row.overallProgressBasisPoints <= query.maxProgressBasisPoints)
    );
  }
  private sortRows(left: ReportRow, right: ReportRow, query: ParticipantReportQueryDto) {
    if (query.sort !== 'overallProgress') return 0;
    return (
      (query.direction === 'asc' ? 1 : -1) *
      (left.overallProgressBasisPoints - right.overallProgressBasisPoints)
    );
  }
  private validateDates(query: ParticipantReportQueryDto) {
    if (
      query.startedFrom &&
      query.startedTo &&
      new Date(query.startedFrom) > new Date(query.startedTo)
    )
      throw new BadRequestException('startedFrom must not be after startedTo.');
    if (
      query.completedFrom &&
      query.completedTo &&
      new Date(query.completedFrom) > new Date(query.completedTo)
    )
      throw new BadRequestException('completedFrom must not be after completedTo.');
  }
  private endOfDay(value: string) {
    const date = new Date(value);
    date.setUTCHours(23, 59, 59, 999);
    return date;
  }
  private safeFilters(query: ParticipantReportQueryDto) {
    return JSON.stringify({
      brandId: query.brandId ?? null,
      curriculumVersionId: query.curriculumVersionId ?? null,
      status: query.status ?? null,
      startedFrom: query.startedFrom ?? null,
      startedTo: query.startedTo ?? null,
      completedFrom: query.completedFrom ?? null,
      completedTo: query.completedTo ?? null,
      minProgressBasisPoints: query.minProgressBasisPoints ?? null,
      maxProgressBasisPoints: query.maxProgressBasisPoints ?? null,
    });
  }
}

const reportInclude = {
  brand: { select: { id: true, code: true, name: true } },
  participant: {
    select: {
      email: true,
      staffProfile: {
        select: {
          fullName: true,
          phoneNumber: true,
          normalizedPhone: true,
          nikFirst4: true,
          nikLast4: true,
        },
      },
    },
  },
  curriculumVersion: { select: { versionNumber: true, curriculum: { select: { code: true } } } },
} satisfies Prisma.TrainingEnrollmentInclude;
