import { loadApiEnvironment } from '@unicom/config';
import { NotificationDeliveryStatus, prisma } from '@unicom/database';

const environment = loadApiEnvironment();
const now = new Date();
const deliveryCutoff = new Date(
  now.getTime() - environment.OPERATIONAL_DELIVERY_RETENTION_DAYS * 24 * 60 * 60 * 1_000,
);

try {
  const [sessions, invitations, resets, deliveries] = await prisma.$transaction([
    prisma.authSession.deleteMany({
      where: {
        OR: [
          { revokedAt: { not: null } },
          { idleExpiresAt: { lte: now } },
          { absoluteExpiresAt: { lte: now } },
        ],
      },
    }),
    prisma.invitationToken.deleteMany({
      where: { OR: [{ expiresAt: { lte: now } }, { usedAt: { not: null } }] },
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lte: now } },
          { consumedAt: { not: null } },
          { revokedAt: { not: null } },
        ],
      },
    }),
    prisma.notificationDelivery.deleteMany({
      where: {
        status: {
          in: [
            NotificationDeliveryStatus.DELIVERED,
            NotificationDeliveryStatus.FAILED,
            NotificationDeliveryStatus.DISABLED,
          ],
        },
        updatedAt: { lt: deliveryCutoff },
      },
    }),
  ]);
  console.info(
    JSON.stringify({
      event: 'operational_cleanup_completed',
      sessionsDeleted: sessions.count,
      invitationsDeleted: invitations.count,
      resetTokensDeleted: resets.count,
      deliveryMetadataDeleted: deliveries.count,
      deliveryRetentionDays: environment.OPERATIONAL_DELIVERY_RETENTION_DAYS,
    }),
  );
} finally {
  await prisma.$disconnect();
}
