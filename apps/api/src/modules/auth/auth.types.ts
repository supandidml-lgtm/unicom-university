import type { AuthSecurityEventType, UserStatus } from '@unicom/database';

export interface AuthRequestContext {
  requestId: string;
  userAgent?: string;
}

export interface SafeAuthenticatedUser {
  id: string;
  email: string;
  status: UserStatus;
}

export interface SafeAuthorizationRole {
  code: string;
  name: string;
}

export interface SafeAuthorizedUser extends SafeAuthenticatedUser {
  roles: SafeAuthorizationRole[];
  permissions: string[];
}

export interface ActiveSession {
  id: string;
  user: SafeAuthenticatedUser;
  csrfTokenHash: string;
}

export type SecurityEvent = AuthSecurityEventType;
