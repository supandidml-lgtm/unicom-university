# Unicom University — Master Agent Rule

## Authority

This workspace builds **Unicom University**, an enterprise internal Learning Management System.

Before making any implementation decision, read and obey:

`../../MASTER_PRD_UNICOM_UNIVERSITY.md`

The MASTER PRD is the highest project-level source of truth. This rule does not replace it.

Priority:

1. MASTER PRD.
2. `.agents/rules/`.
3. Architecture, database, security, UI/UX, and testing documentation.
4. Active phase prompt.
5. Existing implementation decisions that do not conflict with the above.

If there is a conflict, follow the higher-priority source and document the conflict.

## Mandatory Working Procedure

Before changing code:

1. Read the active phase requirement in the MASTER PRD.
2. Read all relevant `.agents/rules/`.
3. Audit the existing repository and current implementation.
4. Identify dependencies and regression risk.
5. Produce an implementation plan before editing.
6. Work only on the explicitly requested phase.
7. Do not start the next phase automatically.

Never assume a feature is absent until the repository has been inspected.

## Phase Discipline

Only implement requirements belonging to the current phase.

Do not opportunistically implement future phases.

A small interface, type, adapter, schema placeholder, or boundary required by the active phase is allowed only when it is a genuine architectural dependency. It must not pretend to be a completed future feature.

When the active phase is complete:

**STOP.**

Wait for an explicit instruction before starting another phase.

## No Fake Completion

A feature is NOT complete if any required part is:

- mocked in production paths;
- hardcoded only to make the screen look complete;
- represented by a non-functional button;
- backed by fake dashboard data;
- implemented only in frontend without required backend logic;
- implemented in backend without authorization;
- left as a blocking TODO;
- skipped because a test was disabled;
- bypassed with an unsafe type cast or security exception.

Never claim completion when a mandatory requirement is missing.

## Server Authority

The backend/domain layer is authoritative for:

- authentication;
- authorization;
- resource scope;
- training assignment;
- course locking/unlocking;
- video completion;
- PDF completion;
- progress calculation;
- exam attempt limits;
- grading;
- pass/fail;
- final score.

Frontend values are never trusted as final authority for these domains.

## Configurability

Do not hardcode business entities or policy values such as:

- Brand names;
- Branch names;
- training week count;
- passing score;
- exam attempt limit;
- course/exam weights;
- completion thresholds;
- training duration;
- role scope;
- sequential-learning rules.

Configuration must come from controlled application configuration or persisted domain data as specified by the PRD.

## Code Quality

Code must be:

- strongly typed;
- modular;
- readable;
- testable;
- secure;
- maintainable;
- consistent.

Avoid:

- duplicated business logic;
- giant components;
- giant services;
- circular dependencies;
- magic numbers;
- silent catches;
- broad `any`;
- unexplained type suppression;
- direct database access from frontend;
- direct vendor coupling when an abstraction is required.

Do not use `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, unsafe casts, or test skips merely to make CI pass. Any legitimate exception must be narrow and documented.

## Data Safety

Never perform destructive schema or data changes without evaluating existing data and migration impact.

Never delete historical training, exam, progress, audit, or version data simply to simplify implementation.

Prefer archive, deactivate, version, or migration strategies when historical records exist.

## Security Baseline

Never commit or print real secrets.

Never expose stack traces, database details, secret values, password hashes, correct exam answers, or privileged internal metadata to unauthorized clients.

Authorization must be enforced server-side.

Treat all client input as untrusted.

## Required Quality Gate

Before declaring a phase complete, run all relevant checks:

- lint;
- typecheck;
- unit tests;
- integration/API tests;
- build;
- security/dependency verification;
- browser verification for UI changes;
- regression verification;
- documentation update.

A mandatory failed gate means:

`PHASE STATUS = NOT COMPLETE`

Fix the root cause and rerun the failed checks.

## Browser Verification

For UI-affecting work, verify the real application in a browser.

At minimum inspect:

- initial render;
- navigation;
- forms/interactions;
- loading state;
- empty state;
- error state;
- permission-denied state;
- responsive behavior;
- console errors;
- failed network requests;
- real API integration when available.

A successful build alone is not proof that the feature works.

## Regression Rule

Changes in Phase N must not break completed functionality from earlier phases.

When a defect is found, fix the root cause rather than weakening prior requirements.

## Documentation

Update relevant documentation when architecture, environment, API behavior, database design, security behavior, or operational behavior changes.

Do not leave the repository in a state where implementation and documentation materially disagree.

## Implementation Report

At the end of each phase provide:

- Phase;
- Status;
- Implemented;
- Changed files;
- Database changes;
- Security changes;
- Test results;
- Browser verification;
- Regression result;
- Known issues;
- Deferred items;
- PRD deviations;
- Ready for next phase: YES/NO.

If there is no PRD deviation, explicitly state `NONE`.

## Final Rule

Do not optimize for speed of code generation.

Optimize for correctness, maintainability, security, data integrity, and faithful implementation of the MASTER PRD.
