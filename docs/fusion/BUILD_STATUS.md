# Fusion build status — honest incomplete inventory

**Date:** 2026-07-23  
**Branch:** `tapconnect-v1-v2-fusion`  
**Integration owner:** continuous fusion agent (this worktree)  
**Rule:** Railway / shared DBs never migration targets. Isolated DB only: `tapconnect_fusion_dev` @ `127.0.0.1:5433`.

## Status vocabulary

DEFINED · CONTRACTED · SCAFFOLDED · WIRED · FUNCTIONAL · INTEGRATED · VERIFIED · OWNER-READY  

Do not call complete unless **OWNER-READY**.

## Infrastructure blocker (this machine)

| Check | Result |
|-------|--------|
| Docker CLI / Docker Desktop | **Unavailable** (`docker` not found; Docker.app missing) |
| Homebrew / local Postgres | **Unavailable** |
| Safety guard on fusion URL | **PASS** (`npm run fusion:db-ready`) |
| Safety guard on Railway URL | **REJECT** (exit 1) |
| Migrate / seed applied | **BLOCKED** until PO-NOW-001 (Docker or approved local Postgres) |

See `docs/fusion/PRODUCT_OWNER_INPUT_QUEUE.md`.

## Scripts ready (run when DB is up)

```bash
npm run fusion:dev-db          # Docker Compose → tapconnect-fusion-dev-pg
# .env.local DATABASE_URL=postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev
npm run fusion:db-ready        # redacted readiness
npm run db:migrate:deploy      # guarded migrate
npm run fusion:seed            # [SEED]-labeled data only
npm run test:fusion            # unit/integration suite
```

## Migrations (apply in order on isolated DB only)

1. `20260723000000_fusion_spine`  
2. `20260723000001_fusion_audience`  
3. `20260723000002_journey_draft`  
4. `20260723000003_tapsave_autopilot_outbox`  
5. `20260723000004_wallet_inbox_comms`  
6. `20260723000005_fusion_taploop`  

## Pillar snapshot (honest)

| Area | Classification |
|------|----------------|
| V1 Builder / Campaigns / Scan / media | OWNER-READY floor (preserve; continuous parity) |
| Durable outbox | FUNCTIONAL |
| TapSave / MyTap | FUNCTIONAL → INTEGRATED pending DB E2E |
| Autopilot proposals + budget stub + kill switch | FUNCTIONAL |
| Wallet mock lifecycle | FUNCTIONAL → VERIFIED BUT REQUIRES CREDENTIALS (live) |
| TapInbox / TapCase / Email mock | FUNCTIONAL → VERIFIED BUT REQUIRES CREDENTIALS (live) |
| Insights Prisma KPIs | FUNCTIONAL |
| TapLoop | FUNCTIONAL pending migrate E2E |
| TapFlow editor + dry-run runtime | FUNCTIONAL (no live visitor executor yet) |
| Platform Admin KPIs | FUNCTIONAL |
| Landing page | EXPLICITLY DEFERRED BY CHARTER |
| Live Stripe / Wallet certs / Meta | BLOCKED on credentials |

## Tests

- `npm run test:fusion` — **113 passing** (unit/integration; not a substitute for browser OWNER-READY proof)

## Docs added this pass

- `PRODUCT_OWNER_INPUT_QUEUE.md`  
- `CREDENTIALS_FINAL_CHECKLIST.md`  
- `A11Y_RUNTIME_CHECKLIST.md`  

## Confirmation

- No push / merge / deploy  
- Railway untouched  
- Master directive **not** complete  

## Next (when Docker available on machine)

1. `fusion:dev-db` → `fusion:db-ready` → `db:migrate:deploy` → `fusion:seed`  
2. Browser E2E every workflow in owner-occupancy § testing list  
3. Fix defects → checkpoints → continue remaining pillars  
