# Unicom University — Backend Rule

Read `00-master.md`, `01-architecture.md`, `02-database.md`, and the MASTER PRD first.

Preferred backend baseline: **NestJS + TypeScript**, unless the approved architecture changes.

## Module Structure

Organize backend by domain capability, not by arbitrary technical folders alone.

Each major domain should have clear ownership for:

- controller/API boundary;
- application/service logic;
- domain rules;
- persistence/repository interaction;
- validation/contracts;
- tests.

Avoid giant shared services.

## Controllers

Controllers should:

- authenticate/authorize;
- parse validated input;
- call application services;
- return structured responses.

Controllers should not contain substantial business logic.

## Validation

Validate every external input server-side:

- body;
- query;
- path params;
- headers when relevant;
- upload metadata;
- progress events;
- exam submissions.

Reject unknown/invalid values according to a defined policy.

Do not trust TypeScript types at runtime.

## Authorization

Every privileged operation must have server-side authorization.

Use:

`RBAC + resource scope`

Examples:

- Staff can read only assigned training resources.
- Supervisor can read only permitted scope.
- Trainer cannot create/elevate Super Admin.
- Frontend route visibility does not grant API access.

Object-level authorization is mandatory to prevent IDOR.

## Authentication

Follow the security rule.

Session/token handling must support:

- expiration;
- logout/revocation;
- account disable/suspend;
- password reset invalidation;
- privileged-account hardening.

Never return password hashes or secret authentication fields.

## Business Logic

Centralize domain logic.

Do not duplicate calculations for:

- progress;
- lock/unlock;
- pass/fail;
- attempt limits;
- assignment validity.

Frontend and multiple backend modules must call the same authoritative domain behavior rather than reimplementing formulas independently.

## Error Contract

Return structured, stable errors.

Example shape:

```json
{
  "success": false,
  "error": {
    "code": "COURSE_LOCKED",
    "message": "Course belum dapat diakses."
  }
}
```

Use appropriate HTTP status codes.

Never expose production stack traces, SQL errors, internal paths, secrets, or provider credentials.

## API Design

Use `/api/v1`.

Use consistent:

- pagination;
- filtering;
- sorting;
- date formats;
- validation;
- error codes.

Large collections must use server-side pagination.

Do not load an entire user/progress dataset into a client for filtering.

## Idempotency

Critical operations must tolerate retries.

Examples:

- final exam submission;
- additional attempt grants;
- assignment creation where duplicates would be harmful;
- job callbacks;
- progress heartbeat processing.

A client double-click must not create duplicate final state.

## Progress Endpoints

Never accept client-supplied final progress as truth.

The client sends evidence/events.

Backend validates and calculates authoritative completion using the Progress Engine rule.

## Exam Endpoints

Do not send correct-answer markers to the learner before exam submission.

Randomization must be generated/persisted in a way that allows deterministic grading of the learner's presented attempt.

Score and pass/fail are calculated server-side.

## Uploads

File upload endpoints must follow `06-security.md`.

Validate:

- authorization;
- file type;
- MIME;
- size;
- safe naming/storage;
- association to permitted domain resources.

Use private object storage.

Do not trust the browser-provided filename or MIME alone.

## Background Jobs

Offload long work such as:

- transcription;
- PDF parsing;
- AI question generation;
- media processing.

API should return/track job state rather than block excessively.

Job handlers must be retry-safe.

## Logging

Use structured logging.

Include useful correlation/request identifiers where appropriate.

Never log:

- passwords;
- password reset secrets;
- raw auth tokens;
- AI/storage API keys;
- full sensitive exam answer payloads unless specifically secured and necessary.

## Performance

Avoid:

- N+1 database queries;
- unbounded result sets;
- synchronous heavy media processing;
- repeated expensive aggregate queries without optimization.

Measure before adding caches.

## Dependency Injection

Use DI/interfaces to isolate:

- persistence;
- AI providers;
- storage;
- email/notification providers;
- transcription/media adapters.

This enables testing and vendor replacement.

## Tests

Every significant backend rule must have tests.

Minimum coverage focus:

- authorization boundaries;
- validation;
- domain calculations;
- transaction behavior;
- idempotency;
- failure paths;
- external-provider adapters.

A controller happy-path test alone is insufficient for critical business logic.
