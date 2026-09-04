import 'reflect-metadata';
import {
  Body,
  BadRequestException,
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
import { CurriculumService } from './curriculum.service.js';
// NestJS reads these constructors through emitted decorator metadata for runtime validation.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateCurriculumDto } from './dto/create-curriculum.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateVersionDto } from './dto/create-version.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateWeekDto } from './dto/create-week.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateModuleDto } from './dto/create-module.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { OrderDto } from './dto/order.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UpdateWeekDto } from './dto/update-week.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UpdateModuleDto } from './dto/update-module.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UpdateCurriculumDto } from './dto/update-curriculum.dto.js';

@Controller()
export class CurriculaController {
  constructor(@Inject(CurriculumService) private readonly curricula: CurriculumService) {}
  @Get('curricula')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.CurriculaRead)
  list(@Req() request: Request) {
    return this.curricula.list(request.authSession!.user);
  }
  @Post('curricula')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.CurriculaCreate)
  create(@Body() dto: CreateCurriculumDto, @Req() request: Request) {
    this.rejectManagedFields(request, [
      'id',
      'status',
      'archivedAt',
      'createdByUserId',
      'createdAt',
      'updatedAt',
      'versions',
    ]);
    return this.curricula.create(dto, request.authSession!.user, authRequestContext(request));
  }
  @Get('curricula/:id')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.CurriculaRead)
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: Request) {
    return this.curricula.get(id, request.authSession!.user, authRequestContext(request));
  }
  @Patch('curricula/:id')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.CurriculaUpdate)
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCurriculumDto,
    @Req() request: Request,
  ) {
    this.rejectManagedFields(request, [
      'id',
      'brandId',
      'code',
      'status',
      'archivedAt',
      'createdByUserId',
      'createdAt',
      'updatedAt',
      'versions',
    ]);
    return this.curricula.update(id, dto, request.authSession!.user, authRequestContext(request));
  }
  @Patch('curricula/:id/archive')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.CurriculaArchive)
  archive(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: Request) {
    return this.curricula.archive(id, request.authSession!.user, authRequestContext(request));
  }
  @Get('curricula/:id/versions')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.CurriculumVersionsRead)
  versions(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: Request) {
    return this.curricula.listVersions(id, request.authSession!.user, authRequestContext(request));
  }
  @Post('curricula/:id/versions')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.CurriculumVersionsCreate)
  createVersion(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateVersionDto,
    @Req() request: Request,
  ) {
    return this.curricula.createVersion(
      id,
      dto,
      request.authSession!.user,
      authRequestContext(request),
    );
  }
  @Get('curriculum-versions/:id')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.CurriculumVersionsRead)
  version(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: Request) {
    return this.curricula.getVersion(id, request.authSession!.user, authRequestContext(request));
  }
  @Post('curriculum-versions/:id/publish')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.CurriculumVersionsPublish)
  publish(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: Request) {
    return this.curricula.publish(id, request.authSession!.user, authRequestContext(request));
  }
  @Post('curriculum-versions/:id/weeks')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.CurriculumWeeksManage)
  addWeek(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateWeekDto,
    @Req() request: Request,
  ) {
    return this.curricula.addWeek(id, dto, request.authSession!.user, authRequestContext(request));
  }
  @Patch('curriculum-weeks/:id')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.CurriculumWeeksManage)
  updateWeek(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateWeekDto,
    @Req() request: Request,
  ) {
    return this.curricula.updateWeek(
      id,
      dto,
      request.authSession!.user,
      authRequestContext(request),
    );
  }
  @Delete('curriculum-weeks/:id')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.CurriculumWeeksManage)
  deleteWeek(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() request: Request,
  ) {
    return this.curricula.deleteWeek(id, request.authSession!.user, authRequestContext(request));
  }
  @Put('curriculum-versions/:id/weeks/order')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.CurriculumWeeksManage)
  reorderWeeks(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: OrderDto,
    @Req() request: Request,
  ) {
    return this.curricula.reorderWeeks(
      id,
      dto,
      request.authSession!.user,
      authRequestContext(request),
    );
  }
  @Post('curriculum-weeks/:id/modules')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.CurriculumModulesManage)
  addModule(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateModuleDto,
    @Req() request: Request,
  ) {
    return this.curricula.addModule(
      id,
      dto,
      request.authSession!.user,
      authRequestContext(request),
    );
  }
  @Patch('curriculum-modules/:id')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.CurriculumModulesManage)
  updateModule(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateModuleDto,
    @Req() request: Request,
  ) {
    return this.curricula.updateModule(
      id,
      dto,
      request.authSession!.user,
      authRequestContext(request),
    );
  }
  @Delete('curriculum-modules/:id')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.CurriculumModulesManage)
  deleteModule(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() request: Request,
  ) {
    return this.curricula.deleteModule(id, request.authSession!.user, authRequestContext(request));
  }
  @Put('curriculum-weeks/:id/modules/order')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.CurriculumModulesManage)
  reorderModules(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: OrderDto,
    @Req() request: Request,
  ) {
    return this.curricula.reorderModules(
      id,
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
