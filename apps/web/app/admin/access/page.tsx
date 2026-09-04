'use client';

import React, { useEffect, useState } from 'react';

const apiBaseUrl = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';

interface AuthorizationContext {
  roles: Array<{ code: string; name: string }>;
  permissions: string[];
}

export default function AuthorizationAccessPage() {
  const [context, setContext] = useState<AuthorizationContext | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    void loadAuthorizationContext();
  }, []);

  async function loadAuthorizationContext(): Promise<void> {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/me`, { credentials: 'include' });
      if (!response.ok) {
        setDenied(true);
        return;
      }
      const payload = (await response.json()) as { user: AuthorizationContext };
      if (!payload.user.permissions.includes('roles.read')) {
        setDenied(true);
        return;
      }
      setContext({ roles: payload.user.roles, permissions: payload.user.permissions });
    } catch {
      setDenied(true);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 py-12">
      <section className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl sm:p-10">
        <p className="text-sm font-semibold tracking-[0.2em] text-indigo-600">UNICOM UNIVERSITY</p>
        {denied ? (
          <>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Access Denied</h1>
            <p className="mt-3 text-slate-600">
              You do not have permission to access authorization management.
            </p>
            <a
              className="mt-8 inline-block text-sm font-semibold text-indigo-700 underline"
              href="/authenticated"
            >
              Back to authenticated session
            </a>
          </>
        ) : context ? (
          <>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
              Authorization Foundation Ready
            </h1>
            <section className="mt-8" aria-labelledby="current-roles">
              <h2 id="current-roles" className="text-lg font-semibold text-slate-900">
                Current Roles
              </h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700">
                {context.roles.map((role) => (
                  <li key={role.code}>{role.name}</li>
                ))}
              </ul>
            </section>
            <section className="mt-8" aria-labelledby="current-permissions">
              <h2 id="current-permissions" className="text-lg font-semibold text-slate-900">
                Current Permissions
              </h2>
              <ul className="mt-3 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
                {context.permissions.map((permission) => (
                  <li key={permission}>{permission}</li>
                ))}
              </ul>
            </section>
          </>
        ) : (
          <p className="text-slate-600" role="status">
            Loading authorization context…
          </p>
        )}
      </section>
    </main>
  );
}
