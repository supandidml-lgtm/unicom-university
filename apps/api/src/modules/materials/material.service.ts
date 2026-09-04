import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { loadApiEnvironment } from '@unicom/config';
import {
  AuthSecurityEventType,
  FileAssetStatus,
  LearningMaterialProgressStatus,
  MaterialType,
  PermissionCode,
  prisma,
} from '@unicom/database';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, promises as fs } from 'node:fs';
import { basename, extname } from 'node:path';
import type { AuthRequestContext, SafeAuthenticatedUser } from '../auth/auth.types.js';
import { AuthSecurityEventService } from '../auth/auth-security-event.service.js';
import { AuthorizationService } from '../auth/authorization.service.js';
import { BrandAuthorizationService } from '../brands/brand-authorization.service.js';
import type { CreateMaterialDto } from './dto/create-material.dto.js';
import type { MaterialOrderDto } from './dto/material-order.dto.js';
import type { UpdateMaterialDto } from './dto/update-material.dto.js';
import { MaterialMalwareScannerService } from './material-malware-scanner.service.js';
import { MaterialMetadataService } from './material-metadata.service.js';
import { MaterialStorageService } from './material-storage.service.js';

type UploadFile = Express.Multer.File;
const supportedFiles: Record<MaterialType, readonly { extension: string; mime: string }[]> = {
  [MaterialType.VIDEO]: [
    { extension: '.mp4', mime: 'video/mp4' },
    { extension: '.webm', mime: 'video/webm' },
  ],
  [MaterialType.PDF]: [{ extension: '.pdf', mime: 'application/pdf' }],
  [MaterialType.IMAGE]: [
    { extension: '.jpg', mime: 'image/jpeg' },
    { extension: '.jpeg', mime: 'image/jpeg' },
    { extension: '.png', mime: 'image/png' },
    { extension: '.webp', mime: 'image/webp' },
  ],
  [MaterialType.DOCUMENT]: [
    { extension: '.txt', mime: 'text/plain' },
    {
      extension: '.docx',
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
  ],
  [MaterialType.SPREADSHEET]: [
    {
      extension: '.xlsx',
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  ],
};

@Injectable()
export class MaterialService {
  private readonly environment = loadApiEnvironment();

  constructor(
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(BrandAuthorizationService)
    private readonly brandAuthorization: BrandAuthorizationService,
    @Inject(AuthSecurityEventService) private readonly securityEvents: AuthSecurityEventService,
    @Inject(MaterialStorageService) private readonly storage: MaterialStorageService,
    @Inject(MaterialMalwareScannerService) private readonly scanner: MaterialMalwareScannerService,
    @Inject(MaterialMetadataService) private readonly metadata: MaterialMetadataService,
  ) {}

  async list(moduleId: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const module = await this.getModule(moduleId);
    await this.brandAuthorization.assertBrandAccess(
      actor,
      module.curriculumWeek.curriculumVersion.curriculum.brandId,
      context,
    );
    return prisma.learningMaterial.findMany({
      where: { curriculumModuleId: moduleId },
      include: { fileAsset: { select: this.assetMetadata } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(
    moduleId: string,
    dto: CreateMaterialDto,
    file: UploadFile | undefined,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const module = await this.assertDraftModule(moduleId, actor, context);
    const asset = await this.acceptFile(dto.type, file, actor, context);
    try {
      const material = await prisma.$transaction(async (tx) => {
        const last = await tx.learningMaterial.aggregate({
          where: { curriculumModuleId: module.id },
          _max: { sortOrder: true },
        });
        const created = await tx.learningMaterial.create({
          data: {
            curriculumModuleId: module.id,
            type: dto.type,
            title: dto.title.trim(),
            description: dto.description?.trim() || null,
            sortOrder: (last._max.sortOrder ?? -1) + 1,
            fileAssetId: asset.id,
            createdByUserId: actor.id,
          },
          include: { fileAsset: { select: this.assetMetadata } },
        });
        await tx.authSecurityEvent.create({
          data: {
            eventType: AuthSecurityEventType.MATERIAL_CREATED,
            userId: actor.id,
            requestId: context.requestId,
            metadata: { materialId: created.id, moduleId },
          },
        });
        return created;
      });
      return material;
    } catch (error) {
      await this.deleteOrphanAsset(asset.id, asset.storageKey);
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateMaterialDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const material = await this.assertDraftMaterial(id, actor, context);
    const updated = await prisma.learningMaterial.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
      },
      include: { fileAsset: { select: this.assetMetadata } },
    });
    await this.record(AuthSecurityEventType.MATERIAL_UPDATED, actor, context, {
      materialId: material.id,
    });
    return updated;
  }

  async replaceFile(
    id: string,
    type: MaterialType,
    file: UploadFile | undefined,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const material = await this.assertDraftMaterial(id, actor, context);
    if (material.type !== type)
      throw new BadRequestException('Replacement file type must match the material type.');
    const asset = await this.acceptFile(type, file, actor, context);
    const oldAssetId = material.fileAssetId;
    try {
      await prisma.learningMaterial.update({ where: { id }, data: { fileAssetId: asset.id } });
      await this.record(AuthSecurityEventType.MATERIAL_FILE_REPLACED, actor, context, {
        materialId: id,
      });
      await this.deleteOrphanAsset(oldAssetId, material.fileAsset.storageKey);
      return prisma.learningMaterial.findUniqueOrThrow({
        where: { id },
        include: { fileAsset: { select: this.assetMetadata } },
      });
    } catch (error) {
      await this.deleteOrphanAsset(asset.id, asset.storageKey);
      throw error;
    }
  }

  async remove(id: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const material = await this.assertDraftMaterial(id, actor, context);
    await prisma.learningMaterial.delete({ where: { id } });
    await this.record(AuthSecurityEventType.MATERIAL_REMOVED, actor, context, { materialId: id });
    await this.deleteOrphanAsset(material.fileAssetId, material.fileAsset.storageKey);
    return { id };
  }

  async reorder(
    moduleId: string,
    dto: MaterialOrderDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    await this.assertDraftModule(moduleId, actor, context);
    if (new Set(dto.materialIds).size !== dto.materialIds.length)
      throw new BadRequestException('Material IDs must be unique.');
    const existing = await prisma.learningMaterial.findMany({
      where: { curriculumModuleId: moduleId },
      select: { id: true },
    });
    if (
      existing.length !== dto.materialIds.length ||
      existing.some(({ id }) => !dto.materialIds.includes(id))
    )
      throw new BadRequestException(
        'Order must include every material in the module exactly once.',
      );
    await prisma.$transaction(
      dto.materialIds.map((id, sortOrder) =>
        prisma.learningMaterial.update({ where: { id }, data: { sortOrder } }),
      ),
    );
    await this.record(AuthSecurityEventType.MATERIAL_REORDERED, actor, context, { moduleId });
    return { materialIds: dto.materialIds };
  }

  async content(id: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const material = await prisma.learningMaterial.findUnique({
      where: { id },
      include: {
        fileAsset: true,
        curriculumModule: {
          include: {
            curriculumWeek: { include: { curriculumVersion: { include: { curriculum: true } } } },
          },
        },
      },
    });
    if (!material || material.fileAsset.status !== FileAssetStatus.READY)
      throw new NotFoundException('Material content is unavailable.');
    const versionId = material.curriculumModule.curriculumWeek.curriculumVersionId;
    const canManage = await this.authorization.hasPermission(actor, PermissionCode.MaterialsRead);
    if (canManage) {
      await this.brandAuthorization.assertBrandAccess(
        actor,
        material.curriculumModule.curriculumWeek.curriculumVersion.curriculum.brandId,
        context,
      );
    } else {
      const enrollment = await prisma.trainingEnrollment.findFirst({
        where: {
          participantUserId: actor.id,
          curriculumVersionId: versionId,
          status: { not: 'CANCELLED' },
        },
        select: { id: true },
      });
      if (!enrollment) {
        await this.record(AuthSecurityEventType.MATERIAL_ACCESS_DENIED, actor, context, {
          materialId: id,
        });
        throw new ForbiddenException('No enrollment grants access to this material.');
      }
    }
    return material;
  }

  async selfContent(enrollmentId: string, actor: SafeAuthenticatedUser) {
    const enrollment = await prisma.trainingEnrollment.findUnique({
      where: { id: enrollmentId },
      select: { participantUserId: true, curriculumVersionId: true, status: true },
    });
    if (
      !enrollment ||
      enrollment.participantUserId !== actor.id ||
      enrollment.status === 'CANCELLED'
    )
      throw new ForbiddenException('Access denied.');
    if (!enrollment.curriculumVersionId)
      return { enrollmentId, curriculumVersionId: null, weeks: [] };
    const version = await prisma.curriculumVersion.findUniqueOrThrow({
      where: { id: enrollment.curriculumVersionId },
      select: {
        id: true,
        weeks: {
          orderBy: { weekNumber: 'asc' },
          select: {
            id: true,
            weekNumber: true,
            title: true,
            modules: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                code: true,
                name: true,
                materials: {
                  where: { fileAsset: { status: FileAssetStatus.READY } },
                  orderBy: { sortOrder: 'asc' },
                  select: {
                    id: true,
                    type: true,
                    title: true,
                    description: true,
                    fileAsset: { select: this.participantAssetMetadata },
                  },
                },
              },
            },
          },
        },
      },
    });
    const progressRows = await prisma.learningMaterialProgress.findMany({
      where: { enrollmentId },
      select: {
        materialId: true,
        status: true,
        progressBasisPoints: true,
        completedAt: true,
      },
    });
    const progressByMaterialId = new Map(progressRows.map((row) => [row.materialId, row]));
    return {
      enrollmentId,
      curriculumVersionId: version.id,
      weeks: version.weeks.map((week) => ({
        ...week,
        modules: week.modules.map((module) => ({
          ...module,
          materials: module.materials.map((material) => {
            const progress = progressByMaterialId.get(material.id);
            return {
              ...material,
              progress: progress
                ? {
                    status: progress.status,
                    progressPercent: progress.progressBasisPoints / 100,
                    completedAt: progress.completedAt,
                  }
                : {
                    status: LearningMaterialProgressStatus.NOT_STARTED,
                    progressPercent: 0,
                    completedAt: null,
                  },
            };
          }),
        })),
      })),
    };
  }

  private async acceptFile(
    type: MaterialType,
    file: UploadFile | undefined,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    if (!file?.path) throw new BadRequestException('One material file is required.');
    try {
      const metadata = await this.validateFile(type, file);
      const storageKey = `materials/${randomUUID()}`;
      const asset = await prisma.fileAsset.create({
        data: {
          storageProvider: this.environment.MATERIAL_STORAGE_PROVIDER,
          storageKey,
          originalFileName: metadata.name,
          mimeType: metadata.mime,
          detectedExtension: metadata.extension,
          sizeBytes: file.size,
          sha256: metadata.sha256,
          status: FileAssetStatus.QUARANTINED,
          createdByUserId: actor.id,
        },
      });
      await this.record(AuthSecurityEventType.FILE_ASSET_UPLOADED, actor, context, {
        fileAssetId: asset.id,
        sizeBytes: file.size,
      });
      const scan = await this.scanner.scan(file.path);
      if (scan !== 'clean') {
        await prisma.fileAsset.update({
          where: { id: asset.id },
          data: { status: scan === 'infected' ? FileAssetStatus.REJECTED : FileAssetStatus.FAILED },
        });
        await this.record(AuthSecurityEventType.FILE_ASSET_REJECTED, actor, context, {
          fileAssetId: asset.id,
          infected: scan === 'infected',
        });
        throw scan === 'infected'
          ? new BadRequestException('File rejected by malware scanner.')
          : new ServiceUnavailableException('File scanner unavailable; upload was rejected.');
      }
      const extractedMetadata = await this.metadata.extract(type, file.path);
      await this.storage.putFromQuarantine(storageKey, file.path);
      const ready = await prisma.fileAsset.update({
        where: { id: asset.id },
        data: { status: FileAssetStatus.READY, ...extractedMetadata },
      });
      await this.record(AuthSecurityEventType.FILE_ASSET_READY, actor, context, {
        fileAssetId: asset.id,
      });
      return ready;
    } finally {
      await fs.rm(file.path, { force: true }).catch(() => undefined);
    }
  }

  private async validateFile(type: MaterialType, file: UploadFile) {
    const name = this.safeFileName(file.originalname);
    const extension = extname(name).toLowerCase();
    const allowed = supportedFiles[type].find((candidate) => candidate.extension === extension);
    if (!allowed || file.mimetype !== allowed.mime)
      throw new BadRequestException(
        'File extension or declared MIME type is not permitted for this material type.',
      );
    const maxMb =
      type === MaterialType.VIDEO
        ? this.environment.MATERIAL_MAX_VIDEO_MB
        : type === MaterialType.IMAGE
          ? this.environment.MATERIAL_MAX_IMAGE_MB
          : this.environment.MATERIAL_MAX_DOCUMENT_MB;
    if (file.size < 1 || file.size > maxMb * 1024 * 1024)
      throw new BadRequestException('File exceeds the size limit for this material type.');
    const header = await this.header(file.path);
    if (!this.hasExpectedSignature(type, extension, header))
      throw new BadRequestException('File content does not match its declared type.');
    if (extension === '.docx' && !(await this.isOfficeDocument(file.path, 'word/')))
      throw new BadRequestException('DOCX content is invalid.');
    if (extension === '.xlsx' && !(await this.isOfficeDocument(file.path, 'xl/')))
      throw new BadRequestException('XLSX content is invalid.');
    return { name, extension, mime: allowed.mime, sha256: await this.sha256(file.path) };
  }

  private hasExpectedSignature(type: MaterialType, extension: string, header: Buffer): boolean {
    if (extension === '.pdf') return header.subarray(0, 5).toString() === '%PDF-';
    if (extension === '.png')
      return header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (extension === '.jpg' || extension === '.jpeg')
      return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    if (extension === '.webp')
      return (
        header.subarray(0, 4).toString() === 'RIFF' && header.subarray(8, 12).toString() === 'WEBP'
      );
    if (extension === '.mp4') return header.subarray(4, 8).toString() === 'ftyp';
    if (extension === '.webm')
      return header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3;
    if (extension === '.docx' || extension === '.xlsx')
      return header[0] === 0x50 && header[1] === 0x4b;
    return type === MaterialType.DOCUMENT && extension === '.txt' && !header.includes(0);
  }

  private safeFileName(original: string): string {
    const normalized = original.normalize('NFC').trim();
    if (
      !normalized ||
      normalized.length > 180 ||
      /[\\/\0\r\n]/.test(normalized) ||
      normalized.includes('..') ||
      basename(normalized) !== normalized
    )
      throw new BadRequestException('Unsafe file name.');
    return normalized;
  }
  private async header(path: string): Promise<Buffer> {
    const handle = await fs.open(path, 'r');
    try {
      const buffer = Buffer.alloc(512);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      return buffer.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  }
  private async sha256(path: string): Promise<string> {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    return hash.digest('hex');
  }
  private async isOfficeDocument(path: string, requiredDirectory: string): Promise<boolean> {
    let previous = Buffer.alloc(0);
    let hasContentTypes = false;
    let hasRequiredDirectory = false;
    for await (const chunk of createReadStream(path, { highWaterMark: 64 * 1024 })) {
      const bytes = Buffer.concat([previous, Buffer.from(chunk)]);
      hasContentTypes ||= bytes.includes(Buffer.from('[Content_Types].xml'));
      hasRequiredDirectory ||= bytes.includes(Buffer.from(requiredDirectory));
      if (hasContentTypes && hasRequiredDirectory) return true;
      previous = bytes.subarray(Math.max(0, bytes.length - 64));
    }
    return false;
  }
  private async getModule(id: string) {
    const module = await prisma.curriculumModule.findUnique({
      where: { id },
      include: {
        curriculumWeek: { include: { curriculumVersion: { include: { curriculum: true } } } },
      },
    });
    if (!module) throw new NotFoundException('Curriculum module not found.');
    return module;
  }
  private async assertDraftModule(
    id: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const module = await this.getModule(id);
    if (module.curriculumWeek.curriculumVersion.status !== 'DRAFT')
      throw new BadRequestException('Materials can only be changed in a Draft curriculum version.');
    await this.brandAuthorization.assertBrandAccess(
      actor,
      module.curriculumWeek.curriculumVersion.curriculum.brandId,
      context,
    );
    return module;
  }
  private async assertDraftMaterial(
    id: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const material = await prisma.learningMaterial.findUnique({
      where: { id },
      include: {
        fileAsset: true,
        curriculumModule: {
          include: {
            curriculumWeek: { include: { curriculumVersion: { include: { curriculum: true } } } },
          },
        },
      },
    });
    if (!material) throw new NotFoundException('Material not found.');
    if (material.curriculumModule.curriculumWeek.curriculumVersion.status !== 'DRAFT')
      throw new BadRequestException('Materials can only be changed in a Draft curriculum version.');
    await this.brandAuthorization.assertBrandAccess(
      actor,
      material.curriculumModule.curriculumWeek.curriculumVersion.curriculum.brandId,
      context,
    );
    return material;
  }
  private async deleteOrphanAsset(id: string, key: string) {
    const references = await prisma.learningMaterial.count({ where: { fileAssetId: id } });
    if (!references) {
      await prisma.fileAsset.delete({ where: { id } }).catch(() => undefined);
      await this.storage.remove(key).catch(() => undefined);
    }
  }
  private async record(
    type: AuthSecurityEventType,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
    metadata: Record<string, string | number | boolean>,
  ) {
    await this.securityEvents.record(type, context, actor.id, metadata);
  }
  private readonly assetMetadata = {
    id: true,
    originalFileName: true,
    mimeType: true,
    detectedExtension: true,
    sizeBytes: true,
    sha256: true,
    status: true,
    createdAt: true,
  } as const;
  private readonly participantAssetMetadata = {
    originalFileName: true,
    mimeType: true,
    sizeBytes: true,
    durationMs: true,
    pageCount: true,
  } as const;
}
