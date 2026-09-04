import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthSecurityEventType, prisma, SystemRoleCode, UserStatus } from '@unicom/database';
import { isEmail } from 'class-validator';
import { normalizeEmail } from '../auth/auth.crypto.js';
import { AuthSecurityEventService } from '../auth/auth-security-event.service.js';
import { AuthorizationService } from '../auth/authorization.service.js';
import { BrandAuthorizationService } from '../brands/brand-authorization.service.js';
import type { AuthRequestContext, SafeAuthenticatedUser } from '../auth/auth.types.js';
import { NotificationService } from '../notifications/notification.service.js';
import type { CreateStaffDto } from './dto/create-staff.dto.js';
import type { StaffListQueryDto } from './dto/staff-list-query.dto.js';
import type { UpdateStaffProfileDto } from './dto/update-staff-profile.dto.js';
import {
  maskNik,
  normalizeFullName,
  normalizeNik,
  normalizePhoneNumber,
  StaffProfileCrypto,
} from './staff-profile.crypto.js';

const staffRole = {
  participant: SystemRoleCode.Trainee,
  trainer: SystemRoleCode.Trainer,
} as const;

type StaffKind = keyof typeof staffRole;

@Injectable()
export class StaffProvisioningService {
  private readonly crypto = new StaffProfileCrypto();

  constructor(
    @Inject(AuthSecurityEventService) private readonly securityEvents: AuthSecurityEventService,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(BrandAuthorizationService)
    private readonly brandAuthorization: BrandAuthorizationService,
    @Inject(NotificationService) private readonly notifications: NotificationService,
  ) {}

  async create(
    kind: StaffKind,
    dto: CreateStaffDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const identity = this.normalizeIdentity(dto);
    try {
      const staff = await prisma.$transaction(async (transaction) => {
        const role = await transaction.role.findUniqueOrThrow({
          where: { code: staffRole[kind] },
          select: { id: true },
        });
        const user = await transaction.user.create({
          data: {
            email: identity.email,
            normalizedEmail: identity.normalizedEmail,
            status: UserStatus.INVITED,
          },
        });
        const profile = await transaction.staffProfile.create({
          data: {
            userId: user.id,
            fullName: identity.fullName,
            phoneNumber: identity.phoneNumber,
            normalizedPhone: identity.phoneNumber,
            encryptedNik: identity.encryptedNik,
            nikFingerprint: identity.nikFingerprint,
            nikFirst4: identity.nik.slice(0, 4),
            nikLast4: identity.nik.slice(-4),
            createdByUserId: actor.id,
          },
        });
        await transaction.userRole.create({ data: { userId: user.id, roleId: role.id } });
        await transaction.authSecurityEvent.create({
          data: {
            eventType:
              kind === 'participant'
                ? AuthSecurityEventType.PARTICIPANT_CREATED
                : AuthSecurityEventType.TRAINER_CREATED,
            userId: actor.id,
            requestId: context.requestId,
            metadata: { targetUserId: user.id, role: staffRole[kind] },
          },
        });
        return { user, profile };
      });
      const delivery = await this.notifications.queueInvitation(
        staff.user.id,
        kind,
        context.requestId,
      );
      return { [kind]: this.staffView(staff.user, staff.profile), invitation: delivery };
    } catch (error) {
      if (this.isUniqueConstraint(error, 'normalizedEmail')) {
        throw new ConflictException('Email is already registered.');
      }
      if (this.isUniqueConstraint(error, 'nikFingerprint')) {
        throw new ConflictException('NIK is already registered.');
      }
      throw error;
    }
  }

