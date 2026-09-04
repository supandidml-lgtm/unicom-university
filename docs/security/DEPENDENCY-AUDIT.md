# Dependency audit

## TASK-016A — 2026-09-04

Both required audit commands completed successfully:

- `pnpm audit --audit-level=high`: 0 critical, 0 high, 3 moderate, 0 low.
- `pnpm audit --prod --audit-level=high`: 0 critical, 0 high, 3 moderate, 0 low.

The three moderate findings are transitive through `@unicom/api → exceljs@4.4.0
→ uuid@8.3.2`, including [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq).
ExcelJS is used only for server-side, bounded XLSX report generation. No unsafe
override is applied because forcing an incompatible UUID major version would be a
larger reliability risk. This advisory remains tracked for an upstream-compatible
ExcelJS release; it is non-blocking under the approved high/critical gate.

## TASK-013 — 2026-09-01

`pnpm audit --prod --audit-level=high` passed: no production high or critical vulnerability was reported.

The full production audit reports one moderate, transitive advisory: `exceljs@4.4.0 → uuid@8.3.2`
([GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)). The installed ExcelJS release is
the current published release and declares the `uuid` 8.x dependency. TASK-013 uses ExcelJS only for
server-side, in-memory report generation; it does not pass an attacker-supplied buffer to UUID APIs. The
advisory is recorded for upstream tracking. No unreviewed override is applied because forcing UUID 11 into
ExcelJS's declared 8.x range may create an unsupported runtime combination.
