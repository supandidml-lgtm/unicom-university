# TASK-009 — Learning Consumption & Material Completion Tracking

TASK-009 introduces only enrollment-bound per-material consumption. It does not introduce Exam, score,
passing grade, overall course/training progress, certification, reports, or notifications.

Implementation decisions:

- Progress is unique to exact `TrainingEnrollment + LearningMaterial`; a missing row is `NOT_STARTED/0`.
- Browser telemetry is untrusted. The API derives all percentage, coverage, dwell, and completion state.
- Video completion requires trusted server metadata, merged watched intervals, sequence protection, allowed
  playback cadence/rate, configured coverage, and end-region validation. Byte-range/file streaming has no
  progress side effect.
- PDF completion uses server-derived page metadata, progressive coverage, final-page reach, and capped
  server-time dwell. Image/Office strategies require intentional acknowledgement after verified dwell and
  are explicitly interaction acknowledgement rather than evidence of comprehension.
- Participant activity is exact-owner/version scoped. Trainer/Admin status visibility is read-only and combines
  `learning_progress.read` with fresh Brand scope.
