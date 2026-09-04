export const statusLabels: Record<string, string> = {
  ACTIVE: 'Active',
  APPROVED: 'Approved',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  DISABLED: 'Disabled',
  DRAFT: 'Draft',
  FAILED: 'Failed',
  IN_PROGRESS: 'In progress',
  INVITED: 'Invited',
  NOT_STARTED: 'Not started',
  PENDING: 'Preparing',
  PROCESSING: 'Preparing',
  PUBLISHED: 'Published',
  QUEUED: 'Queued',
  READY: 'Ready',
  RETIRED: 'Retired',
  REVOKED: 'Revoked',
  SUSPENDED: 'Suspended',
};

const tones: Record<string, string> = {
  ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  PUBLISHED: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  READY: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  FAILED: 'border-red-200 bg-red-50 text-red-900',
  DISABLED: 'border-red-200 bg-red-50 text-red-900',
  REVOKED: 'border-red-200 bg-red-50 text-red-900',
  CANCELLED: 'border-red-200 bg-red-50 text-red-900',
  IN_PROGRESS: 'border-sky-200 bg-sky-50 text-sky-900',
  PENDING: 'border-sky-200 bg-sky-50 text-sky-900',
  PROCESSING: 'border-sky-200 bg-sky-50 text-sky-900',
  QUEUED: 'border-sky-200 bg-sky-50 text-sky-900',
  INVITED: 'border-amber-200 bg-amber-50 text-amber-900',
  NOT_STARTED: 'border-slate-200 bg-slate-100 text-slate-800',
  DRAFT: 'border-slate-200 bg-slate-100 text-slate-800',
  RETIRED: 'border-slate-200 bg-slate-100 text-slate-800',
  SUSPENDED: 'border-amber-200 bg-amber-50 text-amber-900',
};

export function statusLabel(status: string): string {
  return statusLabels[status] ?? status.replaceAll('_', ' ').toLowerCase();
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[status] ?? 'border-slate-200 bg-slate-100 text-slate-800'}`}
    >
      {statusLabel(status)}
    </span>
  );
}
