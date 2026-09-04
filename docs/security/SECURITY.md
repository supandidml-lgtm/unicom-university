# Security Engineering Baseline

- Never store plaintext passwords or secrets in source control.
- Validate environment at startup and fail closed for missing critical configuration.
- Authorization is mandatory on the backend; frontend state is never trusted.
- Validate all external input and reject unexpected payload fields.
- Use least privilege for application and infrastructure credentials.
- Redact authorization headers, tokens, passwords, and connection strings from logs.
- Use controlled CORS, security headers, request-size limits, and safe production error responses.
- Audit sensitive operations when business modules introduce them.
- Production access and production resource changes require human approval.

## Authentication controls

- Passwords are hashed server-side with Argon2id. The production profile uses 19 MiB memory, two iterations, and one lane; the lower-cost profile is isolated to `NODE_ENV=test`.
- Sessions are opaque 256-bit random tokens. The raw value is restricted to the HttpOnly cookie; PostgreSQL stores a SHA-256 hash plus idle, absolute, and revocation state.
- Cookies are `HttpOnly`, `SameSite=Lax`, `Path=/`, and are always `Secure` in production.
- Invitation tokens and CSRF tokens are 256-bit random values stored only as SHA-256 hashes. Activation is transactional and invitations are single-use.
- Unsafe authenticated requests require `X-CSRF-Token`; logout is protected by this check.
- Login attempts are rate-limited in Redis by keyed derived account and IP identifiers. Redis failure does not disable protection.
- Login errors are intentionally generic to limit account enumeration. Unknown-email verification executes a dummy Argon2 operation.
- Authentication events are allowlisted and omit plaintext passwords, cookies, authorization data, and tokens. Request logging redacts request bodies and authentication headers.

## Authorization controls

- RBAC authorization is database-backed: `UserRole → Role → RolePermission → Permission`.
- Protected endpoints declare required permissions and are checked server-side. No declared permission
  means default deny; valid authentication alone never grants management access.
- `SUPER_ADMIN` is handled only by the centralized authorization service as a privileged bypass. The
  bypass is not scattered through controllers or business services.
- System role codes and system permission codes are application-controlled and seeded idempotently.
  Clients cannot set `isSystem`, deactivate system roles, or modify system-role permission assignments.
- Removing `SUPER_ADMIN` from the last active Super Administrator is rejected under a transaction lock.

## Brand scope controls

- Brand is an explicit business authorization boundary. A scoped Brand action requires both its RBAC
  permission and verified server-side Brand access.
- `BrandAuthorizationService` is the only Brand scope lookup boundary. It reads PostgreSQL on each
  request, so grants and revocations take effect without a new session or Redis cache invalidation.
- The centralized Super Administrator bypass remains in `AuthorizationService`; Brand controllers do
  not contain scattered role checks.
- Trainer lists are query-scoped in the backend and direct access to an unassigned Brand is denied and
  audited, preventing cross-Brand IDOR. Submitted IDs and frontend filters never authorize access.
- Archived Brands cannot be newly assigned and are ineffective for Trainer operations. Existing rows
  retain history and become effective again only after reactivation and effective Trainer-role checks.
- Authorization mutations require both a valid session and a valid CSRF token. Sensitive role and
  assignment changes emit allowlisted authorization security events without request bodies or secrets.

## Staff identity and provisioning controls

- NIK is sensitive personal data. It is normalized as exactly 16 decimal digits, encrypted in a versioned
  AES-256-GCM envelope, and never logged, returned in normal API responses, or used in partial search.
- A separate 32-byte HMAC key produces the deterministic `nikFingerprint` used for database uniqueness;
  plaintext SHA-256 is prohibited. List/detail/self-profile responses use server-side masking only.
- `PROFILE_PII_ENCRYPTION_KEY` and `PROFILE_NIK_HMAC_KEY` are distinct base64-encoded 32-byte keys.
  Startup fails when they are missing or invalid. `WEB_PUBLIC_URL` is validated and must be HTTPS in production.
- Participant/Trainer provisioning uses the existing hashed, single-use invitation token design. The raw
  activation URL is returned only in the authenticated create/reissue response and is never persisted,
  logged, audited, or retrievable through a GET endpoint.
