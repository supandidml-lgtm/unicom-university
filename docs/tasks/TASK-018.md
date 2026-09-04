# TASK-018 — UAT and Version 1.0 release gate

TASK-018 is a release gate, not a feature-development task. It records traceable UAT evidence,
production prerequisite validation, deployment decisions, release notes, and hypercare
preparation. A final `v1.0.0` tag is permitted only after an approved immutable commit has
been deployed to real production and business approval is recorded.

The current repository has no Git `HEAD` commit and no declared production inventory. TASK-018
therefore prepares release evidence but remains blocked from production deployment and final
go-live acceptance. See `docs/release/GO-LIVE-DECISION-v1.0.md`.
