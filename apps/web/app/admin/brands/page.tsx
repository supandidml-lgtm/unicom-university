'use client';

import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

const apiBaseUrl = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';

interface Brand {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
}

interface AuthorizationContext {
  permissions: string[];
}

export default function BrandsAdministrationPage() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Brand | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const canCreate = permissions.includes('brands.create');
  const canUpdate = permissions.includes('brands.update');
  const canArchive = permissions.includes('brands.archive');
  const canReactivate = permissions.includes('brands.reactivate');

  async function load(): Promise<void> {
    try {
      const me = await fetch(`${apiBaseUrl}/api/v1/auth/me`, { credentials: 'include' });
      if (!me.ok) {
        setDenied(true);
        return;
      }
      const identity = (await me.json()) as { user: AuthorizationContext };
      setPermissions(identity.user.permissions);
      if (!identity.user.permissions.includes('brands.read')) {
        setDenied(true);
        return;
      }
      const response = await fetch(`${apiBaseUrl}/api/v1/brands?pageSize=100`, {
        credentials: 'include',
      });
      if (!response.ok) {
        setError('Brand data could not be loaded.');
        return;
      }
      const payload = (await response.json()) as { items: Brand[] };
      setBrands(payload.items);
    } catch {
      setError('Brand data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  async function csrfToken(): Promise<string> {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/csrf`, { credentials: 'include' });
    if (!response.ok) {
      throw new Error('Your session must be refreshed before changing Brands.');
    }
    return ((await response.json()) as { csrfToken: string }).csrfToken;
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/brands`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrfToken() },
        body: JSON.stringify({
          code: values.get('code'),
          name: values.get('name'),
          description: values.get('description') || undefined,
        }),
      });
      if (!response.ok) {
        throw new Error('Brand creation was rejected.');
      }
      form.reset();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Brand creation failed.');
    }
  }

  async function submitUpdate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!editing) return;
    setError(null);
    const values = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/brands/${editing.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrfToken() },
        body: JSON.stringify({ name: values.get('name'), description: values.get('description') }),
      });
      if (!response.ok) {
        throw new Error('Brand update was rejected.');
      }
      setEditing(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Brand update failed.');
    }
  }

  async function transition(brand: Brand, action: 'archive' | 'reactivate'): Promise<void> {
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/brands/${brand.id}/${action}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'X-CSRF-Token': await csrfToken() },
      });
      if (!response.ok) {
        throw new Error(`Brand ${action} was rejected.`);
      }
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Brand lifecycle change failed.');
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6 sm:py-12">
      <section className="mx-auto w-full max-w-5xl rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
        <p className="text-sm font-semibold tracking-[0.2em] text-indigo-600">UNICOM UNIVERSITY</p>
        {denied ? (
          <>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Access Denied</h1>
            <p className="mt-3 text-slate-600">You do not have permission to read Brand data.</p>
          </>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                  Brand Management
                </h1>
                <p className="mt-2 text-slate-600">
                  Brand is an authorization and curriculum boundary.
                </p>
              </div>
              <a className="text-sm font-semibold text-indigo-700 underline" href="/authenticated">
                Back to authenticated session
              </a>
            </div>
            {error ? (
              <p className="mt-5 rounded bg-red-50 p-3 text-sm text-red-800" role="alert">
                {error}
              </p>
            ) : null}
            {canCreate ? (
              <form
                className="mt-8 grid gap-4 rounded-xl border border-slate-200 p-5 sm:grid-cols-2"
                onSubmit={submitCreate}
              >
                <h2 className="sm:col-span-2 text-lg font-semibold text-slate-900">Create Brand</h2>
                <label className="grid gap-1 text-sm font-medium text-slate-800">
                  Brand Code *
                  <input
                    name="code"
                    required
                    pattern="[A-Z][A-Z0-9_]*"
                    maxLength={64}
                    className="rounded border border-slate-300 p-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-800">
                  Brand Name *
                  <input
                    name="name"
                    required
                    maxLength={100}
                    className="rounded border border-slate-300 p-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-800 sm:col-span-2">
                  Description
                  <textarea
                    name="description"
                    maxLength={500}
                    className="min-h-20 rounded border border-slate-300 p-2"
                  />
                </label>
                <button
                  type="submit"
                  className="w-fit rounded bg-indigo-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  Create Brand
                </button>
              </form>
            ) : null}
            <section className="mt-8" aria-labelledby="brand-list">
              <h2 id="brand-list" className="text-lg font-semibold text-slate-900">
                Brands
              </h2>
              {loading ? (
                <p className="mt-3 text-slate-600" role="status">
                  Loading Brands…
                </p>
              ) : null}
              <ul className="mt-3 grid gap-3">
                {brands.map((brand) => (
                  <li key={brand.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{brand.name}</p>
                        <p className="text-sm text-slate-600">
                          {brand.code} · Status: {brand.status}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {canUpdate ? (
                          <button
                            type="button"
                            onClick={() => setEditing(brand)}
                            className="rounded border border-indigo-700 px-3 py-1 text-sm font-semibold text-indigo-700"
                          >
                            Edit {brand.code}
                          </button>
                        ) : null}
                        {brand.status === 'ACTIVE' && canArchive ? (
                          <button
                            type="button"
                            onClick={() => void transition(brand, 'archive')}
                            className="rounded border border-amber-700 px-3 py-1 text-sm font-semibold text-amber-800"
                          >
                            Archive {brand.code}
                          </button>
                        ) : null}
                        {brand.status === 'ARCHIVED' && canReactivate ? (
                          <button
                            type="button"
                            onClick={() => void transition(brand, 'reactivate')}
                            className="rounded border border-emerald-700 px-3 py-1 text-sm font-semibold text-emerald-800"
                          >
                            Reactivate {brand.code}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {brand.description ? (
                      <p className="mt-2 text-sm text-slate-700">{brand.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
              {!loading && brands.length === 0 ? (
                <p className="mt-3 text-slate-600">No Brands are available in your scope.</p>
              ) : null}
            </section>
            {editing ? (
              <form
                className="mt-8 grid gap-4 rounded-xl border border-indigo-200 bg-indigo-50 p-5 sm:grid-cols-2"
                onSubmit={submitUpdate}
              >
                <h2 className="sm:col-span-2 text-lg font-semibold text-slate-900">
                  Edit {editing.code}
                </h2>
                <label className="grid gap-1 text-sm font-medium text-slate-800">
                  Brand Name *
                  <input
                    name="name"
                    required
                    maxLength={100}
                    defaultValue={editing.name}
                    className="rounded border border-slate-300 p-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-800">
                  Description
                  <textarea
                    name="description"
                    maxLength={500}
                    defaultValue={editing.description ?? ''}
                    className="min-h-20 rounded border border-slate-300 p-2"
                  />
                </label>
                <div className="flex gap-2 sm:col-span-2">
                  <button
                    type="submit"
                    className="rounded bg-indigo-700 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Save Brand
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="rounded border border-slate-400 px-4 py-2 text-sm font-semibold text-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