- Participant creation always assigns only `TRAINEE`; Trainer creation always assigns only `TRAINER`.
  The client cannot choose roles, permissions, status, passwords, Brand assignments, or enrollment fields.
- In TASK-005 a Trainer can administer only Participants they provisioned. This pre-enrollment scope is a
  temporary anti-IDOR boundary and does not override Enrollment plus Brand authorization.

## Training enrollment controls

- Training Enrollment is independent of `UserBrandAccess`: the first is Participant learning assignment;
  the second is Trainer administrative Brand scope. Neither is derived from submitted frontend IDs.
- Enrollment creation verifies the Participant's valid Trainee identity, a Trainer's original provisioning
  ownership (unless centrally bypassed), and active server-side Brand scope for **every** requested Brand
  before writing anything. Bulk assignment is one transaction and rejects duplicates or inaccessible Brands
  without partial writes.
- A partial database unique index enforces one current (`NOT_STARTED`, `IN_PROGRESS`, `SUSPENDED`)
  enrollment per Participant and Brand, including concurrent requests. The API returns a safe `409` conflict.
- Read/update/cancel operations re-check RBAC and current Brand scope. Revoking Brand access or the Trainer
  role takes effect on the next request. Week count changes and cancellation are restricted to `NOT_STARTED`.
- Trainees possess only self-read permission and receive only their own safe enrollment records. Enrollment
  payloads and responses omit NIK, encrypted staff fields, scores, progress, and unintroduced learning data.
- Assignment, bulk assignment, Week count change, cancellation, and scope denials emit allowlisted audit
  events containing identifiers and safe metadata only.

## Curriculum versioning controls

- Curriculum operations combine an explicit RBAC permission with a fresh `BrandAuthorizationService`
  check. Week and Module routes resolve their parent chain in the API, preventing nested-resource IDOR.
- Only Draft versions can be changed. Publishing takes a PostgreSQL transaction lock, validates contiguous
  Weeks, retires any prior publication, and relies on a partial unique index to preserve one current
  published version per Curriculum.
- Curriculum archive and version retirement preserve historical structures and nullable enrollment bindings;
  they are never hard-deleted through the business API.
- Enrollment binding requires both enrollment and Curriculum-version permissions plus same active Brand
  scope. The API verifies `NOT_STARTED`, `PUBLISHED`, and exact derived Week count and audits bind/change.
- Curriculum audit metadata contains only safe resource and Brand identifiers; it never stores request
  bodies, tokens, progress, scores, materials, or personal identity fields.

## Learning consumption controls

- The browser is untrusted: it cannot submit a percentage, completed flag, trusted duration/page count, or
  dwell value. Completion is server-derived for the exact authenticated Trainee, Enrollment, bound
  CurriculumVersion, and READY Material. Retired bound versions remain consumable.
- Learning sessions are short-lived and authenticated, use increasing sequence values, and reject replayed,
  stale, expired, cross-user, cross-enrollment, and cross-material activity. Valid heartbeat state is compact
  and is not copied into the security audit stream.
- Video credit comes only from server-timed continuous visible playback inside the allowed rate. Forward
  seek never credits skipped intervals; completion requires configured verified coverage plus trusted
  end-region reach. PDF completion requires server-derived page coverage, final-page reach, and bounded
  server dwell. Office, spreadsheet, and image completion requires deliberate acknowledgement after a
  verified dwell; it confirms interaction, never comprehension.
- File GET/download and HTTP byte-range serving have zero progress side effects. Trainer progress reads
  require `learning_progress.read` plus fresh Brand scope; no Trainer/Admin API can advance participant
  progress. Security events contain only safe IDs/outcomes, never raw activity-session IDs or heartbeats.

## Exam assessment controls

- Participant access requires an active Trainee, exact own non-cancelled Enrollment, its bound published or
  retired CurriculumVersion, and an Exam from that same Version. Trainer authoring and results require
  fresh Brand scope through `BrandAuthorizationService`.
- Start gating reads only `LearningMaterialProgress.COMPLETED` for the Exam's Week or Module; file access,
  client progress, and submitted completion flags cannot unlock an Exam.
- Active attempt APIs return snapshot prompts and options only. Correct options, answer keys, and correctness
  feedback never leave the server before final submission.
