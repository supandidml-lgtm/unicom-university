# TASK-017 — Production hardening and operations closure

TASK-017 hardens the existing modular monolith without adding LMS product scope or deploying
production. The implementation centralizes fail-fast production configuration, explicit CORS,
security headers, bounded external calls, worker health/draining/lease recovery, safe cleanup,
and operator runbooks.

Verification requires local/non-production infrastructure only: isolated PostgreSQL backup and
restore, controlled load baseline, prior security regressions, and the repository quality gates.
Production deployment, UAT, DNS, release approval, and go-live remain TASK-018.

Key operational references:

- `docs/operations/BACKUP-RESTORE.md`
- `docs/operations/DISASTER-RECOVERY.md`
- `docs/operations/OBSERVABILITY.md`
- `docs/operations/PRODUCTION-READINESS-CHECKLIST.md`
- `docs/performance/PERFORMANCE-BASELINE.md`
- `docs/security/PRODUCTION-SECURITY-REVIEW.md`
