import 'reflect-metadata';
import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Inject,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
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
import { CreateRoleDto } from './dto/create-role.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PaginationQueryDto } from './dto/pagination-query.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ReplaceRolePermissionsDto } from './dto/replace-role-permissions.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { RoleManagementService } from './role-management.service.js';

@Controller('roles')
export class RolesController {
  constructor(@Inject(RoleManagementService) private readonly roles: RoleManagementService) {}

  @Get()
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.RolesRead)
  list(@Query() query: PaginationQueryDto) {
    return this.roles.list(query);
  }

  @Get(':id')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.RolesRead)
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) roleId: string) {
    return this.roles.get(roleId);
  }

  @Post()
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.RolesCreate)
  create(@Body() dto: CreateRoleDto, @Req() request: Request) {
    this.rejectClientSystemField(request);
    return this.roles.create(dto, request.authSession!.user, authRequestContext(request));
  }

  @Patch(':id')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.RolesUpdate)
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) roleId: string,
    @Body() dto: UpdateRoleDto,
    @Req() request: Request,
  ) {
    this.rejectClientUpdateFields(request);
    return this.roles.update(roleId, dto, request.authSession!.user, authRequestContext(request));
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.RolesDelete)
  async deactivate(
    @Param('id', new ParseUUIDPipe({ version: '4' })) roleId: string,
    @Req() request: Request,
  ): Promise<void> {
    await this.roles.deactivate(roleId, request.authSession!.user, authRequestContext(request));
  }

  @Put(':id/permissions')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.RolesUpdate)
  replacePermissions(
    @Param('id', new ParseUUIDPipe({ version: '4' })) roleId: string,
    @Body() dto: ReplaceRolePermissionsDto,
    @Req() request: Request,
  ) {
    return this.roles.replacePermissions(
      roleId,
      dto,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  private rejectClientUpdateFields(request: Request): void {
    if (
      typeof request.body === 'object' &&
      request.body !== null &&
      Object.hasOwn(request.body as object, 'code')
    ) {
      throw new BadRequestException('Role code is immutable after creation.');
    }
    this.rejectClientSystemField(request);
  }

  private rejectClientSystemField(request: Request): void {
    if (
      typeof request.body === 'object' &&
      request.body !== null &&
      Object.hasOwn(request.body as object, 'isSystem')
    ) {
      throw new BadRequestException('isSystem is managed internally.');
    }
  }
}
