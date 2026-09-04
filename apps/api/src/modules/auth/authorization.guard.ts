import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthSecurityEventType } from '@unicom/database';
import type { Request } from 'express';
import { authRequestContext, sessionTokenFromRequest } from './auth-request.js';
import { AuthSecurityEventService } from './auth-security-event.service.js';
import { AuthorizationService } from './authorization.service.js';
import {
  requiredPermissionsMetadataKey,
  type PermissionRequirement,
} from './require-permissions.decorator.js';
import { SessionService } from './session.service.js';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(SessionService) private readonly sessionService: SessionService,
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(AuthSecurityEventService) private readonly securityEvents: AuthSecurityEventService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      requiredPermissionsMetadataKey,
      [context.getHandler(), context.getClass()],
    );
    if (!requirement || requirement.permissions.length === 0) {
      throw new ForbiddenException('Permission declaration is required.');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const session = await this.sessionService.findActive(
      sessionTokenFromRequest(request),
      authRequestContext(request),
    );
    if (!session) {
      throw new UnauthorizedException('Authentication required.');
    }
    request.authSession = session;

    const allowed =
      requirement.mode === 'all'
        ? await this.authorizationService.hasAllPermissions(session.user, requirement.permissions)
        : await this.authorizationService.hasAnyPermission(session.user, requirement.permissions);
    if (allowed) {
      return true;
    }

    await this.securityEvents.record(
      AuthSecurityEventType.AUTHORIZATION_DENIED,
      authRequestContext(request),
      session.user.id,
      {
        permission: requirement.permissions.join(','),
        route: `${request.method} ${request.route?.path ?? request.path}`,
      },
    );
    throw new ForbiddenException('Access denied.');
  }
}
