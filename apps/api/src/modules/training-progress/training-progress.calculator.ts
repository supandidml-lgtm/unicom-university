export const BASIS_POINTS_MAX = 10_000;

export function averageBasisPoints(contributions: readonly number[]): number {
  if (contributions.length === 0) return 0;
  return Math.floor(
    contributions.reduce((sum, value) => sum + clampBasisPoints(value), 0) / contributions.length,
  );
}

export function requirementUnitProgress(
  materialContributions: readonly number[],
  examPassed: readonly boolean[],
): number {
  return averageBasisPoints([
    ...materialContributions,
    ...examPassed.map((passed) => (passed ? BASIS_POINTS_MAX : 0)),
  ]);
}

export function clampBasisPoints(value: number): number {
  return Math.min(BASIS_POINTS_MAX, Math.max(0, Math.trunc(value)));
}

export function progressStatus(
  requirementCount: number,
  completedRequirementCount: number,
  overallProgressBasisPoints: number,
): 'EMPTY' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' {
  if (requirementCount === 0) return 'EMPTY';
  if (completedRequirementCount === requirementCount) return 'COMPLETED';
  return overallProgressBasisPoints > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';
}

export function finiteExamIsExhausted(
  maxAttempts: number | null,
  submittedAttemptCount: number,
  hasPassed: boolean,
): boolean {
  return maxAttempts !== null && !hasPassed && submittedAttemptCount >= maxAttempts;
}
