# Production security review — TASK-017

## Controls confirmed

- Auth uses opaque HttpOnly sessions, secure production cookies, CSRF for authenticated
  mutations, Argon2id passwords, generic failure responses, and Redis-backed fail-closed
  limiters.
- RBAC is server-side default-deny; Brand-owned operations require fresh server-side Brand
  scope except the centralized Super Administrator bypass.
- NIK remains encrypted/HMAC-fingerprinted, masked in DTOs, absent from logs/exports, and has
  no plaintext storage path.
- Materials use private storage, content validation, ClamAV fail-closed scanning, and exact
  enrollment/version access. Progress, scores, and completion remain server-derived.
- AI is authoring-only, source-bounded, untrusted, human-reviewed, and has no scoring path.
- Reports remain authenticated, Brand-scoped projections with formula neutralization and no
  raw NIK, answers, storage keys, or public files.
- Recovery tokens are hash-only and delivery metadata avoids raw tokens/bodies. Certificates
  are private, immutable, authorization-checked, and have no public verification endpoint.

## Production hardening

Central configuration rejects production placeholders, non-HTTPS public/CORS/storage URLs,
missing explicit production CORS allowlist, test email providers, incomplete providers,
local production storage, disabled malware scanning, unsafe SMTP TLS, and invalid numeric/
boolean inputs. Browser responses use CSP, no-referrer policy, clickjacking defenses, nosniff,
and explicit credentialed-origin checks. Logs redact sensitive request material and retain a
validated correlation ID.

The current dependency-audit gate is PASS: 0 critical and 0 high findings for both full and
production audits. Three moderate transitive findings remain via ExcelJS/UUID and are tracked
in `docs/security/DEPENDENCY-AUDIT.md`; no risky override was applied.

## Operational security boundaries

Redis failure causes readiness failure rather than silently removing security controls.
PostgreSQL failure fails readiness. SMTP/AI failure is isolated from canonical training state;
ClamAV failure keeps new uploads blocked. Production secrets are injected outside source,
must never enter Docker images/frontend bundles/logs, and need documented rotation procedures
for sessions, NIK keys (including re-encryption/dual-key planning), provider keys, database,
and storage credentials.
