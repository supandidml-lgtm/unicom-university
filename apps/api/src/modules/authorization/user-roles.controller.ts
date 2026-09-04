import 'reflect-metadata';
import {
  Body,
  Controller,
  Delete,
  Inject,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PermissionCode } from '@unicom/database';
import type { Request } from 'express';
import { authRequestContext } from '../auth/auth-request.js';
import { AuthorizationGuard } from '../auth/authorization.guard.js';
import { CsrfGuard } from '../auth/csrf.guard.js';
import { RequirePermissions } from '../auth/require-permissions.decorator.js';
// NestJS reads these constructors through emitted decorator metadata for runtime validation.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AssignRoleDto } from './dto/assign-role.dto.js';
import { RoleManagementService } from './role-management.service.js';

@Controller('users')
export class UserRolesController {
  constructor(@Inject(RoleManagementService) private readonly roles: RoleManagementService) {}

  @Get(':userId/roles')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.UserRolesRead)
  list(@Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string) {
    return this.roles.listUserRoles(userId);
  }

  @Post(':userId/roles')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.UserRolesAssign)
  assign(
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() dto: AssignRoleDto,
    @Req() request: Request,
  ) {
    return this.roles.assignUserRole(
      userId,
      dto,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Delete(':userId/roles/:roleId')
  @HttpCode(204)
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.UserRolesRemove)
  async remove(
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Param('roleId', new ParseUUIDPipe({ version: '4' })) roleId: string,
    @Req() request: Request,
  ): Promise<void> {
    await this.roles.removeUserRole(
      userId,
      roleId,
      request.authSession!.user,
      authRequestContext(request),
    );
  }
}
