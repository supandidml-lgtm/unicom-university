import { Injectable } from '@nestjs/common';
import { AuthSecurityEventType, prisma } from '@unicom/database';
import { loadApiEnvironment } from '@unicom/config';
import { generateOpaqueToken, hashOpaqueToken, tokensMatch } from './auth.crypto.js';
import type { ActiveSession, AuthRequestContext, SafeAuthenticatedUser } from './auth.types.js';

@Injectable()
export class SessionService {
  async create(
    user: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ): Promise<{ sessionToken: string; csrfToken: string }> {
    const environment = loadApiEnvironment();
    const sessionToken = generateOpaqueToken();
    const csrfToken = generateOpaqueToken();
    const now = new Date();
    const idleExpiresAt = new Date(
      now.getTime() + environment.AUTH_SESSION_IDLE_MINUTES * 60 * 1_000,
    );
    const absoluteExpiresAt = new Date(
      now.getTime() + environment.AUTH_SESSION_ABSOLUTE_HOURS * 60 * 60 * 1_000,
    );

    await prisma.$transaction([
      prisma.authSession.create({
        data: {
          userId: user.id,
          tokenHash: hashOpaqueToken(sessionToken),
          csrfTokenHash: hashOpaqueToken(csrfToken),
          idleExpiresAt,
          absoluteExpiresAt,
          ...(context.userAgent ? { userAgent: context.userAgent.slice(0, 512) } : {}),
        },
      }),
      prisma.authSecurityEvent.create({
        data: {
          eventType: AuthSecurityEventType.SESSION_CREATED,
          userId: user.id,
          requestId: context.requestId,
        },
      }),
    ]);

    return { sessionToken, csrfToken };
  }

  async findActive(
    rawSessionToken: string | undefined,
    context: AuthRequestContext,
  ): Promise<ActiveSession | null> {
    if (!rawSessionToken) {
      return null;
    }

    const session = await prisma.authSession.findUnique({
      where: { tokenHash: hashOpaqueToken(rawSessionToken) },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.user.status !== 'ACTIVE') {
      return null;
    }

    const now = new Date();
    if (session.idleExpiresAt <= now || session.absoluteExpiresAt <= now) {
      await prisma.$transaction([
        prisma.authSession.updateMany({
          where: { id: session.id, revokedAt: null },
          data: { revokedAt: now },
        }),
        prisma.authSecurityEvent.create({
          data: {
            eventType: AuthSecurityEventType.SESSION_EXPIRED,
            userId: session.userId,
            requestId: context.requestId,
          },
        }),
      ]);
      return null;
    }

    const environment = loadApiEnvironment();
    const nextIdleExpiration = new Date(
      Math.min(
        session.absoluteExpiresAt.getTime(),
        now.getTime() + environment.AUTH_SESSION_IDLE_MINUTES * 60 * 1_000,
      ),
    );
    await prisma.authSession.update({
      where: { id: session.id },
      data: { lastSeenAt: now, idleExpiresAt: nextIdleExpiration },
    });

    return {
      id: session.id,
      csrfTokenHash: session.csrfTokenHash,
      user: { id: session.user.id, email: session.user.email, status: session.user.status },
    };
  }

  verifyCsrf(session: ActiveSession, csrfToken: string | undefined): boolean {
    return Boolean(csrfToken && tokensMatch(csrfToken, session.csrfTokenHash));
  }

  async rotateCsrf(session: ActiveSession): Promise<string> {
    const csrfToken = generateOpaqueToken();
    await prisma.authSession.update({
      where: { id: session.id },
      data: { csrfTokenHash: hashOpaqueToken(csrfToken) },
    });
    return csrfToken;
  }

  async revoke(session: ActiveSession, context: AuthRequestContext): Promise<void> {
    const now = new Date();
    await prisma.$transaction([
      prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: now } }),
      prisma.authSecurityEvent.create({
        data: {
          eventType: AuthSecurityEventType.SESSION_REVOKED,
          userId: session.user.id,
          requestId: context.requestId,
        },
      }),
      prisma.authSecurityEvent.create({
        data: {
          eventType: AuthSecurityEventType.LOGOUT,
          userId: session.user.id,
          requestId: context.requestId,
        },
      }),
    ]);
  }
}
