'use client';

import { useEffect, useState } from 'react';
import { Card } from '@unicom/ui';
import { formatPercentage, safeRequestMessage } from '../lib/presentation';

const api = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';
type Dashboard = {
  scope: string;
  totalActiveParticipants: number;
  activeEnrollments: number;
  completedEnrollments: number;
  failedEnrollments: number;
  averageOverallProgressBasisPoints: number;
  brands: {
    brandId: string;
    brandCode: string;
    brandName: string;
    totalEnrollments: number;
    completionRateBasisPoints: number;
    averageOverallProgressBasisPoints: number;
  }[];
};

export function ReportingDashboard({ audience }: { audience: 'admin' | 'trainer' }) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void load();
  }, [audience]);
  async function load() {
    setError(null);
    try {
      const response = await fetch(`${api}/api/v1/dashboard/${audience}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        setError(safeRequestMessage(response.status));
        return;
      }
      setDashboard((await response.json()) as Dashboard);
    } catch {
      setError(safeRequestMessage());
    }
  }
  if (error)
    return (
      <main className="ui-page">
        <section className="ui-container ui-surface max-w-xl p-6">
          <h1 className="text-xl font-bold">Dashboard unavailable</h1>
          <p className="mt-2" role="alert">
            {error}
          </p>
          <button
            className="mt-4 min-h-11 rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white"
            onClick={() => void load()}
          >
            Try again
          </button>
        </section>
      </main>
    );
  if (!dashboard)
    return (
      <main className="ui-page" role="status" aria-label="Loading dashboard">
        <div className="ui-container grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="h-28 animate-pulse rounded-xl bg-slate-200 sm:col-span-2 lg:col-span-5" />
        </div>
      </main>
    );
  const cards = [
    ['Peserta Aktif', dashboard.totalActiveParticipants],
    ['Enrollment Aktif', dashboard.activeEnrollments],
    ['Selesai', dashboard.completedEnrollments],
    ['Gagal', dashboard.failedEnrollments],
    ['Average Progress', formatPercentage(dashboard.averageOverallProgressBasisPoints)],
  ];
  return (
    <main className="ui-page">
      <section className="ui-container max-w-6xl">
        <p className="text-sm font-semibold tracking-[0.12em] text-indigo-700">OPERATIONS</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {audience === 'admin' ? 'Management Dashboard' : 'Trainer Dashboard'}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Data operasional berbasis progres server-side yang canonical.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map(([label, value]) => (
            <Card key={String(label)} className="p-4">
              <p className="text-sm text-slate-600">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </Card>
          ))}
        </div>
        <h2 className="mt-8 text-lg font-semibold">Ringkasan Brand</h2>
        <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <caption className="sr-only">Brand operational summary</caption>
            <thead>
              <tr>
                <th className="p-2 text-left">Brand</th>
                <th className="p-2 text-right">Enrollment</th>
                <th className="p-2 text-right">Selesai</th>
                <th className="p-2 text-right">Rata-rata Progres</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.brands.map((brand) => (
                <tr key={brand.brandId} className="border-t">
                  <td className="p-2">
                    {brand.brandCode} — {brand.brandName}
                  </td>
                  <td className="p-2 text-right">{brand.totalEnrollments}</td>
                  <td className="p-2 text-right">
                    {formatPercentage(brand.completionRateBasisPoints)}
                  </td>
                  <td className="p-2 text-right">
                    {formatPercentage(brand.averageOverallProgressBasisPoints)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {dashboard.brands.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            No Brand records are available in your current scope.
          </p>
        ) : null}
      </section>
    </main>
  );
}
