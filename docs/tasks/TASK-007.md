# TASK-007 Curriculum Versioning, Week & Module Structure

This task establishes the Brand-scoped curriculum hierarchy:

```text
Brand → Curriculum → CurriculumVersion → CurriculumWeek → CurriculumModule
```

Curriculum codes are immutable within their Brand. Versions are server-numbered and begin as `DRAFT`.
Only DRAFT versions may be changed. Publishing validates contiguous Weeks `1..N`, retires the previously
published version in the same transaction, and preserves historical structures and enrollment bindings.

`TrainingEnrollment.curriculumVersionId` is intentionally nullable for TASK-006 compatibility. A new binding
is allowed only for a `NOT_STARTED` enrollment, a same-Brand `PUBLISHED` version, and an exact derived Week
count match. Publishing never changes an existing binding automatically.

Trainer curriculum operations require both the declared permission and active `BrandAuthorizationService`
scope. Nested Week and Module actions resolve their Curriculum and Brand server-side. Materials, progress,
exams, scores, and AI remain explicitly out of scope.
