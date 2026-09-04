import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthSecurityEventType,
  BrandStatus,
  CurriculumStatus,
  CurriculumVersionStatus,
  prisma,
} from '@unicom/database';
import type { Prisma } from '@unicom/database';
import type { AuthRequestContext, SafeAuthenticatedUser } from '../auth/auth.types.js';
import { AuthSecurityEventService } from '../auth/auth-security-event.service.js';
import { BrandAuthorizationService } from '../brands/brand-authorization.service.js';
import type { CreateCurriculumDto } from './dto/create-curriculum.dto.js';
import type { CreateModuleDto } from './dto/create-module.dto.js';
import type { CreateVersionDto } from './dto/create-version.dto.js';
import type { CreateWeekDto } from './dto/create-week.dto.js';
import type { OrderDto } from './dto/order.dto.js';
import type { UpdateCurriculumDto } from './dto/update-curriculum.dto.js';
import type { UpdateModuleDto } from './dto/update-module.dto.js';
import type { UpdateWeekDto } from './dto/update-week.dto.js';

const versionInclude = {
  curriculum: { include: { brand: true } },
  weeks: {
    include: {
      modules: {
        orderBy: { sortOrder: 'asc' },
        include: {
          materials: {
            orderBy: { sortOrder: 'asc' },
            include: {
              fileAsset: {
                select: {
                  id: true,
                  originalFileName: true,
                  mimeType: true,
                  sizeBytes: true,
                  status: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { weekNumber: 'asc' },
  },
} satisfies Prisma.CurriculumVersionInclude;

type CurriculumWithSummary = Prisma.CurriculumGetPayload<{
  include: { brand: true; versions: { include: { weeks: true } } };
}>;
type CurriculumVersionWithDetails = Prisma.CurriculumVersionGetPayload<{
  include: typeof versionInclude;
}>;

@Injectable()
export class CurriculumService {
  constructor(
    @Inject(BrandAuthorizationService)
    private readonly brandAuthorization: BrandAuthorizationService,
    @Inject(AuthSecurityEventService) private readonly securityEvents: AuthSecurityEventService,
  ) {}

  async list(actor: SafeAuthenticatedUser) {
    const ids = (await this.brandAuthorization.isSuperAdministrator(actor))
      ? undefined
      : await this.brandAuthorization.listAccessibleBrandIds(actor);
    const items = await prisma.curriculum.findMany({
      where: ids === undefined ? {} : { brandId: { in: ids } },
      include: { brand: true, versions: { include: { weeks: true } } },
      orderBy: [{ brand: { code: 'asc' } }, { code: 'asc' }],
    });
    return { items: items.map((item) => this.curriculumView(item)) };
  }

  async get(curriculumId: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const curriculum = await this.findCurriculum(curriculumId);
    await this.brandAuthorization.assertBrandAccess(actor, curriculum.brandId, context);
    return this.curriculumView(curriculum);
  }

  async create(
    dto: CreateCurriculumDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const brand = await this.brandAuthorization.assertBrandAccess(actor, dto.brandId, context);
    if (brand.status !== BrandStatus.ACTIVE)
      throw new BadRequestException('Archived Brands cannot receive curricula.');
    try {
      const curriculum = await prisma.curriculum.create({
        data: {
          brandId: brand.id,
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          ...(dto.description === undefined ? {} : { description: dto.description.trim() }),
          createdByUserId: actor.id,
        },
        include: { brand: true, versions: { include: { weeks: true } } },
      });
      await this.record(AuthSecurityEventType.CURRICULUM_CREATED, actor, context, {
        curriculumId: curriculum.id,
        brandId: brand.id,
        curriculumCode: curriculum.code,
      });
      return this.curriculumView(curriculum);
    } catch (error) {
      if (this.unique(error))
        throw new ConflictException('Curriculum code already exists for this Brand.');
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateCurriculumDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const curriculum = await this.findCurriculum(id);
    await this.brandAuthorization.assertBrandAccess(actor, curriculum.brandId, context);
    if (dto.name === undefined && dto.description === undefined)
      throw new BadRequestException('At least one mutable Curriculum field is required.');
    const updated = await prisma.curriculum.update({
      where: { id },
      data: {
        ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
        ...(dto.description === undefined ? {} : { description: dto.description.trim() }),
      },
      include: { brand: true, versions: { include: { weeks: true } } },
    });
    await this.record(AuthSecurityEventType.CURRICULUM_UPDATED, actor, context, {
      curriculumId: id,
    });
    return this.curriculumView(updated);
  }

  async archive(id: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const curriculum = await this.findCurriculum(id);
    await this.brandAuthorization.assertBrandAccess(actor, curriculum.brandId, context);
    const archived = await prisma.curriculum.update({
      where: { id },
      data: { status: CurriculumStatus.ARCHIVED, archivedAt: new Date() },
      include: { brand: true, versions: { include: { weeks: true } } },
    });
    await this.record(AuthSecurityEventType.CURRICULUM_ARCHIVED, actor, context, {
      curriculumId: id,
    });
    return this.curriculumView(archived);
  }

  async createVersion(
    curriculumId: string,
    dto: CreateVersionDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const curriculum = await this.findCurriculum(curriculumId);
    await this.brandAuthorization.assertBrandAccess(actor, curriculum.brandId, context);
    if (curriculum.status !== CurriculumStatus.ACTIVE)
      throw new BadRequestException('Archived Curricula cannot receive new versions.');
    const created = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${curriculumId}))`;
      const latest = await tx.curriculumVersion.aggregate({
        where: { curriculumId },
        _max: { versionNumber: true },
      });
      const version = await tx.curriculumVersion.create({
        data: {
          curriculumId,
          versionNumber: (latest._max.versionNumber ?? 0) + 1,
          createdByUserId: actor.id,
        },
      });
      if (!dto.cloneFromVersionId) return version;
      const source = await tx.curriculumVersion.findFirst({
        where: { id: dto.cloneFromVersionId, curriculumId },
        include: {
          weeks: {
            include: {
              modules: { include: { materials: true } },
              exams: { include: { questions: { include: { options: true } } } },
            },
          },
        },
      });
      if (!source)
        throw new BadRequestException('Clone source does not belong to this Curriculum.');
      for (const week of source.weeks) {
        const copied = await tx.curriculumWeek.create({
          data: {
            curriculumVersionId: version.id,
            weekNumber: week.weekNumber,
            title: week.title,
            description: week.description,
          },
        });
        await tx.curriculumModule.createMany({
          data: week.modules.map((module) => ({
            curriculumWeekId: copied.id,
            code: module.code,
            name: module.name,
            description: module.description,
            sortOrder: module.sortOrder,
          })),
        });
        for (const sourceModule of week.modules) {
          const targetModule = await tx.curriculumModule.findFirstOrThrow({
            where: { curriculumWeekId: copied.id, code: sourceModule.code },
          });
          if (sourceModule.materials.length > 0) {
            await tx.learningMaterial.createMany({
              data: sourceModule.materials.map((material) => ({
                curriculumModuleId: targetModule.id,
                type: material.type,
                title: material.title,
                description: material.description,
                sortOrder: material.sortOrder,
                fileAssetId: material.fileAssetId,
                createdByUserId: actor.id,
              })),
            });
          }
        }
        for (const sourceExam of week.exams) {
          const sourceModule = sourceExam.curriculumModuleId
            ? week.modules.find((module) => module.id === sourceExam.curriculumModuleId)
            : undefined;
          if (sourceExam.curriculumModuleId && !sourceModule)
            throw new BadRequestException('Exam module does not belong to its Curriculum week.');
          const targetModule = sourceModule
            ? await tx.curriculumModule.findFirstOrThrow({
                where: { curriculumWeekId: copied.id, code: sourceModule.code },
              })
            : undefined;
          await tx.exam.create({
            data: {
              curriculumVersionId: version.id,
              curriculumWeekId: copied.id,
              ...(targetModule ? { curriculumModuleId: targetModule.id } : {}),
              code: sourceExam.code,
              title: sourceExam.title,
              description: sourceExam.description,
              passingScoreBasisPoints: sourceExam.passingScoreBasisPoints,
              maxAttempts: sourceExam.maxAttempts,
              createdByUserId: actor.id,
              questions: {
                create: sourceExam.questions.map((question) => ({
                  type: question.type,
                  prompt: question.prompt,
                  explanation: question.explanation,
                  sortOrder: question.sortOrder,
                  points: question.points,
                  // A cloned question must receive fresh human review before a new version publishes.
                  status: 'DRAFT',
                  options: {
                    create: question.options.map((option) => ({
                      text: option.text,
                      sortOrder: option.sortOrder,
                      isCorrect: option.isCorrect,
                    })),
                  },
                })),
              },
            },
          });
        }
      }
      return version;
    });
    await this.record(
      dto.cloneFromVersionId
        ? AuthSecurityEventType.CURRICULUM_VERSION_CLONED
        : AuthSecurityEventType.CURRICULUM_VERSION_CREATED,
      actor,
      context,
      { curriculumId, curriculumVersionId: created.id },
    );
    return this.getVersion(created.id, actor, context);
  }

  async getVersion(id: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const version = await this.findVersion(id);
    await this.brandAuthorization.assertBrandAccess(actor, version.curriculum.brandId, context);
    return this.versionView(version);
  }
  async listVersions(
    curriculumId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const curriculum = await this.findCurriculum(curriculumId);
    await this.brandAuthorization.assertBrandAccess(actor, curriculum.brandId, context);
    const versions = await prisma.curriculumVersion.findMany({
      where: { curriculumId },
      include: versionInclude,
      orderBy: { versionNumber: 'desc' },
    });
    return { items: versions.map((version) => this.versionView(version)) };
  }

  async publish(id: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const version = await this.findVersion(id);
    await this.brandAuthorization.assertBrandAccess(actor, version.curriculum.brandId, context);
    const published = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${version.curriculumId}))`;
      const current = await tx.curriculumVersion.findUnique({
        where: { id },
        include: versionInclude,
      });
      if (!current) throw new NotFoundException('Curriculum version not found.');
      if (current.curriculum.status !== CurriculumStatus.ACTIVE)
        throw new BadRequestException('Archived Curricula cannot publish versions.');
      if (current.status !== CurriculumVersionStatus.DRAFT)
        throw new BadRequestException('Only draft curriculum versions can be published.');
      const numbers = current.weeks.map((week) => week.weekNumber).sort((a, b) => a - b);
      if (numbers.length === 0 || numbers.some((number, index) => number !== index + 1))
        throw new BadRequestException('Week numbers must be contiguous before publication.');
      const unavailableAssetCount = await tx.learningMaterial.count({
        where: {
          curriculumModule: { curriculumWeek: { curriculumVersionId: current.id } },
          fileAsset: { status: { not: 'READY' } },
        },
      });
      if (unavailableAssetCount > 0)
        throw new BadRequestException(
          'Every Curriculum Material asset must be ready before publication.',
        );
      const previous = await tx.curriculumVersion.findMany({
        where: { curriculumId: current.curriculumId, status: CurriculumVersionStatus.PUBLISHED },
        select: { id: true },
      });
      await tx.curriculumVersion.updateMany({
        where: { id: { in: previous.map((item) => item.id) } },
        data: { status: CurriculumVersionStatus.RETIRED, retiredAt: new Date() },
      });
      if (previous.length > 0) {
        await tx.authSecurityEvent.createMany({
          data: previous.map((item) => ({
            eventType: AuthSecurityEventType.CURRICULUM_VERSION_RETIRED,
            userId: actor.id,
            requestId: context.requestId,
            metadata: { curriculumId: current.curriculumId, curriculumVersionId: item.id },
          })),
        });
      }
      return tx.curriculumVersion.update({
        where: { id },
        data: {
          status: CurriculumVersionStatus.PUBLISHED,
          publishedAt: new Date(),
          publishedByUserId: actor.id,
        },
        include: versionInclude,
      });
    });
    await this.record(AuthSecurityEventType.CURRICULUM_VERSION_PUBLISHED, actor, context, {
      curriculumVersionId: id,
      curriculumId: version.curriculumId,
    });
    return this.versionView(published);
  }

  async addWeek(
    versionId: string,
    dto: CreateWeekDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const version = await this.draftVersion(versionId, actor, context);
    try {
      const week = await prisma.curriculumWeek.create({
        data: {
          curriculumVersionId: version.id,
          weekNumber: dto.weekNumber,
          title: dto.title.trim(),
          ...(dto.description === undefined ? {} : { description: dto.description.trim() }),
        },
      });
      await this.record(AuthSecurityEventType.CURRICULUM_WEEK_CREATED, actor, context, {
        curriculumVersionId: version.id,
        curriculumWeekId: week.id,
      });
      return week;
    } catch (error) {
      if (this.unique(error))
        throw new ConflictException('Week number already exists in this Curriculum version.');
      throw error;
    }
  }

  async updateWeek(
    weekId: string,
    dto: UpdateWeekDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const week = await prisma.curriculumWeek.findUnique({ where: { id: weekId } });
    if (!week) throw new NotFoundException('Curriculum week not found.');
    await this.draftVersion(week.curriculumVersionId, actor, context);
    if (dto.weekNumber === undefined && dto.title === undefined && dto.description === undefined)
      throw new BadRequestException('At least one mutable Week field is required.');
    try {
      const updated = await prisma.curriculumWeek.update({
        where: { id: weekId },
        data: {
          ...(dto.weekNumber === undefined ? {} : { weekNumber: dto.weekNumber }),
          ...(dto.title === undefined ? {} : { title: dto.title.trim() }),
          ...(dto.description === undefined ? {} : { description: dto.description.trim() }),
        },
      });
      await this.record(AuthSecurityEventType.CURRICULUM_WEEK_UPDATED, actor, context, {
        curriculumWeekId: weekId,
      });
      return updated;
    } catch (error) {
      if (this.unique(error))
        throw new ConflictException('Week number already exists in this Curriculum version.');
      throw error;
    }
  }

  async deleteWeek(weekId: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const week = await prisma.curriculumWeek.findUnique({ where: { id: weekId } });
    if (!week) throw new NotFoundException('Curriculum week not found.');
    await this.draftVersion(week.curriculumVersionId, actor, context);
    await prisma.curriculumWeek.delete({ where: { id: weekId } });
    await this.record(AuthSecurityEventType.CURRICULUM_WEEK_REMOVED, actor, context, {
      curriculumWeekId: weekId,
    });
  }
  async reorderWeeks(
    versionId: string,
    dto: OrderDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    await this.draftVersion(versionId, actor, context);
    const weeks = await prisma.curriculumWeek.findMany({
      where: { curriculumVersionId: versionId },
      select: { id: true },
    });
    this.assertFullOrder(
      weeks.map((week) => week.id),
      dto.ids,
    );
    await prisma.$transaction(async (tx) => {
      for (const [index, id] of dto.ids.entries()) {
        await tx.curriculumWeek.update({
          where: { id },
          data: { weekNumber: -1_000_000 - index },
        });
      }
      for (const [index, id] of dto.ids.entries()) {
        await tx.curriculumWeek.update({ where: { id }, data: { weekNumber: index + 1 } });
      }
    });
    await this.record(AuthSecurityEventType.CURRICULUM_WEEK_REORDERED, actor, context, {
      curriculumVersionId: versionId,
    });
  }
  async addModule(
    weekId: string,
    dto: CreateModuleDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const week = await prisma.curriculumWeek.findUnique({
      where: { id: weekId },
      include: { modules: true },
    });
    if (!week) throw new NotFoundException('Curriculum week not found.');
    await this.draftVersion(week.curriculumVersionId, actor, context);
    try {
      const lastModule = await prisma.curriculumModule.aggregate({
        where: { curriculumWeekId: weekId },
        _max: { sortOrder: true },
      });
      const module = await prisma.curriculumModule.create({
        data: {
          curriculumWeekId: weekId,
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          ...(dto.description === undefined ? {} : { description: dto.description.trim() }),
          sortOrder: (lastModule._max.sortOrder ?? 0) + 1,
        },
      });
      await this.record(AuthSecurityEventType.CURRICULUM_MODULE_CREATED, actor, context, {
        curriculumWeekId: weekId,
        curriculumModuleId: module.id,
      });
      return module;
    } catch (error) {
      if (this.unique(error))
        throw new ConflictException('Module code already exists in this Curriculum week.');
      throw error;
    }
  }
  async updateModule(
    moduleId: string,
    dto: UpdateModuleDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const module = await prisma.curriculumModule.findUnique({
      where: { id: moduleId },
      include: { curriculumWeek: true },
    });
    if (!module) throw new NotFoundException('Curriculum module not found.');
    await this.draftVersion(module.curriculumWeek.curriculumVersionId, actor, context);
    if (
      dto.code === undefined &&
      dto.name === undefined &&
      dto.description === undefined &&
      dto.sortOrder === undefined
    )
      throw new BadRequestException('At least one mutable Module field is required.');
    try {
      const updated = await prisma.curriculumModule.update({
        where: { id: moduleId },
        data: {
          ...(dto.code === undefined ? {} : { code: dto.code.trim().toUpperCase() }),
          ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
          ...(dto.description === undefined ? {} : { description: dto.description.trim() }),
          ...(dto.sortOrder === undefined ? {} : { sortOrder: dto.sortOrder }),
        },
      });
      await this.record(AuthSecurityEventType.CURRICULUM_MODULE_UPDATED, actor, context, {
        curriculumModuleId: moduleId,
      });
      return updated;
    } catch (error) {
      if (this.unique(error))
        throw new ConflictException('Module code already exists in this Curriculum week.');
      throw error;
    }
  }
  async deleteModule(moduleId: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const module = await prisma.curriculumModule.findUnique({
      where: { id: moduleId },
      include: { curriculumWeek: true },
    });
    if (!module) throw new NotFoundException('Curriculum module not found.');
    await this.draftVersion(module.curriculumWeek.curriculumVersionId, actor, context);
    await prisma.curriculumModule.delete({ where: { id: moduleId } });
    await this.record(AuthSecurityEventType.CURRICULUM_MODULE_REMOVED, actor, context, {
      curriculumModuleId: moduleId,
    });
  }
  async reorderModules(
    weekId: string,
    dto: OrderDto,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const week = await prisma.curriculumWeek.findUnique({
      where: { id: weekId },
      include: { modules: true },
    });
    if (!week) throw new NotFoundException('Curriculum week not found.');
    await this.draftVersion(week.curriculumVersionId, actor, context);
    this.assertFullOrder(
      week.modules.map((module) => module.id),
      dto.ids,
    );
    await prisma.$transaction(
      dto.ids.map((id, index) =>
        prisma.curriculumModule.update({ where: { id }, data: { sortOrder: index + 1 } }),
      ),
    );
    await this.record(AuthSecurityEventType.CURRICULUM_MODULE_REORDERED, actor, context, {
      curriculumWeekId: weekId,
    });
  }
  private async draftVersion(
    id: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const version = await this.findVersion(id);
    await this.brandAuthorization.assertBrandAccess(actor, version.curriculum.brandId, context);
    if (version.curriculum.status !== CurriculumStatus.ACTIVE)
      throw new BadRequestException('Archived Curricula cannot be modified.');
    if (version.status !== CurriculumVersionStatus.DRAFT)
      throw new BadRequestException('Published curriculum versions cannot be modified.');
    return version;
  }
  private assertFullOrder(current: string[], submitted: string[]) {
    if (
      current.length !== submitted.length ||
      new Set(submitted).size !== submitted.length ||
      submitted.some((id) => !current.includes(id))
    )
      throw new BadRequestException('Order must contain every current item exactly once.');
  }

  private async findCurriculum(id: string) {
    const value = await prisma.curriculum.findUnique({
      where: { id },
      include: { brand: true, versions: { include: { weeks: true } } },
    });
    if (!value) throw new NotFoundException('Curriculum not found.');
    return value;
  }
  private async findVersion(id: string) {
    const value = await prisma.curriculumVersion.findUnique({
      where: { id },
      include: versionInclude,
    });
    if (!value) throw new NotFoundException('Curriculum version not found.');
    return value;
  }
  private curriculumView(value: CurriculumWithSummary) {
    return {
      id: value.id,
      brand: { id: value.brand.id, code: value.brand.code, name: value.brand.name },
      code: value.code,
      name: value.name,
      description: value.description,
      status: value.status,
      archivedAt: value.archivedAt,
      versionCount: value.versions.length,
    };
  }
  private versionView(value: CurriculumVersionWithDetails) {
    return {
      id: value.id,
      curriculumId: value.curriculumId,
      versionNumber: value.versionNumber,
      status: value.status,
      publishedAt: value.publishedAt,
      retiredAt: value.retiredAt,
      weekCount: value.weeks.length,
      weeks: value.weeks.map((week) => ({
        id: week.id,
        weekNumber: week.weekNumber,
        title: week.title,
        description: week.description,
        modules: week.modules.map((module) => ({
          id: module.id,
          code: module.code,
          name: module.name,
          description: module.description,
          sortOrder: module.sortOrder,
          materials: module.materials.map((material) => ({
            id: material.id,
            type: material.type,
            title: material.title,
            description: material.description,
            sortOrder: material.sortOrder,
            fileAsset: material.fileAsset,
          })),
        })),
      })),
    };
  }
  private unique(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
  private record(
    type: AuthSecurityEventType,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
    metadata: Record<string, string>,
  ) {
    return this.securityEvents.record(type, context, actor.id, metadata);
  }
}
