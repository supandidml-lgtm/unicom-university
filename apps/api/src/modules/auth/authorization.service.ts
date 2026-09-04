import { Injectable } from '@nestjs/common';
import {
  PermissionCode,
  prisma,
  SystemRoleCode,
  systemPermissions,
  type PermissionCode as PermissionCodeValue,
} from '@unicom/database';
import type { SafeAuthenticatedUser, SafeAuthorizedUser } from './auth.types.js';

@Injectable()
export class AuthorizationService {
  async getUserAuthorizationContext(user: SafeAuthenticatedUser): Promise<SafeAuthorizedUser> {
    const assignments = await prisma.userRole.findMany({
      where: { userId: user.id, role: { isActive: true } },
      include: {
        role: {
          include: {
            rolePermissions: { include: { permission: true } },
          },
        },
      },
    });
    const roles = assignments.map(({ role }) => ({ code: role.code, name: role.name }));
    const isSuperAdministrator = roles.some(
      (role) => role.code === SystemRoleCode.SuperAdministrator,
    );
    const permissions = isSuperAdministrator
      ? systemPermissions.map((permission) => permission.code)
      : [
          ...new Set(
            assignments.flatMap(({ role }) =>
              role.rolePermissions.map(({ permission }) => permission.code),
            ),
          ),
        ].sort();

    return { ...user, roles, permissions };
  }

  async hasPermission(
    user: SafeAuthenticatedUser,
    permission: PermissionCodeValue,
  ): Promise<boolean> {
    return (await this.getUserAuthorizationContext(user)).permissions.includes(permission);
  }

  async hasAnyPermission(
    user: SafeAuthenticatedUser,
    permissions: readonly PermissionCodeValue[],
  ): Promise<boolean> {
    const context = await this.getUserAuthorizationContext(user);
    return permissions.some((permission) => context.permissions.includes(permission));
  }

  async hasAllPermissions(
    user: SafeAuthenticatedUser,
    permissions: readonly PermissionCodeValue[],
  ): Promise<boolean> {
    const context = await this.getUserAuthorizationContext(user);
    return permissions.every((permission) => context.permissions.includes(permission));
  }

  async isSuperAdministrator(user: SafeAuthenticatedUser): Promise<boolean> {
    return (await this.getUserAuthorizationContext(user)).roles.some(
      (role) => role.code === SystemRoleCode.SuperAdministrator,
    );
  }

  // Re-exported through a value reference so controller declarations remain type-safe.
  readonly permissions = PermissionCode;
}
