# Database Documentation

The database package owns Prisma schema and migrations. Every schema change requires a reviewed Prisma migration.

## Authentication entities

TASK-002 introduces the first domain migration, `authentication_foundation`.

- `User` holds a unique normalized login email, optional Argon2id password hash, account status, and activation/login timestamps.
- `AuthSession` holds only SHA-256 hashes of opaque session and CSRF tokens. It stores idle/absolute expiry and server-side revocation state.
- `InvitationToken` holds only a SHA-256 invitation-token hash, expiry, and single-use timestamp.
- `AuthSecurityEvent` is an allowlisted security audit stream for authentication actions. It does not store passwords or raw tokens.

`UserStatus` currently contains `INVITED`, `ACTIVE`, `SUSPENDED`, and `DISABLED`.

## Authorization entities

TASK-003 adds database-backed RBAC through migration `rbac_authorization_foundation`.

- `Role` contains a stable unique code, display metadata, system flag, and active state.
- `Permission` contains a stable application-defined `resource.action` code and display metadata.
- `UserRole` is the unique user-to-role assignment junction.
- `RolePermission` is the unique role-to-permission assignment junction.

Inactive roles never grant permissions and cannot be assigned. System roles are seeded, not
client-created, and are archived/protected rather than hard-deleted by the API. The system seed is
idempotent: run `pnpm db:seed` after migrations to upsert TASK-003 roles and permissions.

## Brand entities

TASK-004 adds the first business-domain boundary through migration
`brand_management_and_scope`.

- `Brand` has an immutable, unique machine code, display metadata, explicit `ACTIVE`/`ARCHIVED`
  lifecycle, archival timestamp, and safe actor references.
- `UserBrandAccess` is an explicit Trainer-only administrative scope junction, unique by
  `(userId, brandId)`. It is not enrollment and must never be reused as participant learning scope.

Brands are archived rather than normally deleted. Historical access mappings remain when a Brand is
archived and become effective again only after reactivation, provided the user still has an effective
`TRAINER` role. Archived Brands cannot receive new assignments and do not grant Trainer business access.

## Staff identity entities

TASK-005 adds `StaffProfile`, a one-to-one staff identity record for both Participants and Trainers.

- `StaffProfile.userId` is unique; no separate Participant or Trainer identity tables exist.
- It stores full name, canonical normalized phone number, provisioning actor, and safe NIK display fragments.
- Raw NIK is never stored as a normal column. `encryptedNik` is a versioned AES-256-GCM envelope and
  `nikFingerprint` is a separate HMAC-SHA-256 value with a database unique constraint.
- `createdByUserId` provides the temporary TASK-005 pre-enrollment ownership scope for Trainers. TASK-006
  must extend/replace this with Enrollment plus Brand scope; it is not learning authorization.
- Existing bootstrap Users need not have a `StaffProfile`; new Participant and Trainer provisioning creates
  User, StaffProfile, required system role, invitation hash, and audit event atomically.

## Training enrollment entities

TASK-006 adds `TrainingEnrollment` through migration `training_enrollment_foundation`.

- An enrollment is a separate participant-to-Brand assignment; it is never represented by
  `UserBrandAccess`, which remains Trainer administrative scope only.
- Each row stores an explicit `plannedWeekCount`, lifecycle status, assignment actor/time, update time,
  and cancellation actor/time. No course, curriculum, content, score, or progress data is introduced.
- The database enforces at most one current enrollment for a `(participantUserId, brandId)` pair through
  a partial unique index covering `NOT_STARTED`, `IN_PROGRESS`, and `SUSPENDED`. `COMPLETED`, `FAILED`,
  `EXPIRED`, and `CANCELLED` rows preserve history and permit later re-enrollment.
- Participant and Brand references use restrictive foreign keys to preserve assignment history. Assignment
  and cancellation actor references are retained when an actor is deleted.

## Curriculum versioning entities

TASK-007 adds the Brand-owned hierarchy `Curriculum → CurriculumVersion → CurriculumWeek →
CurriculumModule` through the `curriculum_versioning_week_modules` migration. The follow-up
`curriculum_single_published_invariant` migration adds the PostgreSQL partial unique index that permits
only one `PUBLISHED` version for each Curriculum.

- `Curriculum` has immutable `(brandId, code)` identity and an `ACTIVE`/`ARCHIVED` lifecycle. Archive
  preserves versions and any historical enrollment bindings.
