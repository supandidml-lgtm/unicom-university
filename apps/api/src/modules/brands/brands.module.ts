import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BrandAuthorizationService } from './brand-authorization.service.js';
import { BrandManagementService } from './brand-management.service.js';
import { BrandsController } from './brands.controller.js';
import { UserBrandAccessController } from './user-brand-access.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [BrandsController, UserBrandAccessController],
  providers: [BrandAuthorizationService, BrandManagementService],
  exports: [BrandAuthorizationService],
})
export class BrandsModule {}
