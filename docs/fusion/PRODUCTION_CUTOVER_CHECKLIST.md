# Production cutover checklist

**Production Studio:** `https://studio.tapthemagic.com`  
**Authorization gate:** Explicit product-owner authorization required before any Railway change, DNS change, production migration, or deploy.  
**Local closeout (2026-07-24):** Quality gates green on `tapconnect_fusion_dev` — platform still **NOT OWNER-READY**. Production cutover remains **BLOCKED** until §B staging rehearsal + PO authorization. Railway **untouched** this session.

**Hard rules**

- Do not push, deploy, change DNS, migrate production, or modify Railway until authorized.
- Never print secret values in logs, docs, browser output, or chat.
- Never point local Fusion or staging at the Railway **production** database for experiments.
- Prefer inheriting existing valid Railway credentials — do not recreate provider apps unnecessarily.

## Local → staging handoff (exact next)

Local owner-ready quality gates are complete for mock/runtime proofs. Before any staging deploy:

1. Provision staging host + Clerk + **separate** Postgres (not prod)
2. Apply Prisma migrations to staging only; smoke `/api/health`
3. Set staging `NEXT_PUBLIC_APP_URL` + webhook/OAuth callback URLs
4. Optionally supply **one** sandbox provider credential set — classify live as **VERIFIED — CREDENTIALS REQUIRED** until probe green
5. Manual VoiceOver/NVDA + 200% zoom residuals (local or staging)
6. Only then consider production §C after written PO authorization

## A. Pre-flight (read-only)

- [ ] Railway CLI / dashboard access confirmed (read-only inventory)
- [ ] Names-only variable export attached to `RAILWAY_PRODUCTION_INHERITANCE_MAP.md` §8
- [ ] Inheritance map reviewed: COMPATIBLE / ALIAS / PROD_ONLY / STAGING_SEPARATE / MISSING
- [ ] Domain map reviewed: `DOMAIN_AND_CALLBACK_MAP.md`
- [ ] `railway.toml` start command reviewed — fusion must **not** run destructive `db push` against unbacked-up prod without rehearsal
- [ ] Feature Registry kill-switches understood (`/admin/platform`)

## B. Staging rehearsal (required before production)

Isolated staging Railway environment + **separate staging database** + sandbox/test credentials where required.

- [ ] Staging `DATABASE_URL` ≠ production
- [ ] Staging `NEXT_PUBLIC_APP_URL` = staging host
- [ ] Apply Prisma migrations to **staging only**; record duration / issues
- [ ] Env validation (names present via readiness probes — no value dumps)
- [ ] Alias coverage report (`listAliasCoverage`) — missing canonicals filled by aliases or set explicitly
- [ ] Authentication test (Clerk sign-in / sign-up / continue)
- [ ] Public Card resolution test
- [ ] Tap Point `/t/{code}` resolution test
- [ ] Media/storage upload + public URL test (R2 / UploadThing)
- [ ] Email send test (Resend sandbox or staging from-address)
- [ ] Provider readiness probes for each enabled feature
- [ ] Smoke: dashboard load, Brand Kit, Campaign save, TapCast mock publish, Keywords suggest
- [ ] Wallet mock / staging path (live certs optional)
- [ ] Monitoring / Sentry (if used) receiving staging events
- [ ] Rollback drill documented (redeploy previous image; restore DB from staging backup)

## C. Production cutover (authorized only)

### C1. Authorization

- [ ] Written PO authorization recorded (who / when / scope)
- [ ] Maintenance window communicated if needed

### C2. Database

- [ ] **Backup** production Postgres (Railway snapshot / logical dump)
- [ ] Backup verified restorable
- [ ] Migration **rehearsal** already passed on staging with same migration set
- [ ] Production migration plan reviewed (forward-only; no experimental migrations)
- [ ] Execute production migrations only after backup + authorization
- [ ] Post-migration row counts / critical table smoke queries (no PII dump)

### C3. Environment validation

- [ ] `NEXT_PUBLIC_APP_URL=https://studio.tapthemagic.com`
- [ ] Clerk keys inherited (not recreated)
- [ ] R2 / UploadThing / Resend / OpenAI / Stripe / Meta / social / productivity: present per inheritance map
- [ ] Aliases temporary; canonical names preferred when renaming inside Railway (same secret values)
- [ ] No local-only vars (`FUSION_ALLOW_REMOTE_DEV_DB`, seed IDs) on production

### C4. Provider readiness (enable features only after probe green)

For each provider to enable (authoritative detail: `PROVIDER_READINESS.md`):

- [ ] Platform developer application created (sandbox + prod plan)
- [ ] Customer OAuth / connection path (or app-password / API key as applicable)
- [ ] Scopes least-privilege granted
- [ ] Callback URL matches Studio domain (`DOMAIN_AND_CALLBACK_MAP.md`)
- [ ] Webhook URL + signature verify (where applicable)
- [ ] Provider App Review complete (when required — e.g. TikTok Direct Post, Meta messaging/publish)
- [ ] Business verification complete (when required — Meta / A2P / etc.)
- [ ] Production approval / live mode / Advanced Access
- [ ] Readiness probe: env names present
- [ ] Live or certified sandbox call succeeds (mock success ≠ live OWNER-READY)
- [ ] Feature Registry enable with reason
- [ ] Kill-switch known
- [ ] Classification remains **VERIFIED — CREDENTIALS REQUIRED** until the above pass

Order suggestion: Auth → Media → Email → Billing (if live) → Messaging → Wallet → TapCast channels (one at a time) → Productivity → Autopilot / Keywords AI.

### C5. Functional smoke (production)

- [ ] `/api/health`
- [ ] Clerk authentication
- [ ] Dashboard load
- [ ] Public Card URL
- [ ] Tap Point resolution
- [ ] Media upload + public fetch
- [ ] Email (safe internal recipient)
- [ ] One mock TapCast path (or certified live channel)
- [ ] Keywords Brand Pack load
- [ ] Monitoring alerts quiet / expected

### C6. Rollback plan

| Trigger | Action |
|---------|--------|
| Auth broken | Revert deploy; confirm Clerk URLs; kill-switch new features |
| DB migration failure | Stop; restore from backup; do not continue forward migrations |
| Provider outage | Kill-switch feature; keep Studio online |
| Bad URLs / domain | Ensure `NEXT_PUBLIC_APP_URL` restored to `https://studio.tapthemagic.com` |

- [ ] Previous deploy image identified
- [ ] DB restore owner + steps documented
- [ ] DNS unchanged unless authorized (prefer app-level URL config)

### C7. Monitoring & handoff

- [ ] Healthcheck green on Railway
- [ ] Error tracking (Sentry if configured)
- [ ] PO sign-off recorded
- [ ] Update `BUILD_STATUS` / readiness ledger with cutover date and remaining VERIFIED — CREDENTIALS REQUIRED items

## D. Explicit non-goals for this document

- Recreating working V1 provider apps “from scratch”
- Using production DB for local Fusion development
- Printing or committing secrets
- Unattended production deploy from this agent session

## Related

- `docs/fusion/RAILWAY_PRODUCTION_INHERITANCE_MAP.md`
- `docs/fusion/DOMAIN_AND_CALLBACK_MAP.md`
- `docs/fusion/PROVIDER_READINESS.md`
- `docs/fusion/RAILWAY_EXISTING_SERVICES_INVENTORY.md`
