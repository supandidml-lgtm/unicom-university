# Performance baseline

These figures are controlled local/test observations, never a production capacity claim or SLA.
The stack used PostgreSQL 17-alpine, Redis 7.4-alpine, ClamAV, Node 24.19.0, and the local
Docker/desktop environment. Workloads must use synthetic data only; no PII or external paid
AI/email provider is load-tested.

## Controlled harness

`pnpm test:load` uses the dependency-free Node fetch harness at
`scripts/task017-load-test.mjs`. It records concurrency, duration, request count, rate,
error rate, p50, p95, and p99. It has a 10-second request deadline and treats unexpected
responses or any 5xx as a failure. An authenticated operator may provide an ephemeral test
cookie through `LOAD_TEST_COOKIE`; the harness never prints it.

Example safe scenarios:

```powershell
$env:LOAD_TEST_ENDPOINT = '/health/live'; pnpm test:load
$env:LOAD_TEST_ENDPOINT = '/api/v1/auth/me'; $env:LOAD_TEST_EXPECTED_STATUS = '401'; pnpm test:load
```

For a non-production authenticated fixture, test participant training, trainer dashboard,
report pagination, and certificate download separately with its expected 200 status. Keep
write scenarios bounded and isolate their fixtures. The report path remains bounded by
`REPORT_EXPORT_MAX_ROWS`; exports are in-memory and must be monitored for heap pressure.

## TASK-017 measured local baseline (2026-09-04)

| Scenario                                         | Concurrency | Requests |      p50 |      p95 |      p99 | Error rate |
| ------------------------------------------------ | ----------: | -------: | -------: | -------: | -------: | ---------: |
| `/health/live`                                   |          10 |      200 | 12.29 ms | 33.74 ms | 63.72 ms |         0% |
| unauthenticated `/api/v1/auth/me` (expected 401) |          10 |      200 | 35.52 ms | 69.16 ms | 72.69 ms |         0% |

The runs completed without server 5xx or connection exhaustion. They validate the harness,
readiness path, and bounded unauthenticated auth lookup only; authenticated participant,
trainer/dashboard, report, certificate-stream, and write baselines require an approved
synthetic fixture before release and remain a TASK-018 release-evidence item.

## Engineering review

- API JSON is bounded by `API_JSON_BODY_LIMIT_KB`; material limits remain type-specific.
- XLSX rows, AI source characters/questions, workers, retries, and external operation timeouts
  are bounded in configuration.
- Files are served as streams with existing Range behavior; video/PDF downloads do not update
  learning progress.
- Private storage uses streaming reads. Production object storage operations use a bounded
  abort signal. ClamAV, SMTP, and AI providers have bounded timeouts.
- Existing schema indexes cover queue status/next-attempt, enrollment/report access paths,
  certificates, auth expiry, curriculum ordering, and material progress. No speculative
  index migration was added in TASK-017.

Before production, capture a fresh baseline using a representative synthetic multi-Brand
dataset (at least enough rows to expose pagination and aggregation), run `EXPLAIN (ANALYZE,
BUFFERS)` only with safe synthetic parameters, and attach results to the release record.
