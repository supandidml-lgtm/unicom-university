import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BrandsModule } from '../brands/brands.module.js';
import { MaterialsModule } from '../materials/materials.module.js';
import { AiQuestionGenerationController } from './ai-question-generation.controller.js';
import {
  DeterministicFakeAiQuestionGenerationProvider,
  DisabledAiQuestionGenerationProvider,
  OpenAiCompatibleQuestionGenerationProvider,
} from './ai-question-generation.provider.js';
import { AiQuestionGenerationService } from './ai-question-generation.service.js';
import { AiQuestionGenerationJobProcessor } from './ai-question-generation-job.processor.js';
import { MaterialSourceExtractionService } from './material-source-extraction.service.js';
import { VideoTranscriptionService } from './video-transcription.service.js';

@Module({
  imports: [AuthModule, BrandsModule, MaterialsModule],
  controllers: [AiQuestionGenerationController],
  providers: [
    AiQuestionGenerationService,
    AiQuestionGenerationJobProcessor,
    MaterialSourceExtractionService,
    VideoTranscriptionService,
    DisabledAiQuestionGenerationProvider,
    OpenAiCompatibleQuestionGenerationProvider,
    DeterministicFakeAiQuestionGenerationProvider,
  ],
  exports: [AiQuestionGenerationService, AiQuestionGenerationJobProcessor],
})
export class AiQuestionGenerationModule {}
