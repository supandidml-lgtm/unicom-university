const baseUrl = process.env.LOAD_TEST_BASE_URL ?? 'http://localhost:4000';
const concurrency = parsePositiveInteger(process.env.LOAD_TEST_CONCURRENCY, 10);
const requestsPerWorker = parsePositiveInteger(process.env.LOAD_TEST_REQUESTS_PER_WORKER, 20);
const endpoint = process.env.LOAD_TEST_ENDPOINT ?? '/health/live';
const expectedStatus = parsePositiveInteger(process.env.LOAD_TEST_EXPECTED_STATUS, 200);
const cookie = process.env.LOAD_TEST_COOKIE;

const timings = [];
let unexpectedResponses = 0;
let serverErrors = 0;
const startedAt = performance.now();

await Promise.all(
  Array.from({ length: concurrency }, async () => {
    for (let index = 0; index < requestsPerWorker; index += 1) {
      const requestStartedAt = performance.now();
      try {
        const response = await fetch(new URL(endpoint, baseUrl), {
          headers: cookie ? { cookie } : undefined,
          signal: AbortSignal.timeout(10_000),
        });
        if (response.status >= 500) serverErrors += 1;
        if (response.status !== expectedStatus) unexpectedResponses += 1;
        await response.arrayBuffer();
      } catch {
        serverErrors += 1;
        unexpectedResponses += 1;
      } finally {
        timings.push(performance.now() - requestStartedAt);
      }
    }
  }),
);

timings.sort((left, right) => left - right);
const totalDurationMs = performance.now() - startedAt;
const totalRequests = timings.length;
const result = {
  endpoint,
  expectedStatus,
  concurrency,
  requests: totalRequests,
  durationMs: Math.round(totalDurationMs),
  requestsPerSecond: Number((totalRequests / (totalDurationMs / 1_000)).toFixed(2)),
  errorRatePercent: Number(((unexpectedResponses / totalRequests) * 100).toFixed(2)),
  serverErrors,
  p50Ms: percentile(timings, 0.5),
  p95Ms: percentile(timings, 0.95),
  p99Ms: percentile(timings, 0.99),
};

console.log(JSON.stringify(result));
process.exitCode = unexpectedResponses === 0 && serverErrors === 0 ? 0 : 1;

function parsePositiveInteger(value, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error('Load-test numeric inputs must be positive integers.');
  }
  return parsed;
}

function percentile(samples, percentileValue) {
  if (samples.length === 0) return 0;
  const index = Math.min(samples.length - 1, Math.ceil(samples.length * percentileValue) - 1);
  return Number(samples[index].toFixed(2));
}
