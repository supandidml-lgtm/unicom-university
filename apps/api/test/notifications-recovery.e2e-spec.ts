import type { INestApplication } from '@nestjs/common';
import { prisma, UserStatus } from '@unicom/database';
import request from 'supertest';
import { createClient, type RedisClientType } from 'redis';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/application.js';
import { PasswordService } from '../src/modules/auth/password.service.js';
import { TestEmailInbox } from '../src/modules/notifications/email-provider.js';
import { NotificationService } from '../src/modules/notifications/notification.service.js';

const prefix = 'task14a-';
const oldPassword = 'existing-safe-password';
const newPassword = 'replacement-safe-password';

describe('TASK-014 account recovery security boundary', () => {
  let app: INestApplication;
  let passwords: PasswordService;
  let notifications: NotificationService;
  let inbox: TestEmailInbox;
  let redis: RedisClientType;

  beforeAll(async () => {
    const application = await createApiApplication();
    app = application.app;
    await app.init();
    passwords = app.get(PasswordService);
    notifications = app.get(NotificationService);
    inbox = app.get(TestEmailInbox);
    redis = createClient({ socket: { host: 'localhost', port: 6379 } });
    await redis.connect();
  });

  beforeEach(async () => {
    process.env['EMAIL_TEST_PROVIDER_MODE'] = 'success';
    inbox.clear();
    const recoveryKeys: string[] = [];
    for await (const batch of redis.scanIterator({ MATCH: 'auth:*:test:*' })) {
      recoveryKeys.push(...batch);
    }
    if (recoveryKeys.length > 0) await redis.sendCommand(['DEL', ...recoveryKeys]);
    await prisma.notificationDelivery.deleteMany({
      where: { recipientEmail: { startsWith: prefix } },
    });
    await prisma.passwordResetToken.deleteMany({
      where: { user: { normalizedEmail: { startsWith: prefix } } },
    });
    await prisma.authSession.deleteMany({
      where: { user: { normalizedEmail: { startsWith: prefix } } },
    });
    await prisma.user.deleteMany({ where: { normalizedEmail: { startsWith: prefix } } });
  });

  afterAll(async () => {
    await prisma.notificationDelivery.deleteMany({
      where: { recipientEmail: { startsWith: prefix } },
    });
    await prisma.user.deleteMany({ where: { normalizedEmail: { startsWith: prefix } } });
    await redis.disconnect();
    await app.close();
  });

  it('keeps forgot-password responses generic and only queues ACTIVE accounts', async () => {
    const active = await createUser('active', UserStatus.ACTIVE);
    await createUser('invited', UserStatus.INVITED);
    await createUser('disabled', UserStatus.DISABLED);
    await createUser('suspended', UserStatus.SUSPENDED);
    const responses = await Promise.all(
      [
        active.email,
        `${prefix}unknown@example.test`,
        `${prefix}invited@example.test`,
        `${prefix}disabled@example.test`,
        `${prefix}suspended@example.test`,
      ].map(async (email) =>
        request(app.getHttpServer()).post('/api/v1/auth/forgot-password').send({ email }),
      ),
    );
    for (const response of responses) {
      expect(response.status).toBe(202);
      expect(response.body).toEqual({
        message: 'If this account is eligible, password reset instructions will be sent.',
      });
    }
    expect(
      await prisma.notificationDelivery.count({
        where: { type: 'PASSWORD_RESET', recipientUserId: active.id },
      }),
    ).toBe(1);
    expect(await prisma.passwordResetToken.count({ where: { userId: active.id } })).toBe(0);
  });

  it('uses a hash-only single-use reset token and revokes all old sessions', async () => {
    const user = await createUser('reset', UserStatus.ACTIVE);
    const first = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: oldPassword })
      .expect(200);
    const second = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: oldPassword })
      .expect(200);
    const firstCookie = first.headers['set-cookie'];
    const secondCookie = second.headers['set-cookie'];
    expect(firstCookie).toBeDefined();
    expect(secondCookie).toBeDefined();
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: user.email })
      .expect(202);
    const delivery = await prisma.notificationDelivery.findFirst({
      where: { recipientUserId: user.id, type: 'PASSWORD_RESET' },
      orderBy: { createdAt: 'desc' },
    });
    expect(delivery).toBeDefined();
    expect(await notifications.processDelivery(delivery!.id)).toBe(true);
    const delivered = await prisma.notificationDelivery.findUniqueOrThrow({
      where: { id: delivery!.id },
    });
    expect({ status: delivered.status, failureCode: delivered.failureCode }).toEqual({
      status: 'DELIVERED',
      failureCode: null,
    });
    const message = inbox.all().find((item) => item.to === user.email);
    expect(message).toBeDefined();
    const token = message!.text.match(/[?&]token=([^\s]+)/)?.[1];
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const reset = await prisma.passwordResetToken.findFirstOrThrow({ where: { userId: user.id } });
    expect(reset.tokenHash).not.toContain(token!);
    expect(reset.tokenHash).toHaveLength(64);
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token, password: newPassword, confirmPassword: newPassword })
      .expect(204);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: oldPassword })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: newPassword })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', firstCookie!)
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', secondCookie!)
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token, password: newPassword, confirmPassword: newPassword })
      .expect(400);
  });

  it('retries transient delivery without issuing another reset token and bounds permanent failures', async () => {
    const transientUser = await createUser('transient', UserStatus.ACTIVE);
    process.env['EMAIL_TEST_PROVIDER_MODE'] = 'transient_once';
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: transientUser.email })
      .expect(202);
    const transient = await prisma.notificationDelivery.findFirstOrThrow({
      where: { recipientUserId: transientUser.id, type: 'PASSWORD_RESET' },
    });
    await notifications.processDelivery(transient.id);
    expect(
      await prisma.notificationDelivery.findUniqueOrThrow({ where: { id: transient.id } }),
    ).toMatchObject({ status: 'QUEUED', attemptCount: 1, failureCode: 'TEST_TRANSIENT_FAILURE' });
    expect(await prisma.passwordResetToken.count({ where: { userId: transientUser.id } })).toBe(1);
    await prisma.notificationDelivery.update({
      where: { id: transient.id },
      data: { nextAttemptAt: new Date(Date.now() - 1_000) },
    });
    await notifications.processDelivery(transient.id);
    expect(
      await prisma.notificationDelivery.findUniqueOrThrow({ where: { id: transient.id } }),
    ).toMatchObject({ status: 'DELIVERED', attemptCount: 2 });
    expect(await prisma.passwordResetToken.count({ where: { userId: transientUser.id } })).toBe(1);

    const permanentUser = await createUser('permanent', UserStatus.ACTIVE);
    process.env['EMAIL_TEST_PROVIDER_MODE'] = 'permanent_failure';
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: permanentUser.email })
      .expect(202);
    const permanent = await prisma.notificationDelivery.findFirstOrThrow({
      where: { recipientUserId: permanentUser.id, type: 'PASSWORD_RESET' },
    });
    await notifications.processDelivery(permanent.id);
    expect(
      await prisma.notificationDelivery.findUniqueOrThrow({ where: { id: permanent.id } }),
    ).toMatchObject({ status: 'FAILED', attemptCount: 1, failureCode: 'TEST_PERMANENT_FAILURE' });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: permanentUser.id } })).status).toBe(
      UserStatus.ACTIVE,
    );
    process.env['EMAIL_TEST_PROVIDER_MODE'] = 'success';
  });

  it('consumes one reset token exactly once under concurrent replay', async () => {
    const user = await createUser('concurrent', UserStatus.ACTIVE);
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: user.email })
      .expect(202);
    const delivery = await prisma.notificationDelivery.findFirstOrThrow({
      where: { recipientUserId: user.id, type: 'PASSWORD_RESET' },
    });
    await notifications.processDelivery(delivery.id);
    const token = inbox
      .all()
      .find((message) => message.to === user.email)
      ?.text.match(/[?&]token=([^\s]+)/)?.[1];
    const attempts = await Promise.all(
      [0, 1].map(() =>
        request(app.getHttpServer())
          .post('/api/v1/auth/reset-password')
          .send({ token, password: newPassword, confirmPassword: newPassword }),
      ),
    );
    expect(attempts.map((attempt) => attempt.status).sort()).toEqual([204, 400]);
    expect(
      await prisma.passwordResetToken.count({
        where: { userId: user.id, consumedAt: { not: null } },
      }),
    ).toBe(1);
  });

  it('revokes an earlier invitation after resend without exposing the raw link in delivery data', async () => {
    const user = await createUser('invitation', UserStatus.INVITED);
    const first = await notifications.queueInvitation(user.id, 'participant');
    await notifications.processDelivery(first.id);
    const firstToken = inbox
      .all()
      .find((message) => message.to === user.email)
      ?.text.match(/[?&]token=([^\s]+)/)?.[1];
    await prisma.notificationDelivery.update({
      where: { id: first.id },
      data: { createdAt: new Date(Date.now() - 60_000) },
    });
    const second = await notifications.queueInvitation(user.id, 'participant');
    await notifications.processDelivery(second.id);
    const secondToken = inbox
      .all()
      .filter((message) => message.to === user.email)
      .at(-1)
      ?.text.match(/[?&]token=([^\s]+)/)?.[1];
    expect(secondToken).not.toBe(firstToken);
    const deliveryData = JSON.stringify(
      await prisma.notificationDelivery.findMany({ where: { recipientUserId: user.id } }),
    );
    expect(deliveryData).not.toContain(firstToken!);
    expect(deliveryData).not.toContain(secondToken!);
    await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token: firstToken, password: oldPassword, confirmPassword: oldPassword })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token: secondToken, password: oldPassword, confirmPassword: oldPassword })
      .expect(204);
  });

  async function createUser(label: string, status: UserStatus) {
    const email = `${prefix}${label}@example.test`;
    return prisma.user.create({
      data: {
        email,
        normalizedEmail: email,
        status,
        passwordHash: status === UserStatus.ACTIVE ? await passwords.hash(oldPassword) : null,
        ...(status === UserStatus.ACTIVE
          ? { activatedAt: new Date(), emailVerifiedAt: new Date() }
          : {}),
      },
    });
  }
});
