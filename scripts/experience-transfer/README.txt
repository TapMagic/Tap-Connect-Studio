TapConnect controlled Experience transfer

Operator preparation, not a public import endpoint. No command publishes content.
Keep every package outside Git; bundle.json contains private content and credential
hashes. Use mode 0700 for its directory and protect database/R2 environment secrets.

1. Export from a restored LOCAL checkpoint only:
   node --import tsx scripts/experience-transfer/cli.ts export \
     --experience SOURCE_EXPERIENCE_ID --package PRIVATE_PACKAGE_DIRECTORY
   DATABASE_URL and canonical media storage must point at that local recovery copy.

2. Select an approved, dedicated target workspace in the existing application.
   It must have an active OWNER membership and no existing Experience/media data.
   Existing customer workspaces cannot be overwritten by this tool. No tenant,
   membership, entitlement, schema, user or billing configuration is auto-created.
   Verify the owner and Curated family entitlements through existing authorities.

3. With securely supplied TARGET DATABASE_URL and the EXISTING R2 configuration:
   node --import tsx scripts/experience-transfer/cli.ts plan \
     --package PRIVATE_PACKAGE_DIRECTORY --tenant APPROVED_TARGET_BUSINESS_ID \
     --actor APPROVED_OWNER_USER_ID
   This is a read-only database transaction. It checks owner authorization,
   entitlements, required schema columns, identifiers, slug and credential hashes.
   Review target-plan.json, the exact candidate commit, and its planHash.
   Validate the running production SHA separately before approving execution.

4. AFTER separate Product Owner production approval only:
   Repeat the same command with mode apply and --execute --approved-plan PLAN_HASH.
   This recomputes the plan, refuses drift, performs insert-only database writes,
   uses conditional no-overwrite object writes, and records an audit and receipt.
   Preserve import-receipt.json and pending-upload-ledger.json outside Git.
   Failed/unknown remote writes require ledger review; never purge a bucket.

5. Inspect the imported document while UNPUBLISHED and destination access OFF.
   Verify all pages, actions, shared materials, signed Preview and mobile layouts.
   Publish via the existing Studio workflow and explicitly enable destination
   access only after publication approval. Display/download the existing permanent
   QR from Studio. Use the owned production domain, never a local-test address.
   Source history is retained; republishing uses canonical immutable snapshots.

6. Rollback before any subsequent editing/publication:
   Run mode rollback with the same package/tenant/actor and explicit --execute
   --approved-plan PLAN_HASH. It refuses changed documents, used/changed credentials,
   new history or reused media; deletes only unchanged imported rows and verified
   unused objects. It does not remove the tenant, owner, audit trail or any customer.
   After real authoring/publication: use existing Unpublish/Access Off to isolate
   the imported Experience, retain its data, and obtain a reviewed recovery plan.
   Never restore a full production dump over intervening customer writes.

Application rollback: use Railway's prior successful immutable deployment and its
existing environment variables. Record that deployment ID/SHA before execution.
Keep database auto-migration disabled (existing railway.toml starts npm start only).
A pre-execution production database backup is mandatory; do not run db push/reset.
No schema change is included. Any catalog mismatch stops execution for approval.

Local rehearsal only: --local-test with --media-origin local-fixture requires a
loopback DATABASE_URL and CREATIVE_PROVIDER_MODE=fixture; it cannot target production.
Temporary signed previews remain expiring sessions; the printed credential is the
persistent published Experience authority, independent of those sessions.
