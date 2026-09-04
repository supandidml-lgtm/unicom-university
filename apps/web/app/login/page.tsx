'use client';

import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

const apiBaseUrl = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setSessionExpired(new URLSearchParams(window.location.search).get('session') === 'expired');
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        setError('Email atau password tidak valid.');
        return;
      }
      window.location.assign('/authenticated');
    } catch {
      setError('Layanan autentikasi tidak tersedia. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-[minmax(0,1fr)] place-items-center bg-slate-950 px-6 py-12">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl sm:p-10">
        <p className="text-sm font-semibold tracking-[0.2em] text-indigo-600">UNICOM UNIVERSITY</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Masuk</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Gunakan akun yang telah diaktivasi melalui undangan institusi.
        </p>
        {sessionExpired ? (
          <p
            className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            role="status"
          >
            Your session has expired. Please sign in again.
          </p>
        ) : null}

        <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
          <div>
            <label className="block text-sm font-semibold text-slate-800" htmlFor="email">
              Email <span aria-hidden="true">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-950 outline-none ring-indigo-500 focus:ring-2"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'login-error' : undefined}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-800" htmlFor="password">
              Password <span aria-hidden="true">*</span>
            </label>
            <div className="mt-2 flex rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-indigo-500">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-w-0 flex-1 rounded-l-lg px-3 py-2.5 text-slate-950 outline-none"
                required
              />
              <button
                type="button"
                className="rounded-r-lg px-3 text-sm font-medium text-indigo-700"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? 'Sembunyikan' : 'Tampilkan'}
              </button>
            </div>
          </div>
          {error ? (
            <p id="login-error" className="text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Memproses…' : 'Masuk'}
          </button>
          <a
            className="block text-center text-sm font-semibold text-indigo-700 underline"
            href="/forgot-password"
          >
            Lupa password?
          </a>
        </form>
      </section>
    </main>
  );
}
