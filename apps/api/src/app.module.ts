import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv, apiEnvSchema } from "@unicom/validation";
import { HealthModule } from "./modules/health/health.module";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { OrganizationModule } from "./modules/organization/organization.module";
import { TrainingModule } from "./modules/training/training.module";
import { StorageModule } from "./modules/storage/storage.module";
import { ProgressModule } from "./modules/progress/progress.module";
import { ExamModule } from "./modules/exam/exam.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { AuditModule } from "./modules/audit/audit.module";
import { NotificationModule } from "./modules/notifications/notification.module";
import { CompetencyModule } from "./modules/competency/competency.module";
import { CertificatesModule } from "./modules/certificates/certificates.module";
import { EvaluationModule } from "./modules/evaluation/evaluation.module";
import { AssistantModule } from "./modules/assistant/assistant.module";
import { CoachingModule } from "./modules/coaching/coaching.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => validateEnv(apiEnvSchema, config),
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    OrganizationModule,
    TrainingModule,
    StorageModule,
    ProgressModule,
    ExamModule,
    ReportsModule,
    AuditModule,
    NotificationModule,
    CompetencyModule,
    CertificatesModule,
    EvaluationModule,
    AssistantModule,
    CoachingModule,
    HealthModule,
  ],
})
export class AppModule {}
