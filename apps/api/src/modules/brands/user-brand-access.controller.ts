import 'reflect-metadata';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { AssignBrandAccessDto } from './dto/assign-brand-access.dto.js';
import { BrandManagementService } from './brand-management.service.js';

@Controller('users')
export class UserBrandAccessController {
  constructor(@Inject(BrandManagementService) private readonly brands: BrandManagementService) {}

  @Get(':userId/brand-access')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.BrandAccessRead)
  list(@Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string) {
    return this.brands.listUserBrandAccess(userId);
  }

  @Post(':userId/brand-access')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.BrandAccessAssign)
  assign(
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() dto: AssignBrandAccessDto,
    @Req() request: Request,
  ) {
    return this.brands.assignUserBrandAccess(
      userId,
      dto,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Delete(':userId/brand-access/:brandId')
  @HttpCode(204)
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.BrandAccessRemove)
  async remove(
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Param('brandId', new ParseUUIDPipe({ version: '4' })) brandId: string,
    @Req() request: Request,
  ): Promise<void> {
    await this.brands.removeUserBrandAccess(
      userId,
      brandId,
      request.authSession!.user,
      authRequestContext(request),
    );
  }
}
