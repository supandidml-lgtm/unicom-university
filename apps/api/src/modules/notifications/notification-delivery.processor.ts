import { Inject, Injectable } from '@nestjs/common';
import { NotificationService } from './notification.service.js';

@Injectable()
export class NotificationDeliveryProcessor {
  constructor(@Inject(NotificationService) private readonly notifications: NotificationService) {}
  processNext(): Promise<boolean> {
    return this.notifications.processNext();
  }
}
