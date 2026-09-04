'use client';

import { useEffect, useState } from 'react';
import { StatusBadge } from '@unicom/ui';
import { formatDate, formatPercentage, safeRequestMessage } from '../../lib/presentation';

const apiBaseUrl = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';

interface WeekProgress {
  id: string;
  weekNumber: number;
  title: string;
  overallProgressBasisPoints: number;
  status: 'EMPTY' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  requiredMaterialCount: number;
  completedMaterialCount: number;
  requiredExamCount: number;
  passedExamCount: number;
  exams: {
    id: string;
    title: string;
    latestScoreBasisPoints: number | null;
    bestScoreBasisPoints: number | null;
    latestResult: 'PASS' | 'FAIL' | null;
  }[];
}

interface EnrollmentProgress {
  enrollmentId: string;
  brand: { id: string; code: string; name: string };
  status: string;
  plannedWeekCount: number;
  overallProgressBasisPoints: number;
  courseProgressBasisPoints: number;
  examProgressBasisPoints: number;
  requiredMaterialCount: number;
  completedMaterialCount: number;
  requiredExamCount: number;
  passedExamCount: number;
  noMaterialRequired: boolean;
  noExamRequired: boolean;
  startedAt: string | null;
  completedAt: string | null;
  completionBlockedReason: string | null;
  weeks: WeekProgress[];
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  const visualValue = Math.min(10_000, Math.max(0, value));
  return (
    <div className="mt-3">
      <div className="flex justify-between gap-3 text-sm text-slate-700">
        <span>{label}</span>
        <span>{formatPercentage(value)}</span>
      </div>
      <div
        className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={visualValue / 100}
        aria-valuetext={formatPercentage(value)}
      >
        <div
          className="h-full rounded-full bg-indigo-700"
          style={{ width: `${visualValue / 100}%` }}
        />
      </div>
    </div>
  );
}

export default function MyTrainingPage() {
  const [items, setItems] = useState<EnrollmentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load(): Promise<void> {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/my-training/dashboard`, {
        credentials: 'include',
      });
      if (response.status === 401 || response.status === 403) {
        setDenied(true);
        return;
      }
      if (!response.ok) {
        setError(safeRequestMessage(response.status));
        return;
      }
      setItems(((await response.json()) as { items: EnrollmentProgress[] }).items);
    } catch {
      setError(safeRequestMessage());
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ui-page">
      <section className="ui-container ui-surface max-w-5xl p-5 sm:p-8">
        {denied ? (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Access denied</h1>
            <p className="mt-3 text-slate-600">You do not have access to this area.</p>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-[0.12em] text-indigo-700">
                  LEARNING SPACE
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                  My Training
                </h1>
              </div>
              <a
                className="inline-flex min-h-11 items-center rounded-lg border border-indigo-200 px-4 text-sm font-semibold text-indigo-800 hover:bg-indigo-50"
                href="/my-training/certificates"
              >
                View certificates
              </a>
            </div>
            <p className="mt-2 text-slate-600">
              Progress is calculated from server-verified learning activity and submitted assessment
              results.
            </p>
            {error ? (
              <p className="mt-5 rounded bg-red-50 p-3 text-sm text-red-800" role="alert">
                {error}
              </p>
            ) : null}
            {loading ? (
              <div
                className="mt-5 grid gap-4"
                role="status"
                aria-label="Loading training dashboard"
              >
                <div className="h-44 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-44 animate-pulse rounded-xl bg-slate-100" />
              </div>
            ) : null}
            <ul className="mt-6 grid gap-4">
              {items.map((item) => (
                <li
                  key={item.enrollmentId}
                  className="rounded-xl border border-slate-200 p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950">{item.brand.name}</h2>
                      <p className="mt-1 text-sm text-slate-700">Brand: {item.brand.code}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <ProgressBar label="Overall progress" value={item.overallProgressBasisPoints} />
                  {item.noMaterialRequired ? (
                    <p className="mt-3 text-sm text-slate-600">No material required</p>
                  ) : (
                    <ProgressBar
                      label="Course / material progress"
                      value={item.courseProgressBasisPoints}
                    />
                  )}
                  {item.noExamRequired ? (
                    <p className="mt-3 text-sm text-slate-600">No exam required</p>
                  ) : (
                    <ProgressBar label="Exam progress" value={item.examProgressBasisPoints} />
                  )}
                  <p className="mt-3 text-sm text-slate-700">
                    Materials: {item.completedMaterialCount}/{item.requiredMaterialCount} completed
                    · Exams: {item.passedExamCount}/{item.requiredExamCount} passed · Planned
                    duration: {item.plannedWeekCount} weeks
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    Started: {item.startedAt ? formatDate(item.startedAt) : 'Not started'} ·
                    Completed: {item.completedAt ? formatDate(item.completedAt) : 'Not completed'}
                  </p>
                  {item.completionBlockedReason === 'NO_TRAINING_REQUIREMENTS' ? (
                    <p className="mt-2 text-sm text-amber-800">
                      This enrollment has no training requirements.
                    </p>
                  ) : null}
                  <a
                    className="mt-4 inline-block rounded bg-indigo-700 px-3 py-2 text-sm font-semibold text-white"
                    href={`/my-training/${item.enrollmentId}`}
                  >
                    Continue training
                  </a>
                  <details className="mt-4 border-t border-slate-200 pt-3">
                    <summary className="cursor-pointer font-semibold text-indigo-700">
                      Week breakdown
                    </summary>
                    <ul className="mt-3 grid gap-3">
                      {item.weeks.map((week) => (
                        <li key={week.id} className="rounded border border-slate-200 p-3 text-sm">
                          <p className="font-semibold text-slate-900">
                            Week {week.weekNumber} — {week.title}
                          </p>
                          <p className="mt-1 text-slate-700">
                            Status: {week.status.replaceAll('_', ' ')} · Overall:{' '}
                            {formatPercentage(week.overallProgressBasisPoints)} · Materials:{' '}
                            {week.completedMaterialCount}/{week.requiredMaterialCount} · Exams:{' '}
                            {week.passedExamCount}/{week.requiredExamCount}
                          </p>
                          {week.exams.map((exam) => (
                            <p key={exam.id} className="mt-1 text-slate-700">
                              {exam.title}: {exam.latestResult ?? 'No submitted result'} · Latest
                              score:{' '}
                              {exam.latestScoreBasisPoints === null
                                ? '—'
                                : formatPercentage(exam.latestScoreBasisPoints)}{' '}
                              · Best score:{' '}
                              {exam.bestScoreBasisPoints === null
                                ? '—'
                                : formatPercentage(exam.bestScoreBasisPoints)}
                            </p>
                          ))}
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>
            {!loading && items.length === 0 ? (
              <section className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <h2 className="font-semibold text-slate-950">No training assigned</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Your training assignments will appear here when issued.
                </p>
              </section>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
