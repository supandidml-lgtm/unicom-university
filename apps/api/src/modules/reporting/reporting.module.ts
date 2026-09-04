import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BrandsModule } from '../brands/brands.module.js';
import { TrainingProgressModule } from '../training-progress/training-progress.module.js';
import { ReportingController } from './reporting.controller.js';
import { ReportingExportService } from './reporting-export.service.js';
import { ReportingService } from './reporting.service.js';

@Module({
  imports: [AuthModule, BrandsModule, TrainingProgressModule],
  controllers: [ReportingController],
  providers: [ReportingService, ReportingExportService],
})
export class ReportingModule {}
