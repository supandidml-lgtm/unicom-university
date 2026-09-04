'use client';

import { useEffect, useState } from 'react';

const apiBaseUrl = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';

interface Progress {
  status: string;
  overallProgressBasisPoints: number;
  courseProgressBasisPoints: number;
  examProgressBasisPoints: number;
  noMaterialRequired: boolean;
  noExamRequired: boolean;
  weeks: {
    id: string;
    weekNumber: number;
    title: string;
    overallProgressBasisPoints: number;
    status: string;
    exams: {
      id: string;
      title: string;
      latestScoreBasisPoints: number | null;
      bestScoreBasisPoints: number | null;
      latestResult: 'PASS' | 'FAIL' | null;
    }[];
  }[];
}

const percent = (basisPoints: number) => `${(basisPoints / 100).toFixed(2)}%`;

export function ParticipantTrainingProgress({
  participantId,
  enrollmentId,
}: {
  participantId: string;
  enrollmentId: string;
}) {
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/participants/${participantId}/enrollments/${enrollmentId}/progress`,
        { credentials: 'include' },
      );
      if (response.ok) setProgress((await response.json()) as Progress);
    })();
  }, [enrollmentId, participantId]);

  if (!progress) return null;
  return (
    <details className="mt-3 border-t border-slate-200 pt-3 text-sm">
      <summary className="cursor-pointer font-semibold text-indigo-700">
        Read-only training progress
      </summary>
      <p className="mt-2 text-slate-700">
        Status: {progress.status.replaceAll('_', ' ')} · Overall:{' '}
        {percent(progress.overallProgressBasisPoints)}
        {progress.noMaterialRequired
          ? ' · No material required'
          : ` · Course: ${percent(progress.courseProgressBasisPoints)}`}
        {progress.noExamRequired
          ? ' · No exam required'
          : ` · Exam: ${percent(progress.examProgressBasisPoints)}`}
      </p>
      <ul className="mt-2 grid gap-2">
        {progress.weeks.map((week) => (
          <li key={week.id} className="rounded border border-slate-200 p-2">
            Week {week.weekNumber} — {week.title}: {week.status.replaceAll('_', ' ')} ·{' '}
            {percent(week.overallProgressBasisPoints)}
            {week.exams.map((exam) => (
              <p key={exam.id} className="mt-1 text-slate-700">
                {exam.title}: {exam.latestResult ?? 'No result'} · Latest score:{' '}
                {exam.latestScoreBasisPoints === null ? '—' : percent(exam.latestScoreBasisPoints)}{' '}
                · Best:{' '}
                {exam.bestScoreBasisPoints === null ? '—' : percent(exam.bestScoreBasisPoints)}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </details>
  );
}
