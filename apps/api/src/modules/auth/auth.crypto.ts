import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function tokensMatch(candidate: string, tokenHash: string): boolean {
  const candidateHash = hashOpaqueToken(candidate);
  return timingSafeEqual(Buffer.from(candidateHash, 'utf8'), Buffer.from(tokenHash, 'utf8'));
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
