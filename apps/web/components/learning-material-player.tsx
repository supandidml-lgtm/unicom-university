'use client';

import React, { useEffect, useRef, useState } from 'react';

const apiBaseUrl = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';

export interface MaterialProgress {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  progressPercent: number;
  completedAt: string | null;
}

export interface LearningMaterialPlayerMaterial {
  id: string;
  type: 'VIDEO' | 'PDF' | 'IMAGE' | 'DOCUMENT' | 'SPREADSHEET';
  title: string;
  description: string | null;
  fileAsset: {
    originalFileName: string;
    mimeType: string;
    sizeBytes: number;
    durationMs?: number | null;
    pageCount?: number | null;
  };
  progress: MaterialProgress;
}

interface ActivitySession {
  activitySessionId: string;
  expiresAt: string;
}

export function LearningMaterialPlayer({
  enrollmentId,
  material,
  onProgress,
}: {
  enrollmentId: string;
  material: LearningMaterialPlayerMaterial;
  onProgress: (progress: MaterialProgress) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const csrfTokenRef = useRef<string | null>(null);
  const sequence = useRef(0);
  const [session, setSession] = useState<ActivitySession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [documentOpened, setDocumentOpened] = useState(false);
  const [videoOpened, setVideoOpened] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [verifiedPositionMs, setVerifiedPositionMs] = useState(0);

  useEffect(() => {
    if (!session || material.type !== 'VIDEO') return;
    const timer = window.setInterval(() => {
      if (playing) void heartbeat(false);
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [playing, session]);

  async function start(): Promise<ActivitySession | null> {
    try {
      const csrf = await fetch(`${apiBaseUrl}/api/v1/auth/csrf`, { credentials: 'include' });
      if (!csrf.ok) throw new Error('Your session could not start learning activity.');
      const token = ((await csrf.json()) as { csrfToken: string }).csrfToken;
      csrfTokenRef.current = token;
      const response = await fetch(
        `${apiBaseUrl}/api/v1/my-training/enrollments/${enrollmentId}/materials/${material.id}/activity-sessions`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
          body: '{}',
        },
      );
      if (!response.ok) throw new Error('This material cannot start yet.');
      const value = (await response.json()) as ActivitySession & { progress: MaterialProgress };
      const next = { activitySessionId: value.activitySessionId, expiresAt: value.expiresAt };
      setSession(next);
      onProgress(value.progress);
      setError(null);
      return next;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Learning activity could not start.');
      return null;
    }
  }

  async function post(path: string, body: object): Promise<MaterialProgress | null> {
    const active = session ?? (await start());
    const token = csrfTokenRef.current;
    if (!active || !token) return null;
    const response = await fetch(`${apiBaseUrl}/api/v1/${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
      body: JSON.stringify({ ...body, activitySessionId: active.activitySessionId }),
    });
    if (!response.ok) {
      const message =
        response.status === 409 ? 'Duplicate activity was ignored.' : 'Activity was not accepted.';
      setError(message);
      return null;
    }
    const progress = (await response.json()) as MaterialProgress;
    onProgress(progress);
    return progress;
  }

  async function heartbeat(ended: boolean): Promise<void> {
    const element = video.current;
    if (!element || !session) return;
    const progress = await post(`learning/materials/${material.id}/video/heartbeat`, {
      sequence: ++sequence.current,
      currentTimeMs: Math.floor(element.currentTime * 1_000),
      playing: !element.paused,
      ended,
      visibility: document.visibilityState === 'visible' ? 'visible' : 'hidden',
      playbackRate: element.playbackRate,
    });
    if (progress) setVerifiedPositionMs(Math.floor(element.currentTime * 1_000));
  }

  async function recordPage(nextPage: number): Promise<void> {
    setPage(nextPage);
    await post(`learning/materials/${material.id}/document/page`, {
      sequence: ++sequence.current,
      pageNumber: nextPage,
    });
  }

  return (
    <section className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-slate-900">{material.title}</p>
        <p className="text-sm text-slate-700" aria-live="polite">
          Status: {material.progress.status.replaceAll('_', ' ')} ·{' '}
          {material.progress.progressPercent.toFixed(2)}%
        </p>
      </div>
      <p className="mt-1 text-sm text-slate-600">{material.fileAsset.originalFileName}</p>
      {material.description ? (
        <p className="mt-1 text-sm text-slate-600">{material.description}</p>
      ) : null}
      {material.type === 'VIDEO' ? (
        <div className="mt-3">
          {!videoOpened ? (
            <button
              type="button"
              className="rounded bg-indigo-700 px-3 py-1 text-sm font-semibold text-white"
              onClick={async () => {
                if (await start()) setVideoOpened(true);
              }}
            >
              Open video
            </button>
          ) : (
            <video
              ref={video}
              className="w-full rounded bg-black"
              src={`${apiBaseUrl}/api/v1/materials/${material.id}/content`}
              controls
              controlsList="nodownload"
              crossOrigin="use-credentials"
              onPlay={async () => {
                if (!(session ?? (await start()))) return;
                setPlaying(true);
              }}
              onPause={() => setPlaying(false)}
              onEnded={() => void heartbeat(true)}
              onSeeking={() => {
                const element = video.current;
                if (element && element.currentTime * 1_000 > verifiedPositionMs + 1_000) {
                  element.currentTime = verifiedPositionMs / 1_000;
                }
              }}
              aria-label={`Video learning material: ${material.title}`}
            />
          )}
        </div>
      ) : material.type === 'PDF' ? (
        <div className="mt-3">
          {!documentOpened ? (
            <button
              type="button"
              className="rounded bg-indigo-700 px-3 py-1 text-sm font-semibold text-white"
              onClick={async () => {
                if (await start()) setDocumentOpened(true);
              }}
            >
              Open document
            </button>
          ) : (
            <>
              <iframe
                className="h-64 w-full rounded border border-slate-300 bg-white"
                src={`${apiBaseUrl}/api/v1/materials/${material.id}/content`}
                title={`PDF material: ${material.title}`}
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className="rounded border px-2 py-1"
                  disabled={page <= 1}
                  onClick={() => void recordPage(page - 1)}
                >
                  Previous page
                </button>
                <span aria-live="polite">
                  Page {page} of {material.fileAsset.pageCount ?? 'unavailable'}
                </span>
                <button
                  type="button"
                  className="rounded border px-2 py-1"
                  disabled={!material.fileAsset.pageCount || page >= material.fileAsset.pageCount}
                  onClick={() => void recordPage(page + 1)}
                >
                  Next page
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1"
                  onClick={() => void recordPage(page)}
                >
                  Start reading
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mt-3">
          <a
            className="font-semibold text-indigo-700 underline"
            href={`${apiBaseUrl}/api/v1/materials/${material.id}/content`}
            target="_blank"
            rel="noreferrer"
          >
            Open material
          </a>
          <button
            type="button"
            className="ml-3 rounded bg-indigo-700 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
            disabled={material.progress.status === 'COMPLETED'}
            onClick={() => void post(`learning/materials/${material.id}/acknowledge`, {})}
          >
            I have read this material
          </button>
        </div>
      )}
      {error ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
