import { Controller, Get, Inject, Req } from '@nestjs/common';
import type { Request } from 'express';
import { authRequestContext, sessionTokenFromRequest } from '../auth/auth-request.js';
import { AuthService } from '../auth/auth.service.js';
import { StaffProvisioningService } from './staff-provisioning.service.js';

@Controller('profile')
export class ProfileController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(StaffProvisioningService) private readonly staff: StaffProvisioningService,
  ) {}

  @Get('me')
  async me(@Req() request: Request) {
    const user = await this.auth.me(sessionTokenFromRequest(request), authRequestContext(request));
    return this.staff.me(user.id);
  }
}
