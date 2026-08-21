# Unicom University — Database Rule

Read `00-master.md` and the MASTER PRD first.

Primary database: **PostgreSQL**.

The database is a critical integrity boundary, not merely a storage bucket.

## Schema Principles

Use normalized relational modeling where it improves integrity and maintainability.

Core entities should follow the PRD, including:

- users;
- roles;
- permissions;
- user_roles;
- employee_profiles;
- branches;
- brands;
- training_programs;
- training_program_brands;
- training_weeks;
- training_assignments;
- courses;
- course_materials;
- material_versions;
- learning_sessions;
- video_progress;
- document_progress;
- course_progress;
- week_progress;
- training_progress;
- exams;
- exam_versions;
- questions;
- question_options;
- question_sources;
- exam_attempts;
- exam_answers;
- ai_generation_jobs;
- notifications;
- activity_events;
- audit_logs.

Exact schema may evolve, but the domain relationships and historical integrity must remain consistent with the PRD.

## Primary Keys and Timestamps

Use stable primary keys appropriate for distributed web applications.

All important persisted entities should have appropriate timestamps such as:

- `created_at`;
- `updated_at`.

Use immutable event timestamps for audit/activity records.

Store time in a timezone-safe form. Present local time at the application boundary.

## Constraints

Enforce critical invariants in the database when practical.

Examples:

- Staff NIK must be unique according to the active business rule.
- required foreign keys must exist;
- unique relation combinations must be constrained;
- invalid nullability must be prevented;
- enum/status values must be controlled;
- duplicate final exam submissions must be prevented by design.

Frontend validation is not a substitute for database integrity.

## Foreign Keys

Use foreign keys for relational integrity.

Define intentional delete/update behavior.

Do not use broad cascading deletes when they could remove historical:

- training assignments;
- exam attempts;
- progress;
- material versions;
- audit/activity events.

Historical business data should usually be archived/deactivated/versioned rather than destroyed.

## Migrations

Every schema change must be represented by a migration.

Never make undocumented manual production schema changes.

Migration workflow:

- generate/write migration;
- review migration;
- test on development;
- test against staging-like data when risky;
- evaluate backward/forward compatibility;
- document destructive or long-running operations.

Do not reset production data to solve migration problems.

## Destructive Changes

For rename/remove/type-change operations:

1. inspect existing data;
2. plan migration;
3. preserve compatibility where needed;
4. backfill safely;
5. validate;
6. remove legacy structure only when safe.

Prefer expand/migrate/contract for high-risk changes.

## Indexing

Index based on real access patterns.

Likely indexed/filterable fields include:

- user identifiers;
- NIK;
- role relations;
- branch;
- brand;
- training program;
- assignment status;
- deadlines;
- course/material relations;
- exam attempt relations;
- created timestamps;
- job status.

Do not add arbitrary indexes without considering write cost.

Audit slow queries and avoid N+1 patterns.

## Transactions

Use database transactions for operations that must succeed atomically, including:

- training assignment creation involving multiple records;
- privilege changes;
- exam final submission;
- grading/finalization;
- additional exam attempt grants;
- version publication;
- other multi-record critical operations.

Do not leave partially committed business states.

## Concurrency and Idempotency

Design for duplicate/reordered requests.

Exam final submission must be idempotent.

Progress updates may arrive out of order; database writes must not regress validated progress incorrectly.

Use optimistic locking, unique constraints, conditional updates, or transaction locking where appropriate.

## Soft Delete / Archive

Entities with historical references should normally support lifecycle state:

- ACTIVE;
- INACTIVE;
- ARCHIVED;

or equivalent.

Do not physically delete a Brand, Branch, Program, Material, or User merely because it is no longer active if historical records depend on it.

## Material Versioning

Never overwrite a material in a way that changes what a completed learner historically viewed.

Persist material versions.

Progress must reference the material version that was consumed.

New assignments may use a new published version without corrupting prior history.

## Exam Versioning

Persist exam versions.

An exam attempt must remain linked to the exact exam/question version presented to that learner.

Do not mutate historical questions/options in place when doing so would alter interpretation of completed attempts.

## Progress Storage

Do not store only a single `progress_percent` and lose evidence.

Persist sufficient authoritative evidence for the Progress Engine, such as:

- learning sessions;
- validated video watched segments/checkpoints;
- document page completion/exposure;
- active engagement timing;
- completion status and timestamps.

Derived aggregate progress may be stored/cached if there is a clear consistency strategy.

## Audit Data

Audit records should be append-oriented.

Never store:

- plaintext password;
- password reset token value;
- full secrets;
- unnecessary sensitive payloads.

Audit log integrity must not depend on editable client data.

## Seeds

Development/test seed data must be clearly separated from production.

Do not automatically insert demo users, fake scores, or mock dashboard data into production.

Production bootstrap of the first privileged account must use a secure, documented process.

## Backup Compatibility

Database changes must consider backup and restore.

Before production rollout of risky migrations, ensure backup/restore procedure remains valid.

A backup is not considered operationally reliable until restore has been tested.
