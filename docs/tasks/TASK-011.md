# TASK-011 — Training Progress Engine, Enrollment Completion & Participant Dashboard

## Implemented scope

- Central `TrainingProgressService` derives course, exam, Week, and overall summaries with integer
  `REQUIREMENT_UNIT_V1` arithmetic from the exact Enrollment-bound CurriculumVersion.
- Material contribution uses only server-derived `LearningMaterialProgress`; Exam contribution is PASS-only
  and exposes scores separately. Zero-requirement Enrollments stay at zero and do not auto-complete.
- Legitimate material activity, Exam start, and Exam submit refresh lifecycle state under an Enrollment lock.
  `startedAt` and `completedAt` are server-owned, completion is monotonic, and finite retry exhaustion is the
  only FAILED path.
- Participant dashboard/self-progress and read-only scoped Trainer/Admin progress APIs enforce ownership,
  RBAC, effective role, and fresh Brand scope. No manual progress or completion mutation exists.
- `/my-training` now displays distinct multi-Brand/re-enrollment cards, accessible progress values, no-content
  messaging, Week details, and distinct Exam score/result data. Trainer/Admin assignment views include a
  read-only scoped progress detail.

## Data change

Migration `20260831130000_training_progress_lifecycle` adds lifecycle timestamps only. It preserves all
existing Enrollment rows and does not introduce cached progress percentages or automatic migration-time
completion.