  async list(kind: StaffKind, query: StaffListQueryDto, actor: SafeAuthenticatedUser) {
    const superAdministrator = await this.authorization.isSuperAdministrator(actor);
    const page = this.paginationValue(query.page, 1, 'page');
    const pageSize = this.paginationValue(query.pageSize, 25, 'pageSize');
    const search = query.search?.trim();
    const scopeWhere =
      kind === 'participant' && !superAdministrator
        ? {
            OR: [
              { staffProfile: { is: { createdByUserId: actor.id } } },
              {
                participantEnrollments: {
                  some: {
                    status: { not: 'CANCELLED' as const },
                    brandId: { in: await this.brandAuthorization.listAccessibleBrandIds(actor) },
                  },
                },
              },
            ],
          }
        : undefined;
    const searchWhere = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            {
              staffProfile: {
                is: { fullName: { contains: search, mode: 'insensitive' as const } },
              },
            },
            {
              staffProfile: {
                is: {
                  normalizedPhone: {
                    contains: search.replace(/[\s().-]/g, ''),
                    mode: 'insensitive' as const,
                  },
                },
              },
            },
          ],
        }
      : undefined;
    const conditions = [scopeWhere, searchWhere].filter(
      (condition): condition is NonNullable<typeof condition> => condition !== undefined,
    );
    const where = {
      userRoles: { some: { role: { code: staffRole[kind], isActive: true } } },
      ...(query.status ? { status: query.status } : {}),
      ...(conditions.length > 0 ? { AND: conditions } : {}),
    };
    const [total, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: { staffProfile: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      page,
      pageSize,
      total,
      items: users.flatMap((user) =>
        user.staffProfile ? [this.staffView(user, user.staffProfile)] : [],
      ),
    };
  }

  async get(
    kind: StaffKind,
    userId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const staff = await this.findStaff(kind, userId);
    await this.assertReadScope(kind, staff.profile.createdByUserId, actor, context, userId);
    return this.staffView(staff.user, staff.profile);
  }

  async update(
    kind: StaffKind,
    userId: string,
    dto: UpdateStaffProfileDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const staff = await this.findStaff(kind, userId);
    await this.assertManageScope(kind, staff.profile.createdByUserId, actor, context, userId);
    const fullName = dto.fullName === undefined ? undefined : this.safeFullName(dto.fullName);
    const phoneNumber =
      dto.phoneNumber === undefined ? undefined : this.safePhoneNumber(dto.phoneNumber);
    if (fullName === undefined && phoneNumber === undefined) {
      throw new BadRequestException('At least one mutable profile field is required.');
    }
    const profile = await prisma.staffProfile.update({
      where: { userId },
      data: {
        ...(fullName !== undefined ? { fullName } : {}),
        ...(phoneNumber !== undefined ? { phoneNumber, normalizedPhone: phoneNumber } : {}),
      },
    });
    await this.record(
      kind === 'participant'
        ? AuthSecurityEventType.PARTICIPANT_UPDATED
        : AuthSecurityEventType.TRAINER_UPDATED,
      actor,
      context,
      {
        targetUserId: userId,
        changedFields: [
          fullName !== undefined ? 'fullName' : '',
          phoneNumber !== undefined ? 'phoneNumber' : '',
        ]
          .filter(Boolean)
          .join(','),
      },
    );
    return this.staffView(staff.user, profile);
  }

  async disable(
    kind: StaffKind,
    userId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const staff = await this.findStaff(kind, userId);
    await this.assertManageScope(kind, staff.profile.createdByUserId, actor, context, userId);
    if (staff.user.status === UserStatus.DISABLED) {
      return this.staffView(staff.user, staff.profile);
    }
    const user = await prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(9130043)`;
      const superRole = await transaction.role.findUniqueOrThrow({
        where: { code: SystemRoleCode.SuperAdministrator },
        select: { id: true },
      });
      const targetIsSuperAdministrator = await transaction.userRole.findUnique({
        where: { userId_roleId: { userId, roleId: superRole.id } },
        select: { id: true },
      });
      if (targetIsSuperAdministrator && staff.user.status === UserStatus.ACTIVE) {
        const activeSuperAdministrators = await transaction.userRole.count({
          where: {
            roleId: superRole.id,
            user: { status: UserStatus.ACTIVE },
          },
        });
        if (activeSuperAdministrators <= 1) {
          throw new BadRequestException('The last active Super Administrator cannot be disabled.');
        }
      }
      const updated = await transaction.user.update({
        where: { id: userId },
        data: { status: UserStatus.DISABLED },
      });
      await transaction.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return updated;
    });
    await this.record(
      kind === 'participant'
        ? AuthSecurityEventType.PARTICIPANT_DISABLED
        : AuthSecurityEventType.TRAINER_DISABLED,
      actor,
      context,
      { targetUserId: userId },
    );
    return this.staffView(user, staff.profile);
  }

  async reactivate(
    kind: StaffKind,
    userId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const staff = await this.findStaff(kind, userId);
    await this.assertManageScope(kind, staff.profile.createdByUserId, actor, context, userId);
    if (staff.user.status !== UserStatus.DISABLED) {
      throw new BadRequestException('Only disabled accounts can be reactivated.');
    }
    const status = staff.user.passwordHash ? UserStatus.ACTIVE : UserStatus.INVITED;
    const user = await prisma.user.update({ where: { id: userId }, data: { status } });
    await this.record(
      kind === 'participant'
        ? AuthSecurityEventType.PARTICIPANT_REACTIVATED
        : AuthSecurityEventType.TRAINER_REACTIVATED,
      actor,
      context,
      { targetUserId: userId },
    );
    return this.staffView(user, staff.profile);
  }

  async reissueInvitation(
    kind: StaffKind,
    userId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const staff = await this.findStaff(kind, userId);
    await this.assertManageScope(kind, staff.profile.createdByUserId, actor, context, userId);
    if (staff.user.status !== UserStatus.INVITED) {
      throw new BadRequestException(
        'Only invited accounts can receive a new activation invitation.',
      );
    }
    const delivery = await this.notifications.queueInvitation(userId, kind, context.requestId);
    await this.record(
      kind === 'participant'
        ? AuthSecurityEventType.PARTICIPANT_INVITATION_REISSUED
        : AuthSecurityEventType.TRAINER_INVITATION_REISSUED,
      actor,
      context,
      { targetUserId: userId, role: staffRole[kind], deliveryId: delivery.id },
    );
    return { invitation: delivery };
  }

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { staffProfile: true },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user.staffProfile
      ? this.staffView(user, user.staffProfile)
      : {
          id: user.id,
          email: user.email,
          fullName: null,
          phoneNumber: null,
          maskedNik: null,
          status: user.status,
        };
  }

  private normalizeIdentity(dto: CreateStaffDto) {
    const nik = this.safeNik(dto.nik);
    const email = typeof dto.email === 'string' ? dto.email.trim() : '';
    const normalizedEmail = normalizeEmail(email);
    if (!isEmail(normalizedEmail)) {
      throw new BadRequestException('A valid email is required.');
    }
    return {
      nik,
      email,
      normalizedEmail,
      fullName: this.safeFullName(dto.fullName),
      phoneNumber: this.safePhoneNumber(dto.phoneNumber),
      encryptedNik: this.crypto.encryptNik(nik),
      nikFingerprint: this.crypto.fingerprintNik(nik),
    };
  }

  private async findStaff(kind: StaffKind, userId: string) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        userRoles: { some: { role: { code: staffRole[kind], isActive: true } } },
      },
      include: { staffProfile: true },
    });
    if (!user || !user.staffProfile) {
      throw new NotFoundException(
        `${kind === 'participant' ? 'Participant' : 'Trainer'} not found.`,
      );
    }
    return { user, profile: user.staffProfile };
  }

  private async assertManageScope(
    kind: StaffKind,
    createdByUserId: string | null,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
    targetUserId: string,
  ): Promise<void> {
    if (await this.authorization.isSuperAdministrator(actor)) {
      return;
    }
    if (kind === 'participant' && createdByUserId === actor.id) {
      return;
    }
    await this.record(AuthSecurityEventType.STAFF_PROFILE_ACCESS_DENIED, actor, context, {
      targetUserId,
      staffType: kind,
    });
    throw new ForbiddenException('Access denied.');
  }

  private async assertReadScope(
    kind: StaffKind,
    createdByUserId: string | null,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
    targetUserId: string,
  ): Promise<void> {
    if (await this.authorization.isSuperAdministrator(actor)) return;
    if (kind !== 'participant') {
      await this.record(AuthSecurityEventType.STAFF_PROFILE_ACCESS_DENIED, actor, context, {
        targetUserId,
        staffType: kind,
      });
      throw new ForbiddenException('Access denied.');
    }
    if (createdByUserId === actor.id) return;
    const accessibleBrandIds = await this.brandAuthorization.listAccessibleBrandIds(actor);
    const visibleThroughEnrollment =
      accessibleBrandIds.length > 0 &&
      (await prisma.trainingEnrollment.count({
        where: {
          participantUserId: targetUserId,
          brandId: { in: accessibleBrandIds },
          status: { not: 'CANCELLED' },
        },
      })) > 0;
    if (visibleThroughEnrollment) return;
    await this.record(AuthSecurityEventType.STAFF_PROFILE_ACCESS_DENIED, actor, context, {
      targetUserId,
      staffType: kind,
    });
    throw new ForbiddenException('Access denied.');
  }

  private staffView(
    user: { id: string; email: string; status: UserStatus; createdAt?: Date },
    profile: {
      fullName: string;
      phoneNumber: string;
      nikFirst4: string;
      nikLast4: string;
      createdAt?: Date;
    },
  ) {
    return {
      id: user.id,
      fullName: profile.fullName,
      email: user.email,
      phoneNumber: profile.phoneNumber,
      maskedNik: maskNik(profile.nikFirst4, profile.nikLast4),
      status: user.status,
      ...(user.createdAt ? { createdAt: user.createdAt } : {}),
    };
  }

  private safeNik(value: unknown): string {
    try {
      return normalizeNik(value);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'NIK is invalid.');
    }
  }

  private paginationValue(value: unknown, fallback: number, field: string): number {
    if (value === undefined) {
      return fallback;
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      throw new BadRequestException(`${field} is invalid.`);
    }
    return parsed;
  }

  private safeFullName(value: unknown): string {
    try {
      return normalizeFullName(value);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Full name is invalid.',
      );
    }
  }

  private safePhoneNumber(value: unknown): string {
    try {
      return normalizePhoneNumber(value);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Phone number is invalid.',
      );
    }
  }

  private async record(
    eventType: AuthSecurityEventType,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
    metadata: Record<string, string>,
  ): Promise<void> {
    await this.securityEvents.record(eventType, context, actor.id, metadata);
  }

  private isUniqueConstraint(error: unknown, target: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002' &&
      'meta' in error &&
      typeof error.meta === 'object' &&
      error.meta !== null &&
      'target' in error.meta &&
      Array.isArray(error.meta.target) &&
      error.meta.target.includes(target)
    );
  }
}
