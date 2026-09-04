param(
  [ValidatePattern('^[a-zA-Z0-9_]+$')]
  [string]$SourceDatabase = 'unicom_test'
)

$ErrorActionPreference = 'Stop'
$restoreDatabase = "unicom_task017_restore_$([guid]::NewGuid().ToString('N'))"
$backupFile = "/tmp/$restoreDatabase.dump"

function Invoke-Postgres([string]$command) {
  & docker compose exec -T postgres sh -lc $command
  if ($LASTEXITCODE -ne 0) { throw "PostgreSQL command failed: $command" }
}

try {
  Invoke-Postgres "pg_dump -Fc -U `"`$POSTGRES_USER`" -d '$SourceDatabase' -f '$backupFile'"
  Invoke-Postgres "createdb -U `"`$POSTGRES_USER`" '$restoreDatabase'"
  Invoke-Postgres "pg_restore -U `"`$POSTGRES_USER`" --exit-on-error -d '$restoreDatabase' '$backupFile'"

  $migrationCount = & docker compose exec -T postgres sh -lc "psql -U `"`$POSTGRES_USER`" -d '$restoreDatabase' -Atc 'SELECT count(*) FROM _prisma_migrations;'"
  if ($LASTEXITCODE -ne 0 -or [int]$migrationCount -lt 1) {
    throw 'Restored database does not contain the Prisma migration ledger.'
  }

  $verificationSql = 'SELECT (SELECT count(*) FROM "User"), (SELECT count(*) FROM "Brand"), (SELECT count(*) FROM "TrainingEnrollment"), (SELECT count(*) FROM "LearningMaterialProgress"), (SELECT count(*) FROM "ExamAttempt"), (SELECT count(*) FROM "TrainingCertificate");'
  $escapedVerificationSql = $verificationSql.Replace('"', '\"')
  $verificationCommand = "psql -U `"`$POSTGRES_USER`" -d '$restoreDatabase' -Atc `"$escapedVerificationSql`""
  Invoke-Postgres $verificationCommand

  Write-Output "TASK-017 isolated restore PASS"
  Write-Output "source_database=$SourceDatabase"
  Write-Output "restore_database=$restoreDatabase"
  Write-Output "migration_rows=$migrationCount"
  Write-Output 'domain_row_count_order=user|brand|enrollment|progress|exam_attempt|certificate'
} finally {
  & docker compose exec -T postgres sh -lc "dropdb -U `"`$POSTGRES_USER`" --if-exists '$restoreDatabase'; rm -f '$backupFile'"
  if ($LASTEXITCODE -ne 0) { throw 'Temporary restore database cleanup failed.' }
  Write-Output 'temporary_restore_database_removed=true'
}
