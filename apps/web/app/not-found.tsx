import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="ui-page">
      <section className="ui-container ui-surface max-w-xl p-6">
        <p className="text-sm font-semibold tracking-widest text-indigo-700">404</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Page not found</h1>
        <p className="mt-2 text-slate-700">The page you requested is unavailable.</p>
        <Link
          className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white"
          href="/authenticated"
        >
          Return to dashboard
        </Link>
      </section>
    </main>
  );
}
