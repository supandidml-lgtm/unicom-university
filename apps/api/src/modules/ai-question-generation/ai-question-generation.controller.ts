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
// NestJS reads this constructor through emitted decorator metadata for runtime validation.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateAiQuestionGenerationJobDto } from './dto/create-ai-question-generation-job.dto.js';
import { AiQuestionGenerationService } from './ai-question-generation.service.js';

@Controller('exams')
export class AiQuestionGenerationController {
  constructor(
    @Inject(AiQuestionGenerationService) private readonly generation: AiQuestionGenerationService,
  ) {}

  @Post(':examId/ai-generation-jobs')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.ExamsUpdate, PermissionCode.QuestionsAiGenerate)
  request(
    @Param('examId', new ParseUUIDPipe({ version: '4' })) examId: string,
    @Body() dto: CreateAiQuestionGenerationJobDto,
    @Req() request: Request,
  ) {
    return this.generation.request(
      examId,
      dto,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Get(':examId/ai-generation-jobs')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.ExamsRead, PermissionCode.QuestionsAiGenerate)
  list(
    @Param('examId', new ParseUUIDPipe({ version: '4' })) examId: string,
    @Req() request: Request,
  ) {
    return this.generation.list(examId, request.authSession!.user, authRequestContext(request));
  }

  @Get(':examId/ai-generation-materials')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.ExamsRead, PermissionCode.QuestionsAiGenerate)
  eligibleMaterials(
    @Param('examId', new ParseUUIDPipe({ version: '4' })) examId: string,
    @Req() request: Request,
  ) {
    return this.generation.eligibleMaterials(
      examId,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Post('ai-generation-jobs/:jobId/cancel')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.QuestionsAiGenerate)
  cancel(
    @Param('jobId', new ParseUUIDPipe({ version: '4' })) jobId: string,
    @Req() request: Request,
  ) {
    return this.generation.cancel(jobId, request.authSession!.user, authRequestContext(request));
  }
}
