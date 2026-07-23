# Fusion build status — honest incomplete inventory

**Date:** 2026-07-23 (post readiness audit + headed proof wave)  
**Branch:** `tapconnect-v1-v2-fusion`  
**Rule:** Railway untouched. Isolated DB only: `tapconnect_fusion_dev` @ `127.0.0.1:5433`.

## Reconciliation

Migration order confirmed (no collisions):

1. `20260723000000_fusion_spine`  
2. `20260723000001_fusion_audience`  
3. `20260723000002_journey_draft`  
4. `20260723000003_tapsave_autopilot_outbox`  
5. `20260723000004_wallet_inbox_comms`  
6. `20260723000005_fusion_taploop`  

`tsc` clean. Unit tests ~261 pass. Headed Playwright: `npm run test:e2e:proofs:headed` (11/11). **Zero OWNER-READY** — ledger retains blockers.

## Infrastructure

| Item | Status |
|------|--------|
| Docker on agent host | Unavailable — embedded PG `:5433` used; PO: `npm run fusion:dev-db` |
| Safety guard | PASS fusion URL / REJECT Railway |
| Scripts | `fusion:dev-db`, `fusion:db-ready`, `fusion:seed`, `db:migrate:*`, `test:e2e:proofs(:headed)` |
| Proof artifacts | `tmp/fusion-proofs/` (gitignored via `/tmp/`) |
| VERIFICATION_LEDGER | Partial proofs; blockers prevent OWNER-READY |

## Recent wiring (not OWNER-READY)

- Derived readiness badges + inspectable hub detail  
- Campaign blank preview fix + Pages-style text toolbar + undo/redo  
- Email → Inbox → Contact timeline (mock)  
- Feature kill-switch runtime gates (pages + APIs)  
- Commerce → loyalty stub → Insights evidence (mock)  
- Headed proof harness (Playwright)

## Classifications

| Area | Status |
|------|--------|
| Public seed tap + group schedule resolve | FUNCTIONAL + headed proof (blockers remain) |
| Lead API → Leads list | FUNCTIONAL + headed proof (Keep/MyTap matrix open) |
| Builder/Campaigns full matrix | FUNCTIONAL — FINAL VERIFICATION REQUIRED |
| TapFlow / Inbox / Insights / Admin shells | FUNCTIONAL — deeper matrices open |
| Wallet live | VERIFIED — CREDENTIALS REQUIRED |
| Email live Resend | VERIFIED — CREDENTIALS REQUIRED |
| Landing | EXPLICITLY DEFERRED |

## Docs

`OWNER_READY_COMPLETION_MATRIX.md`, `ROUTE_AND_ACTION_RUNTIME_AUDIT.md`, `RAILWAY_EXISTING_SERVICES_INVENTORY.md`, `DEVELOPMENT_WIRING_PLAN.md`, `PRODUCT_OWNER_REQUIREMENTS.md`, `ISOLATED_DB_PROOF_QUEUE.md`

## Confirmation

No push / merge / deploy. Railway untouched. Master directive **not** complete.
