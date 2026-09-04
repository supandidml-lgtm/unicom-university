import 'reflect-metadata';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthSecurityEventType, prisma } from '@unicom/database';
import { normalizeEmail, hashOpaqueToken } from './auth.crypto.js';
import type { ActivateAccountDto } from './dto/activate-account.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import { AuthSecurityEventService } from './auth-security-event.service.js';
import { AuthorizationService } from './authorization.service.js';
import { LoginRateLimitService } from './login-rate-limit.service.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';
import type {
  AuthRequestContext,
  SafeAuthenticatedUser,
  SafeAuthorizedUser,
} from './auth.types.js';

const invalidCredentials = 'Invalid email or password.';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PasswordService) private readonly passwordService: PasswordService,
    @Inject(LoginRateLimitService) private readonly rateLimitService: LoginRateLimitService,
    @Inject(SessionService) private readonly sessionService: SessionService,
    @Inject(AuthSecurityEventService) private readonly securityEvents: AuthSecurityEventService,
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
  ) {}

  async activate(dto: ActivateAccountDto, context: AuthRequestContext): Promise<void> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password confirmation does not match.');
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const tokenHash = hashOpaqueToken(dto.token);
    const now = new Date();

    const activated = await prisma.$transaction(async (transaction) => {
      const invitation = await transaction.invitationToken.findFirst({
        where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
        include: { user: true },
      });
      if (!invitation || invitation.user.status !== 'INVITED') {
        return false;
      }

      const invitationUpdate = await transaction.invitationToken.updateMany({
        where: { id: invitation.id, usedAt: null },
        data: { usedAt: now },
      });
      const userUpdate = await transaction.user.updateMany({
        where: { id: invitation.userId, status: 'INVITED' },
        data: {
          passwordHash,
          status: 'ACTIVE',
          activatedAt: now,
          emailVerifiedAt: now,
        },
      });
      if (invitationUpdate.count !== 1 || userUpdate.count !== 1) {
        throw new BadRequestException('Invalid or expired invitation token.');
      }

      await transaction.authSecurityEvent.create({
        data: {
          eventType: AuthSecurityEventType.ACCOUNT_ACTIVATED,
          userId: invitation.userId,
          requestId: context.requestId,
        },
      });
      return true;
    });

    if (!activated) {
      throw new BadRequestException('Invalid or expired invitation token.');
    }
  }

  async login(
    dto: LoginDto,
    context: AuthRequestContext,
    ipAddress: string,
  ): Promise<{ user: SafeAuthenticatedUser; csrfToken: string; sessionToken: string }> {
    const normalizedEmail = normalizeEmail(dto.email);
    if (await this.rateLimitService.isBlocked(normalizedEmail, ipAddress)) {
      await this.securityEvents.record(
        AuthSecurityEventType.LOGIN_RATE_LIMITED,
        context,
        undefined,
        {
          scope: 'login',
        },
      );
      throw new UnauthorizedException(invalidCredentials);
    }

    const user = await prisma.user.findUnique({ where: { normalizedEmail } });
    const passwordValid = user?.passwordHash
      ? await this.passwordService.verify(user.passwordHash, dto.password)
      : await this.verifyUnknownPassword(dto.password);

    if (!user || user.status !== 'ACTIVE' || !passwordValid) {
      await this.rateLimitService.registerFailure(normalizedEmail, ipAddress);
      await this.securityEvents.record(AuthSecurityEventType.LOGIN_FAILURE, context, user?.id, {
        reason: 'invalid_credentials',
      });
      throw new UnauthorizedException(invalidCredentials);
    }

    const safeUser: SafeAuthenticatedUser = { id: user.id, email: user.email, status: user.status };
    const session = await this.sessionService.create(safeUser, context);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
      prisma.authSecurityEvent.create({
        data: {
          eventType: AuthSecurityEventType.LOGIN_SUCCESS,
          userId: user.id,
          requestId: context.requestId,
        },
      }),
    ]);
    await this.rateLimitService.clearAccountFailures(normalizedEmail);

    return { user: safeUser, ...session };
  }

  async me(
    rawSessionToken: string | undefined,
    context: AuthRequestContext,
  ): Promise<SafeAuthorizedUser> {
    const session = await this.sessionService.findActive(rawSessionToken, context);
    if (!session) {
      throw new UnauthorizedException('Authentication required.');
    }
    return this.authorizationService.getUserAuthorizationContext(session.user);
  }

  async csrf(rawSessionToken: string | undefined, context: AuthRequestContext): Promise<string> {
    const session = await this.requireSession(rawSessionToken, context);
    return this.sessionService.rotateCsrf(session);
  }

  async logout(
    rawSessionToken: string | undefined,
    csrfToken: string | undefined,
    context: AuthRequestContext,
  ): Promise<void> {
    const session = await this.requireSession(rawSessionToken, context);
    if (!this.sessionService.verifyCsrf(session, csrfToken)) {
      throw new ForbiddenException('Invalid CSRF token.');
    }
    await this.sessionService.revoke(session, context);
  }

  private async requireSession(rawSessionToken: string | undefined, context: AuthRequestContext) {
    const session = await this.sessionService.findActive(rawSessionToken, context);
    if (!session) {
      throw new UnauthorizedException('Authentication required.');
    }
    return session;
  }

  private async verifyUnknownPassword(password: string): Promise<boolean> {
    await this.passwordService.verifyDummy(password);
    return false;
  }
}
