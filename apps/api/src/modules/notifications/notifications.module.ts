import { Module } from '@nestjs/common';
import { TransactionalEmailService, TestEmailInbox } from './email-provider.js';
import { NotificationDeliveryProcessor } from './notification-delivery.processor.js';
import { NotificationService } from './notification.service.js';

@Module({
  providers: [
    TestEmailInbox,
    TransactionalEmailService,
    NotificationService,
    NotificationDeliveryProcessor,
  ],
  exports: [NotificationService, NotificationDeliveryProcessor, TestEmailInbox],
})
export class NotificationsModule {}
