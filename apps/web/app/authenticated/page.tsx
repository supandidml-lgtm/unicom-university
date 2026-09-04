'use client';

import React, { useEffect, useState } from 'react';

const apiBaseUrl = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';

interface User {
  email: string;
  permissions: string[];
  roles: { code: string; name: string }[];
}

export default function AuthenticatedPage() {
  const [user, setUser] = useState<User | null>(null);
  const [csrfToken, setCsrfToken] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void restoreSession();
  }, []);

  async function restoreSession(): Promise<void> {
    try {
      const me = await fetch(`${apiBaseUrl}/api/v1/auth/me`, { credentials: 'include' });
      if (!me.ok) {
        setError('Sesi tidak tersedia.');
        return;
      }
      const mePayload = (await me.json()) as { user: User };
      const csrf = await fetch(`${apiBaseUrl}/api/v1/auth/csrf`, { credentials: 'include' });
      if (!csrf.ok) {
        setError('Sesi tidak tersedia.');
        return;
      }
      const csrfPayload = (await csrf.json()) as { csrfToken: string };
      setUser(mePayload.user);
      setCsrfToken(csrfPayload.csrfToken);
    } catch {
      setError('Layanan autentikasi tidak tersedia.');
    }
  }

  async function logout(): Promise<void> {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'x-csrf-token': csrfToken },
    });
    if (response.ok) {
      window.location.assign('/login');
      return;
    }
    setError('Sesi tidak dapat diakhiri.');
  }

  return (
    <main className="ui-page">
      <section className="ui-container ui-surface max-w-2xl p-6 sm:p-8">
        <p className="text-sm font-semibold tracking-[0.12em] text-indigo-700">ACCOUNT</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Welcome to UNICOM University
        </h1>
        {user ? <p className="mt-5 text-slate-700">Email: {user.email}</p> : null}
        {error ? (
          <p className="mt-5 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {user ? (
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-900"
              href="/admin/access"
            >
              Authorization access
            </a>
            <a
              className="rounded-lg border border-indigo-700 px-4 py-2 text-sm font-semibold text-indigo-700"
              href="/admin/brands"
            >
              Brand management
            </a>
            {user.permissions.includes('participants.read') ? (
              <a
                className="rounded-lg border border-indigo-700 px-4 py-2 text-sm font-semibold text-indigo-700"
                href="/admin/participants"
              >
                Participant management
              </a>
            ) : null}
            {user.permissions.includes('curricula.read') ? (
              <a
                className="rounded-lg border border-indigo-700 px-4 py-2 text-sm font-semibold text-indigo-700"
                href="/admin/curricula"
              >
                Curriculum management
              </a>
            ) : null}
            {user.permissions.includes('reports.read') ? (
              <>
                <a
                  className="rounded-lg border border-indigo-700 px-4 py-2 text-sm font-semibold text-indigo-700"
                  href={
                    user.roles.some((role) => role.code === 'SUPER_ADMIN')
                      ? '/admin/dashboard'
                      : '/trainer/dashboard'
                  }
                >
                  Management dashboard
                </a>
                <a
                  className="rounded-lg border border-indigo-700 px-4 py-2 text-sm font-semibold text-indigo-700"
                  href={
                    user.roles.some((role) => role.code === 'SUPER_ADMIN')
                      ? '/admin/reports/participants'
                      : '/trainer/reports/participants'
                  }
                >
                  Participant reports
                </a>
              </>
            ) : null}
            {user.permissions.includes('participants.read') ? (
              <a
                className="rounded-lg border border-indigo-700 px-4 py-2 text-sm font-semibold text-indigo-700"
                href="/trainer/participants"
              >
                My participants
              </a>
            ) : null}
            {user.permissions.includes('trainers.read') ? (
              <a
                className="rounded-lg border border-indigo-700 px-4 py-2 text-sm font-semibold text-indigo-700"
                href="/admin/trainers"
              >
                Trainer management
              </a>
            ) : null}
            {user.permissions.includes('enrollments.read_self') ? (
              <a
                className="rounded-lg border border-indigo-700 px-4 py-2 text-sm font-semibold text-indigo-700"
                href="/my-training"
              >
                My training
              </a>
            ) : null}
            <button
              className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
              onClick={() => void logout()}
            >
              Logout
            </button>
          </div>
        ) : (
          <a
            className="mt-8 inline-block text-sm font-semibold text-indigo-700 underline"
            href="/login"
          >
            Ke halaman masuk
          </a>
        )}
      </section>
    </main>
  );
}
