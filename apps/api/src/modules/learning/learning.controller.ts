import 'reflect-metadata';
import {
  Body,
  Controller,
  Get,
  Inject,
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
import { AcknowledgeMaterialDto } from './dto/acknowledge-material.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { DocumentPageDto } from './dto/document-page.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { StartLearningActivityDto } from './dto/start-learning-activity.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { VideoHeartbeatDto } from './dto/video-heartbeat.dto.js';
import { LearningService } from './learning.service.js';

@Controller()
export class LearningController {
  constructor(@Inject(LearningService) private readonly learning: LearningService) {}

  @Post('my-training/enrollments/:enrollmentId/materials/:materialId/activity-sessions')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.LearningContentReadSelf)
  start(
    @Param('enrollmentId', new ParseUUIDPipe({ version: '4' })) enrollmentId: string,
    @Param('materialId', new ParseUUIDPipe({ version: '4' })) materialId: string,
    @Body() _dto: StartLearningActivityDto,
    @Req() request: Request,
  ) {
    return this.learning.start(
      enrollmentId,
      materialId,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Post('learning/materials/:materialId/video/heartbeat')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.LearningContentReadSelf)
  videoHeartbeat(
    @Param('materialId', new ParseUUIDPipe({ version: '4' })) materialId: string,
    @Body() dto: VideoHeartbeatDto,
    @Req() request: Request,
  ) {
    return this.learning.videoHeartbeat(
      materialId,
      dto,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Post('learning/materials/:materialId/document/page')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.LearningContentReadSelf)
  documentPage(
    @Param('materialId', new ParseUUIDPipe({ version: '4' })) materialId: string,
    @Body() dto: DocumentPageDto,
    @Req() request: Request,
  ) {
    return this.learning.documentPage(
      materialId,
      dto,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Post('learning/materials/:materialId/acknowledge')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.LearningContentReadSelf)
  acknowledge(
    @Param('materialId', new ParseUUIDPipe({ version: '4' })) materialId: string,
    @Body() dto: AcknowledgeMaterialDto,
    @Req() request: Request,
  ) {
    return this.learning.acknowledge(
      materialId,
      dto,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Get('my-training/enrollments/:enrollmentId/material-progress')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.LearningContentReadSelf)
  selfProgress(
    @Param('enrollmentId', new ParseUUIDPipe({ version: '4' })) enrollmentId: string,
    @Req() request: Request,
  ) {
    return this.learning.selfProgress(
      enrollmentId,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Get('enrollments/:enrollmentId/material-progress')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.LearningProgressRead)
  scopedProgress(
    @Param('enrollmentId', new ParseUUIDPipe({ version: '4' })) enrollmentId: string,
    @Req() request: Request,
  ) {
    return this.learning.scopedProgress(
      enrollmentId,
      request.authSession!.user,
      authRequestContext(request),
    );
  }
}
