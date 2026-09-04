# API Documentation

API versioning starts at `/api/v1`. The infrastructure health endpoints remain outside that prefix: `/health`, `/health/live`, and `/health/ready`.

## Authentication

All authentication endpoints are under `/api/v1/auth`. There is deliberately no public registration endpoint.

| Endpoint              | Purpose                                      | Result                                          |
| --------------------- | -------------------------------------------- | ----------------------------------------------- |
| `POST /auth/activate` | Consume an invitation and set a password     | `204`, or safe `400`                            |
| `POST /auth/login`    | Authenticate an active user                  | `200`, session cookie, safe user and CSRF token |
| `GET /auth/me`        | Read the authenticated identity              | `200` or `401`                                  |
| `GET /auth/csrf`      | Rotate/retrieve the session-bound CSRF token | `200` or `401`                                  |
| `POST /auth/logout`   | Revoke the server-side session               | `204`, requires `X-CSRF-Token`                  |

The session cookie is HttpOnly, `SameSite=Lax`, and `Path=/`. It is `Secure` in production. Browser clients use credentialed requests and retain the CSRF token only in memory. Login failures intentionally use the same public `401` message whether the email, password, or account status is invalid.

## Authorization management

All management endpoints require a server-validated session and the documented permission. `POST`,
`PATCH`, `PUT`, and `DELETE` additionally require `X-CSRF-Token` from `GET /api/v1/auth/csrf`.

| Endpoint                                                              | Permission                                  | Purpose                                                                |
| --------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| `GET /roles` and `GET /roles/:id`                                     | `roles.read`                                | List/read roles                                                        |
| `POST /roles`                                                         | `roles.create`                              | Create a custom role                                                   |
| `PATCH /roles/:id`, `DELETE /roles/:id`, `PUT /roles/:id/permissions` | `roles.update` / `roles.delete`             | Update, deactivate, or replace a custom role's complete permission set |
| `GET /permissions`                                                    | `permissions.read`                          | List application-defined permissions                                   |
| `GET /users/:userId/roles`                                            | `users.roles.read`                          | Read user role assignments                                             |
| `POST` / `DELETE /users/:userId/roles`                                | `users.roles.assign` / `users.roles.remove` | Idempotently assign or remove a role                                   |
| `GET /system/auth-events`                                             | `system.auth-events.read`                   | Read safe authorization audit events                                   |

`GET /auth/me` returns only safe role code/name pairs and permission codes. `SUPER_ADMIN` is granted
the application-defined permission catalog by the centralized authorization layer, rather than through
client-trusted state.

## Brand management

Brand mutations require `X-CSRF-Token`. Normal Brand deletion is intentionally not exposed; archive and
reactivation are explicit lifecycle transitions.

| Endpoint                                      | Permission            | Scope / purpose                                                                                         |
| --------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------- |
| `GET /brands`                                 | `brands.read`         | Super Administrator sees permitted status-filtered Brands; Trainer receives only assigned active Brands |
| `GET /brands/:id`                             | `brands.read`         | Trainer requires active `UserBrandAccess`; cross-Brand access is denied                                 |
| `POST /brands`                                | `brands.create`       | Create immutable-code Brand                                                                             |
| `PATCH /brands/:id`                           | `brands.update`       | Update only name/description                                                                            |
| `PATCH /brands/:id/archive`                   | `brands.archive`      | Archive without hard deletion                                                                           |
| `PATCH /brands/:id/reactivate`                | `brands.reactivate`   | Restore an archived Brand                                                                               |
| `GET /users/:userId/brand-access`             | `brand_access.read`   | Read safe Trainer Brand assignments                                                                     |
| `POST /users/:userId/brand-access`            | `brand_access.assign` | Idempotently assign active Brand to active Trainer                                                      |
| `DELETE /users/:userId/brand-access/:brandId` | `brand_access.remove` | Immediately revoke scope                                                                                |

