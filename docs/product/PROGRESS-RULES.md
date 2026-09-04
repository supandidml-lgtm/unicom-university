# Training Progress Rules

TASK-011 establishes `REQUIREMENT_UNIT_V1` as the canonical progress policy. All values are integer basis
points (`0..10000`) calculated by the API from the exact `TrainingEnrollment.curriculumVersionId`.

- Each READY participant-consumable Material is one requirement unit. A missing progress row contributes
  `0`; an in-progress row contributes its server-derived basis points; a completed row contributes `10000`.
- Each participant-available Exam with approved Questions is one requirement unit. It contributes `10000`
  only when the exact Enrollment has a submitted PASS attempt. Scores remain separate display data.
- Course and Exam category progress are deterministic floor averages of their respective units. Overall
  progress is the floor average across both unit types; no implicit course/exam weighting is used.
- A category with zero requirements reports `0` plus `noMaterialRequired` or `noExamRequired`; it is
  satisfied for completion logic. An Enrollment with zero total requirements remains `NOT_STARTED` at `0`
  and returns `NO_TRAINING_REQUIREMENTS`.
- Week summaries apply the same formula restricted to that Week. Enrollments never merge histories across
  Brands or re-enrollments, and a new CurriculumVersion never changes a bound historical calculation.

Lifecycle is server-controlled. Legitimate material activity or an Exam start transitions an Enrollment from
`NOT_STARTED` to `IN_PROGRESS` and sets `startedAt` once. Completion requires at least one requirement,
every Material completed, every required Exam passed, and an Enrollment that is neither cancelled nor
suspended. Completion sets `completedAt` once and is monotonic. A failed Exam does not fail training while a
retry remains; `FAILED` is possible only when a required Exam has finite exhausted submitted attempts and no
PASS. Unlimited attempts never exhaust training.
