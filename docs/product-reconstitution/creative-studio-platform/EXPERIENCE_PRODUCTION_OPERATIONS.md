# Experience production operations

This runbook covers the durable Experience Library, published revisions,
stable destinations, and access credentials. It does not replace Railway's
database or incident-response documentation.

## Release and backup gate

1. Identify the Railway project, production environment, web service, and its
   attached PostgreSQL service. Verify the web service's `DATABASE_URL`
   reference points to that exact PostgreSQL service without printing its value.
2. Verify `railway.toml` starts the web service with `npm start`. Migrations are
   never part of normal web startup.
3. In Railway, create a PostgreSQL backup/snapshot. If plan-level snapshots are
   unavailable, take a custom-format logical backup with the same major-version
   `pg_dump` client to approved private storage. Restrict it to mode `0600` and
   use encryption at rest according to the host backup policy. Record timestamp,
   database service, size, checksum, and restore owner.
4. Verify the backup is visible and restorable before continuing.
5. Review pending SQL. Reject any `DROP`, truncation, destructive recreation,
   `prisma db push`, reset, or `--accept-data-loss` operation.
6. Run `npx prisma migrate status`. If the production database predates the
   Prisma ledger and reports every migration as pending even though the V1 tables
   exist, restore the backup into an isolated PostgreSQL instance and rehearse
   this exact baseline sequence first:
   - `npx prisma db execute --file prisma/migrations/20260722000000_v1_media_baseline_reconciliation/migration.sql`
   - `npx prisma migrate resolve --applied 20260722000000_v1_media_baseline_reconciliation`
   - `npx prisma migrate deploy`
   - `npx prisma migrate status`
   Require unchanged critical row counts and a zero-difference `prisma migrate
   diff` before repeating the same explicit sequence against production. Never
   mark later migrations applied without executing them.
7. For a database with an established ledger, run `npx prisma migrate deploy`
   as the explicit one-off release operation using the production service
   environment.
8. Run `EXPERIENCE_REGISTRATION_BUSINESS_SLUG=<approved-workspace> node --import tsx scripts/register-love-and-theft-experience.ts` once to register the accepted Love & Theft revision in durable publication authority.
9. Re-run migration status, `/api/health`, authenticated Library access, and the
   public Love & Theft URL. Compare critical row counts captured before release.

## Recovery

- **Bad application deploy:** redeploy the previously identified Railway image
  or commit. Do not roll schema backward automatically.
- **Bad schema migration or data damage:** stop writes, restore the verified
  PostgreSQL snapshot/logical backup to a replacement service, validate it, and
  repoint only through the approved Railway recovery procedure.
- **Bad published content:** open the Experience's revision history and select
  the last known-good immutable revision. Rollback changes the public pointer;
  it does not rewrite the Draft.
- **Archived Experience:** open Library → Archived and choose Restore. Archive
  is non-destructive.
- **Leaked QR credential:** open the Experience's QR panel and rotate with
  “Revoke all previous active QR credentials.” The stable Experience and public
  destination remain unchanged.
- **Temporary public shutdown:** use Access Off. This returns the governed
  dormant response while preserving Draft, published history, destination, and
  credentials.

## Post-release evidence

Record the deployed commit, Railway deployment ID/status, migration status,
backup identifier/timestamp (never its secret URL), healthcheck result, and the
operator who performed publication/access/credential acceptance actions. Those
actions are inspectable in the existing Platform Audit surface.
