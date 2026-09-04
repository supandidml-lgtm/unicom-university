import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { SessionService } from './session.service.js';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(@Inject(SessionService) private readonly sessionService: SessionService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const session = request.authSession;
    if (!session || !this.sessionService.verifyCsrf(session, request.header('x-csrf-token'))) {
      throw new ForbiddenException('Invalid CSRF token.');
    }
    return true;
  }
}
