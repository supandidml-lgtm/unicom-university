'use client';

import { useEffect } from 'react';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep runtime diagnostics out of the UI; production logging belongs to the host environment.
  }, []);
  return (
    <main className="ui-page">
      <section className="ui-container ui-surface max-w-xl p-6">
        <h1 className="text-2xl font-bold text-slate-950">Something went wrong</h1>
        <p className="mt-2 text-slate-700">
          The page could not be displayed safely. Please try again.
        </p>
        <button
          className="mt-5 min-h-11 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white"
          onClick={reset}
        >
          Try again
        </button>
      </section>
    </main>
  );
}