## Staff provisioning

Staff mutations require a valid session and `X-CSRF-Token`. Creation and invitation reissue return an
activation URL exactly once because notification delivery is deferred. GET responses never return the raw
token, encrypted NIK envelope, fingerprint, password hash, or session data.

| Endpoint                                     | Permission                | Scope / purpose                                                                  |
| -------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------- |
| `POST /participants`                         | `participants.create`     | Provision INVITED User + StaffProfile + TRAINEE atomically                       |
| `GET /participants`, `GET /participants/:id` | `participants.read`       | Super Administrator all; Trainer only pre-enrollment records they provisioned    |
| `PATCH /participants/:id`                    | `participants.update`     | Only full name and phone; same Participant scope                                 |
| `POST /participants/:id/disable`             | `participants.disable`    | Disable and revoke active sessions; same Participant scope                       |
| `POST /participants/:id/reactivate`          | `participants.reactivate` | Restore DISABLED account to ACTIVE/INVITED as applicable; same Participant scope |
| `POST /participants/:id/invitations`         | `participants.invite`     | INVITED only; invalidates prior unused invitation                                |
| `POST /trainers`                             | `trainers.create`         | Super Administrator only; provisions TRAINER atomically                          |
| `GET /trainers`, `GET /trainers/:id`         | `trainers.read`           | Super Administrator only                                                         |
| `PATCH /trainers/:id`                        | `trainers.update`         | Super Administrator only; only full name and phone                               |
| `POST /trainers/:id/disable`                 | `trainers.disable`        | Super Administrator only                                                         |
| `POST /trainers/:id/reactivate`              | `trainers.reactivate`     | Super Administrator only                                                         |
| `POST /trainers/:id/invitations`             | `trainers.invite`         | Super Administrator only; INVITED only                                           |
| `GET /profile/me`                            | authenticated session     | Safe self profile; masked NIK only                                               |

Participant/Trainer create payloads require `fullName`, `phoneNumber`, `nik`, and `email`. They reject
role, permission, status, password, Brand, and Enrollment fields. Email and NIK changes are deferred to
dedicated workflows.

## Training enrollment

Enrollment mutations require a valid session and `X-CSRF-Token`. They accept only server-validated Brand
UUIDs and positive integer `plannedWeekCount` values (bounded by `TRAINING_MAX_PLANNED_WEEKS`). Client
payloads cannot set participant identity, status, audit fields, progress, score, course, or curriculum data.

| Endpoint                                        | Permission              | Scope / purpose                                                                                     |
| ----------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| `POST /participants/:participantId/enrollments` | `enrollments.create`    | Atomic multi-Brand assignment; Trainer needs original provisioning ownership and active Brand scope |
| `GET /participants/:participantId/enrollments`  | `enrollments.read`      | List only enrollments within the caller's active Brand scope                                        |
| `GET /enrollments` and `GET /enrollments/:id`   | `enrollments.read`      | Super Administrator all; Trainer limited to active assigned Brands                                  |
| `PATCH /enrollments/:id`                        | `enrollments.update`    | Change only `plannedWeekCount` while `NOT_STARTED` and Brand scope remains effective                |
| `POST /enrollments/:id/cancel`                  | `enrollments.cancel`    | Explicit cancellation while `NOT_STARTED`; retains history                                          |
| `GET /my-training/enrollments`                  | `enrollments.read_self` | Trainee can read only their own safe assignments                                                    |

At most one `NOT_STARTED`, `IN_PROGRESS`, or `SUSPENDED` enrollment may exist per Participant and Brand.
The API maps both preflight and database-concurrency conflicts to `409`; cancellation then allows a new
assignment. Enrollment responses contain only safe Brand summary and assignment lifecycle data.

## Curriculum versioning

Curriculum mutations require a valid session and `X-CSRF-Token`. The client may select a Brand or a
resource identifier but the API resolves all nested resources to their parent Curriculum and checks the
current server-side Brand scope. Published and retired versions have no mutable Week or Module endpoint.

