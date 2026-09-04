# Architecture

UNICOM UNIVERSITY uses a modular monolith with a separate background worker.

```text
Browser → Next.js web → NestJS API → PostgreSQL / Redis
                                      ↓
                                future private object storage
                                      ↓
                                TypeScript background worker
```

`apps/web` owns presentation and browser interaction. `apps/api` owns validation, authorization, business rules, and database access. `apps/worker` owns asynchronous work such as future content processing and AI generation. Shared packages are intentionally small and only contain cross-application contracts or primitives.

The API is the source of truth. The frontend must never decide authorization, scores, progress, roles, or permissions. PostgreSQL is the transactional system of record; Redis is reserved for cache, rate limiting, and queue infrastructure. Object storage will be private and accessed through API-authorized short-lived URLs when introduced.

## Authentication boundary

```text
Browser -- HttpOnly opaque-session cookie --> NestJS Auth
                                             |        |
                                             |        +--> Redis login rate limits
                                             v
                                         PostgreSQL
                                   User / AuthSession / InvitationToken
                                            / AuthSecurityEvent
```

The browser receives a random session token only as an HttpOnly cookie. PostgreSQL stores its SHA-256 hash, never the raw token. Passwords use Argon2id, and invitation tokens are random, expiry-bound, single-use values stored only as hashes. CSRF tokens are session-bound and also stored hashed.

## Authorization boundary

```text
Authenticated session → AuthorizationGuard → PostgreSQL RBAC lookup → allow / 403
                                            UserRole → Role → RolePermission → Permission
```

Authorization information is read from PostgreSQL on each protected request; it is not stored in the
cookie or trusted from the client. `SUPER_ADMIN` is a centralized privileged bypass. Brand/resource
scope remains deliberately deferred until the Brand domain exists.

## Brand authorization boundary

```text
TRAINER → RBAC permission: brands.read → UserBrandAccess → active Brand
SUPER_ADMIN → centralized AuthorizationService bypass → all Brands
```

`apps/api` owns Brand filtering and direct-resource scope checks. The browser can display a selected
Brand but cannot authorize it. Future Brand-owned domains follow `Brand → Curriculum → Course → Exam` and
must call the explicit Brand authorization service rather than introducing a generic scope framework.

## Training enrollment boundary

```text
Trainer → enrollments.create + pre-enrollment participant ownership + active Brand scope
                                                        ↓
                                              TrainingEnrollment
                                                        ↓
Trainee → enrollments.read_self → own assignment rows only
```

`TrainingEnrollment` is its own domain boundary. It models a participant's Brand assignment and planned
duration without adding learning content or progress. `UserBrandAccess` continues to model only Trainer
administrative scope. A scoped non-cancelled enrollment may expand a Trainer's participant read visibility,
but profile mutation and invitation operations remain limited to the provisioning owner. The service checks
both permission and current Brand scope for every protected operation; the centralized Super Administrator
bypass is unchanged.

## Staff provisioning boundary

```text
Authorized staff → RBAC guard → StaffProvisioningService → User + StaffProfile + UserRole + InvitationToken
                                                     ↓
                                  temporary Trainer pre-enrollment ownership check
```

Participant and Trainer remain ordinary `User` identities; `StaffProfile` contains their shared staff
data. The API encrypts NIK and returns only a masked representation. Creation and invitation reissue stay
inside the API/database boundary; the browser receives a raw activation URL only in the immediate protected
response and never persists it. Training Enrollment is a separate authorization domain; it neither replaces
identity provisioning nor grants profile-management rights.

## Curriculum versioning boundary

```text
Curriculum request → AuthorizationGuard → CurriculumService → parent-chain Brand scope check
                                                    ↓
                         Curriculum → Version → Week → Module (PostgreSQL transaction)
                                                    ↓
                           published version → immutable historical enrollment binding
```

