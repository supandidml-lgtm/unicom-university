export function formatPercentage(basisPoints: number): string {
  const bounded = Math.min(10_000, Math.max(0, basisPoints));
  const value = bounded / 100;
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function safeRequestMessage(status?: number): string {
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have access to this area.';
  if (status === 404) return 'The requested record is not available.';
  return 'We could not load this information. Please try again.';
}
