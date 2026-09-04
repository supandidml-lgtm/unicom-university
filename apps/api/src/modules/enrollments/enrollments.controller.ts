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
import { RequireAnyPermission, RequirePermissions } from '../auth/require-permissions.decorator.js';
// NestJS reads these constructors through emitted decorator metadata for runtime validation.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { EnrollmentListQueryDto } from './dto/enrollment-list-query.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { BindCurriculumVersionDto } from './dto/bind-curriculum-version.dto.js';
import { EnrollmentService } from './enrollment.service.js';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(@Inject(EnrollmentService) private readonly enrollments: EnrollmentService) {}

  @Get()
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.EnrollmentsRead)
  list(@Query() query: EnrollmentListQueryDto, @Req() request: Request) {
    return this.enrollments.list(query, request.authSession!.user);
  }

  @Get(':id')
  @UseGuards(AuthorizationGuard)
  @RequireAnyPermission(PermissionCode.EnrollmentsRead, PermissionCode.EnrollmentsReadSelf)
  get(
    @Param('id', new ParseUUIDPipe({ version: '4' })) enrollmentId: string,
    @Req() request: Request,
  ) {
    return this.enrollments.get(
      enrollmentId,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Patch(':id')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.EnrollmentsUpdate)
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) enrollmentId: string,
    @Body() dto: UpdateEnrollmentDto,
    @Req() request: Request,
  ) {
    this.rejectManagedFields(request, [
      'status',
      'brandId',
      'participantUserId',
      'assignedByUserId',
      'cancelledAt',
      'cancelledByUserId',
      'progress',
      'score',
      'curriculumVersionId',
      'createdAt',
    ]);
    return this.enrollments.update(
      enrollmentId,
      dto,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Post(':id/cancel')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.EnrollmentsCancel)
  cancel(
    @Param('id', new ParseUUIDPipe({ version: '4' })) enrollmentId: string,
    @Req() request: Request,
  ) {
    return this.enrollments.cancel(
      enrollmentId,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Patch(':id/curriculum-version')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.EnrollmentsUpdate, PermissionCode.CurriculumVersionsRead)
  bindCurriculumVersion(
    @Param('id', new ParseUUIDPipe({ version: '4' })) enrollmentId: string,
    @Body() dto: BindCurriculumVersionDto,
    @Req() request: Request,
  ) {
    return this.enrollments.bindCurriculumVersion(
      enrollmentId,
      dto,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  private rejectManagedFields(request: Request, fields: readonly string[]): void {
    if (typeof request.body !== 'object' || request.body === null) return;
    const field = fields.find((candidate) => Object.hasOwn(request.body as object, candidate));
    if (field) throw new BadRequestException(`${field} is managed internally.`);
  }
}
