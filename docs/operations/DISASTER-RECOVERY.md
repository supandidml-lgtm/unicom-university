# Disaster recovery

This runbook is a production-preparation document, not an automatic recovery system. Keep
contacts, hosting escalation routes, backup identifiers, and incident records outside this
repository. All hosts must use synchronized time because session expiry, audit timestamps,
retry scheduling, reset tokens, and certificate dates depend on it.

## Incident decisions

| Condition                             | Immediate safe state                                                    | Recovery decision                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| PostgreSQL unavailable                | `/health/ready` fails; API returns safe errors                          | Restore database connectivity or follow the backup/restore runbook.                   |
| Redis unavailable                     | `/health/ready` fails; do not bypass rate limits or session protections | Restore Redis before accepting normal traffic.                                        |
| Private storage unavailable           | File/material/certificate operations fail safely                        | Restore storage and reconcile `FileAsset` metadata/object keys.                       |
| ClamAV unavailable                    | New uploads remain fail-closed; existing READY content remains readable | Restore scanner/signatures; never mark an unscanned upload READY.                     |
| SMTP or AI unavailable                | Delivery/AI jobs retry or fail safely; core LMS state stays canonical   | Repair provider configuration/service and inspect safe failure codes.                 |
| Credential compromise                 | Disable/revoke affected credential and preserve audit evidence          | Rotate credentials, invalidate affected sessions/tokens as approved, assess exposure. |
| Bad deployment or accidental deletion | Stop rollout and preserve evidence                                      | Roll back compatible application, forward-fix, or restore a verified backup.          |

## Required operational checks

- `/health/live` confirms only the API process is alive.
- `/health/ready` requires PostgreSQL and Redis. SMTP and AI are optional and do not make
  core readiness fail; storage/ClamAV failure is isolated to file/upload capability.
- Worker health is emitted as structured `Worker health.` logs with the PostgreSQL queue
  transport, last successful poll, failures, and processed-job count. The worker does not
  use Redis as a queue, while the API still requires Redis for security controls.
- On SIGTERM/SIGINT the API uses Nest shutdown hooks. The worker stops claiming jobs,
  waits for bounded in-flight work, then closes its application context. Lease-expired AI,
  notification, and certificate claims are safely returned to QUEUED/PENDING.

Do not retry invitation/reset delivery blindly after a process crash: their raw token content
is intentionally not persisted. Inspect the safe failure code and issue an authorized resend
instead. Certificate and AI jobs are idempotent at the domain level; inspect their statuses
before retrying.
