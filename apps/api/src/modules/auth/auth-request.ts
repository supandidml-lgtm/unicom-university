import { loadApiEnvironment } from '@unicom/config';
import type { Request } from 'express';
import type { ActiveSession, AuthRequestContext } from './auth.types.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authSession?: ActiveSession;
    }
  }
}

export function sessionTokenFromRequest(request: Request): string | undefined {
  const name = loadApiEnvironment().AUTH_COOKIE_NAME;
  const cookies = request.headers.cookie?.split(';') ?? [];
  const entry = cookies.find((cookie) => cookie.trim().startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.trim().slice(name.length + 1)) : undefined;
}

export function authRequestContext(request: Request): AuthRequestContext {
  const userAgent = request.header('user-agent');
  return {
    requestId: String(request.id ?? 'unavailable'),
    ...(userAgent ? { userAgent } : {}),
  };
}