| Endpoint                                    | Permission                                        | Scope / purpose                                                   |
| ------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| `GET`, `POST /curricula`                    | `curricula.read/create`                           | List scoped Curricula or create immutable-code Curriculum         |
| `GET`, `PATCH /curricula/:id`               | `curricula.read/update`                           | Read/update only mutable Curriculum metadata                      |
| `PATCH /curricula/:id/archive`              | `curricula.archive`                               | Super Administrator lifecycle archive                             |
| `GET`, `POST /curricula/:id/versions`       | `curriculum_versions.read/create`                 | Read history or create server-numbered Draft (optionally clone)   |
| `GET /curriculum-versions/:id`              | `curriculum_versions.read`                        | Read full Week/Module structure                                   |
| `POST /curriculum-versions/:id/publish`     | `curriculum_versions.publish`                     | Validate contiguous Weeks and atomically retire prior publication |
| `POST /curriculum-versions/:id/weeks`       | `curriculum_weeks.manage`                         | Add a Week to a Draft                                             |
| `PATCH`, `DELETE /curriculum-weeks/:id`     | `curriculum_weeks.manage`                         | Update/remove a Draft Week                                        |
| `PUT /curriculum-versions/:id/weeks/order`  | `curriculum_weeks.manage`                         | Submit every current Week ID exactly once                         |
| `POST /curriculum-weeks/:id/modules`        | `curriculum_modules.manage`                       | Add a Module to a Draft Week                                      |
| `PATCH`, `DELETE /curriculum-modules/:id`   | `curriculum_modules.manage`                       | Update/remove a Draft Module                                      |
| `PUT /curriculum-weeks/:id/modules/order`   | `curriculum_modules.manage`                       | Submit every current Module ID exactly once                       |
| `PATCH /enrollments/:id/curriculum-version` | `enrollments.update` + `curriculum_versions.read` | Bind same-Brand Published version to `NOT_STARTED` enrollment     |

Publishing requires a nonempty contiguous Week sequence `1..N`. Binding requires the published version's
derived Week count to exactly match `plannedWeekCount`; publication never assigns or migrates bindings.

## Materials and private learning content

All Material mutations require a valid session, CSRF token, relevant permission, Draft version, and
server-resolved parent Brand scope. File uploads are multipart, disk-quarantined with generated names,
size-limited, checked against allowed extension/MIME/signature combinations, SHA-256 hashed by the server,
and ClamAV scanned fail-closed before an asset can become `READY`.

| Endpoint                                        | Permission                                                 | Purpose                                                                             |
| ----------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `GET`, `POST /curriculum-modules/:id/materials` | `materials.read` / `materials.create` + `materials.upload` | Read scoped metadata or create a Draft material from an uploaded file               |
| `PATCH`, `DELETE /materials/:id`                | `materials.update` / `materials.remove`                    | Edit or remove a Draft material                                                     |
| `POST /materials/:id/file`                      | `materials.update` + `materials.upload`                    | Copy-on-write replacement of a Draft file                                           |
| `PUT /curriculum-modules/:id/materials/order`   | `materials.reorder`                                        | Submit every Material ID exactly once                                               |
| `GET /materials/:id/content`                    | `materials.read` or `learning_content.read_self`           | Private authorized stream; participant access requires exact own Enrollment/version |
| `GET /my-training/enrollments/:id/content`      | `learning_content.read_self`                               | Safe Week/Module/READY-Material structure for the caller's own bound Enrollment     |

Supported formats are PDF, JPEG, PNG, WebP, MP4, WebM, TXT, DOCX, and XLSX. Local private storage is
development/test-only and sits outside public/source trees; production requires configured private
S3-compatible storage and malware scanning. Content responses use validated MIME, `nosniff`, private cache
controls, safe disposition headers, and byte ranges when requested. No endpoint returns a storage key,
filesystem path, provider secret, or learning-progress side effect.

