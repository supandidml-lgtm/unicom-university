import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { loadApiEnvironment } from '@unicom/config';
import {
  AuthSecurityEventType,
  NotificationDeliveryStatus,
  NotificationDeliveryType,
  UserStatus,
  prisma,
} from '@unicom/database';
import { randomUUID } from 'node:crypto';
import { generateOpaqueToken, hashOpaqueToken } from '../auth/auth.crypto.js';
import {
  EMAIL_TEMPLATE_VERSION,
  invitationEmail,
  passwordResetEmail,
  trainingAssignedEmail,
  trainingCompletedEmail,
  certificateReadyEmail,
  type RenderedEmail,
} from './email-templates.js';
import { TransactionalEmailService } from './email-provider.js';

type InvitationKind = 'participant' | 'trainer';

@Injectable()
export class NotificationService {
  private readonly renderedRetryContent = new Map<string, RenderedEmail>();

  constructor(
    @Inject(TransactionalEmailService) private readonly email: TransactionalEmailService,
  ) {}

  async queueInvitation(
    userId: string,
    kind: InvitationKind,
    requestId?: string,
  ): Promise<{ id: string; status: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, status: true },
    });
    if (!user || user.status !== UserStatus.INVITED)
      throw new ConflictException('Only invited accounts can receive an activation invitation.');
    const type =
      kind === 'participant'
        ? NotificationDeliveryType.PARTICIPANT_INVITATION
        : NotificationDeliveryType.TRAINER_INVITATION;
    const cooldown = loadApiEnvironment().AUTH_INVITATION_RESEND_COOLDOWN_SECONDS * 1_000;
    const previous = await prisma.notificationDelivery.findFirst({
      where: { recipientUserId: userId, type },
      orderBy: { createdAt: 'desc' },
    });
    if (previous && previous.createdAt.getTime() + cooldown > Date.now()) {
      throw new ConflictException('Invitation resend is temporarily unavailable.');
    }
    const now = new Date();
    const delivery = await prisma.$transaction(async (tx) => {
      await tx.invitationToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: now },
      });
      const created = await tx.notificationDelivery.create({
        data: {
          type,
          recipientUserId: userId,
          recipientEmail: user.email,
          provider: loadApiEnvironment().EMAIL_PROVIDER,
          templateVersion: EMAIL_TEMPLATE_VERSION,
          idempotencyKey: `invitation:${userId}:${randomUUID()}`,
        },
      });
      await tx.authSecurityEvent.create({
        data: {
          eventType: AuthSecurityEventType.INVITATION_DELIVERY_QUEUED,
          userId,
          ...(requestId ? { requestId } : {}),
          metadata: { deliveryId: created.id, invitationType: type },
        },
      });
      return created;
    });
    return this.deliveryView(delivery);
  }

  async queueTrainingAssigned(
    userId: string,
    enrollmentIds: string[],
    requestId?: string,
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user || enrollmentIds.length === 0) return;
    const delivery = await prisma.notificationDelivery.create({
      data: {
        type: NotificationDeliveryType.TRAINING_ASSIGNED,
        recipientUserId: userId,
        recipientEmail: user.email,
        provider: loadApiEnvironment().EMAIL_PROVIDER,
        templateVersion: EMAIL_TEMPLATE_VERSION,
        idempotencyKey: `training-assigned:${userId}:${randomUUID()}`,
        correlationEntityId: enrollmentIds.join(','),
      },
    });
    await prisma.authSecurityEvent.create({
      data: {
        eventType: AuthSecurityEventType.TRAINING_ASSIGNED_NOTIFICATION_QUEUED,
        userId,
        ...(requestId ? { requestId } : {}),
        metadata: { deliveryId: delivery.id, enrollmentCount: enrollmentIds.length },
      },
    });
  }

  async queueTrainingCompleted(enrollmentId: string, requestId?: string): Promise<void> {
    const enrollment = await prisma.trainingEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { participant: { select: { email: true } } },
    });
    if (!enrollment) return;
    try {
      const delivery = await prisma.notificationDelivery.create({
        data: {
          type: NotificationDeliveryType.TRAINING_COMPLETED,
          recipientUserId: enrollment.participantUserId,
          recipientEmail: enrollment.participant.email,
          provider: loadApiEnvironment().EMAIL_PROVIDER,
          templateVersion: EMAIL_TEMPLATE_VERSION,
          idempotencyKey: `training-completed:${enrollmentId}`,
          correlationEntityId: enrollmentId,
        },
      });
      await prisma.authSecurityEvent.create({
        data: {
          eventType: AuthSecurityEventType.TRAINING_COMPLETED_NOTIFICATION_QUEUED,
          userId: enrollment.participantUserId,
          ...(requestId ? { requestId } : {}),
          metadata: { deliveryId: delivery.id, enrollmentId },
        },
      });
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'P2002') throw error;
    }
  }

  async queuePasswordReset(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, status: true },
    });
    if (!user || user.status !== UserStatus.ACTIVE) return;
    await prisma.notificationDelivery.create({
      data: {
        type: NotificationDeliveryType.PASSWORD_RESET,
        recipientUserId: userId,
        recipientEmail: user.email,
        provider: loadApiEnvironment().EMAIL_PROVIDER,
        templateVersion: EMAIL_TEMPLATE_VERSION,
        idempotencyKey: `password-reset:${userId}:${randomUUID()}`,
      },
    });
  }

  async queueCertificateReady(
    userId: string,
    certificateId: string,
    certificateNumber: string,
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, status: true },
    });
    if (!user || user.status !== UserStatus.ACTIVE) return;
    try {
      await prisma.notificationDelivery.create({
        data: {
          type: NotificationDeliveryType.CERTIFICATE_READY,
          recipientUserId: userId,
          recipientEmail: user.email,
          provider: loadApiEnvironment().EMAIL_PROVIDER,
          templateVersion: EMAIL_TEMPLATE_VERSION,
          idempotencyKey: `certificate-ready:${certificateId}`,
          correlationEntityId: `${certificateId}:${certificateNumber}`,
        },
      });
    } catch (error) {
      if (!this.isUniqueConstraint(error)) throw error;
    }
  }

  async listForUser(userId: string) {
    const deliveries = await prisma.notificationDelivery.findMany({
      where: { recipientUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return deliveries.map((delivery) => this.deliveryView(delivery));
  }

  async processNext(): Promise<boolean> {
    await this.recoverExpiredLease();
    return this.processQueuedDelivery();
  }

  /** Internal worker/test hook. It is not exposed through an HTTP API. */
  async processDelivery(deliveryId: string): Promise<boolean> {
    return this.processQueuedDelivery(deliveryId);
  }

  private async processQueuedDelivery(deliveryId?: string): Promise<boolean> {
    const candidate = await prisma.notificationDelivery.findFirst({
      where: {
        ...(deliveryId ? { id: deliveryId } : {}),
        status: NotificationDeliveryStatus.QUEUED,
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!candidate) return false;
    const claimed = await prisma.notificationDelivery.updateMany({
      where: { id: candidate.id, status: NotificationDeliveryStatus.QUEUED },
      data: {
        status: NotificationDeliveryStatus.PROCESSING,
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });
    if (claimed.count !== 1) return true;
    const delivery = await prisma.notificationDelivery.findUniqueOrThrow({
      where: { id: candidate.id },
    });
    let result: Awaited<ReturnType<TransactionalEmailService['send']>>;
    try {
      const email = await this.renderForDelivery(delivery);
      result = await this.email.send({ to: delivery.recipientEmail, ...email });
    } catch (error) {
      result = {
        outcome: 'retryable_failure',
        code: error instanceof Error ? 'DELIVERY_RENDER_FAILED' : 'DELIVERY_FAILED',
      };
    }
    if (result.outcome === 'sent') {
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.DELIVERED,
          deliveredAt: new Date(),
          failureCode: null,
        },
      });
      if (
        delivery.type === NotificationDeliveryType.PARTICIPANT_INVITATION ||
        delivery.type === NotificationDeliveryType.TRAINER_INVITATION
      ) {
        await prisma.authSecurityEvent.create({
          data: {
            eventType: AuthSecurityEventType.INVITATION_DELIVERY_DELIVERED,
            userId: delivery.recipientUserId,
            metadata: { deliveryId: delivery.id, outcome: 'delivered' },
          },
        });
      }
      return true;
    }
    if (result.outcome === 'disabled') {
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.DISABLED,
          ...(result.code ? { failureCode: result.code } : {}),
        },
      });
      return true;
    }
    const maximum = loadApiEnvironment().EMAIL_DELIVERY_MAX_ATTEMPTS;
    const terminal = result.outcome === 'permanent_failure' || delivery.attemptCount >= maximum;
    const delay = Math.min(60_000, 1_000 * 2 ** Math.max(0, delivery.attemptCount - 1));
    await prisma.$transaction([
      prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: terminal
          ? {
              status: NotificationDeliveryStatus.FAILED,
              ...(result.code ? { failureCode: result.code } : {}),
            }
          : {
              status: NotificationDeliveryStatus.QUEUED,
              nextAttemptAt: new Date(Date.now() + delay),
              ...(result.code ? { failureCode: result.code } : {}),
            },
      }),
      prisma.authSecurityEvent.create({
        data: {
          eventType:
            delivery.type === NotificationDeliveryType.PARTICIPANT_INVITATION ||
            delivery.type === NotificationDeliveryType.TRAINER_INVITATION
              ? AuthSecurityEventType.INVITATION_DELIVERY_FAILED
              : AuthSecurityEventType.NOTIFICATION_DELIVERY_FAILED,
          userId: delivery.recipientUserId,
          metadata: { deliveryId: delivery.id, failureCode: result.code, terminal },
        },
      }),
    ]);
    return true;
  }

  private async render(delivery: {
    id: string;
    type: NotificationDeliveryType;
    recipientUserId: string | null;
    correlationEntityId: string | null;
  }): Promise<RenderedEmail> {
    const user = delivery.recipientUserId
      ? await prisma.user.findUnique({
          where: { id: delivery.recipientUserId },
          include: { staffProfile: true },
        })
      : null;
    const name = user?.staffProfile?.fullName ?? 'UNICOM UNIVERSITY participant';
    if (
      delivery.type === NotificationDeliveryType.PARTICIPANT_INVITATION ||
      delivery.type === NotificationDeliveryType.TRAINER_INVITATION
    ) {
      if (!user || user.status !== UserStatus.INVITED)
        throw new Error('Invitation recipient is no longer eligible.');
      const token = generateOpaqueToken();
      await prisma.$transaction(async (tx) => {
        await tx.invitationToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: new Date() },
        });
        await tx.invitationToken.create({
          data: {
            userId: user.id,
            tokenHash: hashOpaqueToken(token),
            expiresAt: new Date(
              Date.now() + loadApiEnvironment().AUTH_INVITATION_TTL_HOURS * 3_600_000,
            ),
          },
        });
      });
      const url = new URL('/activate', loadApiEnvironment().WEB_PUBLIC_URL);
      url.searchParams.set('token', token);
      return invitationEmail(name, url.toString());
    }
    if (delivery.type === NotificationDeliveryType.PASSWORD_RESET) {
      if (!user || user.status !== UserStatus.ACTIVE)
        throw new Error('Password-reset recipient is no longer eligible.');
      const token = generateOpaqueToken();
      await prisma.$transaction(async (tx) => {
        await tx.passwordResetToken.updateMany({
          where: { userId: user.id, consumedAt: null, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await tx.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: hashOpaqueToken(token),
            expiresAt: new Date(
              Date.now() + loadApiEnvironment().AUTH_PASSWORD_RESET_TTL_MINUTES * 60_000,
            ),
          },
        });
      });
      const url = new URL('/reset-password', loadApiEnvironment().WEB_PUBLIC_URL);
      url.searchParams.set('token', token);
      return passwordResetEmail(name, url.toString());
    }
    if (delivery.type === NotificationDeliveryType.TRAINING_ASSIGNED) {
      const ids = (delivery.correlationEntityId ?? '').split(',').filter(Boolean);
      const enrollments = await prisma.trainingEnrollment.findMany({
        where: { id: { in: ids } },
        include: { brand: true },
      });
      return trainingAssignedEmail(
        name,
        enrollments.map((enrollment) => enrollment.brand.name),
      );
    }
    if (delivery.type === NotificationDeliveryType.CERTIFICATE_READY) {
      const [, certificateNumber = 'your certificate'] = (delivery.correlationEntityId ?? '').split(
        ':',
      );
      return certificateReadyEmail(name, certificateNumber);
    }
    const enrollment = delivery.correlationEntityId
      ? await prisma.trainingEnrollment.findUnique({
          where: { id: delivery.correlationEntityId },
          include: { brand: true },
        })
      : null;
    return trainingCompletedEmail(name, enrollment?.brand.name ?? 'your assigned programme');
  }

  private async renderForDelivery(delivery: {
    id: string;
    type: NotificationDeliveryType;
    recipientUserId: string | null;
    correlationEntityId: string | null;
    attemptCount: number;
  }): Promise<RenderedEmail> {
    const cached = this.renderedRetryContent.get(delivery.id);
    if (cached) return cached;
    if (
      delivery.attemptCount > 1 &&
      (delivery.type === NotificationDeliveryType.PARTICIPANT_INVITATION ||
        delivery.type === NotificationDeliveryType.TRAINER_INVITATION ||
        delivery.type === NotificationDeliveryType.PASSWORD_RESET)
    ) {
      throw new Error('RETRY_CONTENT_UNAVAILABLE');
    }
    const rendered = await this.render(delivery);
    this.renderedRetryContent.set(delivery.id, rendered);
    return rendered;
  }

  private deliveryView(delivery: {
    id: string;
    status: NotificationDeliveryStatus;
    type: NotificationDeliveryType;
    createdAt: Date;
    deliveredAt: Date | null;
    failureCode: string | null;
  }) {
    return {
      id: delivery.id,
      type: delivery.type,
      status: delivery.status,
      createdAt: delivery.createdAt,
      deliveredAt: delivery.deliveredAt,
      failureCode: delivery.failureCode,
    };
  }

  private isUniqueConstraint(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }

  private async recoverExpiredLease(): Promise<void> {
    const now = new Date();
    const expiredBefore = new Date(
      now.getTime() - loadApiEnvironment().WORKER_JOB_LEASE_SECONDS * 1_000,
    );
    await prisma.notificationDelivery.updateMany({
      where: {
        status: NotificationDeliveryStatus.PROCESSING,
        lastAttemptAt: { lt: expiredBefore },
      },
      data: {
        status: NotificationDeliveryStatus.QUEUED,
        nextAttemptAt: now,
        failureCode: 'WORKER_LEASE_EXPIRED',
      },
    });
  }
}
