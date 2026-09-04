import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BrandsModule } from '../brands/brands.module.js';
import { TrainingProgressController } from './training-progress.controller.js';
import { TrainingProgressService } from './training-progress.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { CertificatesModule } from '../certificates/certificates.module.js';

@Module({
  imports: [AuthModule, BrandsModule, NotificationsModule, CertificatesModule],
  controllers: [TrainingProgressController],
  providers: [TrainingProgressService],
  exports: [TrainingProgressService],
})
export class TrainingProgressModule {}
