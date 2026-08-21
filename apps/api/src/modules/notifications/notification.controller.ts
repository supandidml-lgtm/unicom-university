import { Controller, Get, Patch, Param, UseGuards } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  async getMyNotifications(@CurrentUser("id") userId: string) {
    return this.notificationService.getUserNotifications(userId);
  }

  @Get("unread-count")
  async getUnreadCount(@CurrentUser("id") userId: string) {
    return this.notificationService.getUnreadCount(userId);
  }

  @Patch(":id/read")
  async markAsRead(
    @Param("id") notificationId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.notificationService.markAsRead(notificationId, userId);
  }

  @Patch("mark-all-read")
  async markAllAsRead(@CurrentUser("id") userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }
}
