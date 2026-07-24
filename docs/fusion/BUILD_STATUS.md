# Fusion build status — honest incomplete inventory

**Date:** 2026-07-24  
**Branch:** `tapconnect-v1-v2-fusion`  
**Rule:** Railway untouched. Isolated DB: `tapconnect_fusion_dev`.

## PO headed attestation

- **13/13** core fusion proofs passed (Chromium headed, localhost:3000)  
- Ledger updated with suite evidence + **blockers retained** (no platform-wide OWNER-READY)  
- Extended matrix specs: `e2e/fusion-proofs-matrix.spec.ts` (builder save, TapFlow, Admin, Insights, controls, responsive, a11y, wallet mock)

## Migrations (unchanged, valid)

1. `20260723000000_fusion_spine` … 6. `20260723000005_fusion_taploop`

## Recent wiring

- Keep → MyTap → mock Apple Wallet (`/api/mytap/wallet`)  
- Campaign save uses `blocksRef` (stale-closure fix) + `data-testid` for proofs  
- Feature kill-switch / Email→Inbox / Commerce→Insights (prior)  
- Derived readiness badges (prior)

## Still open (priority)

1. Builder save/publish/assign + formatting headed persistence  
2. TapFlow full lifecycle UI  
3. Admin disable → runtime 503 → re-enable headed  
4. Insights drill-down + provenance  
5. A11y/responsive completion  
6. Live credentials only when mock workflows done  

## Commands

```bash
export DATABASE_URL='postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev'
npm run fusion:db-ready && npm run fusion:seed
npm run dev
npm run test:e2e:proofs:headed
```

## Confirmation

No push / merge / deploy. Railway untouched. Master directive **not** complete.
