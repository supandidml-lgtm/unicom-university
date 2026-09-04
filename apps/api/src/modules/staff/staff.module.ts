import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BrandsModule } from '../brands/brands.module.js';
import { ParticipantsController } from './participants.controller.js';
import { ProfileController } from './profile.controller.js';
import { StaffProvisioningService } from './staff-provisioning.service.js';
import { TrainersController } from './trainers.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [AuthModule, BrandsModule, NotificationsModule],
  controllers: [ParticipantsController, TrainersController, ProfileController],
  providers: [StaffProvisioningService],
})
export class StaffModule {}
