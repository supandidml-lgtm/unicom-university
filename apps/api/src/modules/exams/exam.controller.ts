import 'reflect-metadata';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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
import {
  CreateExamDto,
  CreateExamQuestionDto,
  OrderExamQuestionsDto,
  SaveExamAnswerDto,
  UpdateExamDto,
  UpdateExamQuestionDto,
} from './dto/exam.dto.js';
import { ExamService } from './exam.service.js';

@Controller()
export class ExamController {
  constructor(@Inject(ExamService) private readonly exams: ExamService) {}

  @Get('curriculum-weeks/:weekId/exams')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.ExamsRead, PermissionCode.QuestionsRead)
  listWeek(
    @Param('weekId', new ParseUUIDPipe({ version: '4' })) weekId: string,
    @Req() request: Request,
  ) {
    return this.exams.listWeek(weekId, request.authSession!.user, authRequestContext(request));
  }

  @Post('curriculum-weeks/:weekId/exams')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.ExamsCreate)
  create(
    @Param('weekId', new ParseUUIDPipe({ version: '4' })) weekId: string,
    @Body() dto: CreateExamDto,
    @Req() request: Request,
  ) {
    return this.exams.create(weekId, dto, request.authSession!.user, authRequestContext(request));
  }

  @Get('exams/:examId')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.ExamsRead, PermissionCode.QuestionsRead)
  get(
    @Param('examId', new ParseUUIDPipe({ version: '4' })) examId: string,
    @Req() request: Request,
  ) {
    return this.exams.get(examId, request.authSession!.user, authRequestContext(request));
  }

  @Patch('exams/:examId')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.ExamsUpdate)
  update(
    @Param('examId', new ParseUUIDPipe({ version: '4' })) examId: string,
    @Body() dto: UpdateExamDto,
    @Req() request: Request,
  ) {
    return this.exams.update(examId, dto, request.authSession!.user, authRequestContext(request));
  }

  @Post('exams/:examId/questions')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.QuestionsCreate)
  createQuestion(
    @Param('examId', new ParseUUIDPipe({ version: '4' })) examId: string,
    @Body() dto: CreateExamQuestionDto,
    @Req() request: Request,
  ) {
    return this.exams.createQuestion(
      examId,
      dto,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Patch('exam-questions/:questionId')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.QuestionsUpdate)
  updateQuestion(
    @Param('questionId', new ParseUUIDPipe({ version: '4' })) questionId: string,
    @Body() dto: UpdateExamQuestionDto,
    @Req() request: Request,
  ) {
    return this.exams.updateQuestion(
      questionId,
      dto,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Delete('exam-questions/:questionId')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.QuestionsUpdate)
  removeQuestion(
    @Param('questionId', new ParseUUIDPipe({ version: '4' })) questionId: string,
    @Req() request: Request,
  ) {
    return this.exams.removeQuestion(
      questionId,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Post('exam-questions/:questionId/approve')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.QuestionsApprove)
  approveQuestion(
    @Param('questionId', new ParseUUIDPipe({ version: '4' })) questionId: string,
    @Req() request: Request,
  ) {
    return this.exams.approveQuestion(
      questionId,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Put('exams/:examId/questions/order')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.QuestionsUpdate)
  reorderQuestions(
    @Param('examId', new ParseUUIDPipe({ version: '4' })) examId: string,
    @Body() dto: OrderExamQuestionsDto,
    @Req() request: Request,
  ) {
    return this.exams.reorderQuestions(
      examId,
      dto,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Get('my-training/enrollments/:enrollmentId/exams')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.ExamAttemptsReadSelf)
  listSelf(
    @Param('enrollmentId', new ParseUUIDPipe({ version: '4' })) enrollmentId: string,
    @Req() request: Request,
  ) {
    return this.exams.listSelfExams(
      enrollmentId,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Post('my-training/enrollments/:enrollmentId/exams/:examId/start')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.ExamAttemptsStartSelf)
  start(
    @Param('enrollmentId', new ParseUUIDPipe({ version: '4' })) enrollmentId: string,
    @Param('examId', new ParseUUIDPipe({ version: '4' })) examId: string,
    @Req() request: Request,
  ) {
    return this.exams.start(
      enrollmentId,
      examId,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Put('exam-attempts/:attemptId/answers/:attemptQuestionId')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.ExamAttemptsAnswerSelf)
  saveAnswer(
    @Param('attemptId', new ParseUUIDPipe({ version: '4' })) attemptId: string,
    @Param('attemptQuestionId', new ParseUUIDPipe({ version: '4' })) attemptQuestionId: string,
    @Body() dto: SaveExamAnswerDto,
    @Req() request: Request,
  ) {
    return this.exams.saveAnswer(
      attemptId,
      attemptQuestionId,
      dto,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Post('exam-attempts/:attemptId/submit')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.ExamAttemptsSubmitSelf)
  submit(
    @Param('attemptId', new ParseUUIDPipe({ version: '4' })) attemptId: string,
    @Req() request: Request,
  ) {
    return this.exams.submit(attemptId, request.authSession!.user, authRequestContext(request));
  }

  @Get('my-training/enrollments/:enrollmentId/exam-attempts')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.ExamAttemptsReadSelf)
  history(
    @Param('enrollmentId', new ParseUUIDPipe({ version: '4' })) enrollmentId: string,
    @Req() request: Request,
  ) {
    return this.exams.history(enrollmentId, request.authSession!.user, authRequestContext(request));
  }

  @Get('exams/:examId/results')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.ExamResultsRead)
  results(
    @Param('examId', new ParseUUIDPipe({ version: '4' })) examId: string,
    @Req() request: Request,
  ) {
    return this.exams.results(examId, request.authSession!.user, authRequestContext(request));
  }
}
