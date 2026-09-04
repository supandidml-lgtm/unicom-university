import { Injectable } from '@nestjs/common';
import { prisma } from '@unicom/database';
import type { AuthSecurityEventType } from '@unicom/database';
import type { AuthRequestContext } from './auth.types.js';

@Injectable()
export class AuthSecurityEventService {
  async record(
    eventType: AuthSecurityEventType,
    context: AuthRequestContext,
    userId?: string,
    metadata?: Record<string, string | number | boolean>,
  ): Promise<void> {
    await prisma.authSecurityEvent.create({
      data: {
        eventType,
        ...(userId ? { userId } : {}),
        requestId: context.requestId,
        ...(metadata ? { metadata } : {}),
      },
    });
  }
}
