import type { INestApplication } from '@nestjs/common';
import { prisma, seedAuthorizationData, SystemRoleCode, UserStatus } from '@unicom/database';
import { loadApiEnvironment } from '@unicom/config';
import { createClient, type RedisClientType } from 'redis';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/application.js';
import { PasswordService } from '../src/modules/auth/password.service.js';
import { generateOpaqueToken, hashOpaqueToken } from '../src/modules/auth/auth.crypto.js';
import { StaffProfileCrypto } from '../src/modules/staff/staff-profile.crypto.js';

const password = 'staff-provisioning-test-password';
const emailPrefix = 'staff-test-';

describe('staff profile provisioning', () => {
  let app: INestApplication;
  let passwordService: PasswordService;
  let redis: RedisClientType;

  beforeAll(async () => {
    const environment = loadApiEnvironment();
    redis = createClient({
      socket: { host: environment.REDIS_HOST, port: environment.REDIS_PORT },
    });
    await redis.connect();
    const application = await createApiApplication();
    app = application.app;
    await app.init();
    passwordService = app.get(PasswordService);
  });

  beforeEach(async () => {
    const keys: string[] = [];
    for await (const result of redis.scanIterator({ MATCH: 'auth:login:test:*' })) {
      keys.push(...result);
    }
    if (keys.length > 0) {
      await redis.sendCommand(['DEL', ...keys]);
    }
    await prisma.notificationDelivery.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.user.deleteMany({ where: { normalizedEmail: { startsWith: emailPrefix } } });
    await seedAuthorizationData(prisma);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { normalizedEmail: { startsWith: emailPrefix } } });
    await redis.disconnect();
    await app.close();
  });

  it('provisions Participants atomically with a masked NIK and one-time invitation', async () => {
    const superAdministrator = await createActiveUser('super', SystemRoleCode.SuperAdministrator);
    const session = await login(superAdministrator.email);
    const nik = '3174123456789012';
    const email = `${emailPrefix}participant@example.test`;

    const created = await request(app.getHttpServer())
      .post('/api/v1/participants')
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({
        fullName: 'Participant Satu',
        phoneNumber: '0812-3456-7890',
        nik,
        email,
      })
      .expect(201);

    expect(created.body.participant).toMatchObject({
      fullName: 'Participant Satu',
      email,
      phoneNumber: '+6281234567890',
      maskedNik: '3174********9012',
      status: 'INVITED',
    });
    expect(created.body.invitation).toMatchObject({ status: 'QUEUED' });
    expect(JSON.stringify(created.body)).not.toContain('token=');
    expect(JSON.stringify(created.body)).not.toContain(nik);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: created.body.participant.id as string },
      include: {
        staffProfile: true,
        userRoles: { include: { role: true } },
        invitationTokens: true,
      },
    });
    expect(user.status).toBe(UserStatus.INVITED);
    expect(user.staffProfile?.encryptedNik).not.toContain(nik);
    expect(user.staffProfile?.nikFingerprint).not.toContain(nik);
    expect(user.userRoles.map(({ role }) => role.code)).toEqual([SystemRoleCode.Trainee]);
    expect(user.invitationTokens).toHaveLength(0);
    const delivery = await prisma.notificationDelivery.findFirstOrThrow({
      where: { recipientUserId: user.id },
    });
    expect(delivery.status).toBe('QUEUED');

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/participants/${user.id}`)
      .set('Cookie', session.cookie)
      .expect(200);
    expect(detail.body).toMatchObject({ maskedNik: '3174********9012', status: 'INVITED' });
    expect(JSON.stringify(detail.body)).not.toContain(nik);
    expect(JSON.stringify(detail.body)).not.toContain('encryptedNik');
    expect(JSON.stringify(detail.body)).not.toContain('nikFingerprint');
    expect(JSON.stringify(detail.body)).not.toContain('activationUrl');
  });

  it('enforces Trainer ownership and blocks role escalation and cross-actor endpoints', async () => {
    const trainerA = await createActiveUser('trainer-a', SystemRoleCode.Trainer);
    const trainerB = await createActiveUser('trainer-b', SystemRoleCode.Trainer);
    const trainee = await createActiveUser('trainee', SystemRoleCode.Trainee);
    const trainerASession = await login(trainerA.email);
    const trainerBSession = await login(trainerB.email);
    const traineeSession = await login(trainee.email);

    const created = await request(app.getHttpServer())
      .post('/api/v1/participants')
      .set('Cookie', trainerASession.cookie)
      .set('X-CSRF-Token', trainerASession.csrfToken)
      .send({
        fullName: 'Owned Participant',
        phoneNumber: '081234567891',
        nik: '3174123456789013',
        email: `${emailPrefix}owned@example.test`,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/participants/${created.body.participant.id as string}`)
      .set('Cookie', trainerASession.cookie)
      .expect(200);
    const ownedList = await request(app.getHttpServer())
      .get('/api/v1/participants?pageSize=100')
      .set('Cookie', trainerASession.cookie)
      .expect(200);
    expect(ownedList.body.items).toHaveLength(1);
    expect(ownedList.body.items[0]).toMatchObject({ id: created.body.participant.id });
    await request(app.getHttpServer())
      .get(`/api/v1/participants/${created.body.participant.id as string}`)
      .set('Cookie', trainerBSession.cookie)
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/trainers')
      .set('Cookie', trainerASession.cookie)
      .set('X-CSRF-Token', trainerASession.csrfToken)
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/participants')
      .set('Cookie', traineeSession.cookie)
      .set('X-CSRF-Token', traineeSession.csrfToken)
      .send({})
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/participants')
      .set('Cookie', trainerASession.cookie)
      .set('X-CSRF-Token', trainerASession.csrfToken)
      .send({
        fullName: 'Injected Role',
        phoneNumber: '081234567892',
        nik: '3174123456789014',
        email: `${emailPrefix}injection@example.test`,
        roles: ['SUPER_ADMIN'],
      })
      .expect(400);
    expect(
      await prisma.user.findUnique({
        where: { normalizedEmail: `${emailPrefix}injection@example.test` },
      }),
    ).toBeNull();
  });

  it('handles safe conflicts, invitation reissue, activation, and lifecycle status', async () => {
    const superAdministrator = await createActiveUser(
      'super-reissue',
      SystemRoleCode.SuperAdministrator,
    );
    const session = await login(superAdministrator.email);
    const payload = {
      fullName: 'Invitation Participant',
      phoneNumber: '081234567893',
      nik: '3174123456789015',
      email: `${emailPrefix}invite@example.test`,
    };
    const created = await request(app.getHttpServer())
      .post('/api/v1/participants')
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send(payload)
      .expect(201);
    await prisma.notificationDelivery.updateMany({
      where: { recipientUserId: created.body.participant.id as string },
      data: { createdAt: new Date(Date.now() - 60_000) },
    });
    const reissued = await request(app.getHttpServer())
      .post(`/api/v1/participants/${created.body.participant.id as string}/invitations`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .expect(201);
    expect(reissued.body.invitation).toMatchObject({ status: 'QUEUED' });
    const oldToken = generateOpaqueToken();
    const newToken = generateOpaqueToken();
    await prisma.invitationToken.create({
      data: {
        userId: created.body.participant.id as string,
        tokenHash: hashOpaqueToken(newToken),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token: oldToken, password, confirmPassword: password })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token: newToken, password, confirmPassword: password })
      .expect(204);
    await request(app.getHttpServer())
      .post(`/api/v1/participants/${created.body.participant.id as string}/invitations`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .expect(400);

    const participantSession = await login(payload.email);
    await request(app.getHttpServer())
      .post(`/api/v1/participants/${created.body.participant.id as string}/disable`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', participantSession.cookie)
      .expect(401);
    await request(app.getHttpServer())
      .post(`/api/v1/participants/${created.body.participant.id as string}/reactivate`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/participants')
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ ...payload, email: `${emailPrefix}duplicate-email@example.test` })
      .expect(409);
    await request(app.getHttpServer())
      .post('/api/v1/participants')
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ ...payload, nik: '317412345678901', email: `${emailPrefix}invalid@example.test` })
      .expect(400);
  });

  it('allows only Super Administrators to provision and administer Trainers', async () => {
    const superAdministrator = await createActiveUser(
      'super-trainer',
      SystemRoleCode.SuperAdministrator,
    );
    const trainer = await createActiveUser('trainer-no-admin', SystemRoleCode.Trainer);
    const superSession = await login(superAdministrator.email);
    const trainerSession = await login(trainer.email);
    const created = await request(app.getHttpServer())
      .post('/api/v1/trainers')
      .set('Cookie', superSession.cookie)
      .set('X-CSRF-Token', superSession.csrfToken)
      .send({
        fullName: 'New Trainer',
        phoneNumber: '081234567894',
        nik: '3174123456789016',
        email: `${emailPrefix}new-trainer@example.test`,
      })
      .expect(201);
    expect(created.body.trainer).toMatchObject({
      maskedNik: '3174********9016',
      status: 'INVITED',
    });
    const roles = await prisma.userRole.findMany({
      where: { userId: created.body.trainer.id as string },
      include: { role: true },
    });
    expect(roles.map(({ role }) => role.code)).toEqual([SystemRoleCode.Trainer]);
    await request(app.getHttpServer())
      .get('/api/v1/trainers')
      .set('Cookie', trainerSession.cookie)
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/v1/trainers/${created.body.trainer.id as string}`)
      .set('Cookie', trainerSession.cookie)
      .set('X-CSRF-Token', trainerSession.csrfToken)
      .send({ fullName: 'Blocked' })
      .expect(403);
  });

  it('preserves the last active Super Administrator invariant during staff disable', async () => {
    const superAdministrator = await createActiveUser(
      'last-super',
      SystemRoleCode.SuperAdministrator,
    );
    await prisma.user.updateMany({
      where: { id: { not: superAdministrator.id }, status: UserStatus.ACTIVE },
      data: { status: UserStatus.SUSPENDED },
    });
    const trainerRole = await prisma.role.findUniqueOrThrow({
      where: { code: SystemRoleCode.Trainer },
    });
    await prisma.userRole.create({
      data: { userId: superAdministrator.id, roleId: trainerRole.id },
    });
    const nik = '3174123456789017';
    const crypto = new StaffProfileCrypto();
    await prisma.staffProfile.create({
      data: {
        userId: superAdministrator.id,
        createdByUserId: superAdministrator.id,
        fullName: 'Last Super Administrator',
        phoneNumber: '+6281234567895',
        normalizedPhone: '+6281234567895',
        encryptedNik: crypto.encryptNik(nik),
        nikFingerprint: crypto.fingerprintNik(nik),
        nikFirst4: nik.slice(0, 4),
        nikLast4: nik.slice(-4),
      },
    });
    const session = await login(superAdministrator.email);
    await request(app.getHttpServer())
      .post(`/api/v1/trainers/${superAdministrator.id}/disable`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .expect(400);
    await expect(
      prisma.user.findUniqueOrThrow({ where: { id: superAdministrator.id } }),
    ).resolves.toMatchObject({ status: UserStatus.ACTIVE });
  });

  async function createActiveUser(label: string, roleCode: SystemRoleCode) {
    const email = `${emailPrefix}${label}-${Math.random().toString(36).slice(2)}@example.test`;
    const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    const user = await prisma.user.create({
      data: {
        email,
        normalizedEmail: email,
        passwordHash: await passwordService.hash(password),
        status: UserStatus.ACTIVE,
        activatedAt: new Date(),
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: role.id } },
      },
    });
    return user;
  }

  async function login(email: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const cookies = response.headers['set-cookie'];
    const cookie = Array.isArray(cookies) ? cookies[0] : undefined;
    if (!cookie) {
      throw new Error('Expected a session cookie.');
    }
    return {
      cookie,
      csrfToken: response.body.csrfToken as string,
    };
  }
});
