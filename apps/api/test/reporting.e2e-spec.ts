import type { INestApplication } from '@nestjs/common';
import {
  AuthSecurityEventType,
  EnrollmentStatus,
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

const prefix = 'reporting-test-';
const password = 'reporting-test-password';
const previousExportMaxRows = process.env['REPORT_EXPORT_MAX_ROWS'];

describe('TASK-013 reporting authorization and export boundary', () => {
  let app: INestApplication;
  let passwords: PasswordService;

  beforeAll(async () => {
    process.env['REPORT_EXPORT_MAX_ROWS'] = '2';
    const application = await createApiApplication();
    app = application.app;
    await app.init();
    passwords = app.get(PasswordService);
  });
  beforeEach(async () => {
    await cleanup();
    await seedAuthorizationData(prisma);
  });
  afterAll(async () => {
    await cleanup();
    await app.close();
    await prisma.$disconnect();
    if (previousExportMaxRows === undefined) delete process.env['REPORT_EXPORT_MAX_ROWS'];
    else process.env['REPORT_EXPORT_MAX_ROWS'] = previousExportMaxRows;
  });

  it('scopes Trainer report/export to Brand, masks NIK, and audits safe export metadata', async () => {
    const trainer = await user('trainer', SystemRoleCode.Trainer);
    const traineeA = await user('=HYPERLINK("https://evil.example")', SystemRoleCode.Trainee);
    const traineeB = await user('other', SystemRoleCode.Trainee);
    const [brandA, brandB] = await Promise.all([brand('A'), brand('B')]);
    await prisma.userBrandAccess.create({ data: { userId: trainer.id, brandId: brandA.id } });
    await enrollment(traineeA.id, brandA.id, EnrollmentStatus.IN_PROGRESS);
    const enrollmentB = await enrollment(traineeB.id, brandB.id, EnrollmentStatus.COMPLETED);
    const session = await login(trainer.email);

    const report = await request(app.getHttpServer())
      .get('/api/v1/reports/participants')
      .set('Cookie', session.cookie)
      .expect(200);
    expect(report.body.total).toBe(1);
    expect(report.body.items[0]).toMatchObject({
      brandId: brandA.id,
      maskedNik: '1234********5678',
    });
    expect(JSON.stringify(report.body)).not.toContain('1111222233334444');
    expect(JSON.stringify(report.body)).not.toContain('encryptedNik');
    await request(app.getHttpServer())
      .get(`/api/v1/reports/participants?brandId=${brandB.id}`)
      .set('Cookie', session.cookie)
      .expect(403);
    await request(app.getHttpServer())
      .get(`/api/v1/reports/participants/${traineeB.id}/enrollments/${enrollmentB.id}`)
      .set('Cookie', session.cookie)
      .expect(403);
    const exportResponse = await request(app.getHttpServer())
      .get('/api/v1/reports/participants/export.xlsx')
      .set('Cookie', session.cookie)
      .expect(200);
    expect(exportResponse.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(exportResponse.headers['content-disposition']).toContain(
      'unicom-university-participant-report-',
    );
    const audit = await prisma.authSecurityEvent.findMany({
      where: {
        userId: trainer.id,
        eventType: {
          in: [
            AuthSecurityEventType.REPORT_EXPORT_REQUESTED,
            AuthSecurityEventType.REPORT_EXPORT_COMPLETED,
            AuthSecurityEventType.REPORT_EXPORT_DOWNLOADED,
          ],
        },
      },
    });
    expect(audit).toHaveLength(3);
    expect(JSON.stringify(audit)).not.toContain('1111222233334444');

    await prisma.userBrandAccess.deleteMany({
      where: { userId: trainer.id, brandId: brandA.id },
    });
    const revokedScope = await request(app.getHttpServer())
      .get('/api/v1/reports/participants')
      .set('Cookie', session.cookie)
      .expect(200);
    expect(revokedScope.body.total).toBe(0);
    await request(app.getHttpServer())
      .get(`/api/v1/reports/participants?brandId=${brandA.id}`)
      .set('Cookie', session.cookie)
      .expect(403);

    const trainerRole = await prisma.role.findUniqueOrThrow({
      where: { code: SystemRoleCode.Trainer },
    });
    await prisma.userRole.deleteMany({ where: { userId: trainer.id, roleId: trainerRole.id } });
    await request(app.getHttpServer())
      .get('/api/v1/reports/participants')
      .set('Cookie', session.cookie)
      .expect(403);

    await prisma.userRole.create({ data: { userId: trainer.id, roleId: trainerRole.id } });
    await prisma.user.update({ where: { id: trainer.id }, data: { status: UserStatus.DISABLED } });
    await request(app.getHttpServer())
      .get('/api/v1/reports/participants')
      .set('Cookie', session.cookie)
      .expect(401);
  }, 15_000);

  it('gives Super Administrator the global dashboard while denying a Trainer-only dashboard', async () => {
    const administrator = await user('administrator', SystemRoleCode.SuperAdministrator);
    const trainer = await user('trainer', SystemRoleCode.Trainer);
    const traineeA = await user('trainee-a', SystemRoleCode.Trainee);
    const traineeB = await user('trainee-b', SystemRoleCode.Trainee);
    const [brandA, brandB] = await Promise.all([brand('ADMIN_A'), brand('ADMIN_B')]);
    await prisma.userBrandAccess.create({ data: { userId: trainer.id, brandId: brandA.id } });
    await enrollment(traineeA.id, brandA.id, EnrollmentStatus.IN_PROGRESS);
    await enrollment(traineeB.id, brandB.id, EnrollmentStatus.COMPLETED);
    const session = await login(administrator.email);

    const report = await request(app.getHttpServer())
      .get('/api/v1/reports/participants')
      .set('Cookie', session.cookie)
      .expect(200);
    expect(report.body.total).toBe(2);
    const dashboard = await request(app.getHttpServer())
      .get('/api/v1/dashboard/admin')
      .set('Cookie', session.cookie)
      .expect(200);
    expect(dashboard.body.scope).toBe('GLOBAL');
    expect(dashboard.body.brands).toHaveLength(2);
    await request(app.getHttpServer())
      .get('/api/v1/dashboard/trainer')
      .set('Cookie', session.cookie)
      .expect(403);
  });

  it('rejects an XLSX export that exceeds the configured safe row limit', async () => {
    const administrator = await user('bounded-administrator', SystemRoleCode.SuperAdministrator);
    const [first, second, third] = await Promise.all([
      user('bounded-first', SystemRoleCode.Trainee),
      user('bounded-second', SystemRoleCode.Trainee),
      user('bounded-third', SystemRoleCode.Trainee),
    ]);
    const reportBrand = await brand('EXPORT_BOUND');
    await Promise.all([
      enrollment(first.id, reportBrand.id, EnrollmentStatus.NOT_STARTED),
      enrollment(second.id, reportBrand.id, EnrollmentStatus.NOT_STARTED),
      enrollment(third.id, reportBrand.id, EnrollmentStatus.NOT_STARTED),
    ]);
    const session = await login(administrator.email);
    await request(app.getHttpServer())
      .get('/api/v1/reports/participants/export.xlsx')
      .set('Cookie', session.cookie)
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('Export exceeds the 2-row safety limit');
      });
  });

  async function user(label: string, roleCode: string) {
    const email = `${prefix}${randomUUID()}@example.test`;
    const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    const result = await prisma.user.create({
      data: {
        email,
        normalizedEmail: email,
        passwordHash: await passwords.hash(password),
        status: UserStatus.ACTIVE,
        activatedAt: new Date(),
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: role.id } },
      },
    });
    await prisma.staffProfile.create({
      data: {
        userId: result.id,
        fullName: label,
        phoneNumber: '+628123456789',
        normalizedPhone: '628123456789',
        encryptedNik: 'not-returned',
        nikFingerprint: randomUUID(),
        nikFirst4: '1234',
        nikLast4: '5678',
      },
    });
    return result;
  }
  async function brand(label: string) {
    return prisma.brand.create({
      data: { code: `REPORT_${label}_${randomUUID().slice(0, 8)}`, name: `Report Brand ${label}` },
    });
  }
  async function enrollment(participantUserId: string, brandId: string, status: EnrollmentStatus) {
    return prisma.trainingEnrollment.create({
      data: { participantUserId, brandId, plannedWeekCount: 1, status },
    });
  }
  async function login(email: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const cookie = (
      Array.isArray(response.headers['set-cookie'])
        ? response.headers['set-cookie'][0]
        : response.headers['set-cookie']
    ) as string;
    return { cookie: cookie.split(';')[0]! };
  }
  async function cleanup() {
    const brands = await prisma.brand.findMany({
      where: { code: { startsWith: 'REPORT_' } },
      select: { id: true },
    });
    const users = await prisma.user.findMany({
      where: { normalizedEmail: { startsWith: prefix } },
      select: { id: true },
    });
    const ids = users.map((item) => item.id);
    await prisma.trainingEnrollment.deleteMany({
      where: {
        OR: [
          { participantUserId: { in: ids } },
          { brandId: { in: brands.map((brand) => brand.id) } },
        ],
      },
    });
    await prisma.userBrandAccess.deleteMany({
      where: {
        OR: [{ userId: { in: ids } }, { brandId: { in: brands.map((brand) => brand.id) } }],
      },
    });
    await prisma.authSecurityEvent.deleteMany({ where: { userId: { in: ids } } });
    await prisma.authSession.deleteMany({ where: { userId: { in: ids } } });
    await prisma.staffProfile.deleteMany({ where: { userId: { in: ids } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.brand.deleteMany({ where: { id: { in: brands.map((brand) => brand.id) } } });
  }
});
