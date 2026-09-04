import 'reflect-metadata';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MaterialType, PermissionCode } from '@unicom/database';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { diskStorage } from 'multer';
import { authRequestContext } from '../auth/auth-request.js';
import { AuthorizationGuard } from '../auth/authorization.guard.js';
import { CsrfGuard } from '../auth/csrf.guard.js';
import { RequireAnyPermission, RequirePermissions } from '../auth/require-permissions.decorator.js';
// NestJS reads these constructors through emitted decorator metadata for runtime validation.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateMaterialDto } from './dto/create-material.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { MaterialOrderDto } from './dto/material-order.dto.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UpdateMaterialDto } from './dto/update-material.dto.js';
import { MaterialService } from './material.service.js';
import { MaterialStorageService } from './material-storage.service.js';

const quarantineDirectory = resolve(tmpdir(), 'unicom-material-quarantine');
const upload = FileInterceptor('file', {
  storage: diskStorage({
    destination: (_request, _file, callback) => {
      mkdirSync(quarantineDirectory, { recursive: true, mode: 0o700 });
      callback(null, quarantineDirectory);
    },
    filename: (_request, _file, callback) => callback(null, randomUUID()),
  }),
  limits: { files: 1, fields: 8, fileSize: 250 * 1024 * 1024 },
});

@Controller()
export class MaterialsController {
  constructor(
    @Inject(MaterialService) private readonly materials: MaterialService,
    @Inject(MaterialStorageService) private readonly storage: MaterialStorageService,
  ) {}

  @Get('curriculum-modules/:id/materials')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.MaterialsRead)
  list(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: Request) {
    return this.materials.list(id, request.authSession!.user, authRequestContext(request));
  }

  @Post('curriculum-modules/:id/materials')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.MaterialsCreate, PermissionCode.MaterialsUpload)
  @UseInterceptors(upload)
  create(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateMaterialDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: Request,
  ) {
    return this.materials.create(
      id,
      dto,
      file,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Patch('materials/:id')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.MaterialsUpdate)
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateMaterialDto,
    @Req() request: Request,
  ) {
    return this.materials.update(id, dto, request.authSession!.user, authRequestContext(request));
  }

  @Post('materials/:id/file')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.MaterialsUpdate, PermissionCode.MaterialsUpload)
  @UseInterceptors(upload)
  replaceFile(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body('type') type: MaterialType,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: Request,
  ) {
    if (!Object.values(MaterialType).includes(type))
      throw new BadRequestException('Material type is required.');
    return this.materials.replaceFile(
      id,
      type,
      file,
      request.authSession!.user,
      authRequestContext(request),
    );
  }

  @Delete('materials/:id')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.MaterialsRemove)
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() request: Request) {
    return this.materials.remove(id, request.authSession!.user, authRequestContext(request));
  }

  @Put('curriculum-modules/:id/materials/order')
  @UseGuards(AuthorizationGuard, CsrfGuard)
  @RequirePermissions(PermissionCode.MaterialsReorder)
  reorder(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: MaterialOrderDto,
    @Req() request: Request,
  ) {
    return this.materials.reorder(id, dto, request.authSession!.user, authRequestContext(request));
  }

  @Get('materials/:id/content')
  @UseGuards(AuthorizationGuard)
  @RequireAnyPermission(PermissionCode.MaterialsRead, PermissionCode.LearningContentReadSelf)
  async content(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const material = await this.materials.content(
      id,
      request.authSession!.user,
      authRequestContext(request),
    );
    const { fileAsset } = material;
    const range = this.parseRange(request.headers.range, fileAsset.sizeBytes);
    response.setHeader('Accept-Ranges', 'bytes');
    response.setHeader('Content-Type', fileAsset.mimeType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${this.safeHeaderFilename(fileAsset.originalFileName)}"`,
    );
    response.setHeader('Cache-Control', 'private, no-store');
    if (range) {
      response
        .status(206)
        .setHeader('Content-Range', `bytes ${range.start}-${range.end}/${fileAsset.sizeBytes}`);
      response.setHeader('Content-Length', range.end - range.start + 1);
      (await this.storage.stream(fileAsset.storageKey, range.start, range.end)).pipe(response);
      return;
    }
    response.setHeader('Content-Length', fileAsset.sizeBytes);
    (await this.storage.stream(fileAsset.storageKey)).pipe(response);
  }

  @Get('my-training/enrollments/:id/content')
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.LearningContentReadSelf)
  selfContent(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() request: Request,
  ) {
    return this.materials.selfContent(id, request.authSession!.user);
  }

  private parseRange(
    value: string | undefined,
    size: number,
  ): { start: number; end: number } | undefined {
    if (!value) return undefined;
    const match = /^bytes=(\d*)-(\d*)$/.exec(value);
    if (!match) throw new BadRequestException('Invalid byte range.');
    const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    const end = match[2] && match[1] ? Number(match[2]) : size - 1;
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      end < start ||
      start >= size
    )
      throw new HttpException(
        'Requested byte range is unavailable.',
        HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
      );
    return { start, end: Math.min(end, size - 1) };
  }
  private safeHeaderFilename(value: string): string {
    return value.replace(/["\\\r\n]/g, '_');
  }
}
