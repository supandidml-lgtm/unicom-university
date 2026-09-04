'use client';

import { useEffect, useState } from 'react';

const api = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';

type Detail = {
  fullName: string;
  enrollmentStatus: string;
  brandCode: string;
  brandName: string;
  overallProgressBasisPoints: number;
  materialProgressBasisPoints: number;
  examProgressBasisPoints: number;
  weekSummary: {
    weekNumber: number;
    title: string;
    status: string;
    overallProgressBasisPoints: number;
    completedMaterialCount: number;
    requiredMaterialCount: number;
    passedExamCount: number;
    requiredExamCount: number;
  }[];
};

export function ReportingEnrollmentDetail({
  participantId,
  enrollmentId,
}: {
  participantId: string;
  enrollmentId: string;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void load();
  }, [participantId, enrollmentId]);
  async function load() {
    setError(null);
    const response = await fetch(
      `${api}/api/v1/reports/participants/${participantId}/enrollments/${enrollmentId}`,
      { credentials: 'include' },
    );
    if (!response.ok) {
      setError('Detail enrollment tidak dapat dimuat.');
      return;
    }
    setDetail((await response.json()) as Detail);
  }
  if (error)
    return (
      <main className="p-6">
        <p role="alert">{error}</p>
        <button className="mt-3 rounded border px-3 py-2" onClick={() => void load()}>
          Coba lagi
        </button>
      </main>
    );
  if (!detail)
    return (
      <main className="p-6">
        <p role="status">Memuat detail enrollment…</p>
      </main>
    );
  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <h1 className="text-2xl font-bold">Enrollment Report Detail</h1>
      <p className="mt-1 text-slate-600">
        {detail.fullName} · {detail.brandCode} — {detail.brandName} · {detail.enrollmentStatus}
      </p>
      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ['Overall progress', detail.overallProgressBasisPoints],
          ['Material progress', detail.materialProgressBasisPoints],
          ['Exam progress', detail.examProgressBasisPoints],
        ].map(([label, basisPoints]) => (
          <div key={String(label)} className="rounded border bg-white p-3">
            <dt className="text-sm text-slate-600">{label}</dt>
            <dd className="text-xl font-bold">{(Number(basisPoints) / 100).toFixed(2)}%</dd>
          </div>
        ))}
      </dl>
      <h2 className="mt-8 text-lg font-semibold">Week Summary</h2>
      <div className="mt-2 overflow-x-auto rounded border">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              {['Week', 'Status', 'Overall', 'Materials', 'Exams'].map((heading) => (
                <th key={heading} scope="col" className="p-2 text-left">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {detail.weekSummary.map((week) => (
              <tr key={week.weekNumber} className="border-t">
                <td className="p-2">
                  {week.weekNumber} · {week.title}
                </td>
                <td className="p-2">{week.status}</td>
                <td className="p-2">{(week.overallProgressBasisPoints / 100).toFixed(2)}%</td>
                <td className="p-2">
                  {week.completedMaterialCount}/{week.requiredMaterialCount}
                </td>
                <td className="p-2">
                  {week.passedExamCount}/{week.requiredExamCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
