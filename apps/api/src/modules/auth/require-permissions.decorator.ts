import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '@unicom/database';

export const requiredPermissionsMetadataKey = 'unicom:required-permissions';

export interface PermissionRequirement {
  permissions: PermissionCode[];
  mode: 'all' | 'any';
}

export function RequireAllPermissions(...permissions: PermissionCode[]) {
  return SetMetadata(requiredPermissionsMetadataKey, {
    permissions,
    mode: 'all',
  } satisfies PermissionRequirement);
}

export const RequirePermissions = RequireAllPermissions;

export function RequireAnyPermission(...permissions: PermissionCode[]) {
  return SetMetadata(requiredPermissionsMetadataKey, {
    permissions,
    mode: 'any',
  } satisfies PermissionRequirement);
}
