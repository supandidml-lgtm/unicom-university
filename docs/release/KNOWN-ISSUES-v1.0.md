# Known issues and release blockers — Version 1.0

## Release blockers

| Severity         | Issue                                                                                              | Status | Owner / action                                              |
| ---------------- | -------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------- |
| Release-blocking | No production topology, credentials/secrets injection, or deployment operator has been authorized. | Open   | Platform/operations owner must provide the approved target. |
| Release-blocking | Stakeholder UAT and go-live approval have not been recorded.                                       | Open   | Business owner must complete and sign UAT.                  |

## Non-blocking technical advisories

The latest dependency audit found 0 critical and 0 high findings, with 3 moderate advisories
recorded in `docs/security/DEPENDENCY-AUDIT.md`. No dependency was changed solely to suppress
an advisory. Reassess these advisories before a production release if their dependency graph
or upstream fixes change.

## Defect statement

No P0 or P1 product defect was identified by the latest automated regression, end-to-end,
build, and local infrastructure evidence. This is not a substitute for stakeholder UAT.
