# TASK-010 — Exam Engine, Question Bank, Scoring & Material Completion Gating

TASK-010 implements deterministic objective assessments only: single choice, multiple choice, and
true/false Questions. Objective scoring is performed solely by the API from immutable attempt snapshots.
AI generation/scoring, free-text grading, overall training progress, reports, certificates, and notifications
remain out of scope.

An Exam belongs to the exact CurriculumVersion and Week (optionally a Module). Draft authoring requires
Brand-scoped Trainer authorization; published and retired definitions are immutable. Participant starts
require the exact own Enrollment/version binding and server-verified completion of every READY Material in
the Exam scope. Existing retired bindings remain consumable and assessable.

The score is `floor(pointsEarned * 10000 / maxPoints)`. Multiple choice uses exact-set all-or-nothing
scoring. A pass is score greater than or equal to the Exam threshold. Active participant responses do not
expose correctness or answer keys.
