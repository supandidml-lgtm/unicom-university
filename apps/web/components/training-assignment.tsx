'use client';

import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ParticipantTrainingProgress } from './participant-training-progress';

const apiBaseUrl = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';

interface Brand {
  id: string;
  code: string;
  name: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

interface Participant {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  maskedNik: string;
  status: string;
}

interface Enrollment {
  id: string;
  brand: Brand;
  curriculumVersionId: string | null;
  plannedWeekCount: number;
  status: string;
  assignedAt: string;
}

interface Curriculum {
  id: string;
  brand: Brand;
}

interface CurriculumVersion {
  id: string;
  curriculumId: string;
  versionNumber: number;
  status: 'DRAFT' | 'PUBLISHED' | 'RETIRED';
  weekCount: number;
}

export function TrainingAssignment({
  participantId,
  audience,
}: {
  participantId: string;
  audience: 'admin' | 'trainer';
}) {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedWeeks, setSelectedWeeks] = useState<Record<string, string>>({});
  const [weekDrafts, setWeekDrafts] = useState<Record<string, string>>({});
  const [publishedVersions, setPublishedVersions] = useState<Record<string, CurriculumVersion[]>>(
    {},
  );
  const [versionDrafts, setVersionDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, [participantId]);

  async function load(): Promise<void> {
    try {
      const [participantResponse, brandsResponse, enrollmentsResponse, curriculaResponse] =
        await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/participants/${participantId}`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/v1/brands?status=ACTIVE&pageSize=100`, {
            credentials: 'include',
          }),
          fetch(`${apiBaseUrl}/api/v1/participants/${participantId}/enrollments?pageSize=100`, {
            credentials: 'include',
          }),
          fetch(`${apiBaseUrl}/api/v1/curricula`, { credentials: 'include' }),
        ]);
      if (
        !participantResponse.ok ||
        !brandsResponse.ok ||
        !enrollmentsResponse.ok ||
        !curriculaResponse.ok
      )
        throw new Error('Training assignment data could not be loaded.');
      setParticipant((await participantResponse.json()) as Participant);
      setBrands(((await brandsResponse.json()) as { items: Brand[] }).items);
      const records = ((await enrollmentsResponse.json()) as { items: Enrollment[] }).items;
      setEnrollments(records);
      setWeekDrafts(
        Object.fromEntries(records.map((item) => [item.id, String(item.plannedWeekCount)])),
      );
      const curricula = ((await curriculaResponse.json()) as { items: Curriculum[] }).items;
      const versionResponses = await Promise.all(
        curricula.map(async (curriculum) => {
          const response = await fetch(`${apiBaseUrl}/api/v1/curricula/${curriculum.id}/versions`, {
            credentials: 'include',
          });
          if (!response.ok) throw new Error('Published curriculum versions could not be loaded.');
          return {
            brandId: curriculum.brand.id,
            versions: ((await response.json()) as { items: CurriculumVersion[] }).items,
          };
        }),
      );
      const eligible = versionResponses.reduce<Record<string, CurriculumVersion[]>>(
        (result, entry) => ({
          ...result,
          [entry.brandId]: entry.versions.filter((version) => version.status === 'PUBLISHED'),
        }),
        {},
      );
      setPublishedVersions(eligible);
      setVersionDrafts(
        Object.fromEntries(records.map((item) => [item.id, item.curriculumVersionId ?? ''])),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Training assignment data could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function csrfToken(): Promise<string> {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/csrf`, { credentials: 'include' });
    if (!response.ok)
      throw new Error('Your session must be refreshed before changing training assignments.');
    return ((await response.json()) as { csrfToken: string }).csrfToken;
  }

  function toggleBrand(brandId: string, checked: boolean): void {
    setSelectedWeeks((current) => {
      if (!checked) {
        const next = { ...current };
        delete next[brandId];
        return next;
      }
      return { ...current, [brandId]: current[brandId] ?? '' };
    });
  }

  async function assign(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    const enrollmentsPayload = Object.entries(selectedWeeks).map(([brandId, weeks]) => ({
      brandId,
      plannedWeekCount: Number(weeks),
    }));
    if (enrollmentsPayload.length === 0) {
      setError('Select at least one Brand.');
      return;
    }
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/participants/${participantId}/enrollments`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrfToken() },
          body: JSON.stringify({ enrollments: enrollmentsPayload }),
        },
      );
      if (!response.ok)
        throw new Error('Training assignment was rejected. Check Brand access and planned Weeks.');
      setSelectedWeeks({});
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Training assignment failed.');
    }
  }

  async function updateWeeks(enrollment: Enrollment): Promise<void> {
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/enrollments/${enrollment.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrfToken() },
        body: JSON.stringify({ plannedWeekCount: Number(weekDrafts[enrollment.id]) }),
      });
      if (!response.ok) throw new Error('Planned Weeks update was rejected.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Planned Weeks update failed.');
    }
  }

  async function cancel(enrollment: Enrollment): Promise<void> {
    if (
      !window.confirm(`Cancel ${enrollment.brand.name} training assignment for this Participant?`)
    )
      return;
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/enrollments/${enrollment.id}/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': await csrfToken() },
      });
      if (!response.ok) throw new Error('Training enrollment cancellation was rejected.');
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Training enrollment cancellation failed.',
      );
    }
  }

  async function bindCurriculumVersion(enrollment: Enrollment): Promise<void> {
    const curriculumVersionId = versionDrafts[enrollment.id];
    if (!curriculumVersionId) {
      setError('Select a published Curriculum version.');
      return;
    }
    setError(null);
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/enrollments/${enrollment.id}/curriculum-version`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrfToken() },
          body: JSON.stringify({ curriculumVersionId }),
        },
      );
      if (!response.ok) {
        throw new Error('Curriculum binding was rejected. Match the Brand and planned Week count.');
      }
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Curriculum binding failed.');
    }
  }

  const activeEnrollmentBrandIds = new Set(
    enrollments.filter((item) => item.status !== 'CANCELLED').map((item) => item.brand.id),
  );
  const availableBrands = brands.filter((brand) => !activeEnrollmentBrandIds.has(brand.id));
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6 sm:py-12">
      <section className="mx-auto w-full max-w-5xl rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
        <p className="text-sm font-semibold tracking-[0.2em] text-indigo-600">UNICOM UNIVERSITY</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Assign Training</h1>
        <a
          className="mt-3 inline-block text-sm font-semibold text-indigo-700 underline"
          href={`/${audience}/participants`}
        >
          Back to Participants
        </a>
        {error ? (
          <p className="mt-5 rounded bg-red-50 p-3 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="mt-5 text-slate-600" role="status">
            Loading training assignment…
          </p>
        ) : null}
        {participant ? (
          <section
            className="mt-6 rounded-xl border border-slate-200 p-4"
            aria-labelledby="participant-identity"
          >
            <h2 id="participant-identity" className="font-semibold text-slate-950">
              {participant.fullName}
            </h2>
            <p className="mt-1 text-sm text-slate-700">
              {participant.email} · NIK: {participant.maskedNik} · Status: {participant.status}
            </p>
          </section>
        ) : null}
        <form
          className="mt-6 rounded-xl border border-slate-200 p-5"
          onSubmit={assign}
          aria-labelledby="brand-selector"
        >
          <h2 id="brand-selector" className="text-lg font-semibold text-slate-900">
            Select Brand(s) *
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Each selected Brand requires its own planned training Weeks. No training content or
            progress is created here.
          </p>
          <div className="mt-4 grid gap-3">
            {availableBrands.map((brand) => {
              const selected = Object.hasOwn(selectedWeeks, brand.id);
              return (
                <div key={brand.id} className="rounded border border-slate-200 p-3">
                  <label className="flex items-center gap-2 font-medium text-slate-900">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(event) => toggleBrand(brand.id, event.target.checked)}
                    />{' '}
                    {brand.name} ({brand.code})
                  </label>
                  {selected ? (
                    <label className="mt-3 grid max-w-xs gap-1 text-sm font-medium text-slate-800">
                      Training Weeks *
                      <input
                        required
                        min="1"
                        type="number"
                        inputMode="numeric"
                        value={selectedWeeks[brand.id] ?? ''}
                        onChange={(event) =>
                          setSelectedWeeks((current) => ({
                            ...current,
                            [brand.id]: event.target.value,
                          }))
                        }
                        className="rounded border border-slate-300 p-2"
                      />
                    </label>
                  ) : null}
                </div>
              );
            })}
          </div>
          {availableBrands.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              No additional active Brands are available in your scope.
            </p>
          ) : null}
          <button
            type="submit"
            className="mt-5 rounded bg-indigo-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Assign Training
          </button>
        </form>
        <section className="mt-8" aria-labelledby="assignment-list">
          <h2 id="assignment-list" className="text-lg font-semibold text-slate-900">
            Training assignments
          </h2>
          <ul className="mt-3 grid gap-3">
            {enrollments.map((enrollment) => (
              <li key={enrollment.id} className="rounded-xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-950">
                  {enrollment.brand.name} ({enrollment.brand.code})
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Status: {enrollment.status} · Planned Duration: {enrollment.plannedWeekCount}{' '}
                  Weeks
                </p>
                {enrollment.status === 'NOT_STARTED' ? (
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <label className="grid gap-1 text-sm font-medium text-slate-800">
                      Training Weeks *
                      <input
                        type="number"
                        min="1"
                        inputMode="numeric"
                        value={weekDrafts[enrollment.id] ?? ''}
                        onChange={(event) =>
                          setWeekDrafts((current) => ({
                            ...current,
                            [enrollment.id]: event.target.value,
                          }))
                        }
                        className="w-28 rounded border border-slate-300 p-2"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void updateWeeks(enrollment)}
                      className="rounded border border-indigo-700 px-3 py-2 text-sm font-semibold text-indigo-700"
                    >
                      Update Weeks
                    </button>
                    <label className="grid gap-1 text-sm font-medium text-slate-800">
                      Published Curriculum Version
                      <select
                        value={versionDrafts[enrollment.id] ?? ''}
                        onChange={(event) =>
                          setVersionDrafts((current) => ({
                            ...current,
                            [enrollment.id]: event.target.value,
                          }))
                        }
                        className="min-w-52 rounded border border-slate-300 p-2"
                      >
                        <option value="">Select published version</option>
                        {(publishedVersions[enrollment.brand.id] ?? [])
                          .filter((version) => version.weekCount === enrollment.plannedWeekCount)
                          .map((version) => (
                            <option key={version.id} value={version.id}>
                              Version {version.versionNumber} ({version.weekCount} Weeks)
                            </option>
                          ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => void bindCurriculumVersion(enrollment)}
                      className="rounded border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800"
                    >
                      Bind Curriculum
                    </button>
                    <button
                      type="button"
                      onClick={() => void cancel(enrollment)}
                      className="rounded border border-red-700 px-3 py-2 text-sm font-semibold text-red-800"
                    >
                      Cancel assignment
                    </button>
                  </div>
                ) : null}
                {enrollment.curriculumVersionId ? (
                  <p className="mt-3 text-sm font-medium text-emerald-800">
                    A curriculum version is bound to this enrollment.
                  </p>
                ) : null}
                <ParticipantTrainingProgress
                  participantId={participantId}
                  enrollmentId={enrollment.id}
                />
              </li>
            ))}
          </ul>
          {!loading && enrollments.length === 0 ? (
            <p className="mt-3 text-slate-600">No training assignments yet.</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
