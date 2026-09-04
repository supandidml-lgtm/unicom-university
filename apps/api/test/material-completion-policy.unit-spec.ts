import { MaterialType } from '@unicom/database';
import { describe, expect, it } from 'vitest';
import { MaterialCompletionPolicyService } from '../src/modules/learning/material-completion-policy.service.js';

describe('MaterialCompletionPolicyService', () => {
  const policy = new MaterialCompletionPolicyService();

  it('merges compact video intervals without crediting a forward jump', () => {
    const first = policy.mergeRanges([], { startMs: 0, endMs: 5_000 }, 10_000);
    const forgedJump = policy.mergeRanges(first, { startMs: 9_000, endMs: 9_000 }, 10_000);
    expect(forgedJump).toEqual([{ startMs: 0, endMs: 5_000 }]);
    expect(policy.coveredMs(forgedJump)).toBe(5_000);
  });

  it('requires both video coverage and a trusted end-region reach', () => {
    const nearlyComplete = [{ startMs: 0, endMs: 9_800 }];
    expect(policy.videoResult(nearlyComplete, 10_000, 9_800, false).completed).toBe(false);
    expect(policy.videoResult([{ startMs: 0, endMs: 9_700 }], 10_000, 10_000, true).completed).toBe(
      false,
    );
    expect(policy.videoResult(nearlyComplete, 10_000, 10_000, true)).toMatchObject({
      completed: true,
      progressBasisPoints: 10_000,
    });
  });

  it('requires progressive page coverage, final-page reach, and dwell', () => {
    const finalOnly = policy.mergePages({ pages: [], finalReached: false }, 3, 3);
    expect(
      policy.documentResult(finalOnly, 3, policy.minimumDwellMs(MaterialType.PDF)),
    ).toMatchObject({
      completed: false,
    });
    const allPages = policy.mergePages(policy.mergePages(finalOnly, 1, 3), 2, 3);
    expect(
      policy.documentResult(allPages, 3, policy.minimumDwellMs(MaterialType.PDF) - 1).completed,
    ).toBe(false);
    expect(
      policy.documentResult(allPages, 3, policy.minimumDwellMs(MaterialType.PDF)).completed,
    ).toBe(true);
  });

  it('uses acknowledgement only for the non-telemetry material strategies', () => {
    expect(policy.strategyFor(MaterialType.VIDEO)).toBe('VIDEO');
    expect(policy.strategyFor(MaterialType.PDF)).toBe('PAGINATED');
    expect(policy.strategyFor(MaterialType.IMAGE)).toBe('ACKNOWLEDGEMENT');
    expect(policy.strategyFor(MaterialType.DOCUMENT)).toBe('ACKNOWLEDGEMENT');
  });
});