## Learning consumption and completion

All activity mutations require the participant's session, CSRF token, `learning_content.read_self`, an active
Trainee role, the caller's exact non-cancelled Enrollment, its exact bound published/retired Version, and a
READY Material. Payloads never contain progress percentages or a completion flag.

| Endpoint                                                                              | Permission                             | Purpose                                                                        |
| ------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------ |
| `POST /my-training/enrollments/:enrollmentId/materials/:materialId/activity-sessions` | `learning_content.read_self`           | Start an opaque, short-lived session after exact enrollment/version validation |
| `POST /learning/materials/:materialId/video/heartbeat`                                | `learning_content.read_self`           | Submit sequenced playback telemetry; server derives compact watched coverage   |
| `POST /learning/materials/:materialId/document/page`                                  | `learning_content.read_self`           | Submit sequenced PDF page navigation; server derives page coverage/dwell       |
| `POST /learning/materials/:materialId/acknowledge`                                    | `learning_content.read_self`           | Complete only acknowledgement strategies after verified dwell; never video/PDF |
| `GET /my-training/enrollments/:enrollmentId/material-progress`                        | `learning_content.read_self`           | Read safe own per-material progress                                            |
| `GET /enrollments/:enrollmentId/material-progress`                                    | `learning_progress.read` + Brand scope | Read-only Trainer/Admin status visibility                                      |

Video requires server metadata, accepted continuous coverage, and server-validated end reach. PDF requires
server page count, progressive page coverage, final-page reach, and server dwell. Image/Office material uses a
deliberate acknowledgement after server dwell. These prove interaction only, not comprehension.

## Exam engine

Assessment mutations require CSRF and authoring resolves `Exam → CurriculumVersion → Curriculum → Brand`
on the server. Only Draft assessment definitions can change.

| Endpoint                                                | Permission                    | Purpose                                           |
| ------------------------------------------------------- | ----------------------------- | ------------------------------------------------- |
| `GET`, `POST /curriculum-weeks/:weekId/exams`           | `exams.read` / `exams.create` | List scoped Exams or create a Draft Exam          |
| `GET`, `PATCH /exams/:examId`                           | `exams.read` / `exams.update` | Read or update a Draft Exam                       |
| `POST /exams/:examId/questions`                         | `questions.create`            | Add a Draft Question and options                  |
| `PATCH`, `DELETE /exam-questions/:questionId`           | `questions.update`            | Edit (resets approval) or remove a Draft Question |
| `POST /exam-questions/:questionId/approve`              | `questions.approve`           | Approve a structurally valid Question             |
| `PUT /exams/:examId/questions/order`                    | `questions.update`            | Submit every Question ID exactly once             |
| `GET /my-training/enrollments/:id/exams`                | `exam_attempts.read_self`     | Safe locked/available Exams and own history       |
| `POST /my-training/enrollments/:id/exams/:examId/start` | `exam_attempts.start_self`    | Start or resume one gated immutable attempt       |
| `PUT /exam-attempts/:id/answers/:attemptQuestionId`     | `exam_attempts.answer_self`   | Autosave snapshot selections without feedback     |
| `POST /exam-attempts/:id/submit`                        | `exam_attempts.submit_self`   | Transactional, idempotent deterministic scoring   |
| `GET /my-training/enrollments/:id/exam-attempts`        | `exam_attempts.read_self`     | Own safe attempt history                          |
| `GET /exams/:examId/results`                            | `exam_results.read`           | Brand-scoped read-only submitted results          |

Participant responses never contain correct-answer fields. Scores round down with
`floor(scorePoints * 10000 / maxPoints)`; a score equal to the configured threshold passes.

## Training progress

Progress endpoints are read-only. Values are integer basis points and are reconstructed using
`REQUIREMENT_UNIT_V1`; no endpoint accepts an authoritative progress or completion payload.

