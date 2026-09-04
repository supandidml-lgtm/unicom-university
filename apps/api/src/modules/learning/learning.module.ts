import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BrandsModule } from '../brands/brands.module.js';
import { LearningController } from './learning.controller.js';
import { MaterialCompletionPolicyService } from './material-completion-policy.service.js';
import { LearningService } from './learning.service.js';
import { TrainingProgressModule } from '../training-progress/training-progress.module.js';

@Module({
  imports: [AuthModule, BrandsModule, TrainingProgressModule],
  controllers: [LearningController],
  providers: [LearningService, MaterialCompletionPolicyService],
  exports: [LearningService, MaterialCompletionPolicyService],
})
export class LearningModule {}
