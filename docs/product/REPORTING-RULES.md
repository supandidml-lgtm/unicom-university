# Reporting Rules

TASK-013 reporting is a read-only projection of canonical PostgreSQL domain data. It does not store an
independent progress score or result. `TrainingProgressService` remains the only owner of
`REQUIREMENT_UNIT_V1`; submitted `ExamAttempt` records remain the source for score and pass/fail.

All official report and export timestamps use `REPORTING_TIMEZONE` (default `Asia/Jakarta`). The database
timestamps themselves remain canonical UTC timestamps. A historical Enrollment remains an independent row;
re-enrollment never merges history, even for the same Participant and Brand.

## Metrics

- **Active Participant**: a distinct Participant with an Enrollment in `NOT_STARTED`, `IN_PROGRESS`, or
  `SUSPENDED` in the selected scope.
- **Active Enrollment**: an Enrollment with one of those same statuses.
- **Completion rate**: `COMPLETED / (NOT_STARTED + IN_PROGRESS + COMPLETED + FAILED + SUSPENDED)`.
  `CANCELLED` is excluded.
- **Average progress**: floor average of canonical Enrollment overall progress basis points.
- **Material/exam progress**: the canonical material and exam values from `TrainingProgressService`.
- **Latest activity**: maximum trusted Material progress activity or Exam attempt start/submission time.

## Export security

Exports are generated synchronously and in memory, bounded by `REPORT_EXPORT_MAX_ROWS` (default 5,000).
They use exactly the same server-side Brand scope and filters as the report query. Every text value that could
be user controlled is protected against spreadsheet formula injection by prefixing `=`, `+`, `-`, or `@` with
an apostrophe. XLSX cells use numeric values for progress and Date values for timestamps.

Exports contain only masked NIK (`1234********5678`), never raw/encrypted NIK or NIK fingerprints. They never
contain answer keys, correct options, telemetry, storage paths, or private URLs. A download is an authenticated
report request; no private file is persisted and there are no public links or TTL-bearing export artifacts.
