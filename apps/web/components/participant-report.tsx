'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
const api = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';
type Item = {
  participantUserId: string;
  enrollmentId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  maskedNik: string;
  brandCode: string;
  brandName: string;
  enrollmentStatus: string;
  overallProgressBasisPoints: number;
  materialProgressBasisPoints: number;
  examProgressBasisPoints: number;
  completedMaterialCount: number;
  requiredMaterialCount: number;
  passedExamCount: number;
  requiredExamCount: number;
  latestExamScoreBasisPoints: number | null;
  bestExamScoreBasisPoints: number | null;
  startedAt: string | null;
  completedAt: string | null;
};
type Report = { page: number; pageSize: number; total: number; items: Item[] };
type Brand = { id: string; code: string; name: string; status: string };
const officialTimezone = 'Asia/Jakarta';

function dateInOfficialTimezone(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: officialTimezone }).format(
        new Date(value),
      )
    : '—';
}

export function ParticipantReport({ audience }: { audience: 'admin' | 'trainer' }) {
  const [report, setReport] = useState<Report | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [query, setQuery] = useState(new URLSearchParams());
  const [error, setError] = useState<string | null>(null);
  const href = useMemo(() => `${api}/api/v1/reports/participants?${query.toString()}`, [query]);
  useEffect(() => {
    void load();
  }, [href]);
  useEffect(() => {
    void loadBrands();
  }, []);
  async function loadBrands() {
    const response = await fetch(`${api}/api/v1/reports/filter-options`, {
      credentials: 'include',
    });
    if (response.ok) setBrands(((await response.json()) as { brands: Brand[] }).brands);
  }
  async function load() {
    setError(null);
    const response = await fetch(href, { credentials: 'include' });
    if (!response.ok) {
      setError('Laporan tidak dapat dimuat.');
      return;
    }
    setReport((await response.json()) as Report);
  }
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const [key, value] of data) {
      if (!value) continue;
      if (key === 'minProgressPercent' || key === 'maxProgressPercent') {
        const percentage = Number(value);
        if (Number.isFinite(percentage)) {
          next.set(
            key === 'minProgressPercent' ? 'minProgressBasisPoints' : 'maxProgressBasisPoints',
            String(Math.round(percentage * 100)),
          );
        }
        continue;
      }
      next.set(key, String(value));
    }
    next.set('page', '1');
    next.set('pageSize', data.get('pageSize')?.toString() || '25');
    setQuery(next);
  }
  function reset() {
    setQuery(new URLSearchParams());
    const form = document.querySelector<HTMLFormElement>('#participant-report-filters');
    form?.reset();
  }
  function exportXlsx() {
    window.location.assign(`${api}/api/v1/reports/participants/export.xlsx?${query.toString()}`);
  }
  function changePage(page: number) {
    const next = new URLSearchParams(query);
    next.set('page', String(page));
    setQuery(next);
  }
  return (
    <section className="mx-auto max-w-7xl p-4 sm:p-6">
      <h1 className="text-2xl font-bold">Participant Training Report</h1>
      <p className="mt-1 text-sm text-slate-600">
        {audience === 'trainer'
          ? 'Hanya enrollment dalam Brand yang Anda akses.'
          : 'Mencakup data operasional seluruh Brand.'}
      </p>
      <form
        id="participant-report-filters"
        onSubmit={apply}
        className="mt-4 grid gap-2 rounded border bg-white p-3 sm:grid-cols-4"
      >
        <label className="text-sm">
          Cari peserta
          <input
            name="search"
            className="mt-1 w-full rounded border p-2"
            placeholder="Nama, email, telepon"
          />
        </label>
        <label className="text-sm">
          Brand
          <select name="brandId" className="mt-1 w-full rounded border p-2">
            <option value="">Semua Brand yang dapat diakses</option>
            {brands.map((brand) => (
              <option value={brand.id} key={brand.id}>
                {brand.code} — {brand.name} ({brand.status})
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Status
          <select name="status" className="mt-1 w-full rounded border p-2">
            <option value="">Semua</option>
            {['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SUSPENDED', 'CANCELLED'].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </label>
        <label className="text-sm">
          Mulai dari
          <input name="startedFrom" type="date" className="mt-1 w-full rounded border p-2" />
        </label>
        <label className="text-sm">
          Mulai sampai
          <input name="startedTo" type="date" className="mt-1 w-full rounded border p-2" />
        </label>
        <label className="text-sm">
          Selesai dari
          <input name="completedFrom" type="date" className="mt-1 w-full rounded border p-2" />
        </label>
        <label className="text-sm">
          Selesai sampai
          <input name="completedTo" type="date" className="mt-1 w-full rounded border p-2" />
        </label>
        <label className="text-sm">
          Progres minimum (%)
          <input
            name="minProgressPercent"
            type="number"
            min="0"
            max="100"
            step="0.01"
            className="mt-1 w-full rounded border p-2"
          />
        </label>
        <label className="text-sm">
          Progres maksimum (%)
          <input
            name="maxProgressPercent"
            type="number"
            min="0"
            max="100"
            step="0.01"
            className="mt-1 w-full rounded border p-2"
          />
        </label>
        <label className="text-sm">
          Urutkan
          <select
            name="sort"
            className="mt-1 w-full rounded border p-2"
            defaultValue="overallProgress"
          >
            <option value="overallProgress">Overall progress</option>
            <option value="fullName">Nama</option>
            <option value="brand">Brand</option>
            <option value="status">Status</option>
            <option value="startedAt">Tanggal mulai</option>
            <option value="completedAt">Tanggal selesai</option>
          </select>
        </label>
        <label className="text-sm">
          Arah
          <select name="direction" className="mt-1 w-full rounded border p-2" defaultValue="desc">
            <option value="desc">Menurun</option>
            <option value="asc">Menaik</option>
          </select>
        </label>
        <label className="text-sm">
          Baris per halaman
          <select name="pageSize" className="mt-1 w-full rounded border p-2" defaultValue="25">
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className="rounded bg-indigo-700 px-3 py-2 text-sm font-semibold text-white">
            Apply
          </button>
          <button type="button" onClick={reset} className="rounded border px-3 py-2 text-sm">
            Reset
          </button>
          <button
            type="button"
            onClick={exportXlsx}
            className="rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white"
          >
            Export Excel
          </button>
        </div>
      </form>
      {error ? (
        <p className="mt-3" role="alert">
          {error}
        </p>
      ) : null}
      {!report ? (
        <p className="mt-3" role="status">
          Memuat laporan…
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm" role="status">
            {report.total} record · halaman {report.page} dari{' '}
            {Math.max(1, Math.ceil(report.total / report.pageSize))}
          </p>
          <div className="mt-2 overflow-x-auto rounded border">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  {[
                    'Name',
                    'Email',
                    'Phone',
                    'Masked NIK',
                    'Brand',
                    'Enrollment Status',
                    'Overall %',
                    'Materials %',
                    'Exam %',
                    'Material Summary',
                    'Exam Summary',
                    'Started',
                    'Completed',
                    'Detail',
                  ].map((header) => (
                    <th key={header} scope="col" className="whitespace-nowrap p-2 text-left">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.items.map((item) => (
                  <tr key={item.enrollmentId} className="border-t">
                    <td className="p-2">{item.fullName}</td>
                    <td className="p-2">{item.email}</td>
                    <td className="p-2">{item.phoneNumber}</td>
                    <td className="p-2">{item.maskedNik}</td>
                    <td className="p-2">
                      {item.brandCode} — {item.brandName}
                    </td>
                    <td className="p-2">{item.enrollmentStatus}</td>
                    <td className="p-2">{(item.overallProgressBasisPoints / 100).toFixed(2)}%</td>
                    <td className="p-2">{(item.materialProgressBasisPoints / 100).toFixed(2)}%</td>
                    <td className="p-2">{(item.examProgressBasisPoints / 100).toFixed(2)}%</td>
                    <td className="p-2">
                      {item.completedMaterialCount}/{item.requiredMaterialCount} completed
                    </td>
                    <td className="p-2">
                      {item.passedExamCount}/{item.requiredExamCount} passed
                      {item.bestExamScoreBasisPoints !== null
                        ? ` · best ${(item.bestExamScoreBasisPoints / 100).toFixed(2)}%`
                        : item.latestExamScoreBasisPoints !== null
                          ? ` · latest ${(item.latestExamScoreBasisPoints / 100).toFixed(2)}%`
                          : ''}
                    </td>
                    <td className="p-2">{dateInOfficialTimezone(item.startedAt)}</td>
                    <td className="p-2">{dateInOfficialTimezone(item.completedAt)}</td>
                    <td className="p-2">
                      <a
                        className="font-medium text-indigo-700 underline"
                        href={`/${audience}/reports/participants/${item.participantUserId}/enrollments/${item.enrollmentId}`}
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
                {report.items.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="p-4 text-center">
                      No training records match the selected filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <nav className="mt-3 flex items-center gap-2" aria-label="Report pagination">
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm disabled:opacity-50"
              disabled={report.page <= 1}
              onClick={() => changePage(report.page - 1)}
            >
              Sebelumnya
            </button>
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm disabled:opacity-50"
              disabled={report.page >= Math.ceil(report.total / report.pageSize)}
              onClick={() => changePage(report.page + 1)}
            >
              Berikutnya
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
