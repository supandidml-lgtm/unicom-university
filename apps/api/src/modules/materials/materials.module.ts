import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BrandsModule } from '../brands/brands.module.js';
import { MaterialsController } from './materials.controller.js';
import { MaterialMalwareScannerService } from './material-malware-scanner.service.js';
import { MaterialMetadataService } from './material-metadata.service.js';
import { MaterialService } from './material.service.js';
import { MaterialStorageService } from './material-storage.service.js';

@Module({
  imports: [AuthModule, BrandsModule],
  controllers: [MaterialsController],
  providers: [
    MaterialService,
    MaterialStorageService,
    MaterialMalwareScannerService,
    MaterialMetadataService,
  ],
  exports: [MaterialService, MaterialStorageService],
})
export class MaterialsModule {}