- `CurriculumVersion` is server-numbered and starts `DRAFT`. Published and retired versions retain their
  complete Week/Module structure. Restrictive foreign keys preserve binding history.
- `CurriculumWeek` is unique by `(curriculumVersionId, weekNumber)` and `CurriculumModule` is unique by
  `(curriculumWeekId, code)`, with a separate explicit `sortOrder`.
- `TrainingEnrollment.curriculumVersionId` is nullable for existing assignments. A binding is created only
  by the API after lifecycle, Brand, publication state, and exact Week-count validation.

## Material and private-file entities

TASK-008 adds `FileAsset` and `LearningMaterial` through the
`material_learning_content_management` migration.

- `LearningMaterial` belongs to one `CurriculumModule`, has an explicit order and safe display metadata,
  and references a `FileAsset` using a restrictive foreign key.
- `FileAsset` holds a generated private storage key, server-derived MIME/extension, byte size, SHA-256,
  scanner state, and creator reference. It never contains a public URL or provider credential.
- A clone creates fresh Material rows but may share the same immutable READY FileAsset. Draft file
  replacement is copy-on-write, leaving historical Published/Retired content unchanged.
- `UPLOADING`, `QUARANTINED`, `READY`, `REJECTED`, and `FAILED` are explicit states; publishing accepts
  only READY assets. TASK-008 still introduces no progress, watch tracking, score, or completion entity.

## Learning consumption and material completion

TASK-009 adds enrollment-scoped material consumption through the
`learning_consumption_completion_tracking` migration.

- `LearningMaterialProgress` is unique by `(enrollmentId, materialId)`. A missing row means
  `NOT_STARTED` at `0%`; no global User-to-Material completion is stored. Its percentage is integer basis
  points and may only increase. `COMPLETED` rows remain completed.
- Compact `videoCoverage` merged intervals and `pageCoverage` page sets replace per-heartbeat event rows.
  `accumulatedDwellMs` is server-clock-derived and capped per event. `FileAsset.durationMs` and
  `FileAsset.pageCount` are server-derived metadata; absent metadata prevents the relevant material type
  from becoming completable.
- `LearningActivitySession` is a short-lived, authenticated participant session distinct from authentication
  sessions. It binds a user, enrollment, and material and stores only last sequence/position/event state for
  replay and rate protection. It is never exposed in audit metadata.

## Exam engine and immutable attempts

TASK-010 adds deterministic objective assessment through `Exam`, `ExamQuestion`, and
`ExamQuestionOption`. An Exam belongs to one exact CurriculumVersion and Week and can optionally be
Module-scoped. Questions are `DRAFT` until a structurally valid human approval; published and retired
version definitions remain immutable.

`ExamAttempt` is unique by Enrollment, Exam, and server-generated attempt number. A PostgreSQL partial
unique index permits only one `IN_PROGRESS` attempt for an Enrollment/Exam pair. At start, relational
`ExamAttemptQuestion` and `ExamAttemptQuestionOption` rows snapshot prompt, point values, ordering,
options, and the server-only answer key. `ExamAttemptAnswer` stores only selected snapshot option IDs.
Scoring never reads mutable question-bank rows.

Scores use integer basis points and round down: `floor(pointsEarned * 10000 / maxPoints)`. Single choice
and true/false require the exact correct option; multiple choice requires the exact full set and grants no
partial credit. Unanswered questions receive zero. A pass is `scoreBasisPoints >= passingScoreBasisPoints`.

## Training progress lifecycle

TASK-011 migration `training_progress_lifecycle` adds nullable `TrainingEnrollment.startedAt` and
`TrainingEnrollment.completedAt`. It deliberately adds no cached percentage column: all progress remains a
reconstructable aggregate of immutable bound curriculum structure, Material progress, and Exam attempts.
Existing rows are preserved and are not automatically completed by migration.

## AI source-grounded question authoring

TASK-012 migration `ai_question_generation_source_grounding` adds authoring workflow entities only:
`AiQuestionGenerationJob`, selected-job Materials, reusable immutable-asset extractions/chunks, and per-question
source references. `ExamQuestion.origin` defaults existing rows to `MANUAL`; generated rows point to their job
and remain `DRAFT`. No attempt snapshot, objective scoring, Material-progress, or Enrollment-progress schema
is altered.
