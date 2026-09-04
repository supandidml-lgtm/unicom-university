import { Injectable } from '@nestjs/common';
import { loadApiEnvironment } from '@unicom/config';
import { MaterialType } from '@unicom/database';

export interface CoverageRange {
  startMs: number;
  endMs: number;
}

export interface PageCoverage {
  pages: number[];
  finalReached: boolean;
}

@Injectable()
export class MaterialCompletionPolicyService {
  private readonly environment = loadApiEnvironment();

  strategyFor(type: MaterialType): 'VIDEO' | 'PAGINATED' | 'ACKNOWLEDGEMENT' {
    if (type === MaterialType.VIDEO) return 'VIDEO';
    if (type === MaterialType.PDF) return 'PAGINATED';
    return 'ACKNOWLEDGEMENT';
  }

  safeMetadata(type: MaterialType, durationMs: number | null, pageCount: number | null) {
    return {
      strategy: this.strategyFor(type),
      ...(type === MaterialType.VIDEO
        ? {
            durationMs,
            requiredWatchCoveragePercent: this.environment.LEARNING_VIDEO_REQUIRED_COVERAGE_PERCENT,
            requireEnded: true,
          }
        : {}),
      ...(type === MaterialType.PDF
        ? { pageCount, requiredPageCoveragePercent: 100, requireFinalPage: true }
        : {}),
      ...(type === MaterialType.IMAGE ||
      type === MaterialType.DOCUMENT ||
      type === MaterialType.SPREADSHEET
        ? { minimumDwellSeconds: this.minimumDwellMs(type) / 1_000, acknowledgementRequired: true }
        : {}),
    };
  }

  mergeRanges(
    existing: readonly CoverageRange[],
    candidate: CoverageRange,
    durationMs: number,
  ): CoverageRange[] {
    const range = {
      startMs: this.integerInRange(candidate.startMs, 0, durationMs),
      endMs: this.integerInRange(candidate.endMs, 0, durationMs),
    };
    if (range.endMs <= range.startMs) return [...existing];
    const ranges = [...existing, range]
      .filter(
        (entry) =>
          Number.isSafeInteger(entry.startMs) &&
          Number.isSafeInteger(entry.endMs) &&
          entry.startMs >= 0 &&
          entry.endMs > entry.startMs &&
          entry.endMs <= durationMs,
      )
      .sort((left, right) => left.startMs - right.startMs);
    const merged: CoverageRange[] = [];
    for (const entry of ranges) {
      const previous = merged.at(-1);
      if (previous && entry.startMs <= previous.endMs) {
        previous.endMs = Math.max(previous.endMs, entry.endMs);
      } else {
        merged.push({ ...entry });
      }
    }
    // A bounded representation protects the heartbeat path from an adversarial range explosion.
    return merged.slice(-2_048);
  }

  coveredMs(ranges: readonly CoverageRange[]): number {
    return ranges.reduce((total, range) => total + Math.max(0, range.endMs - range.startMs), 0);
  }

  videoResult(
    ranges: readonly CoverageRange[],
    durationMs: number,
    currentTimeMs: number,
    ended: boolean,
  ) {
    const coveragePercent = Math.min(100, (this.coveredMs(ranges) / durationMs) * 100);
    const endReached =
      ended && currentTimeMs >= Math.max(0, durationMs - this.videoEndToleranceMs(durationMs));
    const completed =
      endReached && coveragePercent >= this.environment.LEARNING_VIDEO_REQUIRED_COVERAGE_PERCENT;
    return {
      completed,
      coveragePercent,
      progressBasisPoints: completed
        ? 10_000
        : Math.min(9_999, Math.floor((coveragePercent / 100) * 10_000)),
    };
  }

  mergePages(existing: PageCoverage, pageNumber: number, pageCount: number): PageCoverage {
    const pages = new Set(existing.pages.filter((page) => page >= 1 && page <= pageCount));
    pages.add(pageNumber);
    return {
      pages: [...pages].sort((left, right) => left - right),
      finalReached: existing.finalReached || pageNumber === pageCount,
    };
  }

  documentResult(coverage: PageCoverage, pageCount: number, dwellMs: number) {
    const coveragePercent = Math.min(100, (coverage.pages.length / pageCount) * 100);
    const completed =
      coverage.finalReached &&
      coverage.pages.length === pageCount &&
      dwellMs >= this.minimumDwellMs(MaterialType.PDF);
    return {
      completed,
      coveragePercent,
      progressBasisPoints: completed
        ? 10_000
        : Math.min(9_999, Math.floor((coveragePercent / 100) * 10_000)),
    };
  }

  minimumDwellMs(type: MaterialType): number {
    return (
      (type === MaterialType.IMAGE
        ? this.environment.LEARNING_IMAGE_MIN_DWELL_SECONDS
        : this.environment.LEARNING_DOCUMENT_MIN_DWELL_SECONDS) * 1_000
    );
  }

  maximumPlaybackRate(): number {
    return this.environment.LEARNING_VIDEO_MAX_PLAYBACK_RATE;
  }

  heartbeatGraceMs(): number {
    return 1_500;
  }

  maxDwellCreditMs(): number {
    return 10_000;
  }

  private videoEndToleranceMs(durationMs: number): number {
    return Math.min(5_000, Math.max(1_000, Math.floor(durationMs * 0.02)));
  }

  private integerInRange(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, Math.trunc(value)));
  }
}
