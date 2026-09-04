# TASK-006 Training Enrollment & Multi-Brand/Week Assignment

TASK-006 introduces Training Enrollment as a distinct business domain. A `TrainingEnrollment` assigns one
Participant to one Brand with a server-validated planned Week count and explicit lifecycle status. It does
not introduce curriculum, course, content, participant progress, score, attendance, certificate, or
notification workflows.

## Authorization model

- `SUPER_ADMIN` uses the centralized authorization bypass.
- `TRAINER` requires the relevant enrollment permission and active server-side Brand scope for every
  enrollment operation.
- A Trainer may create an enrollment only for a Participant they provisioned in TASK-005. This is a
  pre-enrollment creation condition, not a persistent management bypass.
- A non-cancelled enrollment in a Brand currently scoped to a Trainer extends participant read visibility;
  profile update, disable, and invitation reissue remain provisioning-owner-only.
- `TRAINEE` receives only `enrollments.read_self` and may read only their own assignments.

## Lifecycle and integrity

New rows begin as `NOT_STARTED`. Week count can be changed and an enrollment can be cancelled only before
training starts. The database permits only one current (`NOT_STARTED`, `IN_PROGRESS`, `SUSPENDED`)
enrollment per Participant/Brand, while preserving terminal history and allowing re-enrollment after
`CANCELLED`, `COMPLETED`, `FAILED`, or `EXPIRED`.

The multi-Brand create request validates every distinct Brand, participant eligibility, permission, and
scope before executing one database transaction. It has no artificial product-count cap; configured Week
limits protect input bounds only.

## Delivery surface

- NestJS enrollment endpoints under `/api/v1`, guarded by RBAC, CSRF for mutations, and Brand scope.
- Trainer and administrator participant-training screens for multi-Brand assignment, planned Week edits,
  and explicit cancellation confirmation.
- Trainee `/my-training` screen containing only own assignment records.
- Prisma migration, idempotent RBAC seed updates, allowlisted audit events, API E2E coverage for atomicity,
  IDOR, revocation, lifecycle, and concurrent uniqueness.
