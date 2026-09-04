import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BrandsModule } from '../brands/brands.module.js';
import { EnrollmentService } from './enrollment.service.js';
import { EnrollmentsController } from './enrollments.controller.js';
import { MyTrainingController } from './my-training.controller.js';
import { ParticipantEnrollmentsController } from './participant-enrollments.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [AuthModule, BrandsModule, NotificationsModule],
  controllers: [EnrollmentsController, ParticipantEnrollmentsController, MyTrainingController],
  providers: [EnrollmentService],
  exports: [EnrollmentService],
})
export class EnrollmentsModule {}
