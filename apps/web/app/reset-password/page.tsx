'use client';

import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

const apiBaseUrl = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('token');
    setToken(value);
    if (value) window.history.replaceState({}, document.title, '/reset-password');
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || password !== confirmPassword) {
      setMessage('Tautan atau konfirmasi password tidak valid.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      setMessage(
        response.ok
          ? 'Password berhasil diubah. Silakan masuk kembali.'
          : 'Tautan reset tidak valid atau telah kedaluwarsa.',
      );
    } catch {
      setMessage('The account recovery service is unavailable. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="grid min-h-screen grid-cols-[minmax(0,1fr)] place-items-center bg-slate-950 px-6 py-12">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <p className="text-sm font-semibold tracking-[0.2em] text-indigo-600">UNICOM UNIVERSITY</p>
        <h1 className="mt-4 text-3xl font-bold text-slate-950">Password baru</h1>
        <form className="mt-6 space-y-5" onSubmit={submit}>
          <label className="block text-sm font-semibold text-slate-800">
            Password baru
            <input
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5"
              type="password"
              minLength={12}
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            Konfirmasi password
            <input
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5"
              type="password"
              minLength={12}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
          {message ? (
            <p className="text-sm text-slate-700" role="status">
              {message}
            </p>
          ) : null}
          <button
            disabled={!token || busy}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-400"
          >
            {busy ? 'Memproses…' : 'Ubah password'}
          </button>
        </form>
      </section>
    </main>
  );
}
