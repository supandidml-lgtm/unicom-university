import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService, DBNotification } from "../../database/database.service";

@Injectable()
export class NotificationService {
  constructor(private databaseService: DatabaseService) {}

  async getUserNotifications(userId: string) {
    return this.databaseService.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const count = this.databaseService.notifications.filter(
      (n) => n.userId === userId && !n.isRead,
    ).length;
    return { unreadCount: count };
  }

  async markAsRead(notificationId: string, userId: string): Promise<DBNotification> {
    const notif = this.databaseService.notifications.find(
      (n) => n.id === notificationId && n.userId === userId,
    );
    if (!notif) {
      throw new NotFoundException("Notifikasi tidak ditemukan.");
    }
    notif.isRead = true;
    return notif;
  }

  async markAllAsRead(userId: string): Promise<{ markedCount: number }> {
    let count = 0;
    this.databaseService.notifications.forEach((n) => {
      if (n.userId === userId && !n.isRead) {
        n.isRead = true;
        count++;
      }
    });
    return { markedCount: count };
  }

  async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: "ASSIGNMENT" | "EXAM_GRADED" | "MATERIAL_NEW" | "SYSTEM" | "DEADLINE_ALERT" = "SYSTEM",
    linkUrl?: string,
  ): Promise<DBNotification> {
    const newNotif: DBNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      title: title.trim(),
      message: message.trim(),
      type,
      linkUrl,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    this.databaseService.notifications.unshift(newNotif);

    // Audit notification dispatch
    this.databaseService.logAudit({
      actorId: "SYSTEM",
      action: "NOTIFICATION_DISPATCHED",
      resource: "NOTIFICATION",
      resourceId: newNotif.id,
      details: { userId, type, title },
    });

    return newNotif;
  }
}
