'use client';

import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

const apiBaseUrl = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';

export default function ActivatePage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const invitationToken = new URLSearchParams(window.location.search).get('token');
    if (invitationToken) {
      setToken((currentToken) => currentToken ?? invitationToken);
      window.history.replaceState({}, document.title, '/activate');
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    if (!token) {
      setError('Tautan aktivasi tidak valid atau telah kedaluwarsa.');
      return;
    }
    if (password.length < 12 || password.length > 128) {
      setError('Password harus terdiri dari 12 sampai 128 karakter.');
      return;
    }
    if (password !== confirmation) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/activate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword: confirmation }),
      });
      if (!response.ok) {
        setError('Tautan aktivasi tidak valid atau telah kedaluwarsa.');
        return;
      }
      setSuccess(true);
      setToken(null);
    } catch {
      setError('Layanan aktivasi tidak tersedia. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-[minmax(0,1fr)] place-items-center bg-slate-950 px-6 py-12">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl sm:p-10">
        <p className="text-sm font-semibold tracking-[0.2em] text-indigo-600">UNICOM UNIVERSITY</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Aktivasi akun</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Buat password baru untuk mengaktifkan akun Anda. Password harus 12–128 karakter.
        </p>
        {success ? (
          <div className="mt-8 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800" role="status">
            Akun berhasil diaktivasi.{' '}
            <a className="font-semibold underline" href="/login">
              Masuk sekarang
            </a>
            .
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
            <PasswordInput
              id="new-password"
              label="Password baru"
              value={password}
              onChange={setPassword}
              visible={showPassword}
              onToggle={() => setShowPassword((visible) => !visible)}
            />
            <PasswordInput
              id="confirm-password"
              label="Konfirmasi password"
              value={confirmation}
              onChange={setConfirmation}
              visible={showPassword}
              onToggle={() => setShowPassword((visible) => !visible)}
            />
            {error ? (
              <p className="text-sm font-medium text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isSubmitting || token === null}
            >
              {isSubmitting ? 'Mengaktifkan…' : 'Aktifkan akun'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-800" htmlFor={id}>
        {label} <span aria-hidden="true">*</span>
      </label>
      <div className="mt-2 flex rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-indigo-500">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 rounded-l-lg px-3 py-2.5 text-slate-950 outline-none"
          required
        />
        <button
          type="button"
          className="rounded-r-lg px-3 text-sm font-medium text-indigo-700"
          onClick={onToggle}
        >
          {visible ? 'Sembunyikan' : 'Tampilkan'}
        </button>
      </div>
    </div>
  );
}
