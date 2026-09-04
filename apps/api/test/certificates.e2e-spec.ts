import type { INestApplication } from '@nestjs/common';
import {
  EnrollmentStatus,
  NotificationDeliveryType,
  prisma,
  seedAuthorizationData,
  SystemRoleCode,
  UserStatus,
} from '@unicom/database';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/application.js';
import { PasswordService } from '../src/modules/auth/password.service.js';
import { CertificateService } from '../src/modules/certificates/certificate.service.js';
import { NotificationService } from '../src/modules/notifications/notification.service.js';

const prefix = 'certificate-test-';
const password = 'certificate-test-password';

describe('TASK-015 certificate issuance security boundary', () => {
  let app: INestApplication;
  let passwords: PasswordService;
  let certificates: CertificateService;
  let notifications: NotificationService;

  beforeAll(async () => {
    const application = await createApiApplication();
    app = application.app;
    await app.init();
    passwords = app.get(PasswordService);
    certificates = app.get(CertificateService);
    notifications = app.get(NotificationService);
  });
  beforeEach(async () => {
    process.env['EMAIL_TEST_PROVIDER_MODE'] = 'success';
    await cleanup();
    await seedAuthorizationData(prisma);
  });
  afterAll(async () => {
    await cleanup();
    await app.close();
    await prisma.$disconnect();
  });

  it('issues one immutable private certificate only for completed enrollment, protects IDOR, revokes safely, and backfills idempotently', async () => {
    const participant = await createUser('participant', SystemRoleCode.Trainee);
    const other = await createUser('other', SystemRoleCode.Trainee);
    const trainer = await createUser('trainer', SystemRoleCode.Trainer);
    const admin = await createUser('admin', SystemRoleCode.SuperAdministrator);
    const completed = await createEnrollment(participant.id, EnrollmentStatus.COMPLETED);
    const incomplete = await createEnrollment(other.id, EnrollmentStatus.IN_PROGRESS);
    await prisma.userBrandAccess.create({
      data: { userId: trainer.id, brandId: completed.brandId },
    });
    await expect(
      certificates.ensureCertificateForCompletedEnrollment(incomplete.enrollmentId),
    ).rejects.toThrow('Only a canonically completed');
    const [first, second] = await Promise.all([
      certificates.ensureCertificateForCompletedEnrollment(completed.enrollmentId),
      certificates.ensureCertificateForCompletedEnrollment(completed.enrollmentId),
    ]);
    expect(first.id).toBe(second.id);
    expect(first.certificateNumber).toMatch(/^UNICOM-\d{4}-[A-F0-9]{8}$/);
    expect(
      await prisma.trainingCertificate.count({ where: { enrollmentId: completed.enrollmentId } }),
    ).toBe(1);
    await certificates.processNext();
    const ready = await prisma.trainingCertificate.findUniqueOrThrow({
      where: { id: first.id },
      include: { pdfFileAsset: true },
    });
    expect(ready).toMatchObject({
      pdfStatus: 'READY',
      participantNameSnapshot: 'participant Name',
      brandNameSnapshot: 'Brand A',
    });
    expect(ready.pdfFileAsset).toMatchObject({
      mimeType: 'application/pdf',
      purpose: 'CERTIFICATE',
    });
    const certificateNotification = await prisma.notificationDelivery.findFirstOrThrow({
      where: { correlationEntityId: `${first.id}:${first.certificateNumber}` },
    });
    expect(certificateNotification.type).toBe(NotificationDeliveryType.CERTIFICATE_READY);
    expect(
      await prisma.notificationDelivery.count({
        where: { correlationEntityId: `${first.id}:${first.certificateNumber}` },
      }),
    ).toBe(1);
    process.env['EMAIL_TEST_PROVIDER_MODE'] = 'permanent_failure';
    await notifications.processDelivery(certificateNotification.id);
    expect(
      await prisma.notificationDelivery.findUniqueOrThrow({
        where: { id: certificateNotification.id },
      }),
    ).toMatchObject({ status: 'FAILED' });
    expect(
      await prisma.trainingCertificate.findUniqueOrThrow({ where: { id: first.id } }),
    ).toMatchObject({
      pdfStatus: 'READY',
      status: 'ISSUED',
    });
    process.env['EMAIL_TEST_PROVIDER_MODE'] = 'success';
    await prisma.staffProfile.update({
      where: { userId: participant.id },
      data: { fullName: 'Changed Name' },
    });
    await prisma.brand.update({
      where: { id: completed.brandId },
      data: { name: 'Changed Brand' },
    });
    const participantSession = await login(participant.email);
    const otherSession = await login(other.email);
    const trainerSession = await login(trainer.email);
    const adminSession = await login(admin.email);
    const list = await request(app.getHttpServer())
      .get('/api/v1/my-training/certificates')
      .set('Cookie', participantSession.cookie)
      .expect(200);
    expect(JSON.stringify(list.body)).not.toContain('nik');
    expect(list.body[0]).toMatchObject({
      certificateNumber: first.certificateNumber,
      brand: 'Brand A',
      downloadable: true,
    });
    const download = await request(app.getHttpServer())
      .get(`/api/v1/my-training/certificates/${first.id}/download`)
      .set('Cookie', participantSession.cookie)
      .expect(200);
    expect(download.headers).toMatchObject({
      'content-type': expect.stringContaining('application/pdf'),
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    });
    expect(download.body.subarray(0, 5).toString()).toBe('%PDF-');
    const csrf = await csrfToken(adminSession.cookie);
    await request(app.getHttpServer())
      .post(`/api/v1/certificates/${first.id}/regenerate`)
      .set('Cookie', adminSession.cookie)
      .set('X-CSRF-Token', csrf)
      .expect(201);
    await certificates.processNext();
    const regenerated = await prisma.trainingCertificate.findUniqueOrThrow({
      where: { id: first.id },
    });
    expect(regenerated).toMatchObject({
      certificateNumber: first.certificateNumber,
      pdfFileAssetId: ready.pdfFileAssetId,
      pdfStatus: 'READY',
    });
    await request(app.getHttpServer())
      .get(`/api/v1/my-training/certificates/${first.id}/download`)
      .set('Cookie', otherSession.cookie)
      .expect(403);
    await request(app.getHttpServer())
      .get(`/api/v1/certificates/${first.id}`)
      .set('Cookie', trainerSession.cookie)
      .expect(200);
    await prisma.userBrandAccess.delete({
      where: { userId_brandId: { userId: trainer.id, brandId: completed.brandId } },
    });
    await request(app.getHttpServer())
      .get(`/api/v1/certificates/${first.id}`)
      .set('Cookie', trainerSession.cookie)
      .expect(403);
    await prisma.userBrandAccess.create({
      data: { userId: trainer.id, brandId: completed.brandId },
    });
    const trainerRole = await prisma.role.findUniqueOrThrow({
      where: { code: SystemRoleCode.Trainer },
    });
    await prisma.userRole.delete({
      where: { userId_roleId: { userId: trainer.id, roleId: trainerRole.id } },
    });
    await request(app.getHttpServer())
      .get(`/api/v1/certificates/${first.id}`)
      .set('Cookie', trainerSession.cookie)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/certificates/${first.id}/revoke`)
      .set('Cookie', adminSession.cookie)
      .set('X-CSRF-Token', csrf)
      .send({ reason: 'Administrative correction' })
      .expect(201);
    await request(app.getHttpServer())
      .get(`/api/v1/my-training/certificates/${first.id}/download`)
      .set('Cookie', participantSession.cookie)
      .expect(403);
    const firstBackfill = await certificates.backfill();
    const secondBackfill = await certificates.backfill();
    expect(firstBackfill.issued).toBe(0);
    expect(secondBackfill.issued).toBe(0);
  });

  async function createUser(label: string, roleCode: SystemRoleCode) {
    const email = `${prefix}${label}-${randomUUID()}@example.test`;
    const user = await prisma.user.create({
      data: {
        email,
        normalizedEmail: email,
        passwordHash: await passwords.hash(password),
        status: UserStatus.ACTIVE,
        activatedAt: new Date(),
        emailVerifiedAt: new Date(),
        staffProfile: {
          create: {
            fullName: `${label} Name`,
            phoneNumber: `08${Math.floor(Math.random() * 1e10)
              .toString()
              .padStart(10, '0')}`,
            normalizedPhone: `62${randomUUID().replaceAll('-', '').slice(0, 10)}`,
            encryptedNik: 'not-a-real-nik',
            nikFingerprint: randomUUID().replaceAll('-', '').padEnd(64, '0'),
            nikFirst4: '0000',
            nikLast4: '0000',
          },
        },
      },
    });
    const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
    return user;
  }
  async function createEnrollment(participantUserId: string, status: EnrollmentStatus) {
    const brand = await prisma.brand.create({
      data: { code: `${prefix}${randomUUID()}`, name: 'Brand A' },
    });
    const curriculum = await prisma.curriculum.create({
      data: { brandId: brand.id, code: `${prefix}${randomUUID()}`, name: 'Curriculum A' },
    });
    const version = await prisma.curriculumVersion.create({
      data: { curriculumId: curriculum.id, versionNumber: 1, status: 'PUBLISHED' },
    });
    const enrollment = await prisma.trainingEnrollment.create({
      data: {
        participantUserId,
        brandId: brand.id,
        plannedWeekCount: 1,
        curriculumVersionId: version.id,
        status,
        ...(status === EnrollmentStatus.COMPLETED ? { completedAt: new Date() } : {}),
      },
    });
    return { enrollmentId: enrollment.id, brandId: brand.id };
  }
  async function login(email: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const raw = (
      Array.isArray(response.headers['set-cookie'])
        ? response.headers['set-cookie'][0]
        : response.headers['set-cookie']
    ) as string;
    return { cookie: raw.split(';')[0] as string };
  }
  async function csrfToken(cookie: string) {
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/csrf')
      .set('Cookie', cookie)
      .expect(200);
    return response.body.csrfToken as string;
  }
  async function cleanup() {
    const users = await prisma.user.findMany({
      where: { normalizedEmail: { startsWith: prefix } },
      select: { id: true },
    });
    const ids = users.map((item) => item.id);
    await prisma.notificationDelivery.deleteMany({ where: { recipientUserId: { in: ids } } });
    await prisma.authSecurityEvent.deleteMany({ where: { userId: { in: ids } } });
    await prisma.trainingCertificate.deleteMany({ where: { participantUserId: { in: ids } } });
    await prisma.trainingEnrollment.deleteMany({ where: { participantUserId: { in: ids } } });
    await prisma.userBrandAccess.deleteMany({ where: { userId: { in: ids } } });
    await prisma.curriculumVersion.deleteMany({
      where: { curriculum: { code: { startsWith: prefix } } },
    });
    await prisma.curriculum.deleteMany({ where: { code: { startsWith: prefix } } });
    await prisma.brand.deleteMany({ where: { code: { startsWith: prefix } } });
    await prisma.authSession.deleteMany({ where: { userId: { in: ids } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
});
