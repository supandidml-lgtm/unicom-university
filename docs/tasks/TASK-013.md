# TASK-013 — Reporting, Management Dashboard & Secure Export

## Delivery scope

TASK-013 adds an Enrollment-centric reporting projection, Super Administrator and Trainer dashboards, scoped
participant report/detail endpoints, and authenticated XLSX export. It consumes existing authoritative
Enrollment, progress, material-progress, and server-scored Exam data; it does not add a second progress source
of truth or any new participant workflow.

## Security acceptance

- Reporting reads use `reports.read`; exports use `reports.export`.
- Trainers require their effective role plus fresh active Brand scope. Super Administrator is the centralized
  global bypass.
- Responses/export use masked NIK only and exclude answer keys, private asset details, telemetry, and secrets.
- Exports are bounded, formula-safe, in-memory authenticated streams and produce safe audit outcomes.

## Verification

The API integration suite validates both dashboard scopes, immediate authorization revocation, cross-Brand
denial, safe projections, audit events, and real XLSX content. The browser flow validates scoped dashboard and
report visibility. Standard lint, TypeScript typecheck, tests, build, and dependency audit remain release gates.
