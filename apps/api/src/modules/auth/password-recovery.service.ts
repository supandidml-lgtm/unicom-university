import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AuthSecurityEventType, UserStatus, prisma } from '@unicom/database';
import { hashOpaqueToken, normalizeEmail } from './auth.crypto.js';
import type { AuthRequestContext } from './auth.types.js';
import type { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import type { ResetPasswordDto } from './dto/reset-password.dto.js';
import { NotificationService } from '../notifications/notification.service.js';
import { PasswordService } from './password.service.js';
import { RecoveryRateLimitService } from './recovery-rate-limit.service.js';

const genericResetResponse = {
  message: 'If this account is eligible, password reset instructions will be sent.',
};

@Injectable()
export class PasswordRecoveryService {
  constructor(
    @Inject(PasswordService) private readonly passwords: PasswordService,
    @Inject(RecoveryRateLimitService) private readonly rateLimit: RecoveryRateLimitService,
    @Inject(NotificationService) private readonly notifications: NotificationService,
  ) {}

  async forgot(dto: ForgotPasswordDto, context: AuthRequestContext, ipAddress: string) {
    const normalizedEmail = normalizeEmail(dto.email);
    const accepted = await this.rateLimit.consume('forgot', normalizedEmail, ipAddress);
    const user = await prisma.user.findUnique({ where: { normalizedEmail } });
    // Equalize work for unknown and ineligible email addresses; neither can cause delivery.
    if (!user || user.status !== UserStatus.ACTIVE || !accepted) {
      await this.passwords.verifyDummy(normalizedEmail);
      if (!accepted)
        await prisma.authSecurityEvent.create({
          data: {
            eventType: AuthSecurityEventType.PASSWORD_RESET_RATE_LIMITED,
            requestId: context.requestId,
            metadata: { scope: 'forgot' },
          },
        });
      return genericResetResponse;
    }
    await this.notifications.queuePasswordReset(user.id);
    await prisma.authSecurityEvent.create({
      data: {
        eventType: AuthSecurityEventType.PASSWORD_RESET_REQUESTED,
        userId: user.id,
        requestId: context.requestId,
      },
    });
    return genericResetResponse;
  }

  async reset(
    dto: ResetPasswordDto,
    context: AuthRequestContext,
    ipAddress: string,
  ): Promise<void> {
    if (dto.password !== dto.confirmPassword)
      throw new BadRequestException('Password confirmation does not match.');
    const tokenHash = hashOpaqueToken(dto.token);
    if (!(await this.rateLimit.consume('reset', tokenHash, ipAddress))) {
      await prisma.authSecurityEvent.create({
        data: {
          eventType: AuthSecurityEventType.PASSWORD_RESET_RATE_LIMITED,
          requestId: context.requestId,
          metadata: { scope: 'reset' },
        },
      });
      throw new BadRequestException('Reset token is invalid or expired.');
    }
    const passwordHash = await this.passwords.hash(dto.password);
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const reset = await tx.passwordResetToken.findFirst({
        where: { tokenHash, consumedAt: null, revokedAt: null, expiresAt: { gt: now } },
        include: { user: true },
      });
      if (!reset || reset.user.status !== UserStatus.ACTIVE) return null;
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: reset.id, consumedAt: null, revokedAt: null },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) return null;
      await tx.user.update({ where: { id: reset.userId }, data: { passwordHash } });
      await tx.authSession.updateMany({
        where: { userId: reset.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: reset.userId, id: { not: reset.id }, consumedAt: null, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.authSecurityEvent.create({
        data: {
          eventType: AuthSecurityEventType.PASSWORD_RESET_COMPLETED,
          userId: reset.userId,
          requestId: context.requestId,
          metadata: { sessionRevoked: true },
        },
      });
      return reset.userId;
    });
    if (!result) {
      await prisma.authSecurityEvent.create({
        data: {
          eventType: AuthSecurityEventType.PASSWORD_RESET_REJECTED,
          requestId: context.requestId,
          metadata: { reason: 'invalid_or_replayed' },
        },
      });
      throw new BadRequestException('Reset token is invalid or expired.');
    }
  }
}
