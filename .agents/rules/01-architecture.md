# Unicom University — Architecture Rule

Read `00-master.md` and `../../MASTER_PRD_UNICOM_UNIVERSITY.md` first.

## Architecture Goal

Build a modular, production-grade enterprise LMS that can evolve without rewriting the entire application.

Preferred logical architecture:

- `apps/web` — Next.js/React frontend.
- `apps/api` — NestJS backend API.
- `apps/worker` — asynchronous/background processing.
- `packages/ui` — reusable UI primitives and application components.
- `packages/types` — shared contracts that are safe to share.
- `packages/config` — non-secret shared configuration.
- `packages/validation` — reusable validation schemas when appropriate.
- `database` — migrations/schema/database tooling.
- `docs` — architecture and operational documentation.
- `tests` — cross-application/E2E test assets.

Do not change the major architecture without documenting a concrete technical reason.

## Layer Boundaries

Use clear dependency direction.

Frontend:
`page/feature -> frontend service/client -> API`

Backend:
`controller -> application/service -> domain/repository abstraction -> infrastructure`

Worker:
`job consumer -> application service -> provider/adapter`

Do not:

- access PostgreSQL directly from frontend;
- call AI providers directly from browser;
- place privileged business rules in React components;
- duplicate domain calculations in multiple applications;
- let controllers become business-logic containers;
- let persistence models define the entire domain behavior.

## Domain Modules

Keep business domains separated.

Expected major modules include:

- auth;
- users;
- roles/permissions;
- employee profiles;
- branches;
- brands;
- training programs;
- training assignments;
- weeks/courses/materials;
- progress;
- exams;
- AI generation;
- notifications;
- reports;
- audit/activity.

Modules may collaborate through explicit interfaces/services. Avoid hidden cross-module coupling.

## API Architecture

Use versioned APIs:

`/api/v1/...`

Use stable, documented contracts.

Do not expose internal database structure directly as an accidental public API.

API responses and errors must be predictable.

For errors prefer structured codes such as:

`COURSE_LOCKED`, `FORBIDDEN`, `VALIDATION_ERROR`

Client-facing errors must not leak internal stack traces or infrastructure details.

## Async Work

Long-running tasks must not block ordinary HTTP requests.

Use background jobs for work such as:

- video/media processing;
- transcription;
- PDF processing;
- AI question generation;
- heavy report generation when needed.

Job lifecycle should support states such as:

`QUEUED`, `PROCESSING`, `RETRYING`, `COMPLETED`, `FAILED`.

Jobs must be observable and safe to retry.

## Provider Abstraction

External providers must be wrapped behind application-owned interfaces when vendor replacement is plausible.

Examples:

- AI provider;
- object storage provider;
- email/notification provider;
- transcription provider.

Do not scatter vendor SDK calls throughout business modules.

## Configuration

Separate:

- build/runtime configuration;
- domain configuration;
- secrets.

Secrets belong in environment/secret management, never source code.

Validate required environment variables at application startup and fail clearly when critical configuration is missing.

## Scalability

Design stateless web/API processes where practical.

Use:

- server-side pagination;
- database indexes;
- asynchronous jobs;
- private object storage;
- caching only where justified;
- Redis for queue/cache use cases as specified.

Do not introduce distributed complexity without a measurable reason.

## Observability

Architecture must support:

- structured logs;
- error tracking;
- health checks;
- job status;
- performance monitoring.

Do not log secrets or sensitive payloads unnecessarily.

Provide liveness/readiness endpoints when deployment architecture needs them.

## Failure Handling

External provider failures must be explicit and recoverable.

Do not convert a failed AI/media/storage operation into fake success.

Use bounded retries with backoff where appropriate.

Dead-letter or failed-job handling must preserve enough context for diagnosis without exposing secrets.

## Versioning

Historical business records must remain interpretable.

Use versioning for:

- learning materials;
- exams;
- AI-generated question sets when applicable.

A new version must not silently rewrite historical learner completion or exam attempts.

## Architecture Changes

When a change introduces:

- a new cross-cutting dependency;
- a new datastore;
- a new external provider;
- a new major application boundary;
- a significant API contract change;

update relevant architecture documentation and note the decision in the implementation report.

## Dependency Policy

Use current compatible stable versions during the appropriate phase and pin production dependencies.

Before adding a dependency verify:

- active maintenance;
- compatibility;
- security posture;
- bundle/runtime cost;
- whether existing framework/native capabilities already solve the need.

Avoid dependency proliferation.
