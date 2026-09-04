import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BrandsModule } from '../brands/brands.module.js';
import { MaterialsModule } from '../materials/materials.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { CertificatePdfService } from './certificate-pdf.service.js';
import { CertificateProcessor } from './certificate.processor.js';
import { CertificatesController } from './certificates.controller.js';
import { CertificateService } from './certificate.service.js';

@Module({
  imports: [AuthModule, BrandsModule, MaterialsModule, NotificationsModule],
  controllers: [CertificatesController],
  providers: [CertificateService, CertificatePdfService, CertificateProcessor],
  exports: [CertificateService, CertificateProcessor],
})
export class CertificatesModule {}
