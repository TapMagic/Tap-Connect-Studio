# Fusion build status — honest incomplete inventory

**Date:** 2026-07-24  
**Branch:** `tapconnect-v1-v2-fusion`  
**HEAD (UX spine verify checkpoint):** see UX spine section below · prior builder parity `5bd84c7`  
**Rule:** Railway untouched. Isolated DB: `tapconnect_fusion_dev`.  
**Platform overall:** **NOT OWNER-READY** (allowed labels only: OWNER-READY | VERIFIED — CREDENTIALS REQUIRED | IMPLEMENTED BUT NOT OWNER-READY | BLOCKED).

## UX spine discoverability checkpoint (independent verify · tip `cc58c06`)

**Classification:** Studio chrome honesty (notifications / mobile secondary / IA aliases / Pulse / workspace) = **IMPLEMENTED BUT NOT OWNER-READY** · **INDEPENDENT VERIFICATION PASSED** for ID-002 / ID-003 / ID-004 / ID-006 / ID-007 / ID-009.  
**Not OWNER ACCEPTED.** **J1 still pending.** Railway untouched.

| Gate | Result |
|------|--------|
| Tip under verify | `cc58c069145afaf57c64c21668fd2dab9ca8a13f` |
| `ia-honesty.test.ts` | **5/5 PASS** (ID-004 / ID-009) |
| Headed `e2e/ux-spine-discoverability.spec.ts` | **4/4 PASS** (ID-002 / ID-003 / ID-006 / ID-007) |
| lint | **0 errors** (4 img warnings) |
| `tsc --noEmit` | PASS |
| `npm test` | **404/404** |

**Still OPEN (not this slice):** ID-001 (“Studio ready”), ID-005 (Create oversell) — J1 blockers per `COST_CONSCIOUS_IMPLEMENTATION_SEQUENCE.md`.

## Builder V1 parity checkpoint (2026-07-24 · tip `5bd84c7`)

**Classification:** Campaign + Card builders = **IMPLEMENTED BUT NOT OWNER-READY** (do **not** claim OWNER-READY).

| Proven locally (headed, isolated DB) | Status |
|--------------------------------------|--------|
| Interaction parity (icon placement, layout, Finish None, Esc/focus exits, WYSIWYG↔public) | PASS — D-015–D-024 **FIXED** in defect log |
| Remove Background (local-mock adapter + panel + provenance/restore) | PASS — `P-builder-remove-background` / `P-builder-exits-bg-remove` |
| Exploratory / dead-controls sweep | PASS — `P-builder-exploratory-controls` + `P-builder-exploratory-audit` |

**OPEN residuals (keep IMPLEMENTED BUT NOT OWNER-READY):** freeform canvas scaffold (`card.builder.freeform`), live stock/logo credentials (Pexels/Unsplash), session undo lost on full refresh, true VoiceOver/NVDA (platform D-001). Live bg-remove vendor = credentials residual (local-mock only).

**Quick gate at checkpoint:** `npm run lint` → **0 errors** (4 img warnings); `tsc --noEmit` PASS; unit button-layout + bg-remove PASS inside `npm test` (**399/399**). Full 75 e2e suite not re-run here — tip headed builder proofs verified at `5bd84c7`.

## Owner walkthrough final local re-gate (2026-07-24)

Linear tip ancestry retains walkthrough streams (baseline `3872bda`) plus builder parity burn-down through `5bd84c7`:

| Stream | Commit |
|--------|--------|
| Admin kill-switches + defect log | `ce8b26e` |
| TapLoop | `73bbd39` |
| Insights | `f0426b8` |
| Builder (owner-gate) | `2e04988` |
| Inbox + Guardian | `9dfa949` |
| Builder interaction / remove-bg / exploratory | → tip `5bd84c7` |

DB `tapconnect_fusion_dev` @ `127.0.0.1:5433`. `PROOF_HEADED=1` · `BASE_URL=http://127.0.0.1:3000`.

| Gate | Result |
|------|--------|
| Prisma validate | PASS |
| Migrate status | PASS — 11 migrations, schema up to date |
| `tsc --noEmit` | PASS (re-confirmed at builder parity checkpoint) |
| `npm run lint` | PASS — **0 errors**, 4 `@next/next/no-img-element` warnings |
| `npm run build` | PASS (prior re-gate) |
| Unit suite (`npm test`) | **399/399** pass (includes button-layout + bg-remove) |
| Integration (unit: `owner-ready-integration.test.ts` **24/24** + headed `e2e/cross-system-integration.spec.ts`) | PASS (prior re-gate) |
| Headed Playwright (`e2e/*.spec.ts`, 19 files) | **75/75** pass verified at prior re-gate; builder tipped proofs re-verified at `5bd84c7` |
| A11y + responsive owner gates | **PASS** (P-a11y-owner-gate + P-responsive-owner-gate) |

