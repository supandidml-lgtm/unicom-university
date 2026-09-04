'use client';

import { use, useEffect, useState } from 'react';
import {
  LearningMaterialPlayer,
  type LearningMaterialPlayerMaterial,
} from '../../../components/learning-material-player';
import { ExamPanel } from '../../../components/exam-panel';

const apiBaseUrl = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';

interface LearningContent {
  enrollmentId: string;
  curriculumVersionId: string | null;
  weeks: {
    id: string;
    weekNumber: number;
    title: string;
    modules: {
      id: string;
      code: string;
      name: string;
      materials: LearningMaterialPlayerMaterial[];
    }[];
  }[];
}

export default function EnrollmentLearningPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { enrollmentId } = use(params);
  const [content, setContent] = useState<LearningContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [enrollmentId]);

  async function load(): Promise<void> {
    const response = await fetch(
      `${apiBaseUrl}/api/v1/my-training/enrollments/${enrollmentId}/content`,
      {
        credentials: 'include',
      },
    );
    if (!response.ok) {
      setError('Learning content is not available for this enrollment.');
      return;
    }
    setContent((await response.json()) as LearningContent);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6 sm:py-12">
      <section className="mx-auto w-full max-w-4xl rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
        <a className="text-sm font-semibold text-indigo-700 underline" href="/my-training">
          Back to my training
        </a>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
          Learning materials
        </h1>
        <p className="mt-2 text-slate-600">
          Progress is verified by the server. Opening or downloading a file does not complete it.
        </p>
        {error ? (
          <p className="mt-5 text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {!content && !error ? (
          <p className="mt-5" role="status">
            Loading learning materials…
          </p>
        ) : null}
        {content?.weeks.map((week) => (
          <section key={week.id} className="mt-6 border-t border-slate-200 pt-5">
            <h2 className="text-xl font-bold">
              Week {week.weekNumber}: {week.title}
            </h2>
            {week.modules.map((module) => (
              <section key={module.id} className="mt-4">
                <h3 className="font-semibold text-slate-900">
                  {module.code} — {module.name}
                </h3>
                {module.materials.map((material) => (
                  <LearningMaterialPlayer
                    key={material.id}
                    enrollmentId={enrollmentId}
                    material={material}
                    onProgress={(progress) =>
                      setContent((current) =>
                        current
                          ? {
                              ...current,
                              weeks: current.weeks.map((item) => ({
                                ...item,
                                modules: item.modules.map((currentModule) => ({
                                  ...currentModule,
                                  materials: currentModule.materials.map((currentMaterial) =>
                                    currentMaterial.id === material.id
                                      ? { ...currentMaterial, progress }
                                      : currentMaterial,
                                  ),
                                })),
                              })),
                            }
                          : current,
                      )
                    }
                  />
                ))}
              </section>
            ))}
          </section>
        ))}
        {content ? <ExamPanel enrollmentId={enrollmentId} /> : null}
      </section>
    </main>
  );
}
