import { LoadingSpinner } from "@unicom/ui";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <LoadingSpinner size="lg" label="Memuat Unicom University..." />
    </div>
  );
}
