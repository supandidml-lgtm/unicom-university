import { Injectable } from '@nestjs/common';
import { prisma } from '@unicom/database';
import { loadApiEnvironment } from '@unicom/config';
import { generateOpaqueToken, hashOpaqueToken } from './auth.crypto.js';

@Injectable()
export class InvitationService {
  createInvitation(): { token: string; tokenHash: string; expiresAt: Date } {
    const environment = loadApiEnvironment();
    const token = generateOpaqueToken();
    return {
      token,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + environment.AUTH_INVITATION_TTL_HOURS * 60 * 60 * 1_000),
    };
  }

  activationUrl(token: string): string {
    const url = new URL('/activate', loadApiEnvironment().WEB_PUBLIC_URL);
    url.searchParams.set('token', token);
    return url.toString();
  }

  async issueForUser(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const invitation = this.createInvitation();

    await prisma.invitationToken.create({
      data: {
        userId,
        tokenHash: invitation.tokenHash,
        expiresAt: invitation.expiresAt,
      },
    });

    // The caller is responsible for secure delivery. The database only receives the hash.
    return invitation;
  }
}