**Console / server notes (non-blocking):** Clerk `createRouteMatcher` / middleware→proxy deprecation on Next 16; npm `devdir` env config warning; Playwright `NO_COLOR`/`FORCE_COLOR` warning. No hydration failures, Prisma errors, or DB connection failures observed on the final gate.

**Locally OWNER-READY subsystems:** **none** — every ledger section retains residual blockers (true VoiceOver/NVDA, OS-native zoom, live credentials, or incomplete matrices). Strong local proofs do **not** equal OWNER-READY.

## Gate fixes applied during this re-gate

- `CampaignUpdateInput.updatedById` → `updatedBy: { connect }` (TSC/build blocker from builder stream)
- A11y residuals from stream UIs: TapLoop/Audience `<select>` names; Inbox + Insights scroll regions `tabIndex` + `aria-label`
- Builder headed selector hardened (select-by-role + scrollIntoView)
- Readiness unit assertion updated for cards ledger with proofs + residual blockers
- Builder Format single-mount + icon placement / layout / remove-bg / WYSIWYG public path (D-015–D-024)

## PO headed attestation (streams)

- **Builder:** owner-gate + interaction/remove-bg/exploratory tipped proofs at `5bd84c7` · **IMPLEMENTED BUT NOT OWNER-READY**
- **Insights:** `e2e/insights-drilldown.spec.ts` · **IMPLEMENTED BUT NOT OWNER-READY**
- **TapLoop:** `e2e/taploop-operator.spec.ts` · **IMPLEMENTED BUT NOT OWNER-READY**
- **Inbox + Guardian:** `e2e/inbox-guardian-owner-gate.spec.ts` · mock = **IMPLEMENTED BUT NOT OWNER-READY**; live = **VERIFIED — CREDENTIALS REQUIRED**
- **Admin kill-switch matrix:** `e2e/admin-killswitch-matrix.spec.ts` · local proof; platform still not OWNER-READY
- **A11y + responsive:** SR-oriented + 200% CSS zoom PASS; residual true VO/NVDA + OS-native zoom

## Migrations (isolated `tapconnect_fusion_dev` only)

1. `20260723000000_fusion_spine` … 6. `20260723000005_fusion_taploop`  
7. `20260724000006_tapcanvas_tiktok`  
8. `20260724000007_keyword_brand_pack` — `BrandKit.keywordBrandPack` JSON mirror  
9. `202607240000075_tapcast_omnichannel` — `TapCastChannelVariant` / `TapCastChannelConnection` / `TapCastAuditLog`  
10. `20260724000008_brand_vocabulary` — `BrandVocabularyTerm` / packs / suggestion runs / analytics / trigger bindings  
11. `20260724000009_journey_live_execution` — `JourneyPublishedVersion` / `JourneyExecution` / steps / provider events

## Still open (priority)

1. A11y/responsive residuals: **true VoiceOver/NVDA** + **OS-native Cmd+/Ctrl+ zoom** — **IMPLEMENTED BUT NOT OWNER-READY**
2. Builder residuals (not OWNER-READY): freeform scaffold, live stock credentials, session undo on full refresh, platform VO/NVDA
3. Live productivity OAuth apps (one provider at a time) — **VERIFIED — CREDENTIALS REQUIRED**
4. Live TapCast / messaging / AI credentials — never claim OWNER-READY without them
5. Keywords dedicated analytics UI panel
6. Platform overall remains **IMPLEMENTED BUT NOT OWNER-READY** (D-013)

## Classifications

| Surface | Classification |
|---------|----------------|
| Omnichannel TapCast (registry, variants, mock publish) | **IMPLEMENTED BUT NOT OWNER-READY** |
| Live channel publish / messaging / AI / trends / wallet | **VERIFIED — CREDENTIALS REQUIRED** |
| Snapchat organic | **MOCK ONLY / NO LIVE PUBLISH** |
| Builder / Insights / TapLoop / Inbox mock / Admin kill-switches | **IMPLEMENTED BUT NOT OWNER-READY** |
| TapCanvas / TapFlow local | **IMPLEMENTED BUT NOT OWNER-READY** — live OAuth = VERIFIED — CREDENTIALS REQUIRED |

## Commands

```bash
export DATABASE_URL='postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev'
npm run fusion:db-ready && npm run fusion:seed
npm run dev
PROOF_HEADED=1 BASE_URL=http://127.0.0.1:3000 npx playwright test e2e/*.spec.ts --headed
```

## Confirmation

No push / merge / deploy. Railway untouched. Master directive **not** complete. Platform overall **NOT OWNER-READY**. No secrets committed.
