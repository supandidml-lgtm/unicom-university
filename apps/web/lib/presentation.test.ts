import { describe, expect, it } from 'vitest';

import { formatDate, formatPercentage, safeRequestMessage } from './presentation';

describe('presentation utilities', () => {
  it('formats basis points for display without changing canonical values', () => {
    expect(formatPercentage(7250)).toBe('72.50%');
    expect(formatPercentage(12_000)).toBe('100%');
    expect(formatPercentage(-1)).toBe('0%');
  });

  it('formats valid dates and uses a safe fallback for invalid data', () => {
    expect(formatDate('2026-09-03T00:00:00.000Z')).toContain('2026');
    expect(formatDate('not-a-date')).toBe('Not available');
  });

  it('maps request failures to safe UI language', () => {
    expect(safeRequestMessage(403)).toBe('You do not have access to this area.');
    expect(safeRequestMessage()).not.toContain('Error');
  });
});
