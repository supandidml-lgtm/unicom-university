import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthSecurityEventType, BrandStatus, prisma, SystemRoleCode } from '@unicom/database';
import type { AuthRequestContext, SafeAuthenticatedUser } from '../auth/auth.types.js';
import { AuthSecurityEventService } from '../auth/auth-security-event.service.js';
import { BrandAuthorizationService } from './brand-authorization.service.js';
import type { AssignBrandAccessDto } from './dto/assign-brand-access.dto.js';
import type { BrandListQueryDto } from './dto/brand-list-query.dto.js';
import type { CreateBrandDto } from './dto/create-brand.dto.js';
import type { UpdateBrandDto } from './dto/update-brand.dto.js';

@Injectable()
export class BrandManagementService {
  constructor(
    @Inject(AuthSecurityEventService) private readonly securityEvents: AuthSecurityEventService,
    @Inject(BrandAuthorizationService)
    private readonly brandAuthorization: BrandAuthorizationService,
  ) {}

  async list(query: BrandListQueryDto, actor: SafeAuthenticatedUser) {
    const page = this.paginationValue(query.page, 1, 1, Number.MAX_SAFE_INTEGER, 'page');
    const pageSize = this.paginationValue(query.pageSize, 25, 1, 100, 'pageSize');
    const superAdministrator = await this.brandAuthorization.isSuperAdministrator(actor);
    const accessibleBrandIds = superAdministrator
      ? undefined
      : await this.brandAuthorization.listAccessibleBrandIds(actor);
    const search = query.search?.trim();
    const where = {
      ...(query.status ? { status: query.status as BrandStatus } : {}),
      ...(accessibleBrandIds ? { id: { in: accessibleBrandIds } } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' as const } },
              { name: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [total, brands] = await prisma.$transaction([
      prisma.brand.count({ where }),
      prisma.brand.findMany({
        where,
        orderBy: { code: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { page, pageSize, total, items: brands.map((brand) => this.brandView(brand)) };
  }

  async get(brandId: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    return this.brandView(await this.brandAuthorization.assertBrandAccess(actor, brandId, context));
  }

  async create(dto: CreateBrandDto, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const code = this.normalizeCode(dto.code);
    const name = this.normalizeName(dto.name);
    const description = this.normalizeDescription(dto.description);
    try {
      const brand = await prisma.brand.create({
        data: {
          code,
          name,
          ...(description !== undefined ? { description } : {}),
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
        },
      });
      await this.record(AuthSecurityEventType.BRAND_CREATED, actor, context, {
        brandId: brand.id,
        brandCode: brand.code,
      });
      return this.brandView(brand);
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        throw new ConflictException('Brand code already exists.');
      }
      throw error;
    }
  }

  async update(
    brandId: string,
    dto: UpdateBrandDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const brand = await this.findBrand(brandId);
    const name = dto.name === undefined ? undefined : this.normalizeName(dto.name);
    const description =
      dto.description === undefined ? undefined : this.normalizeDescription(dto.description);
    if (name === undefined && description === undefined) {
      throw new BadRequestException('At least one mutable Brand field is required.');
    }
    const updated = await prisma.brand.update({
      where: { id: brand.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        updatedByUserId: actor.id,
      },
    });
    await this.record(AuthSecurityEventType.BRAND_UPDATED, actor, context, {
      brandId: brand.id,
      brandCode: brand.code,
      changedFields: [
        name !== undefined ? 'name' : '',
        description !== undefined ? 'description' : '',
      ]
        .filter(Boolean)
        .join(','),
    });
    return this.brandView(updated);
  }

  async archive(brandId: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const brand = await this.findBrand(brandId);
    if (brand.status === BrandStatus.ARCHIVED) {
      return this.brandView(brand);
    }
    const archived = await prisma.brand.update({
      where: { id: brand.id },
      data: { status: BrandStatus.ARCHIVED, archivedAt: new Date(), updatedByUserId: actor.id },
    });
    await this.record(AuthSecurityEventType.BRAND_ARCHIVED, actor, context, {
      brandId: brand.id,
      brandCode: brand.code,
    });
    return this.brandView(archived);
  }

  async reactivate(brandId: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const brand = await this.findBrand(brandId);
    if (brand.status === BrandStatus.ACTIVE) {
      return this.brandView(brand);
    }
    const active = await prisma.brand.update({
      where: { id: brand.id },
      data: { status: BrandStatus.ACTIVE, archivedAt: null, updatedByUserId: actor.id },
    });
    await this.record(AuthSecurityEventType.BRAND_REACTIVATED, actor, context, {
      brandId: brand.id,
      brandCode: brand.code,
    });
    return this.brandView(active);
  }

  async listUserBrandAccess(userId: string) {
    await this.findUser(userId);
    const assignments = await prisma.userBrandAccess.findMany({
      where: { userId },
      include: { brand: true },
      orderBy: { brand: { code: 'asc' } },
    });
    return assignments.map(({ brand, createdAt }) => ({
      ...this.brandView(brand),
      assignedAt: createdAt,
    }));
  }

  async assignUserBrandAccess(
    userId: string,
    dto: AssignBrandAccessDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const [user, brand, trainerRole] = await Promise.all([
      this.findUser(userId),
      this.findBrand(dto.brandId),
      prisma.role.findUniqueOrThrow({
        where: { code: SystemRoleCode.Trainer },
        select: { id: true },
      }),
    ]);
    if (user.status !== 'ACTIVE') {
      throw new BadRequestException('Brand access requires an active Trainer user.');
    }
    const trainerAssignment = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId: trainerRole.id } },
      include: { role: true },
    });
    if (!trainerAssignment?.role.isActive) {
      throw new BadRequestException('Brand access requires an active TRAINER role.');
    }
    if (brand.status !== BrandStatus.ACTIVE) {
      throw new BadRequestException('Archived Brands cannot receive new access assignments.');
    }
    try {
      const assignment = await prisma.userBrandAccess.create({
        data: { userId, brandId: brand.id, createdByUserId: actor.id },
        include: { brand: true },
      });
      await this.record(AuthSecurityEventType.BRAND_ACCESS_ASSIGNED, actor, context, {
        targetUserId: userId,
        brandId: brand.id,
        brandCode: brand.code,
      });
      return { ...this.brandView(assignment.brand), assignedAt: assignment.createdAt };
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        const assignment = await prisma.userBrandAccess.findUniqueOrThrow({
          where: { userId_brandId: { userId, brandId: brand.id } },
          include: { brand: true },
        });
        return { ...this.brandView(assignment.brand), assignedAt: assignment.createdAt };
      }
      throw error;
    }
  }

  async removeUserBrandAccess(
    userId: string,
    brandId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ): Promise<void> {
    const assignment = await prisma.userBrandAccess.findUnique({
      where: { userId_brandId: { userId, brandId } },
      include: { brand: true },
    });
    if (!assignment) {
      return;
    }
    await prisma.userBrandAccess.delete({ where: { id: assignment.id } });
    await this.record(AuthSecurityEventType.BRAND_ACCESS_REMOVED, actor, context, {
      targetUserId: userId,
      brandId,
      brandCode: assignment.brand.code,
    });
  }

  private async findBrand(brandId: string) {
    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) {
      throw new NotFoundException('Brand not found.');
    }
    return brand;
  }

  private async findUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user;
  }

