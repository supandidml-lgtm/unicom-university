import type { INestApplication } from '@nestjs/common';
import {
  AuthSecurityEventType,
  prisma,
  seedAuthorizationData,
  SystemRoleCode,
} from '@unicom/database';
import { loadApiEnvironment } from '@unicom/config';
import { createClient, type RedisClientType } from 'redis';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/application.js';
import { PasswordService } from '../src/modules/auth/password.service.js';
import { SuperAdminBootstrapService } from '../src/modules/authorization/super-admin-bootstrap.service.js';

const password = 'authorization-test-password';

describe('RBAC authorization foundation', () => {
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
    await prisma.authSecurityEvent.deleteMany();
    await prisma.authSession.deleteMany();
    await prisma.invitationToken.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.user.deleteMany();
    await prisma.rolePermission.deleteMany({ where: { role: { isSystem: false } } });
    await prisma.role.deleteMany({ where: { isSystem: false } });
    await seedAuthorizationData(prisma);
  });

  afterAll(async () => {
    await prisma.authSecurityEvent.deleteMany();
    await prisma.authSession.deleteMany();
    await prisma.invitationToken.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
    await redis.quit();
    await prisma.$disconnect();
  });

  it('defaults to 401 without a session and 403 for trainee and trainer privilege escalation', async () => {
    await request(app.getHttpServer()).get('/api/v1/roles').expect(401);

    for (const systemRole of [SystemRoleCode.Trainee, SystemRoleCode.Trainer]) {
      const user = await createActiveUser(`${systemRole.toLowerCase()}@example.test`, systemRole);
      const session = await login(user.email);
      await request(app.getHttpServer())
        .post('/api/v1/roles')
        .set('Cookie', session.cookie)
        .set('X-CSRF-Token', session.csrfToken)
        .send({ code: 'FORBIDDEN_ROLE', name: 'Forbidden role' })
        .expect(403);
    }
    const lowPrivilegeRole = await prisma.role.create({
      data: { code: 'LOW_PRIVILEGE', name: 'Low Privilege' },
    });
    const lowPrivilegeUser = await createActiveUser('low-privilege@example.test');
    await prisma.userRole.create({
      data: { userId: lowPrivilegeUser.id, roleId: lowPrivilegeRole.id },
    });
    const targetRole = await roleByCode(SystemRoleCode.Trainee);
    const lowPrivilegeSession = await login(lowPrivilegeUser.email);
    await request(app.getHttpServer())
      .post(`/api/v1/users/${lowPrivilegeUser.id}/roles`)
      .set('Cookie', lowPrivilegeSession.cookie)
      .set('X-CSRF-Token', lowPrivilegeSession.csrfToken)
      .send({ roleId: targetRole.id })
      .expect(403);
    await expect(
      prisma.authSecurityEvent.findFirstOrThrow({
        where: { eventType: AuthSecurityEventType.AUTHORIZATION_DENIED },
      }),
    ).resolves.toBeDefined();
  });

  it('allows a Super Administrator to manage roles and rejects system role and mass-assignment changes', async () => {
    const superAdministrator = await createActiveUser(
      'super@example.test',
      SystemRoleCode.SuperAdministrator,
    );
    const session = await login(superAdministrator.email);
    const superRole = await roleByCode(SystemRoleCode.SuperAdministrator);

    await request(app.getHttpServer())
      .get('/api/v1/roles')
      .set('Cookie', session.cookie)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/permissions')
      .set('Cookie', session.cookie)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/system/auth-events')
      .set('Cookie', session.cookie)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/api/v1/roles/${superRole.id}`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set('Cookie', session.cookie)
      .send({ code: 'NO_CSRF_ROLE', name: 'No CSRF role' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ code: 'BAD_SYSTEM_ROLE', name: 'Bad system role', isSystem: true })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ code: 'not_valid', name: 'Invalid code' })
      .expect(400);

    const created = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ code: 'CONTENT_REVIEWER', name: 'Content Reviewer', description: 'Reviews content.' })
      .expect(201);
    expect(created.body).toMatchObject({
      code: 'CONTENT_REVIEWER',
      isSystem: false,
      isActive: true,
    });
    await request(app.getHttpServer())
      .patch(`/api/v1/roles/${created.body.id}`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ isSystem: true })
      .expect(400);
    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/roles/${created.body.id}`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ name: 'Updated Content Reviewer' })
      .expect(200);
    expect(updated.body.name).toBe('Updated Content Reviewer');
    await request(app.getHttpServer())
      .patch(`/api/v1/roles/${superRole.id}`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ code: 'CHANGED_SYSTEM_CODE' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ code: 'CONTENT_REVIEWER', name: 'Duplicate role' })
      .expect(409);
    await expect(
      prisma.authSecurityEvent.findFirstOrThrow({
        where: { eventType: AuthSecurityEventType.ROLE_CREATED },
      }),
    ).resolves.toBeDefined();
  });

  it('applies role permission and role assignment changes to an existing session immediately', async () => {
    const superAdministrator = await createActiveUser(
      'super@example.test',
      SystemRoleCode.SuperAdministrator,
    );
    const target = await createActiveUser('target@example.test');
    const superSession = await login(superAdministrator.email);
    const targetSession = await login(target.email);
    const permission = await prisma.permission.findUniqueOrThrow({ where: { code: 'roles.read' } });
    const created = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set('Cookie', superSession.cookie)
      .set('X-CSRF-Token', superSession.csrfToken)
      .send({ code: 'ROLE_READER', name: 'Role Reader' })
      .expect(201);

    await request(app.getHttpServer())
      .put(`/api/v1/roles/${created.body.id}/permissions`)
      .set('Cookie', superSession.cookie)
      .set('X-CSRF-Token', superSession.csrfToken)
      .send({ permissionIds: [permission.id] })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/roles')
      .set('Cookie', targetSession.cookie)
      .expect(403);
    const firstAssignment = await request(app.getHttpServer())
      .post(`/api/v1/users/${target.id}/roles`)
      .set('Cookie', superSession.cookie)
      .set('X-CSRF-Token', superSession.csrfToken)
      .send({ roleId: created.body.id })
      .expect(201);
    expect(firstAssignment.body).toHaveLength(1);
    const duplicateAssignment = await request(app.getHttpServer())
      .post(`/api/v1/users/${target.id}/roles`)
      .set('Cookie', superSession.cookie)
      .set('X-CSRF-Token', superSession.csrfToken)
      .send({ roleId: created.body.id })
      .expect(201);
    expect(duplicateAssignment.body).toHaveLength(1);
    await request(app.getHttpServer())
      .get('/api/v1/roles')
      .set('Cookie', targetSession.cookie)
      .expect(200);
    const userRoles = await request(app.getHttpServer())
      .get(`/api/v1/users/${target.id}/roles`)
      .set('Cookie', superSession.cookie)
      .expect(200);
    expect(userRoles.body).toHaveLength(1);
    await request(app.getHttpServer())
      .delete(`/api/v1/users/${target.id}/roles/${created.body.id}`)
      .set('Cookie', superSession.cookie)
      .set('X-CSRF-Token', superSession.csrfToken)
      .expect(204);
    await request(app.getHttpServer())
      .get('/api/v1/roles')
      .set('Cookie', targetSession.cookie)
      .expect(403);
    await expect(
      prisma.authSecurityEvent.findFirstOrThrow({
        where: { eventType: AuthSecurityEventType.USER_ROLE_REMOVED },
      }),
    ).resolves.toBeDefined();
  });

  it('does not grant permissions through inactive roles and rejects inactive role assignment', async () => {
    const superAdministrator = await createActiveUser(
      'super@example.test',
      SystemRoleCode.SuperAdministrator,
    );
    const target = await createActiveUser('target@example.test');
    const superSession = await login(superAdministrator.email);
    const targetSession = await login(target.email);
    const permission = await prisma.permission.findUniqueOrThrow({ where: { code: 'roles.read' } });
    const role = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set('Cookie', superSession.cookie)
      .set('X-CSRF-Token', superSession.csrfToken)
      .send({ code: 'TEMPORARY_READER', name: 'Temporary Reader' })
      .expect(201);
    await request(app.getHttpServer())
      .put(`/api/v1/roles/${role.body.id}/permissions`)
      .set('Cookie', superSession.cookie)
      .set('X-CSRF-Token', superSession.csrfToken)
      .send({ permissionIds: [permission.id] })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/users/${target.id}/roles`)
      .set('Cookie', superSession.cookie)
      .set('X-CSRF-Token', superSession.csrfToken)
      .send({ roleId: role.body.id })
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/v1/roles')
      .set('Cookie', targetSession.cookie)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/api/v1/roles/${role.body.id}`)
      .set('Cookie', superSession.cookie)
      .set('X-CSRF-Token', superSession.csrfToken)
      .expect(204);
    await request(app.getHttpServer())
      .get('/api/v1/roles')
      .set('Cookie', targetSession.cookie)
      .expect(403);
    const anotherTarget = await createActiveUser('another-target@example.test');
    await request(app.getHttpServer())
      .post(`/api/v1/users/${anotherTarget.id}/roles`)
      .set('Cookie', superSession.cookie)
      .set('X-CSRF-Token', superSession.csrfToken)
      .send({ roleId: role.body.id })
      .expect(400);
  });

  it('protects the last active Super Administrator and exposes safe authorization context', async () => {
    const superAdministrator = await createActiveUser(
      'super@example.test',
      SystemRoleCode.SuperAdministrator,
    );
    const superRole = await roleByCode(SystemRoleCode.SuperAdministrator);
    const session = await login(superAdministrator.email);
    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', session.cookie)
      .expect(200);
    expect(me.body.user).toMatchObject({
      id: superAdministrator.id,
      roles: [{ code: SystemRoleCode.SuperAdministrator, name: 'Super Administrator' }],
    });
    expect(me.body.user.permissions).toContain('roles.create');
    await request(app.getHttpServer())
      .delete(`/api/v1/users/${superAdministrator.id}/roles/${superRole.id}`)
      .set('Cookie', session.cookie)
      .set('X-CSRF-Token', session.csrfToken)
      .expect(400);
  });

  it('bootstraps exactly one Super Administrator without default credentials', async () => {
    const service = new SuperAdminBootstrapService(passwordService);
    await expect(
      service.bootstrap({
        email: 'invalid-email',
        password,
        confirmPassword: password,
        productionConfirmed: true,
      }),
    ).rejects.toThrow('A valid email is required.');
    await service.bootstrap({
      email: 'bootstrap@example.test',
      password,
      confirmPassword: password,
      productionConfirmed: true,
    });
    await expect(
      service.bootstrap({
        email: 'second@example.test',
        password,
        confirmPassword: password,
        productionConfirmed: true,
      }),
    ).rejects.toThrow('A Super Administrator already exists.');
    await expect(
      prisma.authSecurityEvent.findFirstOrThrow({
        where: { eventType: AuthSecurityEventType.SUPER_ADMIN_BOOTSTRAPPED },
      }),
    ).resolves.toBeDefined();
  });

  async function createActiveUser(email: string, roleCode?: string) {
    const user = await prisma.user.create({
      data: {
        email,
        normalizedEmail: email,
        passwordHash: await passwordService.hash(password),
        status: 'ACTIVE',
        activatedAt: new Date(),
        emailVerifiedAt: new Date(),
      },
    });
    if (roleCode) {
      const role = await roleByCode(roleCode);
      await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
    }
    return user;
  }

  async function roleByCode(code: string) {
    return prisma.role.findUniqueOrThrow({ where: { code } });
  }

  async function login(email: string): Promise<{ cookie: string; csrfToken: string }> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const setCookie = response.headers['set-cookie'];
    const rawCookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie) as string;
    return {
      cookie: rawCookie.split(';')[0] as string,
      csrfToken: response.body.csrfToken as string,
    };
  }
});
