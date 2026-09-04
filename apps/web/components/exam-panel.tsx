'use client';

import { useEffect, useState } from 'react';

const apiBaseUrl = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';

type AttemptQuestion = {
  id: string;
  prompt: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  options: { id: string; text: string }[];
  selectedOptionIds: string[];
};
type Attempt = {
  id: string;
  examId: string;
  attemptNumber: number;
  status: 'IN_PROGRESS' | 'SUBMITTED';
  scorePercent?: number;
  passed?: boolean;
  questions: AttemptQuestion[];
};
type Exam = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  available: boolean;
  lockedReason: string | null;
  activeAttemptId: string | null;
  attempts: {
    id: string;
    attemptNumber: number;
    status: string;
    scorePercent?: number;
    passed?: boolean;
  }[];
};

export function ExamPanel({ enrollmentId }: { enrollmentId: string }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [position, setPosition] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [enrollmentId]);

  async function load(): Promise<void> {
    const response = await fetch(
      `${apiBaseUrl}/api/v1/my-training/enrollments/${enrollmentId}/exams`,
      {
        credentials: 'include',
      },
    );
    if (!response.ok) return;
    setExams(((await response.json()) as { items: Exam[] }).items);
  }

  async function csrf(): Promise<string> {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/csrf`, { credentials: 'include' });
    if (!response.ok) throw new Error('Your session needs to be refreshed.');
    return ((await response.json()) as { csrfToken: string }).csrfToken;
  }

  async function mutation(path: string, method: 'POST' | 'PUT', body?: unknown): Promise<Response> {
    return fetch(`${apiBaseUrl}/api/v1/${path}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrf() },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }

  async function start(examId: string): Promise<void> {
    setError(null);
    const response = await mutation(
      `my-training/enrollments/${enrollmentId}/exams/${examId}/start`,
      'POST',
    );
    if (!response.ok) {
      setError('This exam cannot be started yet. Complete every required material first.');
      return;
    }
    setAttempt((await response.json()) as Attempt);
    setPosition(0);
    await load();
  }

  async function save(question: AttemptQuestion, selectedOptionIds: string[]): Promise<void> {
    if (!attempt) return;
    const previousSelectedOptionIds = question.selectedOptionIds;
    setAttempt((current) =>
      current
        ? {
            ...current,
            questions: current.questions.map((item) =>
              item.id === question.id ? { ...item, selectedOptionIds } : item,
            ),
          }
        : current,
    );
    const response = await mutation(`exam-attempts/${attempt.id}/answers/${question.id}`, 'PUT', {
      selectedOptionIds,
    });
    if (!response.ok) {
      setAttempt((current) =>
        current
          ? {
              ...current,
              questions: current.questions.map((item) =>
                item.id === question.id
                  ? { ...item, selectedOptionIds: previousSelectedOptionIds }
                  : item,
              ),
            }
          : current,
      );
      setError('Answer could not be saved. Please try again.');
    }
  }

  async function submit(): Promise<void> {
    if (!attempt) return;
    const unanswered = attempt.questions.filter(
      (question) => question.selectedOptionIds.length === 0,
    ).length;
    if (
      !window.confirm(
        `Submit exam? ${unanswered} questions are unanswered. Answers cannot be changed after submission.`,
      )
    )
      return;
    const response = await mutation(`exam-attempts/${attempt.id}/submit`, 'POST');
    if (!response.ok) {
      setError('Exam submission was rejected. Please refresh and try again.');
      return;
    }
    setAttempt((await response.json()) as Attempt);
    await load();
  }

  if (attempt) {
    if (attempt.status === 'SUBMITTED') {
      return (
        <section
          className="mt-8 rounded-xl border border-indigo-200 bg-indigo-50 p-5"
          aria-live="polite"
        >
          <h2 className="text-xl font-bold text-slate-950">Exam result</h2>
          <p className="mt-2 text-slate-800">Attempt: {attempt.attemptNumber}</p>
          <p className="text-slate-800">Score: {attempt.scorePercent ?? 0}%</p>
          <p className="font-bold text-slate-950">Result: {attempt.passed ? 'PASS' : 'FAIL'}</p>
          <button
            type="button"
            className="mt-4 rounded border border-indigo-700 px-3 py-2 font-semibold text-indigo-700"
            onClick={() => setAttempt(null)}
          >
            Back to exams
          </button>
        </section>
      );
    }
    const question = attempt.questions[position];
    if (!question) return null;
    const answered = attempt.questions.filter((item) => item.selectedOptionIds.length > 0).length;
    return (
      <section className="mt-8 rounded-xl border border-indigo-200 p-5">
        <p className="text-sm font-semibold text-indigo-700">
          Exam attempt {attempt.attemptNumber}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Answered: {answered}/{attempt.questions.length}
        </p>
        <fieldset className="mt-4">
          <legend className="font-semibold text-slate-950">
            {position + 1}. {question.prompt}
          </legend>
          <div className="mt-3 grid gap-2">
            {question.options.map((option) => {
              const selected = question.selectedOptionIds.includes(option.id);
              return (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2 rounded border border-slate-200 p-3 text-slate-900"
                >
                  <input
                    type={question.type === 'MULTIPLE_CHOICE' ? 'checkbox' : 'radio'}
                    name={question.id}
                    checked={selected}
                    onChange={() => {
                      const next =
                        question.type === 'MULTIPLE_CHOICE'
                          ? selected
                            ? question.selectedOptionIds.filter((id) => id !== option.id)
                            : [...question.selectedOptionIds, option.id]
                          : [option.id];
                      void save(question, next);
                    }}
                  />
                  {option.text}
                </label>
              );
            })}
          </div>
        </fieldset>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={position === 0}
            onClick={() => setPosition((value) => value - 1)}
            className="rounded border border-indigo-700 px-3 py-2 font-semibold text-indigo-700 disabled:border-slate-300 disabled:text-slate-400"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={position === attempt.questions.length - 1}
            onClick={() => setPosition((value) => value + 1)}
            className="rounded border border-indigo-700 px-3 py-2 font-semibold text-indigo-700 disabled:border-slate-300 disabled:text-slate-400"
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            className="rounded bg-indigo-700 px-3 py-2 font-semibold text-white"
          >
            Submit exam
          </button>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="mt-8 border-t border-slate-200 pt-5">
      <h2 className="text-xl font-bold text-slate-950">Exams</h2>
      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-3 grid gap-3">
        {exams.map((exam) => (
          <article key={exam.id} className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-950">{exam.title}</h3>
            <p className="text-sm text-slate-600">{exam.code}</p>
            {exam.available ? (
              <button
                type="button"
                onClick={() => void start(exam.id)}
                className="mt-3 rounded bg-indigo-700 px-3 py-2 text-sm font-semibold text-white"
              >
                {exam.activeAttemptId ? 'Resume exam' : 'Start exam'}
              </button>
            ) : (
              <p className="mt-3 text-sm font-medium text-amber-800">
                Exam — Locked. {exam.lockedReason}
              </p>
            )}
            {exam.attempts
              .filter((item) => item.status === 'SUBMITTED')
              .map((item) => (
                <p key={item.id} className="mt-2 text-sm text-slate-700">
                  Attempt {item.attemptNumber}: {item.scorePercent ?? 0}% —{' '}
                  {item.passed ? 'PASS' : 'FAIL'}
                </p>
              ))}
          </article>
        ))}
        {exams.length === 0 ? (
          <p className="text-sm text-slate-600">No exams are available for this enrollment.</p>
        ) : null}
      </div>
    </section>
  );
}
