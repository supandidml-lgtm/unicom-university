import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthEventsController } from './auth-events.controller.js';
import { PermissionsController } from './permissions.controller.js';
import { RoleManagementService } from './role-management.service.js';
import { RolesController } from './roles.controller.js';
import { UserRolesController } from './user-roles.controller.js';
import { SuperAdminBootstrapService } from './super-admin-bootstrap.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AuthEventsController, PermissionsController, RolesController, UserRolesController],
  providers: [RoleManagementService, SuperAdminBootstrapService],
})
export class AuthorizationModule {}
