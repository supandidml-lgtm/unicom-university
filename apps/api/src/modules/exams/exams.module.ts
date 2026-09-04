import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BrandsModule } from '../brands/brands.module.js';
import { ExamController } from './exam.controller.js';
import { ExamScoringService } from './exam-scoring.service.js';
import { ExamService } from './exam.service.js';
import { TrainingProgressModule } from '../training-progress/training-progress.module.js';

@Module({
  imports: [AuthModule, BrandsModule, TrainingProgressModule],
  controllers: [ExamController],
  providers: [ExamService, ExamScoringService],
})
export class ExamsModule {}
