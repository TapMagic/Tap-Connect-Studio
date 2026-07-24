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
- **TapCanvas + TikTok persistence:** `e2e/tapcanvas-tiktok.spec.ts` — persist/campaigns/TikTok + reverse-repair / keyword-bind / version-restore / mode-matrix / comments-approvals / tapflow-bind / a11y-responsive. TapCanvas = **IMPLEMENTED BUT NOT OWNER-READY**; TikTok live = **VERIFIED — CREDENTIALS REQUIRED**
- **Keywords & Brand Vocabulary:** unit suite green; headed `e2e/keywords-brand-pack.spec.ts` + `e2e/keywords-surfaces.spec.ts` + **owner-gate** `e2e/keywords-owner-gate.spec.ts` (pipeline + kill-switch). Durable terms/packs/edit/lock/archive/locale/scopes; live AI/trends = **VERIFIED — CREDENTIALS REQUIRED** (not OWNER-READY)

## Migrations (isolated `tapconnect_fusion_dev` only)

1. `20260723000000_fusion_spine` … 6. `20260723000005_fusion_taploop`  
7. `20260724000006_tapcanvas_tiktok`  
8. `20260724000007_keyword_brand_pack` — `BrandKit.keywordBrandPack` JSON mirror  
9. `202607240000075_tapcast_omnichannel` — `TapCastChannelVariant` / `TapCastChannelConnection` / `TapCastAuditLog`  
10. `20260724000008_brand_vocabulary` — `BrandVocabularyTerm` / packs / suggestion runs / analytics / trigger bindings

## Reconciliation (2026-07-24 closeout)

- Linear ancestry: Keywords C `9d1a6d8` → Canvas A+B `66ff9f6` (HEAD contains both; no divergent merge required)
- Shell: `tapcanvas-keywords-mount` + TapFlow validate/publish/activate/execute/pause/resume/analytics retained
- Kill-switches unified: `ai.keywords` (API + canvas `bind_keyword_trigger`), `journey.tapflow` (activate), `canvas.tapcanvas` (promote) — proof `P-tapcanvas-killswitch`
- Migration timestamps non-colliding; `tapconnect_fusion_dev` schema up to date
- Channel ID map: `lib/fusion/channels/canonical.ts` (`gbp`↔`google_business`, `instagram_direct`↔`instagram_dm`)
- Omnichannel adapt + hub no longer invent `#TapConnect` / `#TapTheMagic` / `#FYP` — hashtags only from source/Brand Vocabulary
- Vocabulary service selects Prisma when isolated DB is configured (JSON remains write-through mirror only)

## Recent wiring

