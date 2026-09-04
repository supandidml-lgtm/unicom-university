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

@Controller('participants')
export class ParticipantsController {
  constructor(@Inject(StaffProvisioningService) private readonly staff: StaffProvisioningService) {}

  @Get()
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.ParticipantsRead)
  list(@Query() query: StaffListQueryDto, @Req() request: Request) {
    return this.staff.list('participant', query, request.authSession!.user);
  }

  @Post()
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.ParticipantsCreate)
  create(@Body() dto: CreateStaffDto, @Req() request: Request) {
    this.rejectManagedFields(request, [
      'role',
      'roles',
      'status',
      'password',
      'passwordHash',
      'permissions',
      'brandIds',
      'week',
      'weeks',
      'weekCount',
      'trainingDuration',
      'enrollment',
      'isSystem',
      'createdByUserId',
    ]);
    return this.staff.create(
      'participant',
      dto,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Get(':id')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.ParticipantsRead)
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) userId: string, @Req() request: Request) {
    return this.staff.get(
      'participant',
      userId,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Patch(':id')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.ParticipantsUpdate)
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
      'participant',
      userId,
      dto,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Post(':id/disable')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.ParticipantsDisable)
  disable(
    @Param('id', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Req() request: Request,
  ) {
    return this.staff.disable(
      'participant',
      userId,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Post(':id/reactivate')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.ParticipantsReactivate)
  reactivate(
    @Param('id', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Req() request: Request,
  ) {
    return this.staff.reactivate(
      'participant',
      userId,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Post(':id/invitations')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.ParticipantsInvite)
  reissueInvitation(
    @Param('id', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Req() request: Request,
  ) {
    return this.staff.reissueInvitation(
      'participant',
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
