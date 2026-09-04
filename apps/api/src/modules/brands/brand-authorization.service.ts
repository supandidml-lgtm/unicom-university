import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthSecurityEventType, BrandStatus, prisma, SystemRoleCode } from '@unicom/database';
import type { AuthRequestContext, SafeAuthenticatedUser } from '../auth/auth.types.js';
import { AuthSecurityEventService } from '../auth/auth-security-event.service.js';
import { AuthorizationService } from '../auth/authorization.service.js';

@Injectable()
export class BrandAuthorizationService {
  constructor(
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(AuthSecurityEventService) private readonly securityEvents: AuthSecurityEventService,
  ) {}

  async isSuperAdministrator(user: SafeAuthenticatedUser): Promise<boolean> {
    return this.authorization.isSuperAdministrator(user);
  }

  async listAccessibleBrandIds(user: SafeAuthenticatedUser): Promise<string[]> {
    if (await this.isSuperAdministrator(user)) {
      const brands = await prisma.brand.findMany({
        where: { status: BrandStatus.ACTIVE },
        select: { id: true },
      });
      return brands.map((brand) => brand.id);
    }

    const hasTrainerRole = await this.hasEffectiveTrainerRole(user);
    if (!hasTrainerRole) {
      return [];
    }
    const assignments = await prisma.userBrandAccess.findMany({
      where: { userId: user.id, brand: { status: BrandStatus.ACTIVE } },
      select: { brandId: true },
    });
    return assignments.map((assignment) => assignment.brandId);
  }

  async assertBrandAccess(
    user: SafeAuthenticatedUser,
    brandId: string,
    context: AuthRequestContext,
  ) {
    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) {
      throw new NotFoundException('Brand not found.');
    }
    if (await this.isSuperAdministrator(user)) {
      return brand;
    }

    const [hasTrainerRole, assignment] = await Promise.all([
      this.hasEffectiveTrainerRole(user),
      prisma.userBrandAccess.findUnique({
        where: { userId_brandId: { userId: user.id, brandId } },
      }),
    ]);
    if (!hasTrainerRole || !assignment || brand.status !== BrandStatus.ACTIVE) {
      await this.recordDenial(user, context, brandId, brand.code);
      throw new ForbiddenException('Access denied.');
    }
    return brand;
  }

  async canPerformBrandAction(
    user: SafeAuthenticatedUser,
    brandId: string,
    permission: Parameters<AuthorizationService['hasPermission']>[1],
    context: AuthRequestContext,
  ): Promise<boolean> {
    if (!(await this.authorization.hasPermission(user, permission))) {
      return false;
    }
    try {
      await this.assertBrandAccess(user, brandId, context);
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return false;
      }
      throw error;
    }
  }

  async isBrandActive(brandId: string): Promise<boolean> {
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: { status: true },
    });
    return brand?.status === BrandStatus.ACTIVE;
  }

  private async hasEffectiveTrainerRole(user: SafeAuthenticatedUser): Promise<boolean> {
    const context = await this.authorization.getUserAuthorizationContext(user);
    return context.roles.some((role) => role.code === SystemRoleCode.Trainer);
  }

  private async recordDenial(
    user: SafeAuthenticatedUser,
    context: AuthRequestContext,
    brandId: string,
    brandCode: string,
  ): Promise<void> {
    await this.securityEvents.record(AuthSecurityEventType.BRAND_ACCESS_DENIED, context, user.id, {
      brandId,
      brandCode,
    });
  }
}
