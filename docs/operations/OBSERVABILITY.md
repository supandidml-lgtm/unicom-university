# Observability

API logs are structured Pino records. Useful fields include timestamp, level, service,
environment, request ID, route, status, duration, and safe error code. A client-provided
`X-Request-Id` is accepted only when it matches the validated opaque identifier format;
otherwise the API generates one and returns it in the response header. It is diagnostic
metadata, never an authorization token.

Request bodies, Authorization/Cookie/CSRF/API-key headers, Set-Cookie, token query values,
and raw provider payloads are redacted. Do not add user email, NIK, encrypted NIK,
fingerprints, raw prompts/sources, answer keys, signed URLs, passwords, or tokens as metric
labels or log fields.

## Signals and alerts

- API request records provide request rate, latency, and 5xx signal; `/health/ready` failures
  identify required PostgreSQL/Redis failure.
- Worker health records provide polling activity, completed jobs, and safe failure counts.
- Query `NotificationDelivery`, `AiQuestionGenerationJob`, and `TrainingCertificate` status
  plus safe failure codes for backlog/failure inspection. Do not expose raw job payloads.
- Critical alerts: readiness continuously failing, sustained 5xx, failed/repeated worker
  polling, a growing queued/failed job count, or a failed verified backup.

No public `/metrics` endpoint is exposed in TASK-017. A future internal collector must be
network-restricted or authenticated and must use only low-cardinality, non-PII labels.

Use `pnpm operations:cleanup` from a controlled scheduler for expired sessions/tokens and
aged delivery metadata. It never deletes audit events, academic history, certificates,
materials, or active/retryable deliveries.
