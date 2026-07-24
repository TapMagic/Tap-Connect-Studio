# Fusion build status — honest incomplete inventory

**Date:** 2026-07-24  
**Branch:** `tapconnect-v1-v2-fusion`  
**Rule:** Railway untouched. Isolated DB: `tapconnect_fusion_dev`.

## PO headed attestation

- **13/13** core fusion proofs passed (Chromium headed, localhost:3000)  
- Ledger updated with suite evidence + **blockers retained** (no platform-wide OWNER-READY)  
- Extended matrix specs: `e2e/fusion-proofs-matrix.spec.ts` (builder save, TapFlow, Admin, Insights, controls, responsive, a11y, wallet mock)
- **Productivity closeout:** `e2e/productivity-workflows.spec.ts` — 18-step mock workflows + Settings UI (live = VERIFIED — CREDENTIALS REQUIRED)
- **Omnichannel TapCast:** unit suite green; headed proofs in `e2e/tapcast-omnichannel.spec.ts` — **IMPLEMENTED BUT NOT OWNER-READY** / live = **VERIFIED — CREDENTIALS REQUIRED**
- **TapCanvas + TikTok persistence:** `e2e/tapcanvas-tiktok.spec.ts` 3/3 headed — Prisma documents/campaigns + TikTok mock funnel. TapCanvas = **IMPLEMENTED BUT NOT OWNER-READY**; TikTok live = **VERIFIED — CREDENTIALS REQUIRED**
- **Keywords & Brand Vocabulary:** unit suite green; headed `e2e/keywords-brand-pack.spec.ts` passed — durable terms/packs; live AI/trends = **VERIFIED — CREDENTIALS REQUIRED** (not OWNER-READY)

## Migrations (isolated `tapconnect_fusion_dev` only)

1. `20260723000000_fusion_spine` … 6. `20260723000005_fusion_taploop`  
7. `20260724000006_tapcanvas_tiktok`  
8. `20260724000007_tapcast_omnichannel` — `TapCastChannelVariant` / `TapCastChannelConnection` / `TapCastAuditLog`  
9. `20260724000008_brand_vocabulary` — `BrandVocabularyTerm` / packs / suggestion runs / analytics / trigger bindings

## Recent wiring

- **Shared AI Keywords & Hashtags (authoritative)** — `lib/fusion/keywords/**`, durable `BrandVocabularyTerm` + named Brand Packs + suggestion history + trigger collision bindings on isolated DB. API `/api/ai/keywords` (alias `/api/keywords`). Contextual panel on Brand Kit, Campaign/Card builders, TapCast/TikTok, Email, TapCanvas, TapFlow, Inbox, Assets, Templates, Autopilot. Local grounded generation without OpenAI; live AI/trend enrichment = **VERIFIED — CREDENTIALS REQUIRED**. Features `brand.vocabulary` + `ai.keywords`. TikTok no longer hard-codes `#TapConnect`/`#WeeklySpecial` defaults.
- **Mainstream Omnichannel TapCast** — channel capability registry (publishing / conversation / community), mock adapters with publish-path ladder, campaign channel variants (native adapt, no blind cross-post), failure isolation, Admin/Settings panel, `/api/tapcast`, TapCanvas `distribution_graph` / `distribution_action`, Prisma persist on isolated DB. TikTok remains first-class at Experiences → TapCast → TikTok.
- **Productivity & Work Management (deepened)** — shared ExternalWorkItem contract + mock discovery/comments/attachments/webhooks/poll/conflict/retry/idempotency/audit/analytics/Slack·Teams/Knowledge/Zapier; `run_closeout` API; Settings panel actions; headed proofs. Live OAuth remains **VERIFIED — CREDENTIALS REQUIRED**.
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
6. Live productivity OAuth apps (one provider at a time)  
7. Live TapCast credentials per channel (TikTok Direct Post, Meta, YouTube, …) — never claim OWNER-READY without them  
8. TapCanvas full Sketch→Build→Operate headed matrix  

## Classifications (TapCast)

| Surface | Classification |
|---------|----------------|
| Omnichannel TapCast (registry, variants, mock publish, canvas hooks) | **IMPLEMENTED BUT NOT OWNER-READY** |
| Live channel publish (all TapCast providers) | **VERIFIED — CREDENTIALS REQUIRED** |
| TikTok first-class mock path | Prisma-persisted mock funnel (P-tiktok-mock-persist); live Direct Post credential-gated |
| TapCanvas (documents + guided campaigns) | **IMPLEMENTED BUT NOT OWNER-READY** (P-tapcanvas-persist / P-tapcanvas-campaigns) |

## Commands

```bash
export DATABASE_URL='postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev'
npm run fusion:db-ready && npm run fusion:seed
npm run dev
npm run test:e2e:proofs:headed
PROOF_HEADED=1 npx playwright test e2e/productivity-workflows.spec.ts --headed
PROOF_HEADED=1 npx playwright test e2e/tapcanvas-tiktok.spec.ts --headed
PROOF_HEADED=1 npx playwright test e2e/tapcast-omnichannel.spec.ts --headed
node --import tsx --test lib/fusion/tapcast/**/__tests__/**/*.test.ts
```

## Confirmation

No push / merge / deploy. Railway untouched. Master directive **not** complete.