- Submit is transactional and idempotent. The server scores immutable snapshot options using exact-set
  objective rules and integer basis points; client score, points, pass/fail, and correctness values are never used.

## Training progress controls

- Training progress is computed only from the exact Enrollment-pinned CurriculumVersion, server-derived
  `LearningMaterialProgress`, and submitted server-scored Exam attempts. No endpoint accepts a training
  percentage, status, completion flag, score, or PASS assertion.
- Dashboard reads are side-effect-free. Lifecycle timestamps and statuses change only after legitimate
  material activity or Exam workflow events, with idempotent row-locked evaluation and allowlisted audit data.
- Participant reads require an active Trainee and exact own Enrollment. Trainer reads require
  `learning_progress.read`, an effective TRAINER role, and current active Brand scope; Super Administrator
  bypass remains centralized. Revoking scope or Trainer role takes effect on the next read.

## AI question-authoring controls

- AI generation is authoring-only and requires `questions.ai_generate`, Draft Exam/Version state, READY
  selected assets, and fresh server-resolved Brand scope. Trainees receive no authoring permission or job API.
- Source content and provider output are both untrusted. Prompts delimit source data and forbid source-borne
  instructions; output is schema/structure/source-reference validated before any Question is written.
- Generated Questions are always `AI_GENERATED` and `DRAFT`; AI cannot approve, publish, score, alter an
  attempt, update Material completion, or update Enrollment progress. Source, prompt, response, API keys,
  authorization headers, cookies, and Participant PII are excluded from logs/audit metadata.

## Reporting and export controls

- Every reporting read declares `reports.read`; XLSX export separately declares `reports.export`. A non-super
  user must also retain an effective `TRAINER` role and current active Brand access. Brand filters and direct
  Enrollment detail are authorized on the server before the query, so a submitted Brand or participant ID never
  creates scope. Revocation is effective on the next request.
- Report data is an Enrollment-centric, read-only projection. Its overall, material, Exam, and Week values use
  the existing canonical server-side progress calculation; no browser progress, score, completion, or dashboard
  counter is accepted.
- API and XLSX responses contain only masked NIK. They exclude encrypted/fingerprinted NIK, answer keys,
  correct options, private storage identifiers, private URLs, activity-session identifiers, and raw telemetry.
- Exports are bounded, authenticated in-memory streams; they do not create public files, signed download URLs,
  or TTL-bearing artifacts. User-controlled spreadsheet text beginning with `=`, `+`, `-`, or `@` is emitted as
  a literal. Export requested, completion, failure, and download outcomes are allowlisted audit events with
  safe type/count/filter metadata only.

## Transactional email and recovery controls

- `EMAIL_PROVIDER=test` is rejected in production; SMTP requires explicit sender and credential configuration.
  Disabled delivery is explicit and never records a successful delivery.
- Templates are source-controlled, versioned, plain-text plus escaped HTML. Header values reject CR/LF; logs
  and audit metadata contain only delivery IDs and safe failure codes, never tokens, URLs, bodies, or raw NIK.
- Invitation and reset tokens are 32-byte random opaque values; only SHA-256 hashes are persisted. New tokens
  revoke prior unused tokens. Reset consumes one valid token atomically, replaces the Argon2id hash, revokes all
  sessions, and revokes other outstanding reset tokens.
- Forgot-password responses remain generic for unknown and ineligible users. Redis limits recovery by HMAC-keyed
  subject and IP, and non-eligible requests execute dummy password work.

## Certificates

- Certificate eligibility reads only the canonical completed Enrollment, its immutable bound Curriculum Version,
  and its server-persisted completion timestamp. Certificate work cannot modify progress, score, or lifecycle.
- PDFs use application-controlled fonts and sanitised direct text drawing. They are private objects; storage keys,
  bytes, NIK, phone numbers, tokens, and public verification URLs never enter API DTOs, audit metadata, or logs.
- Participant downloads require an active Trainee identity and exact certificate ownership. Trainer access requires
  the current effective Trainer role, declared permission, and fresh active Brand scope; Super Administrator is the
  central bypass. Revocation and scope changes apply on the next request.
- Revocation is historical and non-destructive. A revoked certificate remains visible to its owner but cannot be
  normally downloaded. PDF generation and notification failures are isolated from completion.