Curriculum version numbers, publication, retirement, clone operations, and enrollment binding rules are
owned exclusively by `apps/api`. The publish transaction validates a complete contiguous Week sequence,
retires the previous publication, and then publishes the Draft while a database invariant prevents two
published versions. The browser can render selection and editing controls, but cannot mutate a published
structure, authorize a Brand, or derive an enrollment binding.

## Exam assessment boundary

```text
Participant → exact Enrollment + bound CurriculumVersion → verified Material completion gate
                                                            ↓
                                                     immutable ExamAttempt snapshot
                                                            ↓
                                               transactional deterministic scoring
```

Exam authoring resolves its parent Version, Curriculum, and Brand on the API before permitting a Draft
mutation. Participant attempts never use the mutable question bank for scoring: start creates relational
question/option snapshots, including server-only answer keys, and submit calculates integer basis points
from those snapshots. The browser receives only prompts, options, selected answers, and final safe results.

## Training progress boundary

`TrainingProgressService` is the sole owner of `REQUIREMENT_UNIT_V1`. It derives category, Week, and
Enrollment summaries directly from Enrollment-pinned Version structure, `LearningMaterialProgress`, and
server-scored `ExamAttempt` rows; percentage columns and browser-authored progress do not exist. Learning
activity, Exam start, and Exam submit trigger an idempotent lifecycle refresh under an Enrollment row lock.
Dashboard reads reconstruct the current canonical summary and have no lifecycle side effects.

## AI question-authoring boundary

`AiQuestionGenerationJob` is an authoring-only worker workflow. The API checks `questions.ai_generate`,
Draft Exam/Version state, and fresh Brand scope before enqueueing selected READY Materials. The worker extracts
bounded source chunks, sends only those chunks to a configured provider, validates untrusted structured output,
and persists source-grounded `DRAFT` Question candidates. It has no dependency on participant attempt scoring
or progress mutation paths; human approval remains the existing TASK-010 transition.

## Reporting and dashboard boundary

```text
Browser dashboard/report → AuthorizationGuard + reports.* permission → ReportingService
                                                               ↓
                 current Trainer Brand scope / centralized Super Administrator bypass
                                                               ↓
 TrainingEnrollment + TrainingProgressService + LearningMaterialProgress + server-scored ExamAttempt
                                                               ↓
        safe JSON projection or bounded, in-memory XLSX (with export audit events)
```

Reporting has no independent progress table or cache. `TrainingEnrollment` is the report grain and the
existing `TrainingProgressService` remains the canonical owner of `REQUIREMENT_UNIT_V1`; report reads are
side-effect free. The API authorizes a requested Brand before querying, re-evaluates scope on every request,
and returns only a safe projection. XLSX exports are generated in memory with a configurable 5,000-row default
limit, then sent directly as an authenticated response rather than stored or exposed as a public artifact.

## Transactional notifications and account recovery boundary

```text
Business event → NotificationDelivery (safe metadata only) → worker claim/retry → email provider
                                                               ↓
                                               just-in-time hash-only invitation/reset token
```

`NotificationDelivery` is a non-canonical delivery record, not a source of truth for identity, Enrollment,
or progress. The API queues only approved recipient metadata, template version, safe correlation IDs, and an
idempotency key. The worker creates an opaque token immediately before rendering an invitation or reset email,
persists only its SHA-256 hash, and builds links exclusively from `WEB_PUBLIC_URL`. Production uses explicit
SMTP configuration; disabled and deterministic test adapters cannot silently become a production provider.

## Certificate boundary

```text
Canonical completed Enrollment → idempotent TrainingCertificate snapshot → private PDF worker → authenticated download
```

`TrainingCertificate` is historical and one-to-one with an Enrollment. It captures immutable display data at issue
time and does not feed progress or scoring. The worker may fail or retry independently. Certificate file assets are
explicitly marked `CERTIFICATE` and served only through API authorization; no public verification surface exists.
