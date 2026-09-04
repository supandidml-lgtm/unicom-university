import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthorizationGuard } from './authorization.guard.js';
import { AuthorizationService } from './authorization.service.js';
import { CsrfGuard } from './csrf.guard.js';
import { AuthSecurityEventService } from './auth-security-event.service.js';
import { AuthService } from './auth.service.js';
import { InvitationService } from './invitation.service.js';
import { LoginRateLimitService } from './login-rate-limit.service.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PasswordRecoveryService } from './password-recovery.service.js';
import { RecoveryRateLimitService } from './recovery-rate-limit.service.js';

@Module({
  imports: [NotificationsModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthorizationService,
    AuthorizationGuard,
    CsrfGuard,
    AuthSecurityEventService,
    InvitationService,
    LoginRateLimitService,
    PasswordService,
    SessionService,
    PasswordRecoveryService,
    RecoveryRateLimitService,
  ],
  exports: [
    AuthService,
    AuthSecurityEventService,
    AuthorizationGuard,
    AuthorizationService,
    CsrfGuard,
    InvitationService,
    PasswordService,
    SessionService,
  ],
})
export class AuthModule {}
