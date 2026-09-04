# Deployment record — Version 1.0

Status: **NOT DEPLOYED**

| Field                            | Recorded value                                |
| -------------------------------- | --------------------------------------------- |
| Proposed release candidate       | `v1.0.0-rc.1` — not created or tagged         |
| Source commit SHA                | Unavailable: repository has no `HEAD` commit  |
| Build artifact / image digest    | Unavailable                                   |
| Deployment environment           | No authorized production environment supplied |
| Database migration               | Not run in production                         |
| Pre-deployment backup identifier | Unavailable                                   |
| Production smoke test            | Not run                                       |
| Rollback rehearsal               | Not run                                       |
| Final release tag                | Not created                                   |

## Guardrail

The local Docker and development services are verification infrastructure only. They are not
recorded as production and cannot satisfy this deployment record. Populate this document only
with the approved production environment, immutable artifact digest, backup identifier, and
operator evidence at the time of a real deployment.
