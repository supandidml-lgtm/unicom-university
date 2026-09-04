# Backup and restore

## Baseline policy

PostgreSQL is the transactional source of truth. Production must create an encrypted,
access-restricted daily logical or physical backup and retain it according to an approved
business/legal schedule. Managed PostgreSQL point-in-time recovery is recommended. The
initial planning target is RPO no greater than 24 hours where only daily backups are
available; RTO is the measured time for the documented restore, validation, and service
recovery procedure, not an SLA.

Before any migration or release, the operator records the most recent successful backup
identifier and verifies that a restore procedure has been exercised. Use `prisma migrate
deploy` for production migration; never run `migrate dev` or reset a production database.
Prisma has no safe automatic down migration: prefer expand/deploy/backfill/contract,
application rollback while schemas are compatible, a forward fix, or restore when a
destructive migration makes that necessary.

## Isolated restore verification

The repository includes `scripts/verify-backup-restore.ps1`. It accepts only an
alphanumeric/underscore source database name, creates a custom-format dump inside the
local PostgreSQL container, restores it into a newly generated `unicom_task017_restore_*`
database, checks the Prisma migration ledger and core domain tables/row counts, then drops
the temporary database and dump in `finally`.

Run it only against non-production data:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-backup-restore.ps1 -SourceDatabase unicom_test
```

TASK-017 evidence on 2026-09-04: PASS. The isolated restore contained 18 migration-ledger
rows and the User, Brand, TrainingEnrollment, LearningMaterialProgress, ExamAttempt, and
TrainingCertificate tables were queryable. The test-compatible source contained row counts
`0|1|0|0|0|0`; that is recorded transparently rather than treated as a production data
sample. The generated restore database and dump were removed after the check.

## Production restore sequence

1. Declare the incident and freeze migration/deployment activity.
2. Provision a separate target database; never restore over an unverified live database.
3. Fetch the approved encrypted backup using an operator account with least privilege.
4. Restore database data, validate migration ledger/schema and representative invariant
   queries, then restore application access only after approval.
5. Restore private objects after their database metadata is available; reconcile object keys
   against `FileAsset` SHA-256 metadata before serving file endpoints.
6. Rotate compromised credentials when applicable, deploy the compatible application
   version, wait for `/health/ready`, and document the incident outcome.

Local filesystem storage is development/single-host only. Production must use private,
durable object storage with versioning/backups, encryption, restricted backup access, and
a tested restoration path. Never automatically delete unmatched production objects: report
missing-object and orphan candidates for review first.
