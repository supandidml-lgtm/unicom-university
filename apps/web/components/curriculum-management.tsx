'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ExamEditor } from './exam-editor';

const apiBaseUrl = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';

interface Brand {
  id: string;
  code: string;
  name: string;
}

interface Curriculum {
  id: string;
  brand: Brand;
  code: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  versionCount: number;
}

interface CurriculumModule {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  materials: LearningMaterial[];
}

interface LearningMaterial {
  id: string;
  type: 'VIDEO' | 'PDF' | 'IMAGE' | 'DOCUMENT' | 'SPREADSHEET';
  title: string;
  description: string | null;
  sortOrder: number;
  fileAsset: { originalFileName: string; sizeBytes: number; status: string };
}

interface CurriculumWeek {
  id: string;
  weekNumber: number;
  title: string;
  description: string | null;
  modules: CurriculumModule[];
}

interface CurriculumVersion {
  id: string;
  curriculumId: string;
  versionNumber: number;
  status: 'DRAFT' | 'PUBLISHED' | 'RETIRED';
  publishedAt: string | null;
  retiredAt: string | null;
  weekCount: number;
  weeks: CurriculumWeek[];
}

interface AuthIdentity {
  permissions: string[];
}

export function CurriculumManagement({ audience }: { audience: 'admin' | 'trainer' }) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [versions, setVersions] = useState<CurriculumVersion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => curricula.find((curriculum) => curriculum.id === selectedId) ?? null,
    [curricula, selectedId],
  );
  const can = (permission: string) => permissions.includes(permission);

  useEffect(() => {
    void load();
  }, []);

  async function load(preferredCurriculumId?: string): Promise<void> {
    setLoading(true);
    try {
      const me = await fetch(`${apiBaseUrl}/api/v1/auth/me`, { credentials: 'include' });
      if (!me.ok) {
        setDenied(true);
        return;
      }
      const identity = (await me.json()) as { user: AuthIdentity };
      setPermissions(identity.user.permissions);
      if (!identity.user.permissions.includes('curricula.read')) {
        setDenied(true);
        return;
      }
      const [curriculaResponse, brandsResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/v1/curricula`, { credentials: 'include' }),
        fetch(`${apiBaseUrl}/api/v1/brands?status=ACTIVE&pageSize=100`, { credentials: 'include' }),
      ]);
      if (!curriculaResponse.ok || !brandsResponse.ok) {
        throw new Error('Curriculum data could not be loaded.');
      }
      const records = ((await curriculaResponse.json()) as { items: Curriculum[] }).items;
      setCurricula(records);
      setBrands(((await brandsResponse.json()) as { items: Brand[] }).items);
      const selectedCurriculumId = preferredCurriculumId ?? selectedId;
      const nextSelected =
        selectedCurriculumId && records.some((item) => item.id === selectedCurriculumId)
          ? selectedCurriculumId
          : (records[0]?.id ?? null);
      setSelectedId(nextSelected);
      if (nextSelected) await loadVersions(nextSelected);
      else setVersions([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Curriculum data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  async function loadVersions(curriculumId: string): Promise<void> {
    const response = await fetch(`${apiBaseUrl}/api/v1/curricula/${curriculumId}/versions`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Curriculum versions could not be loaded.');
    setVersions(((await response.json()) as { items: CurriculumVersion[] }).items);
  }

  async function csrfToken(): Promise<string> {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/csrf`, { credentials: 'include' });
    if (!response.ok) throw new Error('Your session must be refreshed before changing curricula.');
    return ((await response.json()) as { csrfToken: string }).csrfToken;
  }

  async function mutate(path: string, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', body?: unknown) {
    const response = await fetch(`${apiBaseUrl}/api/v1/${path}`, {
      method,
      credentials: 'include',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        'X-CSRF-Token': await csrfToken(),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? 'The requested curriculum change was rejected.');
    }
    return response;
  }

  async function chooseCurriculum(curriculumId: string): Promise<void> {
    setError(null);
    setSelectedId(curriculumId);
    try {
      await loadVersions(curriculumId);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Curriculum versions could not be loaded.',
      );
    }
  }

  async function createCurriculum(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setError(null);
    try {
      const response = await mutate('curricula', 'POST', {
        brandId: values.get('brandId'),
        code: String(values.get('code') ?? '').toUpperCase(),
        name: values.get('name'),
        description: values.get('description') || undefined,
      });
      const created = (await response.json()) as Curriculum;
      form.reset();
      setSelectedId(created.id);
      await load(created.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Curriculum creation failed.');
    }
  }

  async function updateCurriculum(): Promise<void> {
    if (!selected) return;
    const name = window.prompt('Curriculum name', selected.name);
    if (name === null || name.trim() === '') return;
    const description = window.prompt('Description (optional)', selected.description ?? '');
    if (description === null) return;
    try {
      await mutate(`curricula/${selected.id}`, 'PATCH', { name, description });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Curriculum update failed.');
    }
  }

  async function archiveCurriculum(): Promise<void> {
    if (
      !selected ||
      !window.confirm(`Archive ${selected.code}? Historical versions will be retained.`)
    )
      return;
    try {
      await mutate(`curricula/${selected.id}/archive`, 'PATCH');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Curriculum archive failed.');
    }
  }

  async function createVersion(cloneFromVersionId?: string): Promise<void> {
    if (!selected) return;
    try {
      await mutate(
        `curricula/${selected.id}/versions`,
        'POST',
        cloneFromVersionId ? { cloneFromVersionId } : {},
      );
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Version creation failed.');
    }
  }

  async function addWeek(version: CurriculumVersion): Promise<void> {
    const weekNumber = version.weeks.length + 1;
    const title = window.prompt(`Title for Week ${weekNumber}`);
    if (!title?.trim()) return;
    try {
      await mutate(`curriculum-versions/${version.id}/weeks`, 'POST', { weekNumber, title });
      await loadVersions(version.curriculumId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Week creation failed.');
    }
  }

  async function updateWeek(version: CurriculumVersion, week: CurriculumWeek): Promise<void> {
    const title = window.prompt(`Week ${week.weekNumber} title`, week.title);
    if (!title?.trim()) return;
    try {
      await mutate(`curriculum-weeks/${week.id}`, 'PATCH', { title });
      await loadVersions(version.curriculumId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Week update failed.');
    }
  }

  async function deleteWeek(version: CurriculumVersion, week: CurriculumWeek): Promise<void> {
    if (!window.confirm(`Remove Week ${week.weekNumber} and its Modules?`)) return;
    try {
      await mutate(`curriculum-weeks/${week.id}`, 'DELETE');
      await loadVersions(version.curriculumId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Week removal failed.');
    }
  }

  async function reorderWeeks(version: CurriculumVersion, from: number, to: number): Promise<void> {
    const ids = version.weeks.map((week) => week.id);
    const [moved] = ids.splice(from, 1);
    if (!moved) return;
    ids.splice(to, 0, moved);
    try {
      await mutate(`curriculum-versions/${version.id}/weeks/order`, 'PUT', { ids });
      await loadVersions(version.curriculumId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Week reordering failed.');
    }
  }

  async function addModule(version: CurriculumVersion, week: CurriculumWeek): Promise<void> {
    const code = window.prompt('Module code (uppercase letters, digits, or underscores)');
    const name = window.prompt('Module name');
    if (!code?.trim() || !name?.trim()) return;
    try {
      await mutate(`curriculum-weeks/${week.id}/modules`, 'POST', {
        code: code.toUpperCase(),
        name,
      });
      await loadVersions(version.curriculumId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Module creation failed.');
    }
  }

  async function updateModule(version: CurriculumVersion, module: CurriculumModule): Promise<void> {
    const name = window.prompt(`Module ${module.code} name`, module.name);
    if (!name?.trim()) return;
    try {
      await mutate(`curriculum-modules/${module.id}`, 'PATCH', { name });
      await loadVersions(version.curriculumId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Module update failed.');
    }
  }

  async function deleteModule(version: CurriculumVersion, module: CurriculumModule): Promise<void> {
    if (!window.confirm(`Remove module ${module.code}?`)) return;
    try {
      await mutate(`curriculum-modules/${module.id}`, 'DELETE');
      await loadVersions(version.curriculumId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Module removal failed.');
    }
  }

  async function reorderModules(
    version: CurriculumVersion,
    week: CurriculumWeek,
    from: number,
    to: number,
  ): Promise<void> {
    const ids = week.modules.map((module) => module.id);
    const [moved] = ids.splice(from, 1);
    if (!moved) return;
    ids.splice(to, 0, moved);
    try {
      await mutate(`curriculum-weeks/${week.id}/modules/order`, 'PUT', { ids });
      await loadVersions(version.curriculumId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Module reordering failed.');
    }
  }

  async function publish(version: CurriculumVersion): Promise<void> {
    if (!window.confirm(`Publish curriculum version ${version.versionNumber}?`)) return;
    try {
      await mutate(`curriculum-versions/${version.id}/publish`, 'POST');
      await loadVersions(version.curriculumId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Publishing failed.');
    }
  }

  async function uploadMaterial(
    version: CurriculumVersion,
    module: CurriculumModule,
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get('file');
    if (!(file instanceof File) || file.size === 0) return;
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/curriculum-modules/${module.id}/materials`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'X-CSRF-Token': await csrfToken() },
          body: data,
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? 'Material upload was rejected.');
      }
      form.reset();
      await loadVersions(version.curriculumId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Material upload failed.');
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6 sm:py-12">
      <section className="mx-auto w-full max-w-6xl rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
        <p className="text-sm font-semibold tracking-[0.2em] text-indigo-600">UNICOM UNIVERSITY</p>
        {denied ? (
          <>
            <h1 className="mt-4 text-3xl font-bold text-slate-950">Access Denied</h1>
            <p className="mt-3 text-slate-600">You do not have permission to read curricula.</p>
          </>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                  Curriculum Management
                </h1>
                <p className="mt-2 text-slate-600">
                  Brand-scoped, versioned curriculum structure. Published and retired versions are
                  read-only.
                </p>
              </div>
              <a
                className="text-sm font-semibold text-indigo-700 underline"
                href={audience === 'trainer' ? '/trainer/participants' : '/authenticated'}
              >
                Back to authenticated session
              </a>
            </div>
            {error ? (
              <p className="mt-5 rounded bg-red-50 p-3 text-sm text-red-800" role="alert">
                {error}
              </p>
            ) : null}
            {can('curricula.create') ? (
              <form
                className="mt-7 grid gap-4 rounded-xl border border-slate-200 p-5 sm:grid-cols-2"
                onSubmit={createCurriculum}
              >
                <h2 className="sm:col-span-2 text-lg font-semibold text-slate-900">
                  Create Curriculum
                </h2>
                <label className="grid gap-1 text-sm font-medium text-slate-800">
                  Brand *
                  <select name="brandId" required className="rounded border border-slate-300 p-2">
                    <option value="">Select Brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name} ({brand.code})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-800">
                  Curriculum Code *
                  <input
                    name="code"
                    required
                    pattern="[A-Z][A-Z0-9_]*"
                    maxLength={64}
                    className="rounded border border-slate-300 p-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-800">
                  Name *
                  <input
                    name="name"
                    required
                    maxLength={100}
                    className="rounded border border-slate-300 p-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-800">
                  Description
                  <input
                    name="description"
                    maxLength={500}
                    className="rounded border border-slate-300 p-2"
                  />
                </label>
                <button
                  type="submit"
                  className="w-fit rounded bg-indigo-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  Create Curriculum
                </button>
              </form>
            ) : null}
            {loading ? (
              <p className="mt-6 text-slate-600" role="status">
                Loading curricula…
              </p>
            ) : null}
            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(15rem,0.7fr)_minmax(0,1.7fr)]">
              <section aria-labelledby="curriculum-list">
                <h2 id="curriculum-list" className="text-lg font-semibold text-slate-900">
                  Curricula
                </h2>
                <ul className="mt-3 grid gap-2">
                  {curricula.map((curriculum) => (
                    <li key={curriculum.id}>
                      <button
                        type="button"
                        onClick={() => void chooseCurriculum(curriculum.id)}
                        className={`w-full rounded border p-3 text-left ${selectedId === curriculum.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200'}`}
                      >
                        <span className="block font-semibold text-slate-950">
                          {curriculum.name}
                        </span>
                        <span className="text-sm text-slate-600">
                          {curriculum.brand.code} · {curriculum.code} · {curriculum.status}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {!loading && curricula.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">
                    No curricula are available in your scope.
                  </p>
                ) : null}
              </section>
              <section aria-live="polite">
                {selected ? (
                  <>
                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap justify-between gap-3">
                        <div>
                          <h2 className="text-xl font-semibold text-slate-950">{selected.name}</h2>
                          <p className="text-sm text-slate-600">
                            {selected.brand.name} · {selected.code} · {selected.status}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {can('curricula.update') ? (
                            <button
                              type="button"
                              onClick={() => void updateCurriculum()}
                              className="rounded border border-indigo-700 px-3 py-1 text-sm font-semibold text-indigo-700"
                            >
                              Edit curriculum
                            </button>
                          ) : null}
                          {can('curricula.archive') && selected.status === 'ACTIVE' ? (
                            <button
                              type="button"
                              onClick={() => void archiveCurriculum()}
                              className="rounded border border-amber-700 px-3 py-1 text-sm font-semibold text-amber-800"
                            >
                              Archive curriculum
                            </button>
                          ) : null}
                          {can('curriculum_versions.create') && selected.status === 'ACTIVE' ? (
                            <button
                              type="button"
                              onClick={() => void createVersion()}
                              className="rounded bg-indigo-700 px-3 py-1 text-sm font-semibold text-white"
                            >
                              New draft version
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {selected.description ? (
                        <p className="mt-2 text-sm text-slate-700">{selected.description}</p>
                      ) : null}
                    </div>
                    <div className="mt-4 grid gap-4">
                      {versions.map((version) => (
                        <article
                          key={version.id}
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h3 className="font-semibold text-slate-950">
                                Version {version.versionNumber}{' '}
                                <span className="text-sm font-medium text-slate-600">
                                  {version.status}
                                </span>
                              </h3>
                              <p className="text-sm text-slate-600">
                                {version.weekCount} Week(s)
                                {version.status === 'RETIRED'
                                  ? ' · retained for historical bindings'
                                  : ''}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {can('curriculum_versions.create') ? (
                                <button
                                  type="button"
                                  onClick={() => void createVersion(version.id)}
                                  className="rounded border border-indigo-700 px-3 py-1 text-sm font-semibold text-indigo-700"
                                >
                                  Clone as draft
                                </button>
                              ) : null}
                              {version.status === 'DRAFT' && can('curriculum_versions.publish') ? (
                                <button
                                  type="button"
                                  onClick={() => void publish(version)}
                                  className="rounded bg-emerald-700 px-3 py-1 text-sm font-semibold text-white"
                                >
                                  Publish
                                </button>
                              ) : null}
                            </div>
                          </div>
                          <ol className="mt-4 grid gap-3">
                            {version.weeks.map((week, weekIndex) => (
                              <li key={week.id} className="rounded border border-slate-200 p-3">
                                <div className="flex flex-wrap justify-between gap-2">
                                  <p className="font-medium text-slate-950">
                                    Week {week.weekNumber}: {week.title}
                                  </p>
                                  {version.status === 'DRAFT' && can('curriculum_weeks.manage') ? (
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() => void updateWeek(version, week)}
                                        className="text-sm font-semibold text-indigo-700"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        disabled={weekIndex === 0}
                                        onClick={() =>
                                          void reorderWeeks(version, weekIndex, weekIndex - 1)
                                        }
                                        className="text-sm font-semibold text-indigo-700 disabled:text-slate-400"
                                      >
                                        Move up
                                      </button>
                                      <button
                                        type="button"
                                        disabled={weekIndex === version.weeks.length - 1}
                                        onClick={() =>
                                          void reorderWeeks(version, weekIndex, weekIndex + 1)
                                        }
                                        className="text-sm font-semibold text-indigo-700 disabled:text-slate-400"
                                      >
                                        Move down
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void deleteWeek(version, week)}
                                        className="text-sm font-semibold text-red-700"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                                <ul className="mt-2 grid gap-1 pl-4 text-sm text-slate-700">
                                  {week.modules.map((module, moduleIndex) => (
                                    <li
                                      key={module.id}
                                      className="flex flex-wrap items-center gap-x-2"
                                    >
                                      <span>
                                        {module.sortOrder}. {module.code} — {module.name}
                                      </span>
                                      {version.status === 'DRAFT' &&
                                      can('curriculum_modules.manage') ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => void updateModule(version, module)}
                                            className="font-semibold text-indigo-700"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            disabled={moduleIndex === 0}
                                            onClick={() =>
                                              void reorderModules(
                                                version,
                                                week,
                                                moduleIndex,
                                                moduleIndex - 1,
                                              )
                                            }
                                            className="font-semibold text-indigo-700 disabled:text-slate-400"
                                          >
                                            ↑
                                          </button>
                                          <button
                                            type="button"
                                            disabled={moduleIndex === week.modules.length - 1}
                                            onClick={() =>
                                              void reorderModules(
                                                version,
                                                week,
                                                moduleIndex,
                                                moduleIndex + 1,
                                              )
                                            }
                                            className="font-semibold text-indigo-700 disabled:text-slate-400"
                                          >
                                            ↓
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => void deleteModule(version, module)}
                                            className="font-semibold text-red-700"
                                          >
                                            Remove
                                          </button>
                                        </>
                                      ) : null}
                                      <ul className="mt-2 w-full grid gap-1 rounded bg-slate-50 p-2 text-xs text-slate-700">
                                        {module.materials.map((material) => (
                                          <li key={material.id}>
                                            {material.type} · {material.title} ·{' '}
                                            {material.fileAsset.originalFileName}{' '}
                                            <span className="font-semibold">
                                              {material.fileAsset.status}
                                            </span>
                                          </li>
                                        ))}
                                        {module.materials.length === 0 ? (
                                          <li>No materials yet.</li>
                                        ) : null}
                                      </ul>
                                      {version.status === 'DRAFT' &&
                                      can('materials.create') &&
                                      can('materials.upload') ? (
                                        <form
                                          className="mt-2 grid w-full gap-2 sm:grid-cols-4"
                                          onSubmit={(event) =>
                                            void uploadMaterial(version, module, event)
                                          }
                                        >
                                          <label className="grid gap-1 text-xs font-medium text-slate-700">
                                            Material title
                                            <input
                                              name="title"
                                              required
                                              maxLength={160}
                                              className="rounded border border-slate-300 px-2 py-1"
                                            />
                                          </label>
                                          <label className="grid gap-1 text-xs font-medium text-slate-700">
                                            Material type
                                            <select
                                              name="type"
                                              defaultValue="PDF"
                                              className="rounded border border-slate-300 px-2 py-1"
                                            >
                                              <option value="VIDEO">Video</option>
                                              <option value="PDF">PDF</option>
                                              <option value="IMAGE">Image</option>
                                              <option value="DOCUMENT">Document</option>
                                              <option value="SPREADSHEET">Spreadsheet</option>
                                            </select>
                                          </label>
                                          <label className="grid gap-1 text-xs font-medium text-slate-700">
                                            Material file
                                            <input
                                              name="file"
                                              type="file"
                                              required
                                              className="text-xs"
                                            />
                                          </label>
                                          <button
                                            type="submit"
                                            className="rounded border border-indigo-700 px-2 py-1 text-xs font-semibold text-indigo-700"
                                          >
                                            Upload material
                                          </button>
                                        </form>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                                {can('exams.read') ? (
                                  <ExamEditor weekId={week.id} draft={version.status === 'DRAFT'} />
                                ) : null}
                                {version.status === 'DRAFT' && can('curriculum_modules.manage') ? (
                                  <button
                                    type="button"
                                    onClick={() => void addModule(version, week)}
                                    className="mt-3 text-sm font-semibold text-indigo-700"
                                  >
                                    Add module
                                  </button>
                                ) : null}
                              </li>
                            ))}
                          </ol>
                          {version.status === 'DRAFT' && can('curriculum_weeks.manage') ? (
                            <button
                              type="button"
                              onClick={() => void addWeek(version)}
                              className="mt-4 rounded border border-indigo-700 px-3 py-1 text-sm font-semibold text-indigo-700"
                            >
                              Add next Week
                            </button>
                          ) : null}
                        </article>
                      ))}
                    </div>
                    {versions.length === 0 ? (
                      <p className="mt-4 text-sm text-slate-600">
                        No versions yet. Create a draft to begin the structure.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="rounded border border-dashed border-slate-300 p-5 text-slate-600">
                    Select a Curriculum to view versions.
                  </p>
                )}
              </section>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
