import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthSecurityEventType, prisma, SystemRoleCode } from '@unicom/database';
import { isUUID } from 'class-validator';
import type { AuthRequestContext, SafeAuthenticatedUser } from '../auth/auth.types.js';
import { AuthSecurityEventService } from '../auth/auth-security-event.service.js';
import type { AssignRoleDto } from './dto/assign-role.dto.js';
import type { CreateRoleDto } from './dto/create-role.dto.js';
import type { PaginationQueryDto } from './dto/pagination-query.dto.js';
import type { ReplaceRolePermissionsDto } from './dto/replace-role-permissions.dto.js';
import type { UpdateRoleDto } from './dto/update-role.dto.js';

const roleInclude = {
  rolePermissions: { include: { permission: true } },
} as const;

@Injectable()
export class RoleManagementService {
  constructor(
    @Inject(AuthSecurityEventService) private readonly securityEvents: AuthSecurityEventService,
  ) {}

  async list(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const skip = (page - 1) * pageSize;
    const [total, roles] = await prisma.$transaction([
      prisma.role.count(),
      prisma.role.findMany({
        include: roleInclude,
        orderBy: { code: 'asc' },
        skip,
        take: pageSize,
      }),
    ]);
    return {
      page,
      pageSize,
      total,
      items: roles.map((role) => this.roleView(role)),
    };
  }

  async get(roleId: string) {
    return this.roleView(await this.findRole(roleId));
  }

