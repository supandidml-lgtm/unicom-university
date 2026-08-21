# Unicom University — Testing and QA Rule

Read `00-master.md` and the MASTER PRD first.

Testing is part of implementation, not a final cleanup activity.

## Test Layers

Use the appropriate combination of:

- unit tests;
- integration tests;
- API tests;
- database tests;
- authorization/security tests;
- E2E tests;
- browser verification;
- accessibility tests;
- performance/load tests;
- regression tests.

Do not force every behavior into E2E if a faster lower-level test proves it reliably.

## Test Philosophy

Prioritize critical business invariants over meaningless line coverage.

Coverage percentage alone is not proof of quality.

Every critical rule should have at least one positive and one relevant negative/edge-case test.

## Mandatory Critical Domains

### Authentication

Test:

- valid login;
- invalid credentials;
- inactive/suspended account;
- logout;
- expired/revoked session;
- password reset behavior when implemented.

### Authorization

Test:

- Staff cannot access admin APIs;
- Staff cannot access another learner's restricted resource;
- Trainer cannot self-elevate;
- Supervisor scope is enforced;
- unauthorized private material access fails;
- object-level access checks resist guessed IDs.

### Database Integrity

Test:

- NIK uniqueness;
- foreign key behavior;
- transaction rollback on failure;
- duplicate critical operation handling;
- migrations on clean database;
- risky migrations against representative data when applicable.

### Progress

Test the rules in `08-progress-engine.md`, including:

- direct video skip is rejected/not credited;
- watched segments do not overcount;
- replay does not inflate unique progress;
- invalid heartbeat does not complete material;
- out-of-order heartbeat does not regress/corrupt state;
- PDF bottom scroll alone does not complete;
- required pages matter;
- locked content remains inaccessible;
- unlock occurs after authoritative completion.

### Exam

Test:

- exam locked before prerequisite;
- exam unlock after prerequisite;
- correct grading;
- multiple-answer exact rule;
- randomization does not leak/alter grading;
- attempt limit;
- additional attempt permission;
- duplicate submit is idempotent;
- correct answer is not exposed pre-submit.

### AI

Test:

- source grounding;
- unsupported source failure;
- insufficient source does not fabricate;
- low-confidence handling;
- duplicate question detection;
- provider failure/retry;
- version linkage to material.

## Test Data

Use deterministic fixtures/factories.

Do not depend on production data.

Do not ship development seed users with weak/default passwords into production.

Keep test credentials clearly isolated.

## No Test Cheating

Never:

- skip/focus-disable failing tests to get green CI;
- weaken assertions because implementation is wrong;
- mock away the exact business rule being tested;
- change expected results to match a bug;
- suppress errors without root-cause analysis.

If a test is genuinely obsolete because a requirement changed, update it together with the approved requirement change and document why.

## Integration Tests

Integration tests should verify real module boundaries where practical:

- API + database;
- transaction behavior;
- authorization;
- persistence;
- provider adapter contracts.

Mock only true external boundaries when needed.

## E2E Critical Flows

At maturity, critical E2E flows should cover at least:

1. authorized user creates/assigns Staff;
2. Staff logs in;
3. Staff sees only assigned training;
4. Staff completes controlled learning material;
5. authoritative progress updates;
6. exam unlocks;
7. Staff submits exam;
8. score/pass result is stored;
9. Trainer/Supervisor sees correct scoped progress.

Also verify negative access flows.

## Browser Verification

For UI phases, run the real application in a browser.

Inspect:

- rendering;
- navigation;
- keyboard basics;
- forms;
- loading;
- empty;
- error;
- permission denied;
- responsive layout;
- console;
- network errors.

Build PASS without browser verification is insufficient.

## Regression

Before closing Phase N, rerun relevant earlier critical tests.

Fixes must not silently break completed phases.

Maintain a growing critical regression suite.

## Accessibility

Automated checks should be supplemented by manual/browser checks for:

- keyboard focus;
- labels;
- modal behavior;
- status meaning;
- contrast where tools can verify;
- responsive zoom/readability.

## Performance

Before production test representative:

- dashboard aggregate queries;
- large paginated user/progress lists;
- concurrent learner progress heartbeats;
- exam submissions;
- AI job queue load where feasible.

Do not invent performance claims without measurement.

## Defect Severity

Use severity:

- Critical — security/data loss/system unusable;
- High — core workflow broken or major access/data issue;
- Medium — meaningful but workaround exists;
- Low — minor/non-blocking.

Known Critical/High defects block production.

## Phase Quality Gate

Report exact command results for:

- lint;
- typecheck;
- unit;
- integration;
- build;
- security;
- browser;
- regression.

If a required check did not run, state `NOT RUN` and why.

Do not report PASS without evidence from the executed check.