| Endpoint                                                    | Permission                    | Scope / purpose                                                          |
| ----------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| `GET /my-training/dashboard`                                | `training_progress.read_self` | Active Trainee's independent current and historical Enrollment summaries |
| `GET /my-training/enrollments/:id/progress`                 | `training_progress.read_self` | Exact own Enrollment only                                                |
| `GET /participants/:participantId/enrollments/:id/progress` | `learning_progress.read`      | Read-only Trainer/Admin view with fresh Brand scope                      |

Responses include overall/course/exam basis points, requirement counts, lifecycle timestamps, no-category
flags, a safe completion-block reason, Week summaries, and separate latest/best submitted Exam scores. A
dashboard GET never starts, completes, or otherwise changes an Enrollment.

## AI question authoring

AI question generation is available only to authorized Exam authors on an exact Draft Exam and Draft
CurriculumVersion. All POST routes require CSRF. The API returns safe job state and source evidence metadata;
it never returns provider credentials, raw prompts, raw responses, storage keys, or participant data.

| Endpoint                                       | Permission                               | Purpose                                      |
| ---------------------------------------------- | ---------------------------------------- | -------------------------------------------- |
| `GET /exams/:examId/ai-generation-materials`   | `exams.read` + `questions.ai_generate`   | List exact-version READY Material candidates |
| `POST /exams/:examId/ai-generation-jobs`       | `exams.update` + `questions.ai_generate` | Queue a source-grounded Draft-question job   |
| `GET /exams/:examId/ai-generation-jobs`        | `exams.read` + `questions.ai_generate`   | Read safe job states/counts                  |
| `POST /exams/ai-generation-jobs/:jobId/cancel` | `questions.ai_generate`                  | Cancel a queued/processing job               |

`materialIds` must be unique READY Materials from the exact target Version. Question-type counts must be
non-negative and sum exactly to `questionCount`. The configured provider may be disabled; this fails safely
without external transmission. AI candidates are always DRAFT and use the normal human question approval API.

# Reporting API (TASK-013)

- `GET /api/v1/dashboard/admin` — global Super Administrator operational dashboard.
- `GET /api/v1/dashboard/trainer` — active Brand-scoped Trainer dashboard.
- `GET /api/v1/reports/participants` — paginated Enrollment-centric projection. Supports `brandId`,
  `curriculumVersionId`, `status`, `search`, date/progress ranges, `page`, `pageSize`, and controlled sorting.
- `GET /api/v1/reports/brands` — Brand aggregates using the same scope and filters.
- `GET /api/v1/reports/participants/:participantId/enrollments/:enrollmentId` — scoped detail and Week summary.
- `GET /api/v1/reports/participants/export.xlsx` — authenticated XLSX export with the same filters and scope.

All endpoints require a current session and `reports.read` or `reports.export`; Trainer filters are authorized
in the service before data selection. API and XLSX responses use masked NIK only and expose no answer keys.

## Certificate API

| Endpoint                                     | Permission                                 | Purpose                                                                                  |
| -------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `GET /my-training/certificates`              | `certificates.read_self`                   | List only the authenticated Trainee's certificate snapshots                              |
| `GET /my-training/certificates/:id/download` | `certificates.read_self`                   | Private own PDF download (`application/pdf`, attachment, `nosniff`, `private, no-store`) |
| `POST /enrollments/:id/certificate`          | `certificates.issue` + Brand scope         | Idempotently issue the canonical completed Enrollment certificate                        |
| `GET /certificates/:id` / `download`         | `certificates.read` + Brand scope          | Scoped Trainer/Admin metadata or private PDF                                             |
| `POST /certificates/:id/revoke`              | `certificates.revoke`, Super Administrator | Historical revocation with non-empty reason                                              |

All certificate mutations require CSRF. Public verification, QR links, public object URLs, and email PDF attachments do not exist.
