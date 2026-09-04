import 'reflect-metadata';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PermissionCode, prisma } from '@unicom/database';
import { AuthorizationGuard } from '../auth/authorization.guard.js';
import { RequirePermissions } from '../auth/require-permissions.decorator.js';
// NestJS reads these constructors through emitted decorator metadata for runtime validation.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PaginationQueryDto } from './dto/pagination-query.dto.js';

@Controller('system/auth-events')
export class AuthEventsController {
  @Get()
  @UseGuards(AuthorizationGuard)
  @RequirePermissions(PermissionCode.SystemAuthEventsRead)
  async list(@Query() query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const skip = (page - 1) * pageSize;
    const [total, events] = await prisma.$transaction([
      prisma.authSecurityEvent.count(),
      prisma.authSecurityEvent.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          eventType: true,
          userId: true,
          requestId: true,
          metadata: true,
          createdAt: true,
        },
      }),
    ]);
    return { page, pageSize, total, items: events };
  }
}
