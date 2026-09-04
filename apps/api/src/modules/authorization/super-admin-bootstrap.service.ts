import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { isEmail } from 'class-validator';
import {
  AuthSecurityEventType,
  prisma,
  seedAuthorizationData,
  SystemRoleCode,
} from '@unicom/database';
import { normalizeEmail } from '../auth/auth.crypto.js';
import { PasswordService } from '../auth/password.service.js';

export interface SuperAdminBootstrapInput {
  email: string;
  password: string;
  confirmPassword: string;
  productionConfirmed: boolean;
}

@Injectable()
export class SuperAdminBootstrapService {
  constructor(@Inject(PasswordService) private readonly passwordService: PasswordService) {}

  async bootstrap(input: SuperAdminBootstrapInput): Promise<void> {
    this.validate(input);
    await seedAuthorizationData(prisma);
    const normalizedEmail = normalizeEmail(input.email);
    const passwordHash = await this.passwordService.hash(input.password);
    const now = new Date();

    try {
      await prisma.$transaction(async (transaction) => {
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(9130044)`;
        const superAdministratorRole = await transaction.role.findUniqueOrThrow({
          where: { code: SystemRoleCode.SuperAdministrator },
        });
        const existing = await transaction.userRole.findFirst({
          where: { roleId: superAdministratorRole.id },
          select: { id: true },
        });
        if (existing) {
          throw new ConflictException('A Super Administrator already exists.');
        }
        const user = await transaction.user.create({
          data: {
            email: input.email.trim(),
            normalizedEmail,
            passwordHash,
            status: 'ACTIVE',
            activatedAt: now,
            emailVerifiedAt: now,
          },
        });
        await transaction.userRole.create({
          data: { userId: user.id, roleId: superAdministratorRole.id },
        });
        await transaction.authSecurityEvent.create({
          data: {
            eventType: AuthSecurityEventType.SUPER_ADMIN_BOOTSTRAPPED,
            userId: user.id,
            metadata: { bootstrap: true },
          },
        });
      });
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        throw new ConflictException('A user with this email already exists.');
      }
      throw error;
    }
  }

  private validate(input: SuperAdminBootstrapInput): void {
    const normalizedEmail = normalizeEmail(input.email);
    if (!isEmail(normalizedEmail)) {
      throw new BadRequestException('A valid email is required.');
    }
    if (input.password.length < 12 || input.password.length > 128) {
      throw new BadRequestException('Password must contain 12 to 128 characters.');
    }
    if (input.password !== input.confirmPassword) {
      throw new BadRequestException('Password confirmation does not match.');
    }
    if (process.env['NODE_ENV'] === 'production' && !input.productionConfirmed) {
      throw new BadRequestException('Production bootstrap requires explicit confirmation.');
    }
  }

  private isUniqueConstraint(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
