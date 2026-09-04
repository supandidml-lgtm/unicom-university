'use client';

import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

const apiBaseUrl = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';

type StaffKind = 'participant' | 'trainer';

interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  maskedNik: string;
  status: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
  createdAt?: string;
}

interface AuthorizationContext {
  permissions: string[];
}

interface StaffManagementProps {
  kind: StaffKind;
  audience: 'admin' | 'trainer';
}

const noun = {
  participant: 'Participant',
  trainer: 'Trainer',
} as const;

export function StaffManagement({ kind, audience }: StaffManagementProps) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [items, setItems] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [deliveryMessage, setDeliveryMessage] = useState<string | null>(null);

  const resource = kind === 'participant' ? 'participants' : 'trainers';
  const title = `${noun[kind]} Management`;
  const can = (action: string) => permissions.includes(`${resource}.${action}`);

  useEffect(() => {
    void loadInitial();
  }, []);

  async function loadInitial(): Promise<void> {
    try {
      const me = await fetch(`${apiBaseUrl}/api/v1/auth/me`, { credentials: 'include' });
      if (!me.ok) {
        setDenied(true);
        return;
      }
      const identity = (await me.json()) as { user: AuthorizationContext };
      setPermissions(identity.user.permissions);
      if (!identity.user.permissions.includes(`${resource}.read`)) {
        setDenied(true);
        return;
      }
      await loadItems();
    } catch {
      setError(`${noun[kind]} data could not be loaded.`);
    } finally {
      setLoading(false);
    }
  }

  async function loadItems(): Promise<void> {
    const response = await fetch(`${apiBaseUrl}/api/v1/${resource}?pageSize=100`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`${noun[kind]} data could not be loaded.`);
    }
    const payload = (await response.json()) as { items: StaffMember[] };
    setItems(payload.items);
  }

  async function csrfToken(): Promise<string> {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/csrf`, { credentials: 'include' });
    if (!response.ok) {
      throw new Error('Your session must be refreshed before changing staff data.');
    }
    return ((await response.json()) as { csrfToken: string }).csrfToken;
  }

  async function create(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setError(null);
    setDeliveryMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/${resource}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrfToken() },
        body: JSON.stringify({
          fullName: values.get('fullName'),
          phoneNumber: values.get('phoneNumber'),
          nik: values.get('nik'),
          email: values.get('email'),
        }),
      });
      if (!response.ok) {
        throw new Error(`${noun[kind]} creation was rejected. Check the required data.`);
      }
      const payload = (await response.json()) as { invitation: { status: string } };
      form.reset();
      setDeliveryMessage(`Invitation delivery is ${payload.invitation.status.toLowerCase()}.`);
      await loadItems();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `${noun[kind]} creation failed.`);
    }
  }

  async function viewStaff(member: StaffMember): Promise<void> {
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/${resource}/${member.id}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`${noun[kind]} detail could not be loaded.`);
      }
      setSelected((await response.json()) as StaffMember);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : `${noun[kind]} detail could not be loaded.`,
      );
    }
  }

  async function update(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selected) return;
    const values = new FormData(event.currentTarget);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/${resource}/${selected.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrfToken() },
        body: JSON.stringify({
          fullName: values.get('fullName'),
          phoneNumber: values.get('phoneNumber'),
        }),
      });
      if (!response.ok) {
        throw new Error(`${noun[kind]} update was rejected.`);
      }
      setSelected((await response.json()) as StaffMember);
      await loadItems();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `${noun[kind]} update failed.`);
    }
  }

  async function lifecycle(member: StaffMember, action: 'disable' | 'reactivate' | 'invitations') {
    setError(null);
    setDeliveryMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/${resource}/${member.id}/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': await csrfToken() },
      });
      if (!response.ok) {
        throw new Error(`${noun[kind]} action was rejected.`);
      }
      if (action === 'invitations') {
        const payload = (await response.json()) as { invitation: { status: string } };
        setDeliveryMessage(`Invitation delivery is ${payload.invitation.status.toLowerCase()}.`);
      }
      await loadItems();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `${noun[kind]} action failed.`);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6 sm:py-12">
      <section className="mx-auto w-full max-w-5xl rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
        <p className="text-sm font-semibold tracking-[0.2em] text-indigo-600">UNICOM UNIVERSITY</p>
        {denied ? (
          <>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Access Denied</h1>
            <p className="mt-3 text-slate-600">
              You do not have permission to manage this staff data.
            </p>
          </>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
                <p className="mt-2 text-slate-600">
                  {audience === 'trainer'
                    ? 'Pre-enrollment Participants you provisioned. Training assignment will be configured in the next workflow.'
                    : 'Provision staff identity and first-activation invitations.'}
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
            {deliveryMessage ? (
              <section
                className="mt-5 rounded border border-emerald-300 bg-emerald-50 p-4"
                aria-labelledby="delivery-status"
              >
                <h2 id="delivery-status" className="font-semibold text-slate-950">
                  Invitation delivery status
                </h2>
                <p className="mt-1 text-sm text-slate-700">
                  {deliveryMessage} The activation link is delivered only through the configured
                  email provider.
                </p>
              </section>
            ) : null}
            {can('create') ? (
              <form
                className="mt-8 grid gap-4 rounded-xl border border-slate-200 p-5 sm:grid-cols-2"
                onSubmit={create}
              >
                <h2 className="sm:col-span-2 text-lg font-semibold text-slate-900">
                  Add {noun[kind]}
                </h2>
                <label className="grid gap-1 text-sm font-medium text-slate-800">
                  Full Name *
                  <input
                    name="fullName"
                    required
                    maxLength={150}
                    className="rounded border border-slate-300 p-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-800">
                  Phone Number *
                  <input
                    name="phoneNumber"
                    required
                    maxLength={32}
                    inputMode="tel"
                    className="rounded border border-slate-300 p-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-800">
                  NIK *
                  <input
                    name="nik"
                    required
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{16}"
                    maxLength={16}
                    className="rounded border border-slate-300 p-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-800">
                  Email *
                  <input
                    name="email"
                    required
                    type="email"
                    maxLength={254}
                    className="rounded border border-slate-300 p-2"
                  />
                </label>
                <button
                  type="submit"
                  className="w-fit rounded bg-indigo-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  Create {noun[kind]}
                </button>
              </form>
            ) : null}
            <section className="mt-8" aria-labelledby="staff-list">
              <h2 id="staff-list" className="text-lg font-semibold text-slate-900">
                {noun[kind]} list
              </h2>
              {loading ? (
                <p className="mt-3 text-slate-600" role="status">
                  Loading staff data…
                </p>
              ) : null}
              <ul className="mt-3 grid gap-3">
                {items.map((member) => (
                  <li key={member.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{member.fullName}</p>
                        <p className="text-sm text-slate-600">
                          {member.email} · {member.phoneNumber}
                        </p>
                        <p className="text-sm text-slate-600">
                          NIK: {member.maskedNik} · Status: {member.status}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void viewStaff(member)}
                          className="rounded border border-slate-500 px-3 py-1 text-sm font-semibold text-slate-800"
                        >
                          View {member.fullName}
                        </button>
                        {kind === 'participant' && permissions.includes('enrollments.create') ? (
                          <a
                            className="rounded border border-indigo-700 px-3 py-1 text-sm font-semibold text-indigo-700"
                            href={`/${audience}/participants/${member.id}/training`}
                          >
                            Assign Training
                          </a>
                        ) : null}
                        {can('update') ? (
                          <button
                            type="button"
                            onClick={() => void viewStaff(member)}
                            className="rounded border border-indigo-700 px-3 py-1 text-sm font-semibold text-indigo-700"
                          >
                            Edit {member.fullName}
                          </button>
                        ) : null}
                        {member.status === 'INVITED' && can('invite') ? (
                          <button
                            type="button"
                            onClick={() => void lifecycle(member, 'invitations')}
                            className="rounded border border-amber-700 px-3 py-1 text-sm font-semibold text-amber-800"
                          >
                            Reissue invitation
                          </button>
                        ) : null}
                        {member.status !== 'DISABLED' && can('disable') ? (
                          <button
                            type="button"
                            onClick={() => void lifecycle(member, 'disable')}
                            className="rounded border border-red-700 px-3 py-1 text-sm font-semibold text-red-800"
                          >
                            Disable {member.fullName}
                          </button>
                        ) : null}
                        {member.status === 'DISABLED' && can('reactivate') ? (
                          <button
                            type="button"
                            onClick={() => void lifecycle(member, 'reactivate')}
                            className="rounded border border-emerald-700 px-3 py-1 text-sm font-semibold text-emerald-800"
                          >
                            Reactivate {member.fullName}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {!loading && items.length === 0 ? (
                <p className="mt-3 text-slate-600">No {resource} are available in your scope.</p>
              ) : null}
            </section>
            {selected ? (
              <form
                className="mt-8 grid gap-4 rounded-xl border border-indigo-200 bg-indigo-50 p-5 sm:grid-cols-2"
                onSubmit={update}
              >
                <h2 className="sm:col-span-2 text-lg font-semibold text-slate-900">
                  {noun[kind]} profile
                </h2>
                <p className="sm:col-span-2 text-sm text-slate-700">
                  {selected.email} · NIK: {selected.maskedNik} · Status: {selected.status}
                </p>
                <label className="grid gap-1 text-sm font-medium text-slate-800">
                  Full Name *
                  <input
                    name="fullName"
                    required
                    maxLength={150}
                    defaultValue={selected.fullName}
                    className="rounded border border-slate-300 p-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-800">
                  Phone Number *
                  <input
                    name="phoneNumber"
                    required
                    maxLength={32}
                    inputMode="tel"
                    defaultValue={selected.phoneNumber}
                    className="rounded border border-slate-300 p-2"
                  />
                </label>
                {can('update') ? (
                  <button
                    type="submit"
                    className="w-fit rounded bg-indigo-700 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Save profile
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="w-fit rounded border border-slate-400 px-4 py-2 text-sm font-semibold text-slate-800"
                >
                  Close
                </button>
              </form>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
