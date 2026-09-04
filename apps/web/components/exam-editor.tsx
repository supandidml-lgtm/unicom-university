'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AiQuestionGenerationPanel } from './ai-question-generation-panel';

const apiBaseUrl = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';
type Question = {
  id: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  prompt: string;
  status: string;
  origin?: 'MANUAL' | 'AI_GENERATED';
  explanation?: string | null;
  sourceReferences?: {
    id: string;
    locatorType: string;
    pageNumber: number | null;
    startMs: number | null;
    endMs: number | null;
    sheetName: string | null;
    cellRange: string | null;
    sectionLabel: string | null;
    excerpt: string | null;
    material: { id: string; title: string };
  }[];
  options: { id: string; text: string; isCorrect: boolean }[];
};
type Exam = {
  id: string;
  code: string;
  title: string;
  passingScoreBasisPoints: number;
  maxAttempts: number | null;
  readiness: { ready: boolean; reason: string | null };
  questions: Question[];
};

export function ExamEditor({ weekId, draft }: { weekId: string; draft: boolean }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [weekId]);
  async function load() {
    const response = await fetch(`${apiBaseUrl}/api/v1/curriculum-weeks/${weekId}/exams`, {
      credentials: 'include',
    });
    if (response.ok) setExams(((await response.json()) as { items: Exam[] }).items);
  }
  async function csrf() {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/csrf`, { credentials: 'include' });
    if (!response.ok) throw new Error('Session refresh required.');
    return ((await response.json()) as { csrfToken: string }).csrfToken;
  }
  async function mutate(path: string, method: 'POST' | 'PATCH' | 'PUT', body?: unknown) {
    const response = await fetch(`${apiBaseUrl}/api/v1/${path}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrf() },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? 'Exam change was rejected.');
    }
    return response;
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await mutate(`curriculum-weeks/${weekId}/exams`, 'POST', {
        code: String(form.get('code')).toUpperCase(),
        title: form.get('title'),
        passingScoreBasisPoints: Number(form.get('passingPercent')) * 100,
        maxAttempts: form.get('maxAttempts') ? Number(form.get('maxAttempts')) : undefined,
      });
      event.currentTarget.reset();
      setMessage('Draft exam created.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Exam creation failed.');
    }
  }
  async function addQuestion(exam: Exam, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const type = String(form.get('type')) as Question['type'];
    const first = String(form.get('first') ?? '');
    const second = String(form.get('second') ?? '');
    const options = [
      { text: first, isCorrect: form.get('correctFirst') !== null },
      { text: second, isCorrect: form.get('correctSecond') !== null },
    ];
    if (type === 'MULTIPLE_CHOICE')
      options.push({
        text: String(form.get('third') ?? ''),
        isCorrect: form.get('correctThird') !== null,
      });
    try {
      await mutate(`exams/${exam.id}/questions`, 'POST', {
        type,
        prompt: form.get('prompt'),
        points: Number(form.get('points')),
        options,
      });
      event.currentTarget.reset();
      setMessage('Question saved as Draft.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Question creation failed.');
    }
  }
  async function approve(question: Question) {
    try {
      await mutate(`exam-questions/${question.id}/approve`, 'POST');
      setMessage('Question approved.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Approval failed.');
    }
  }
  async function editQuestion(question: Question) {
    const prompt = window.prompt('Question prompt', question.prompt);
    if (!prompt?.trim()) return;
    try {
      await mutate(`exam-questions/${question.id}`, 'PATCH', { prompt });
      setMessage('Question updated and returned to Draft review.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Question update failed.');
    }
  }
  async function reorder(exam: Exam, from: number, to: number) {
    const ids = exam.questions.map((question) => question.id);
    const [moved] = ids.splice(from, 1);
    if (!moved) return;
    ids.splice(to, 0, moved);
    try {
      await mutate(`exams/${exam.id}/questions/order`, 'PUT', { ids });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Question reordering failed.');
    }
  }

  return (
    <section className="mt-4 rounded border border-indigo-200 bg-indigo-50 p-3">
      <h4 className="font-semibold text-slate-950">Assessment editor</h4>
      {message ? (
        <p className="mt-2 text-sm text-slate-700" role="status">
          {message}
        </p>
      ) : null}
      {draft ? (
        <form onSubmit={(event) => void create(event)} className="mt-3 grid gap-2 sm:grid-cols-4">
          <input
            name="code"
            required
            placeholder="EXAM_CODE"
            pattern="[A-Z][A-Z0-9_]*"
            className="rounded border p-2 text-sm"
          />
          <input
            name="title"
            required
            placeholder="Exam title"
            className="rounded border p-2 text-sm"
          />
          <input
            name="passingPercent"
            type="number"
            min="0"
            max="100"
            defaultValue="75"
            aria-label="Passing percentage"
            className="rounded border p-2 text-sm"
          />
          <input
            name="maxAttempts"
            type="number"
            min="1"
            placeholder="Attempts (optional)"
            className="rounded border p-2 text-sm"
          />
          <button className="w-fit rounded bg-indigo-700 px-3 py-2 text-sm font-semibold text-white">
            Create exam
          </button>
        </form>
      ) : (
        <p className="mt-2 text-sm text-slate-600">
          Published and retired assessment definitions are read-only.
        </p>
      )}
      {exams.map((exam) => (
        <article key={exam.id} className="mt-4 rounded border border-slate-200 bg-white p-3">
          <p className="font-semibold text-slate-950">
            {exam.code} — {exam.title}
          </p>
          <p className="text-sm text-slate-600">
            Passing: {exam.passingScoreBasisPoints / 100}% ·{' '}
            {exam.readiness.ready ? 'Ready' : `Not ready: ${exam.readiness.reason}`}
          </p>
          <ol className="mt-3 grid gap-2 text-sm">
            {exam.questions.map((question, index) => (
              <li key={question.id} className="rounded border border-slate-200 p-2">
                <p>
                  <strong>{question.type}</strong> · {question.status}
                  {question.origin === 'AI_GENERATED' ? ' · AI Generated' : ''} · {question.prompt}
                </p>
                <p className="text-xs text-slate-600">
                  {question.options
                    .map((option) => `${option.text}${option.isCorrect ? ' ✓' : ''}`)
                    .join(' · ')}
                </p>
                {question.explanation ? (
                  <p className="mt-1 text-xs text-slate-600">{question.explanation}</p>
                ) : null}
                {question.sourceReferences?.length ? (
                  <div className="mt-1 text-xs text-slate-600">
                    <strong>Source evidence:</strong>{' '}
                    {question.sourceReferences.map((reference) => (
                      <a
                        key={reference.id}
                        className="mr-2 inline-block text-indigo-700 underline"
                        href={`${apiBaseUrl}/api/v1/materials/${reference.material.id}/content${reference.pageNumber ? `#page=${reference.pageNumber}` : reference.startMs !== null ? `#t=${Math.floor(reference.startMs / 1000)}` : ''}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open source evidence from ${reference.material.title}`}
                      >
                        {reference.material.title} ·{' '}
                        {reference.pageNumber ? `Page ${reference.pageNumber}` : ''}
                        {reference.startMs !== null && reference.endMs !== null
                          ? ` ${Math.floor(reference.startMs / 60_000)}:${String(Math.floor(reference.startMs / 1_000) % 60).padStart(2, '0')}–${Math.floor(reference.endMs / 60_000)}:${String(Math.floor(reference.endMs / 1_000) % 60).padStart(2, '0')}`
                          : ''}
                        {reference.sheetName && reference.cellRange
                          ? ` ${reference.sheetName} ${reference.cellRange}`
                          : ''}
                        {reference.sectionLabel ? ` ${reference.sectionLabel}` : ''}
                      </a>
                    ))}
                  </div>
                ) : null}
                {draft ? (
                  <div className="mt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => void editQuestion(question)}
                      className="font-semibold text-indigo-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => void reorder(exam, index, index - 1)}
                      className="font-semibold text-indigo-700 disabled:text-slate-400"
                    >
                      Move up
                    </button>
                    {question.status !== 'APPROVED' ? (
                      <button
                        type="button"
                        onClick={() => void approve(question)}
                        className="font-semibold text-emerald-700"
                      >
                        Approve
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
            {draft ? <AiQuestionGenerationPanel examId={exam.id} /> : null}
          </ol>
          {draft ? (
            <form
              onSubmit={(event) => void addQuestion(exam, event)}
              className="mt-3 grid gap-2 sm:grid-cols-3"
            >
              <select
                name="type"
                defaultValue="SINGLE_CHOICE"
                className="rounded border p-2 text-sm"
              >
                <option value="SINGLE_CHOICE">Single choice</option>
                <option value="MULTIPLE_CHOICE">Multiple choice</option>
                <option value="TRUE_FALSE">True / False</option>
              </select>
              <input
                name="prompt"
                required
                placeholder="Question prompt"
                className="rounded border p-2 text-sm"
              />
              <input
                name="points"
                required
                type="number"
                min="1"
                defaultValue="1"
                className="rounded border p-2 text-sm"
              />
              <input
                name="first"
                required
                placeholder="Option 1 (TRUE for true/false)"
                className="rounded border p-2 text-sm"
              />
              <input
                name="second"
                required
                placeholder="Option 2 (FALSE for true/false)"
                className="rounded border p-2 text-sm"
              />
              <input
                name="third"
                placeholder="Option 3 (for multiple)"
                className="rounded border p-2 text-sm"
              />
              <label className="flex items-center gap-1 text-sm">
                <input name="correctFirst" type="checkbox" /> Option 1 correct
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input name="correctSecond" type="checkbox" /> Option 2 correct
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input name="correctThird" type="checkbox" /> Option 3 correct
              </label>
              <button className="w-fit rounded border border-indigo-700 px-3 py-2 text-sm font-semibold text-indigo-700">
                Add draft question
              </button>
            </form>
          ) : null}
        </article>
      ))}
    </section>
  );
}