- **Three-workstream closeout (A+B+C)** — TapCanvas promotion + TapFlow execution + Brand Vocabulary owner gates reconciled on one tip. Shared kill-switch proof covers all three feature ids. Classifications remain **IMPLEMENTED BUT NOT OWNER-READY** / **FUNCTIONAL — FINAL VERIFICATION REQUIRED** (never claim OWNER-READY while ledger blockers remain).
- **TapCanvas + TapFlow owner gates (A+B)** — Persisted promote writers (Card/Campaign/Group/loyalty/Tap Point/TapFlow/EWI/deployment/TapCast variants); planning promote never auto-executes. TapFlow bridge: validate/configure/simulate/publish/activate/execute/recover/pause/resume/analytics/rollback on shared JourneyDraft engine. Kill-switches: `canvas.tapcanvas` + `journey.tapflow` (+ shared `ai.keywords` on bind). Headed proofs in `e2e/tapcanvas-tapflow-owner-gates.spec.ts`.
- **TapCanvas deepen (comments/approvals/tapflow/a11y)** — GET returns `comments` + `approvals`; `create_approval` / `resolve_approval` / `create_tapflow_from_canvas` (JourneyDraft DRAFT bind); shell comments + approvals panels + TapFlow button; keyboard 1–4 modes + Esc; headed mode/comments/tapflow/a11y-responsive proofs. Still **IMPLEMENTED BUT NOT OWNER-READY**.
- **TapCanvas deepen (operate/repair/proofs)** — `open_from_object` reverse viz for Open-in-TapCanvas; repair `proposal_resolve` hydrates + flushes document/versions/proposals/**audit**; `restore_version` / `compare_versions`; `bind_keyword_trigger` via Brand Vocabulary + `tapcanvas` trigger binding (gated by `ai.keywords`); shell versions + keyword bind UI. Still **IMPLEMENTED BUT NOT OWNER-READY**.
- **Shared AI Keywords & Hashtags (authoritative)** — `lib/fusion/keywords/**`, durable `BrandVocabularyTerm` + named Brand Packs + suggestion history + trigger collision bindings on isolated DB. API `/api/ai/keywords` (alias `/api/keywords`). Contextual panel on Brand Kit, Campaign/Card builders, TapCast/TikTok, Email, TapCanvas, TapFlow, Inbox, Assets, Templates, Autopilot. Owner-gate deepen: edit/lock/archive/restore/locale, campaign+location trigger scope, channel-specific suggest (TT/IG/FB/YT), Admin `ai.keywords` kill-switch UI+API+audit, readiness badge. Local grounded generation without OpenAI; live AI/trend enrichment = **VERIFIED — CREDENTIALS REQUIRED**. Features `brand.vocabulary` + `ai.keywords`. TikTok no longer hard-codes `#TapConnect`/`#WeeklySpecial` defaults.
- **Mainstream Omnichannel TapCast** — channel capability registry (publishing / conversation / community), mock adapters with publish-path ladder, campaign channel variants (native adapt, no blind cross-post), failure isolation, Admin/Settings panel, `/api/tapcast`, TapCanvas `distribution_graph` / `distribution_action`, Prisma persist on isolated DB. **IA:** TikTok is first-class **inside** TapCast (Experiences → TapCast → TikTok / channel subnav), not a permanent Experiences sibling. Legacy `/dashboard/experiences/tiktok` redirects into TapCast.
- **Productivity & Work Management (deepened)** — shared ExternalWorkItem contract + mock discovery/comments/attachments/webhooks/poll/conflict/retry/idempotency/audit/analytics/Slack·Teams/Knowledge/Zapier; `run_closeout` API; Settings panel actions; headed proofs. Live OAuth remains **VERIFIED — CREDENTIALS REQUIRED**.
- Keep → MyTap → mock Apple Wallet (`/api/mytap/wallet`)  
- Campaign save uses `blocksRef` (stale-closure fix) + `data-testid` for proofs  
- Feature kill-switch / Email→Inbox / Commerce→Insights (prior)  
- Derived readiness badges (prior)

## Still open (priority)

1. Builder save/publish/assign + formatting headed persistence  
2. TapFlow live visitor executor + provider effects (canvas lifecycle dry-run proved)  
3. Expand remaining Admin kill-switches beyond Keywords/TapCanvas/TapFlow triad  
4. Insights drill-down + provenance  
5. A11y/responsive completion (full SR/axe)  
6. Live productivity OAuth apps (one provider at a time)  
7. Live TapCast credentials per channel (TikTok Direct Post, Meta, YouTube, …) — never claim OWNER-READY without them  
8. TapCanvas OWNER-READY gate (SR/axe + live executor + zero ledger blockers)  
9. Keywords live AI/trend providers + dedicated analytics UI panel
## Classifications (TapCanvas / TapCast)

| Surface | Classification |
|---------|----------------|
| Omnichannel TapCast (registry, variants, mock publish, canvas hooks) | **IMPLEMENTED BUT NOT OWNER-READY** |
| Live channel publish (all TapCast providers) | **VERIFIED — CREDENTIALS REQUIRED** |
| TikTok first-class mock path | Prisma-persisted mock funnel (P-tiktok-mock-persist); live Direct Post credential-gated |
| TapCanvas (documents + guided campaigns + repair/versions/keywords/comments/tapflow lifecycle) | **IMPLEMENTED BUT NOT OWNER-READY** (P-tapcanvas-* + P-tapcanvas-weekly-matrix / conversational-funnel / tapflow-lifecycle / reverse-repair-deep / killswitch) |
| TapFlow from TapCanvas (shared JourneyDraft engine) | **IMPLEMENTED BUT NOT OWNER-READY** — publish/activate gated by `journey.tapflow`; dry-run execute/recover/analytics proved; live visitor executor open |

## Local TapCanvas blockers (precise)

- Full screen-reader / VoiceOver sign-off (`P-tapcanvas-a11y-responsive` is basic keyboard/labels/viewports only)
- Live visitor TapFlow executor + provider effects (email/SMS/loyalty live) from canvas
- Live TapCast/TikTok credentials for variant publish
- Keywords surface a11y headed pass + dedicated analytics UI
- Commerce live path (`commerce.tapcommerce` + Stripe) for promoted commerce actions

## Commands

```bash
export DATABASE_URL='postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev'
npm run fusion:db-ready && npm run fusion:seed
npm run dev
npm run test:e2e:proofs:headed
PROOF_HEADED=1 npx playwright test e2e/productivity-workflows.spec.ts --headed
PROOF_HEADED=1 npx playwright test e2e/tapcanvas-tiktok.spec.ts --headed
PROOF_HEADED=1 npx playwright test e2e/tapcanvas-tapflow-owner-gates.spec.ts --headed
PROOF_HEADED=1 npx playwright test e2e/keywords-owner-gate.spec.ts --headed
PROOF_HEADED=1 npx playwright test e2e/tapcast-omnichannel.spec.ts --headed
node --import tsx --test lib/fusion/canvas/**/__tests__/**/*.test.ts
node --import tsx --test lib/fusion/keywords/**/__tests__/**/*.test.ts
```

## Confirmation

No push / merge / deploy. Railway untouched. Master directive **not** complete. TapCanvas, TapFlow-from-canvas, and Brand Vocabulary remain **not OWNER-READY**.
