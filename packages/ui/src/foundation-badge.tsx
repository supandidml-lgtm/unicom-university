import React, { type ReactNode } from 'react';

export interface FoundationBadgeProps {
  children: ReactNode;
}

export function FoundationBadge({ children }: FoundationBadgeProps) {
  return (
    <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-800">
      {children}
    </span>
  );
}
