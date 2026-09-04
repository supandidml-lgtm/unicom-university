import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { HealthController } from './health.controller.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AuthorizationModule } from './modules/authorization/authorization.module.js';
import { BrandsModule } from './modules/brands/brands.module.js';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module.js';
import { CurriculaModule } from './modules/curricula/curricula.module.js';
import { MaterialsModule } from './modules/materials/materials.module.js';
import { LearningModule } from './modules/learning/learning.module.js';
import { StaffModule } from './modules/staff/staff.module.js';
import { ExamsModule } from './modules/exams/exams.module.js';
import { TrainingProgressModule } from './modules/training-progress/training-progress.module.js';
import { AiQuestionGenerationModule } from './modules/ai-question-generation/ai-question-generation.module.js';
import { ReportingModule } from './modules/reporting/reporting.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { CertificatesModule } from './modules/certificates/certificates.module.js';
import { ReadinessService } from './readiness.service.js';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env['LOG_LEVEL'] ?? 'info',
        customProps: (request) => ({ requestId: request.id }),
        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers.x-api-key',
          'req.headers.x-csrf-token',
          'req.body',
          'req.query.token',
          'req.query.resetToken',
          'req.query.invitationToken',
          'res.headers.set-cookie',
        ],
      },
    }),
    AuthModule,
    AuthorizationModule,
    BrandsModule,
    EnrollmentsModule,
    CurriculaModule,
    MaterialsModule,
    LearningModule,
    ExamsModule,
    TrainingProgressModule,
    AiQuestionGenerationModule,
    ReportingModule,
    NotificationsModule,
    CertificatesModule,
    StaffModule,
  ],
  controllers: [HealthController],
  providers: [ReadinessService],
})
export class AppModule {}
