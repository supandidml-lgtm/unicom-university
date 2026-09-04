# Test Strategy

Every task requires automated verification in addition to manual testing.

- **Unit tests:** isolated logic and component behavior.
- **Integration tests:** API modules and infrastructure boundaries using non-production services only.
- **E2E tests:** critical user flows once business modules exist.
- **Security tests:** authorization boundaries, input validation, error safety, and sensitive-data handling.

No test may connect to or modify a production database or service. A task is not complete merely because a manual test appears successful; lint, typecheck, automated tests, and production build must pass.

## TASK-006 enrollment coverage

`apps/api/test/enrollments.e2e-spec.ts` exercises the non-production PostgreSQL/Redis API boundary for:

- atomic multi-Brand creation, duplicate rejection, cancellation, and re-enrollment;
- Trainer participant-ownership plus active Brand-scope checks, including no partial write on mixed scope;
- enrollment-derived participant read visibility without extending profile mutation authority;
- immediate access revocation after Brand access or Trainer role removal;
- Trainee self-only reads, cross-user IDOR denial, lifecycle validation, and concurrent active-enrollment
  uniqueness.

`apps/api/e2e/enrollments.spec.ts` reuses Playwright for Trainer multi-Brand assignment, a controlled
cross-Brand browser API injection with rollback assertion, and Trainee self-only `/my-training` visibility.
The suite is ready to run once the local API, PostgreSQL, and Redis runtimes are available; it creates
dynamic test credentials and NIK data only in process and does not retain them in artifacts.

## TASK-007 curriculum coverage

`apps/api/test/curricula.e2e-spec.ts` validates server-numbered concurrent Draft creation, Brand-scoped
Trainer access, mass-assignment rejection, contiguous Week publication rules, transactional retirement,
Draft immutability, immediate scope revocation, and exact published-version enrollment binding. It also
checks that a retired version cannot be newly bound and that an in-progress enrollment cannot be rebound.

Browser E2E covers the Administrator curriculum editor through Brand selection, Draft construction, Module
creation, and publication. Enrollment binding is covered through the API integration boundary. Test data
uses local non-production PostgreSQL and Redis only.

## TASK-008 material and learning-content coverage

Material API verification covers protected multipart upload, server-side file type and size validation,
malware-scan fail-closed behavior, Draft-only mutations, immutable published material structures, and
publish rejection when an asset is not `READY`. Authorization checks cover immediate Brand-scope
revocation, participant IDOR denial, exact enrollment-version access, and unbound enrollment responses.
The ClamAV boundary uses a deterministic clean scanner only under `NODE_ENV=test`; development and
production uploads are rejected when the configured scanner cannot return a clean result.

## TASK-009 learning-consumption coverage

Unit tests cover compact interval merge, threshold/end completion, page coverage/dwell, and acknowledgement
strategy selection. API integration verifies server-derived monotonic progress, forged forward-jump rejection,
sequence replay rejection, video end/coverage completion, final-page-only rejection, acknowledgement dwell,
cross-participant IDOR denial, Trainer mutation denial, and immediate Brand-scope revocation for read-only
progress. File streaming remains deliberately outside learning mutation paths and is asserted by design and
route separation.

## TASK-010 exam engine coverage

Unit coverage verifies objective structure rules, exact-set multiple-choice scoring, unanswered handling,
and floor basis-point calculation. API integration verifies immutable attempt snapshots, prerequisite gating,
concurrent start/resume, option injection and participant IDOR rejection, answer-key non-disclosure,
idempotent submit, result Brand-scope revocation, and server-only scoring. Browser coverage exercises the
locked state, verified unlock, participant answer/submit flow, PASS result, and persisted history.

## TASK-011 training progress coverage

Unit coverage verifies basis-point floor arithmetic, partial Material contribution, PASS-only Exam units,
zero-requirement protection, Week state derivation, and finite versus unlimited retry exhaustion. Integration
coverage exercises exact-version and multi-Brand isolation, side-effect-free dashboard reads, lifecycle
timestamps, completion monotonicity, and participant/Trainer IDOR and scope revocation. Browser coverage
exercises separate Enrollment dashboard cards, progress increase through canonical learning activity, and
persisted completion/retry state without client-authored percentages.

## TASK-012 AI question authoring coverage

Unit tests verify prompt-injection delimiting, objective candidate structure, source-reference rejection, and
locator validation. Integration tests use the deterministic `test_fake` provider with no network/API key and
verify Trainer RBAC/Brand scope, Trainee denial, exact-version Material enforcement, generated `DRAFT` origin,
source evidence, and absence of attempt/progress writes. Provider failures, disabled mode, and malformed output
must retain safe job failure state without persisting broken Questions. Existing TASK-010 scoring and answer-key
non-disclosure tests remain mandatory regressions.

## TASK-013 reporting coverage

Reporting unit coverage opens the generated XLSX and verifies spreadsheet-formula neutralization and a safe
filename. API integration covers Trainer Brand scope, denied cross-Brand report/detail access, masked-NIK
responses, export audit metadata, immediate Brand and Trainer-role revocation, global Super Administrator
coverage, and rejection of an Administrator request for the Trainer-only dashboard. Browser E2E verifies the
Trainer dashboard/report navigation and confirms only the authorized Brand's participant is visible; browser
download mechanics are not trusted for authorization and the binary stream is asserted at the API boundary.

## TASK-014 notification and recovery coverage

Notification integration coverage verifies queued, delivered, failed, and disabled states; retry; template
escaping; and deterministic test-provider inbox inspection without persisting raw tokens. Recovery coverage
verifies generic unknown-email behavior, ineligible users, rate limits, hash-only TTL tokens, latest-token
revocation, single-use concurrent replay protection, Argon2 password replacement, and all-session revocation.
Browser smoke coverage includes accessible forgot/reset forms and staff resend status without an activation URL.
SMTP is never called from CI; CI uses only the deterministic test provider.

## TASK-015 certificate coverage

Certificate integration coverage verifies canonical-completion eligibility, one-to-one concurrency convergence,
immutable snapshots, safe private PDF headers, PDF failure isolation/retry, idempotent ready notification,
participant and Trainer scope IDOR denials, immediate scope revocation, Super Administrator revocation, and repeatable
batched backfill. Browser coverage verifies preparing/ready/revoked status and an accessible download action.

## TASK-016 UI/UX hardening coverage

Web component coverage verifies shared display formatting and safe request messaging. Playwright continues
to exercise authenticated role journeys, keyboard-operable authentication controls, narrow viewport
login/activation smoke, and security-sensitive API boundaries. Manual responsive review covers 360px,
390px, 768px, 1024px, and 1440px layouts; it checks that navigation, primary actions, tables, certificate
actions, and error/empty states remain reachable without exposing sensitive values.
