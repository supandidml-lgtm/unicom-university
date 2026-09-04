import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BrandsModule } from '../brands/brands.module.js';
import { CurriculaController } from './curricula.controller.js';
import { CurriculumService } from './curriculum.service.js';
@Module({
  imports: [AuthModule, BrandsModule],
  controllers: [CurriculaController],
  providers: [CurriculumService],
  exports: [CurriculumService],
})
export class CurriculaModule {}
