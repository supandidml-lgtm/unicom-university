import 'reflect-metadata';
import { Controller, Get, Inject, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common';
import { PermissionCode } from '@unicom/database';
import type { Request } from 'express';
import { authRequestContext } from '../auth/auth-request.js';
import { AuthorizationGuard } from '../auth/authorization.guard.js';
import { RequirePermissions } from '../auth/require-permissions.decorator.js';
import { TrainingProgressService } from './training-progress.service.js';

@Controller()
export class TrainingProgressController {
  constructor(
    @Inject(TrainingProgressService) private readonly progress: TrainingProgressService,
  ) {}

  @Get('my-training/dashboard')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.TrainingProgressReadSelf)
  dashboard(@Req() request: Request) {
    return this.progress.dashboard(request.authSession!.user, authRequestContext(request));
  }

  @Get('my-training/enrollments/:enrollmentId/progress')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.TrainingProgressReadSelf)
  selfProgress(
    @Param('enrollmentId', new ParseUUIDPipe({ version: '4' })) enrollmentId: string,
    @Req() request: Request,
  ) {
    return this.progress.selfProgress(
      enrollmentId,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Get('participants/:participantId/enrollments/:enrollmentId/progress')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.LearningProgressRead)
  participantProgress(
    @Param('participantId', new ParseUUIDPipe({ version: '4' })) participantId: string,
    @Param('enrollmentId', new ParseUUIDPipe({ version: '4' })) enrollmentId: string,
    @Req() request: Request,
  ) {
    return this.progress.participantProgress(
      participantId,
      enrollmentId,
      request.authSession!.user,
      authRequestContext(request),
    );
  }
}
