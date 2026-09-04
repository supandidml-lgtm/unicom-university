import 'reflect-metadata';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
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
import { CreateEnrollmentsDto } from './dto/create-enrollments.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { EnrollmentListQueryDto } from './dto/enrollment-list-query.dto.js';
import { EnrollmentService } from './enrollment.service.js';

@Controller('participants')
export class ParticipantEnrollmentsController {
  constructor(@Inject(EnrollmentService) private readonly enrollments: EnrollmentService) {}

  @Get(':participantId/enrollments')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.EnrollmentsRead)
  list(
    @Param('participantId', new ParseUUIDPipe({ version: '4' })) participantUserId: string,
    @Query() query: EnrollmentListQueryDto,
    @Req() request: Request,
  ) {
    return this.enrollments.listForParticipant(participantUserId, query, request.authSession!.user);
  }

  @Post(':participantId/enrollments')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.EnrollmentsCreate)
  create(
    @Param('participantId', new ParseUUIDPipe({ version: '4' })) participantUserId: string,
    @Body() dto: CreateEnrollmentsDto,
    @Req() request: Request,
  ) {
    this.rejectManagedFields(request, [
      'participantUserId',
      'status',
      'assignedByUserId',
      'cancelledAt',
      'cancelledByUserId',
      'progress',
      'score',
      'curriculumVersionId',
      'createdAt',
    ]);
    return this.enrollments.createBulk(
      participantUserId,
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