  private normalizeCode(value: unknown): string {
    const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
    if (!/^[A-Z][A-Z0-9_]*$/.test(normalized) || normalized.length < 2 || normalized.length > 64) {
      throw new BadRequestException('Brand code is invalid.');
    }
    return normalized;
  }

  private paginationValue(
    value: unknown,
    fallback: number,
    minimum: number,
    maximum: number,
    field: string,
  ): number {
    if (value === undefined) {
      return fallback;
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
      throw new BadRequestException(`${field} is invalid.`);
    }
    return parsed;
  }

  private normalizeName(value: unknown): string {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (normalized.length < 2 || normalized.length > 100) {
      throw new BadRequestException('Brand name is invalid.');
    }
    return normalized;
  }

  private normalizeDescription(value: unknown): string | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (typeof value !== 'string' || value.length > 500) {
      throw new BadRequestException('Brand description is invalid.');
    }
    return value.trim();
  }

  private brandView(brand: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    status: BrandStatus;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: brand.id,
      code: brand.code,
      name: brand.name,
      description: brand.description,
      status: brand.status,
      archivedAt: brand.archivedAt,
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
    };
  }

  private async record(
    eventType: AuthSecurityEventType,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
    metadata: Record<string, string>,
  ): Promise<void> {
    await this.securityEvents.record(eventType, context, actor.id, metadata);
  }

  private isUniqueConstraint(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
