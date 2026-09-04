import 'reflect-metadata';
import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { PermissionCode } from '@unicom/database';
import type { Request, Response } from 'express';
import { authRequestContext } from '../auth/auth-request.js';
import { AuthorizationGuard } from '../auth/authorization.guard.js';
import { RequirePermissions } from '../auth/require-permissions.decorator.js';
// NestJS reads this constructor through emitted decorator metadata for runtime validation.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ParticipantReportQueryDto } from './dto/participant-report-query.dto.js';
import { ReportingService } from './reporting.service.js';

@Controller()
export class ReportingController {
  constructor(@Inject(ReportingService) private readonly reporting: ReportingService) {}

  @Get('reports/participants')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.ReportsRead)
  participants(@Query() query: ParticipantReportQueryDto, @Req() request: Request) {
    return this.reporting.participants(
      query,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Get('reports/filter-options')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.ReportsRead)
  filterOptions(@Req() request: Request) {
    return this.reporting.filterOptions(request.authSession!.user, authRequestContext(request));
  }

  @Get('reports/brands')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.ReportsRead)
  brands(@Query() query: ParticipantReportQueryDto, @Req() request: Request) {
    return this.reporting.brandSummary(
      query,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Get('reports/participants/:participantId/enrollments/:enrollmentId')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.ReportsRead)
  detail(
    @Param('participantId', new ParseUUIDPipe({ version: '4' })) participantId: string,
    @Param('enrollmentId', new ParseUUIDPipe({ version: '4' })) enrollmentId: string,
    @Req() request: Request,
  ) {
    return this.reporting.enrollmentDetail(
      participantId,
      enrollmentId,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Get('reports/participants/export.xlsx')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.ReportsExport)
  async export(
    @Query() query: ParticipantReportQueryDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const exportResult = await this.reporting.exportParticipants(
      query,
      request.authSession!.user,
      authRequestContext(request),
    );
    await this.reporting.recordDownload(
      request.authSession!.user,
      authRequestContext(request),
      exportResult.rowCount,
    );
    response.setHeader(
      'content-type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader('content-disposition', `attachment; filename="${exportResult.filename}"`);
    response.setHeader('content-length', exportResult.buffer.length);
    response.end(exportResult.buffer);
  }

  @Get('dashboard/admin')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.ReportsRead)
  admin(@Req() request: Request) {
    return this.reporting.dashboard(
      'admin',
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Get('dashboard/trainer')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.ReportsRead)
  trainer(@Req() request: Request) {
    return this.reporting.dashboard(
      'trainer',
      request.authSession!.user,
      authRequestContext(request),
    );
  }
}
