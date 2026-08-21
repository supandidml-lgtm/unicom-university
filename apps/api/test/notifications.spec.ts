import { describe, it, expect, beforeEach } from "vitest";
import { NotificationService } from "../src/modules/notifications/notification.service";
import { DatabaseService } from "../src/database/database.service";

describe("NotificationModule (PRD Phase 11)", () => {
  let notifService: NotificationService;
  let dbService: DatabaseService;

  beforeEach(async () => {
    dbService = new DatabaseService();
    await dbService.onModuleInit();
    notifService = new NotificationService(dbService);
  });

  it("should retrieve user notifications and unread count", async () => {
    const list = await notifService.getUserNotifications("usr-staff-1");
    expect(list.length).toBeGreaterThan(0);

    const { unreadCount } = await notifService.getUnreadCount("usr-staff-1");
    expect(unreadCount).toBeGreaterThan(0);
  });

  it("should mark a specific notification as read", async () => {
    const notif = await notifService.markAsRead("notif-1", "usr-staff-1");
    expect(notif.isRead).toBe(true);
  });

  it("should dispatch a new notification and add to user feed", async () => {
    const dispatched = await notifService.sendNotification(
      "usr-staff-1",
      "Materi Baru Ditambahkan",
      "Modul troubleshooting IC Power telah diperbarui.",
      "MATERIAL_NEW",
      "/courses",
    );

    expect(dispatched.id).toBeDefined();
    expect(dispatched.isRead).toBe(false);

    const list = await notifService.getUserNotifications("usr-staff-1");
    expect(list[0]!.title).toBe("Materi Baru Ditambahkan");
  });
});
