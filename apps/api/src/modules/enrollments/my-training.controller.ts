import 'reflect-metadata';
import { Controller, Get, Inject, Query, Req, UseGuards } from '@nestjs/common';
import { PermissionCode } from '@unicom/database';
import type { Request } from 'express';
import { AuthorizationGuard } from '../auth/authorization.guard.js';
import { RequirePermissions } from '../auth/require-permissions.decorator.js';
// NestJS reads these constructors through emitted decorator metadata for runtime validation.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { EnrollmentListQueryDto } from './dto/enrollment-list-query.dto.js';
import { EnrollmentService } from './enrollment.service.js';

@Controller('my-training')
export class MyTrainingController {
  constructor(@Inject(EnrollmentService) private readonly enrollments: EnrollmentService) {}

  @Get('enrollments')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.EnrollmentsReadSelf)
  list(@Query() query: EnrollmentListQueryDto, @Req() request: Request) {
    return this.enrollments.listSelf(query, request.authSession!.user);
  }
}
