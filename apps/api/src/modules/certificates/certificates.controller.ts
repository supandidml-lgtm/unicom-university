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
  Res,
  UseGuards,
} from '@nestjs/common';
import { PermissionCode } from '@unicom/database';
import type { Request, Response } from 'express';
import { authRequestContext } from '../auth/auth-request.js';
import { AuthorizationGuard } from '../auth/authorization.guard.js';
import { CsrfGuard } from '../auth/csrf.guard.js';
import { RequireAnyPermission, RequirePermissions } from '../auth/require-permissions.decorator.js';
// NestJS reads this constructor through emitted decorator metadata for runtime validation.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RevokeCertificateDto } from './dto/revoke-certificate.dto.js';
import { CertificateService } from './certificate.service.js';

@Controller()
export class CertificatesController {
  constructor(@Inject(CertificateService) private readonly certificates: CertificateService) {}

  @Get('my-training/certificates')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.CertificatesReadSelf)
  listSelf(@Req() request: Request) {
    return this.certificates.listSelf(request.authSession!.user, authRequestContext(request));
  }

  @Get('my-training/certificates/:id/download')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.CertificatesReadSelf)
  async downloadSelf(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const document = await this.certificates.download(
      id,
      request.authSession!.user,
      authRequestContext(request),
    );
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'private, no-store');
    document.stream.pipe(response);
  }

  @Post('enrollments/:id/certificate')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.CertificatesIssue)
  issue(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: Request) {
    return this.certificates.issue(id, request.authSession!.user, authRequestContext(request));
  }

  @Get('certificates/:id')
  @UseGuards(AuthorizationGuard)
  @RequireAnyPermission(PermissionCode.CertificatesRead, PermissionCode.CertificatesReadSelf)
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: Request) {
    return this.certificates.get(id, request.authSession!.user, authRequestContext(request));
  }

  @Get('certificates/:id/download')
  @UseGuards(AuthorizationGuard)
  @RequireAnyPermission(PermissionCode.CertificatesRead, PermissionCode.CertificatesReadSelf)
  async download(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const document = await this.certificates.download(
      id,
      request.authSession!.user,
      authRequestContext(request),
    );
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'private, no-store');
    document.stream.pipe(response);
  }

  @Post('certificates/:id/revoke')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.CertificatesRevoke)
  revoke(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RevokeCertificateDto,
    @Req() request: Request,
  ) {
    return this.certificates.revoke(
      id,
      dto.reason,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Post('certificates/:id/regenerate')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.CertificatesIssue)
  regenerate(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() request: Request,
  ) {
    return this.certificates.regenerate(id, request.authSession!.user, authRequestContext(request));
  }
}
