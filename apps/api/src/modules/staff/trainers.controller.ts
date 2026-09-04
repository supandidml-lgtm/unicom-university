import 'reflect-metadata';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { CreateStaffDto } from './dto/create-staff.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { StaffListQueryDto } from './dto/staff-list-query.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UpdateStaffProfileDto } from './dto/update-staff-profile.dto.js';
import { StaffProvisioningService } from './staff-provisioning.service.js';

@Controller('trainers')
export class TrainersController {
  constructor(@Inject(StaffProvisioningService) private readonly staff: StaffProvisioningService) {}

  @Get()
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.TrainersRead)
  list(@Query() query: StaffListQueryDto, @Req() request: Request) {
    return this.staff.list('trainer', query, request.authSession!.user);
  }

  @Post()
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.TrainersCreate)
  create(@Body() dto: CreateStaffDto, @Req() request: Request) {
    this.rejectManagedFields(request, [
      'role',
      'roles',
      'status',
      'password',
      'passwordHash',
      'permissions',
      'brandIds',
      'isSystem',
      'createdByUserId',
    ]);
    return this.staff.create(
      'trainer',
      dto,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Get(':id')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.TrainersRead)
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) userId: string, @Req() request: Request) {
    return this.staff.get(
      'trainer',
      userId,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Patch(':id')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.TrainersUpdate)
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() dto: UpdateStaffProfileDto,
    @Req() request: Request,
  ) {
    this.rejectManagedFields(request, [
      'email',
      'nik',
      'role',
      'roles',
      'status',
      'permissions',
      'brandIds',
      'createdByUserId',
    ]);
    return this.staff.update(
      'trainer',
      userId,
      dto,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Post(':id/disable')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.TrainersDisable)
  disable(
    @Param('id', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Req() request: Request,
  ) {
    return this.staff.disable(
      'trainer',
      userId,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Post(':id/reactivate')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.TrainersReactivate)
  reactivate(
    @Param('id', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Req() request: Request,
  ) {
    return this.staff.reactivate(
      'trainer',
      userId,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Post(':id/invitations')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.TrainersInvite)
  reissueInvitation(
    @Param('id', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Req() request: Request,
  ) {
    return this.staff.reissueInvitation(
      'trainer',
      userId,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  private rejectManagedFields(request: Request, fields: readonly string[]): void {
    if (typeof request.body !== 'object' || request.body === null) {
      return;
    }
    const managedField = fields.find((field) => Object.hasOwn(request.body as object, field));
    if (managedField) {
      throw new BadRequestException(`${managedField} is managed internally.`);
    }
  }
}
