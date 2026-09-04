'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

const apiBaseUrl = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';

type Material = { id: string; title: string; type: string; weekNumber: number; moduleName: string };
type Job = {
  id: string;
  status: string;
  requestedQuestionCount: number;
  createdQuestionCount: number;
  rejectedCandidateCount: number;
  errorCode: string | null;
};

export function AiQuestionGenerationPanel({ examId }: { examId: string }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [examId]);

  async function load() {
    const [materialResponse, jobResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/api/v1/exams/${examId}/ai-generation-materials`, {
        credentials: 'include',
      }),
      fetch(`${apiBaseUrl}/api/v1/exams/${examId}/ai-generation-jobs`, { credentials: 'include' }),
    ]);
    if (materialResponse.ok)
      setMaterials(((await materialResponse.json()) as { items: Material[] }).items);
    if (jobResponse.ok) setJobs(((await jobResponse.json()) as { items: Job[] }).items);
  }

  async function csrf() {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/csrf`, { credentials: 'include' });
    if (!response.ok) throw new Error('Session refresh required.');
    return ((await response.json()) as { csrfToken: string }).csrfToken;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const singleChoice = Number(form.get('singleChoice'));
    const multipleChoice = Number(form.get('multipleChoice'));
    const trueFalse = Number(form.get('trueFalse'));
    const questionCount = singleChoice + multipleChoice + trueFalse;
    if (selected.length === 0 || questionCount < 1) {
      setMessage('Pilih minimal satu Material dan setidaknya satu pertanyaan.');
      return;
    }
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/exams/${examId}/ai-generation-jobs`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrf() },
        body: JSON.stringify({
          materialIds: selected,
          questionCount,
          questionTypes: { singleChoice, multipleChoice, trueFalse },
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        errorCode?: string;
        message?: string;
      } | null;
      if (!response.ok) throw new Error(payload?.message ?? 'Permintaan AI ditolak.');
      setMessage(
        payload?.errorCode === 'AI_DISABLED'
          ? 'AI belum dikonfigurasi. Tidak ada Material yang dikirim ke provider.'
          : 'Job AI diantrikan. Hasil tetap Draft dan wajib direview manusia.',
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Permintaan AI gagal.');
    }
  }

  async function cancel(jobId: string) {
    const response = await fetch(`${apiBaseUrl}/api/v1/exams/ai-generation-jobs/${jobId}/cancel`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRF-Token': await csrf() },
    });
    if (response.ok) {
      setMessage('Job AI dibatalkan.');
      await load();
    }
  }

  return (
    <section className="mt-3 rounded border border-violet-200 bg-violet-50 p-3">
      <h5 className="font-semibold text-slate-950">Generate Questions with AI</h5>
      <p className="mt-1 text-xs text-slate-700">
        Hanya Material terpilih yang dikirim ke provider yang dikonfigurasi. Semua hasil adalah
        Draft dan memerlukan review serta approval manusia.
      </p>
      {message ? (
        <p className="mt-2 text-sm text-slate-700" role="status">
          {message}
        </p>
      ) : null}
      <form className="mt-3 grid gap-2" onSubmit={(event) => void submit(event)}>
        <fieldset>
          <legend className="text-sm font-medium text-slate-900">Material sumber</legend>
          <div className="mt-1 grid gap-1 sm:grid-cols-2">
            {materials.map((material) => (
              <label
                key={material.id}
                className="flex gap-2 rounded border border-slate-200 bg-white p-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(material.id)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, material.id]
                        : current.filter((id) => id !== material.id),
                    )
                  }
                />
                <span>
                  {material.title}{' '}
                  <span className="text-slate-500">
                    ({material.type}, Week {material.weekNumber})
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-sm">
            Single choice
            <input
              name="singleChoice"
              type="number"
              min="0"
              max="100"
              defaultValue="2"
              className="mt-1 w-full rounded border p-2"
            />
          </label>
          <label className="text-sm">
            Multiple choice
            <input
              name="multipleChoice"
              type="number"
              min="0"
              max="100"
              defaultValue="0"
              className="mt-1 w-full rounded border p-2"
            />
          </label>
          <label className="text-sm">
            True / False
            <input
              name="trueFalse"
              type="number"
              min="0"
              max="100"
              defaultValue="0"
              className="mt-1 w-full rounded border p-2"
            />
          </label>
        </div>
        <button className="w-fit rounded bg-violet-700 px-3 py-2 text-sm font-semibold text-white">
          Generate draft questions
        </button>
      </form>
      <div className="mt-3 grid gap-2" aria-live="polite">
        {jobs.map((job) => (
          <div key={job.id} className="rounded border border-slate-200 bg-white p-2 text-sm">
            <strong>AI job: {job.status}</strong> · {job.createdQuestionCount}/
            {job.requestedQuestionCount} Draft
            {job.rejectedCandidateCount ? ` · ${job.rejectedCandidateCount} rejected` : ''}
            {job.errorCode ? ` · ${job.errorCode}` : ''}
            {job.status === 'QUEUED' || job.status === 'PROCESSING' ? (
              <button
                type="button"
                onClick={() => void cancel(job.id)}
                className="ml-3 font-semibold text-rose-700"
              >
                Cancel
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
