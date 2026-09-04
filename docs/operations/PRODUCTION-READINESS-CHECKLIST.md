# Production readiness checklist

- [ ] Set `NODE_ENV=production` and `APP_ENV=production`; use externally injected secrets.
- [ ] Supply non-placeholder database, rate-limit, NIK encryption, HMAC, SMTP/AI, and storage credentials.
- [ ] Configure `WEB_PUBLIC_URL`, `WEB_ORIGIN`, and explicit HTTPS `CORS_ALLOWED_ORIGINS`.
- [ ] Confirm HTTPS edge, deliberate proxy trust, secure cookies, headers, and no debug endpoints.
- [ ] Use private durable object storage; do not use ephemeral local container disk.
- [ ] Enable ClamAV and verify signature/health/timeout; uploads must fail closed.
- [ ] Configure SMTP sender, TLS, timeout, and rotation policy; never use test provider.
- [ ] Keep AI disabled unless credentials, timeout, source bounds, concurrency, and cost controls are approved.
- [ ] Set PostgreSQL/Redis capacity, connection limits, and version-compatible managed-service settings.
- [ ] Run `prisma migrate deploy` only after backup identifier and restore evidence are recorded.
- [ ] Verify daily encrypted backup, restricted access, retention, and isolated restore.
- [ ] Configure retention scheduler for `pnpm operations:cleanup` with approved delivery retention.
- [ ] Collect structured API/worker logs and alert on readiness, 5xx, worker failures, and backup failure.
- [ ] Verify `/health/live`, `/health/ready`, worker health records, graceful restart, and failed job handling.
- [ ] Reconfirm rate limits, CSRF, RBAC, Brand scope, upload scanning, exam/progress integrity, and certificate access.
- [ ] Run format, lint, typecheck, tests, Playwright, build, high/critical audits, and `git diff --check`.
- [ ] Run smoke/load checks against an isolated non-production environment.

Deployment, UAT, release approval, DNS, and public go-live remain TASK-018 scope.
