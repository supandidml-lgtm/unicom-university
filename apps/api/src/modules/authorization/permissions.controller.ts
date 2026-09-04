import 'reflect-metadata';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PermissionCode, prisma } from '@unicom/database';
import { AuthorizationGuard } from '../auth/authorization.guard.js';
import { RequirePermissions } from '../auth/require-permissions.decorator.js';
// NestJS reads these constructors through emitted decorator metadata for runtime validation.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PaginationQueryDto } from './dto/pagination-query.dto.js';

@Controller('permissions')
export class PermissionsController {
  @Get()
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.PermissionsRead)
  async list(@Query() query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const skip = (page - 1) * pageSize;
    const [total, permissions] = await prisma.$transaction([
      prisma.permission.count(),
      prisma.permission.findMany({
        orderBy: { code: 'asc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          resource: true,
          action: true,
        },
      }),
    ]);
    return { page, pageSize, total, items: permissions };
  }
}
