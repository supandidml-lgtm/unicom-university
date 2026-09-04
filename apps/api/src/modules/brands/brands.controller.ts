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
import { RequirePermissions } from '../auth/require-permissions.decorator.js';
// NestJS reads these constructors through emitted decorator metadata for runtime validation.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { BrandListQueryDto } from './dto/brand-list-query.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateBrandDto } from './dto/create-brand.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UpdateBrandDto } from './dto/update-brand.dto.js';
import { BrandManagementService } from './brand-management.service.js';

@Controller('brands')
export class BrandsController {
  constructor(@Inject(BrandManagementService) private readonly brands: BrandManagementService) {}

  @Get()
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.BrandsRead)
  list(@Query() query: BrandListQueryDto, @Req() request: Request) {
    return this.brands.list(query, request.authSession!.user);
  }

  @Get(':id')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.BrandsRead)
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) brandId: string, @Req() request: Request) {
    return this.brands.get(brandId, request.authSession!.user, authRequestContext(request));
  }

  @Post()
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.BrandsCreate)
  create(@Body() dto: CreateBrandDto, @Req() request: Request) {
    this.rejectManagedFields(request, [
      'status',
      'archivedAt',
      'createdByUserId',
      'updatedByUserId',
    ]);
    return this.brands.create(dto, request.authSession!.user, authRequestContext(request));
  }

  @Patch(':id')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.BrandsUpdate)
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) brandId: string,
    @Body() dto: UpdateBrandDto,
    @Req() request: Request,
  ) {
    this.rejectManagedFields(request, [
      'code',
      'status',
      'archivedAt',
      'createdByUserId',
      'updatedByUserId',
    ]);
    return this.brands.update(brandId, dto, request.authSession!.user, authRequestContext(request));
  }

  @Patch(':id/archive')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.BrandsArchive)
  archive(
    @Param('id', new ParseUUIDPipe({ version: '4' })) brandId: string,
    @Req() request: Request,
  ) {
    return this.brands.archive(brandId, request.authSession!.user, authRequestContext(request));
  }

  @Patch(':id/reactivate')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.BrandsReactivate)
  reactivate(
    @Param('id', new ParseUUIDPipe({ version: '4' })) brandId: string,
    @Req() request: Request,
  ) {
    return this.brands.reactivate(brandId, request.authSession!.user, authRequestContext(request));
  }

  private rejectManagedFields(request: Request, fields: readonly string[]): void {
    if (typeof request.body !== 'object' || request.body === null) {
      return;
    }
    const managedField = fields.find((field) => Object.hasOwn(request.body as object, field));
    if (managedField) {
      throw new BadRequestException(`${managedField} is managed internally.`);
    }
  }
}
