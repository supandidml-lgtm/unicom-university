'use client';

import React, { useState } from 'react';
import type { FormEvent } from 'react';

const apiBaseUrl = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) setError('We could not submit your request. Please try again.');
      else setSent(true);
    } catch {
      setError('The account recovery service is unavailable. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="grid min-h-screen grid-cols-[minmax(0,1fr)] place-items-center bg-slate-950 px-6 py-12">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <p className="text-sm font-semibold tracking-[0.2em] text-indigo-600">UNICOM UNIVERSITY</p>
        <h1 className="mt-4 text-3xl font-bold text-slate-950">Reset password</h1>
        {sent ? (
          <p className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800" role="status">
            If this account is eligible, reset instructions will be sent.
          </p>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={submit}>
            <label className="block text-sm font-semibold text-slate-800" htmlFor="email">
              Email
              <input
                id="email"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <button
              disabled={busy}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-400"
            >
              {busy ? 'Memproses…' : 'Kirim instruksi'}
            </button>
            {error ? (
              <p className="text-sm text-red-800" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        )}
        <a className="mt-6 block text-sm font-semibold text-indigo-700 underline" href="/login">
          Kembali ke masuk
        </a>
      </section>
    </main>
  );
}
