import type { ApiEnvironment } from '@unicom/config';

export function sessionCookieOptions(environment: ApiEnvironment) {
  return {
    httpOnly: true,
    secure: environment.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: environment.AUTH_SESSION_ABSOLUTE_HOURS * 60 * 60 * 1_000,
  };
}
