# Unicom University — Progress Engine Rule

Read `00-master.md`, `02-database.md`, `03-backend.md`, and the MASTER PRD first.

The Progress Engine is a **security-sensitive business domain**.

Backend/domain logic is authoritative.

## Core Principle

Do not equate:

`opened = completed`

Do not accept client-calculated final percentages as truth.

The client reports learning evidence/events. The server validates evidence and derives progress/completion.

## Status Model

Material/Course:

- `LOCKED`
- `NOT_STARTED`
- `IN_PROGRESS`
- `COMPLETED`

Exam:

- `LOCKED`
- `AVAILABLE`
- `IN_PROGRESS`
- `PASSED`
- `FAILED`

Training assignment:

- `NOT_STARTED`
- `IN_PROGRESS`
- `COMPLETED`
- `FAILED`
- `OVERDUE`
- `CANCELLED`

State transitions must be explicit and tested.

## Learning Session

Create/track learning sessions with sufficient evidence to detect invalid progress.

Relevant data may include:

- learner;
- material version;
- session identifier;
- started/last activity;
- playback/page state;
- validated evidence;
- completion timestamp.

Do not rely solely on browser local storage.

## Video Progress

Do not calculate completion only as:

`currentTime / duration`

Track unique watched coverage/segments or an equivalent robust representation.

Rewatching the same segment must not artificially increase unique completion.

Example:

- watched 0–4 minutes;
- jumped and watched 8–12 minutes;

does not mean 12 minutes continuous completion.

## Video Heartbeat

Frontend may send periodic evidence such as:

- material ID/version;
- session ID;
- current position;
- playback state;
- timestamp/sequence information when appropriate.

Server validates plausible movement.

Heartbeat frequency should balance integrity and system load.

Do not write every event inefficiently if a safe batching/aggregation design can preserve integrity.

## Anti-Skip

A learner may seek backward to previously validated content.

A learner must not receive progress credit for seeking forward into unwatched content.

If the UI prevents seek but the client is manipulated, backend validation must still prevent completion credit.

Tolerance is allowed for normal player jitter/network behavior but must not permit meaningful skipping.

## Video Completion

Default required unique watched coverage:

`98%`

Threshold must be configurable.

Completion is awarded only by the server after evidence satisfies the rule.

Do not mark complete from an `ended` event alone.

## Playback Speed

Default MVP policy is 1x unless configured otherwise.

If speed options are later enabled, progress must still represent content actually traversed and valid active playback.

## Inactive/Background Behavior

Do not assume a playing media element proves active learning.

Use reasonable session/activity validation.

Do not aggressively penalize short tab switches or network interruptions; design for real-world use while preventing trivial unattended/faked completion.

## Resume

Resume from server-validated progress.

Local state may improve UX but cannot override authoritative server state.

## PDF/Document Progress

A PDF is not complete merely because the scrollbar reached the bottom.

Track evidence such as:

- material version;
- required page exposure;
- page visitation;
- active reading/engagement time;
- last activity;
- end-of-document traversal.

Default required page coverage:

`100%`

Minimum engagement time must be configurable.

## PDF Completion

Completion requires:

1. required page coverage;
2. minimum engagement condition;
3. end-of-document reached as defined;
4. server validation.

For exceptionally short content, policy may differ through configuration, not hardcoded special cases.

## Material Version Integrity

Progress must reference the material version actually consumed.

Publishing a new material version must not erase or reinterpret old completed progress.

## Course Progress

Course display percentage may be a weighted/average representation of required materials.

But Course status must remain `IN_PROGRESS` until all required completion rules are met.

Optional materials must not block completion unless configured as required.

## Week Progress

Week progress derives from required Courses and required Exams for that Week.

Do not duplicate week-progress formulas in frontend.

## Exam Progress vs Score

Keep separate:

- Exam Completion Progress;
- Exam Score;
- Pass/Fail.

A learner can have Exam Progress 100% and still fail with a score below passing threshold.

## Overall Training Progress

Default PRD weight:

- Course Completion: 60%
- Exam Completion: 40%

Formula:

`overall = courseProgress * 0.60 + examProgress * 0.40`

Weights are configurable.

Do not hardcode the default in multiple code paths.

## Unlocking

If sequential mode is ON:

- prerequisite material/course completion unlocks next content;
- exam remains locked until required learning is complete.

Authorization must also enforce locked state at API/resource level.

Direct URL/API access must not bypass learning sequence.

## Idempotency

Duplicate heartbeat requests must not double-count progress.

Duplicate completion events must not create duplicate completion records.

Progress updates must be safe under retries.

## Out-of-Order Events

Network conditions can reorder heartbeats.

Use sequence/timestamp/state logic that prevents an older event from:

- reducing trusted state incorrectly;
- creating impossible jumps;
- overwriting newer authoritative evidence.

## Concurrency

Multiple tabs/devices may exist.

Define deterministic conflict behavior.

Do not let concurrent sessions inflate unique progress above 100%.

## Auditability

Important completion transitions should be traceable.

Do not store so little evidence that suspected progress manipulation cannot be diagnosed.

## Required Tests

At minimum test:

- valid normal video completion;
- forward skip attempt;
- replay;
- duplicate heartbeat;
- out-of-order heartbeat;
- manipulated completion request;
- resume;
- PDF direct-bottom attempt;
- incomplete page coverage;
- valid PDF completion;
- version change;
- sequential lock/unlock;
- direct locked-resource API access;
- aggregate progress;
- completion never exceeds 100%.

Progress Engine changes are not complete until these relevant tests pass.
