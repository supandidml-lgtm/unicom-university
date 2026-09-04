export default function Loading() {
  return (
    <main className="ui-page" aria-busy="true" aria-label="Loading page">
      <div className="ui-container animate-pulse space-y-4">
        <div className="h-8 w-64 rounded bg-slate-200" />
        <div className="h-28 rounded-xl bg-slate-200" />
        <div className="h-28 rounded-xl bg-slate-200" />
      </div>
    </main>
  );
}