  async create(dto: CreateRoleDto, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    this.validateCreate(dto);
    try {
      const role = await prisma.role.create({
        data: {
          code: dto.code,
          name: dto.name,
          ...(dto.description ? { description: dto.description } : {}),
        },
        include: roleInclude,
      });
      await this.record(AuthSecurityEventType.ROLE_CREATED, actor, context, { roleId: role.id });
      return this.roleView(role);
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        throw new ConflictException('Role code already exists.');
      }
      throw error;
    }
  }

  async update(
    roleId: string,
    dto: UpdateRoleDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    this.validateUpdate(dto);
    const role = await this.findRole(roleId);
    if (role.isSystem && dto.isActive !== undefined) {
      throw new BadRequestException('System role status cannot be changed.');
    }
    const updated = await prisma.role.update({
      where: { id: role.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: roleInclude,
    });
    await this.record(AuthSecurityEventType.ROLE_UPDATED, actor, context, { roleId: role.id });
    return this.roleView(updated);
  }

  async deactivate(
    roleId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ): Promise<void> {
    const role = await this.findRole(roleId);
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deactivated.');
    }
    if (!role.isActive) {
      return;
    }
    await prisma.role.update({ where: { id: role.id }, data: { isActive: false } });
    await this.record(AuthSecurityEventType.ROLE_DEACTIVATED, actor, context, { roleId: role.id });
  }

  async replacePermissions(
    roleId: string,
    dto: ReplaceRolePermissionsDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    if (
      !Array.isArray(dto.permissionIds) ||
      new Set(dto.permissionIds).size !== dto.permissionIds.length ||
      !dto.permissionIds.every((permissionId) => isUUID(permissionId, '4'))
    ) {
      throw new BadRequestException('permissionIds must be a unique array of UUID values.');
    }
    const role = await this.findRole(roleId);
    if (role.isSystem) {
      throw new BadRequestException(
        'System role permissions are managed by application seed data.',
      );
    }
    const permissions = await prisma.permission.findMany({
      where: { id: { in: dto.permissionIds } },
      select: { id: true },
    });
    if (permissions.length !== dto.permissionIds.length) {
      throw new NotFoundException('One or more permissions were not found.');
    }
    const updated = await prisma.$transaction(async (transaction) => {
      await transaction.rolePermission.deleteMany({ where: { roleId: role.id } });
      if (dto.permissionIds.length > 0) {
        await transaction.rolePermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        });
      }
      return transaction.role.findUniqueOrThrow({ where: { id: role.id }, include: roleInclude });
    });
    await this.record(AuthSecurityEventType.ROLE_PERMISSION_UPDATED, actor, context, {
      roleId: role.id,
      permissionCount: dto.permissionIds.length,
    });
    return this.roleView(updated);
  }

  async listUserRoles(userId: string) {
    await this.findUser(userId);
    const assignments = await prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
      orderBy: { role: { code: 'asc' } },
    });
    return assignments.map(({ role }) => this.userRoleView(role));
  }

  async assignUserRole(
    userId: string,
    dto: AssignRoleDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    if (!isUUID(dto.roleId, '4')) {
      throw new BadRequestException('roleId must be a UUID value.');
    }
    await this.findUser(userId);
    const role = await prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) {
      throw new NotFoundException('Role not found.');
    }
    if (!role.isActive) {
      throw new BadRequestException('Inactive roles cannot be assigned.');
    }
    const existing = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId: role.id } },
    });
    if (!existing) {
      await prisma.userRole.create({ data: { userId, roleId: role.id } });
      await this.record(AuthSecurityEventType.USER_ROLE_ASSIGNED, actor, context, {
        targetUserId: userId,
        roleId: role.id,
      });
    }
    return this.listUserRoles(userId);
  }

  async removeUserRole(
    userId: string,
    roleId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ): Promise<void> {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found.');
    }
    await this.findUser(userId);
    const removed = await prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(9130043)`;
      const assignment = await transaction.userRole.findUnique({
        where: { userId_roleId: { userId, roleId } },
        include: { user: true },
      });
      if (!assignment) {
        return false;
      }
      if (role.code === SystemRoleCode.SuperAdministrator && assignment.user.status === 'ACTIVE') {
        const activeSuperAdministrators = await transaction.userRole.count({
          where: {
            role: { code: SystemRoleCode.SuperAdministrator, isActive: true },
            user: { status: 'ACTIVE' },
          },
        });
        if (activeSuperAdministrators <= 1) {
          throw new BadRequestException('The last active Super Administrator cannot lose access.');
        }
      }
      await transaction.userRole.delete({ where: { id: assignment.id } });
      return true;
    });
    if (removed) {
      await this.record(AuthSecurityEventType.USER_ROLE_REMOVED, actor, context, {
        targetUserId: userId,
        roleId,
      });
    }
  }

  private async findRole(roleId: string) {
    const role = await prisma.role.findUnique({ where: { id: roleId }, include: roleInclude });
    if (!role) {
      throw new NotFoundException('Role not found.');
    }
    return role;
  }

  private async findUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user;
  }

  private roleView(role: Awaited<ReturnType<RoleManagementService['findRole']>>) {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      isActive: role.isActive,
      permissions: role.rolePermissions
        .map(({ permission }) => ({
          id: permission.id,
          code: permission.code,
          name: permission.name,
          resource: permission.resource,
          action: permission.action,
        }))
        .sort((left, right) => left.code.localeCompare(right.code)),
    };
  }

  private userRoleView(role: {
    id: string;
    code: string;
    name: string;
    isSystem: boolean;
    isActive: boolean;
  }) {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      isSystem: role.isSystem,
      isActive: role.isActive,
    };
  }

  private async record(
    eventType: AuthSecurityEventType,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
    metadata: Record<string, string | number>,
  ): Promise<void> {
    await this.securityEvents.record(eventType, context, actor.id, metadata);
  }

  private isUniqueConstraint(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }

  private validateCreate(dto: CreateRoleDto): void {
    if (typeof dto.code !== 'string' || !/^[A-Z][A-Z0-9_]*$/.test(dto.code)) {
      throw new BadRequestException(
        'code must use uppercase letters, digits, and underscores only.',
      );
    }
    if (dto.code.length < 2 || dto.code.length > 64 || !this.validName(dto.name)) {
      throw new BadRequestException('Role code or name is invalid.');
    }
    if (
      dto.description !== undefined &&
      (typeof dto.description !== 'string' || dto.description.length > 500)
    ) {
      throw new BadRequestException('Role description is invalid.');
    }
  }

  private validateUpdate(dto: UpdateRoleDto): void {
    if (dto.name !== undefined && !this.validName(dto.name)) {
      throw new BadRequestException('Role name is invalid.');
    }
    if (
      dto.description !== undefined &&
      (typeof dto.description !== 'string' || dto.description.length > 500)
    ) {
      throw new BadRequestException('Role description is invalid.');
    }
    if (dto.isActive !== undefined && typeof dto.isActive !== 'boolean') {
      throw new BadRequestException('Role status is invalid.');
    }
  }

  private validName(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length >= 2 && value.length <= 100;
  }
}
