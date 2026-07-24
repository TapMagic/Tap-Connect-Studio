# Owner-ready completion matrix

**Branch:** `tapconnect-v1-v2-fusion`  
**Updated:** 2026-07-24  
**PO attestation:** Headed Playwright core proofs + **P-a11y-owner-gate** + **P-responsive-owner-gate** on isolated `tapconnect_fusion_dev` (`http://127.0.0.1:3000`). Railway untouched.  
**Rule:** Suite proofs validate **covered workflows only**. Platform is **not** OWNER-READY overall. `a11yPassed` / `responsivePassed` require keyboard + viewport proofs — never axe alone.

## Scoring method

Eight gates per pillar. `OWNER-READY` requires ledger `browserE2ePassed` + `persistencePassed` + **zero blockers**.

| Pillar | % | Stage | Suite proof | Remaining blockers |
|--------|---|-------|-------------|-------------------|
| Public tap / distribution | 78% | FUNCTIONAL + headed a11y/responsive | P-public-seed-tap + P-a11y/responsive-owner-gate | analytics, full gate, VoiceOver residual |
| Campaign group schedule | 75% | FUNCTIONAL + headed | P-campaign-group-schedule | Studio time-travel UI, fallback |
| Home / readiness honesty | 72% | FUNCTIONAL + headed | P-studio-home + a11y gate | decision queue |
| Campaign builder | 60% | FUNCTIONAL | P-16-editor; P-builder-save open | save/publish/assign/format matrix |
| Card builder | 55% | FUNCTIONAL | P-16-card shell | full Pages matrix |
| Leads capture | 70% | FUNCTIONAL + headed | P-03-lead-capture | consent UI, public form matrix |
| TapSave / MyTap | 70% | FUNCTIONAL + headed | P-03-tapsave-keep | prefs/moments, wallet headed |
| Wallet (mock) | 50% | VERIFIED — CREDENTIALS (live) | wire + P-wallet-mock | live certs; Audience list headed |
| TapLoop | 70% | FUNCTIONAL + headed | P-10-taploop | program UI, reverse, enroll UI |
| TapFlow | 85% | FUNCTIONAL + live visitor runtime | P-06 + P-tapcanvas-tapflow-lifecycle + **P-tapflow-live-visitor** | live OAuth provider effects, full Journeys UI |
| Inbox | 55% | FUNCTIONAL | P-09 shell | reply/Guardian/TapCase |
| Insights | 55% | FUNCTIONAL | P-11 + export matrix | drill-down, provenance |
| Platform Admin | 70% | FUNCTIONAL | P-12 + killswitch matrix; P-keywords-killswitch + P-keywords-owner-gate-killswitch; P-tapcanvas-killswitch (ai.keywords + canvas.tapcanvas + journey.tapflow) | expand disable→503→re-enable to remaining kill-switches |
| Controls / responsive / a11y | 78% | IMPLEMENTED BUT NOT OWNER-READY | P-a11y-owner-gate + P-responsive-owner-gate | VoiceOver/NVDA spot-check, 200% zoom manual |
| Productivity & Work Mgmt | 70% | VERIFIED — CREDENTIALS (live) | P-productivity-* | live OAuth apps |
| TapCanvas | 86% | IMPLEMENTED BUT NOT OWNER-READY | P-tapcanvas-* + P-a11y/responsive-owner-gate | VoiceOver residual, live TapCast publish, live OAuth |
| TapCast · TikTok | 60% | VERIFIED — CREDENTIALS REQUIRED (live); mock persisted | P-tiktok-mock-persist | TIKTOK_* OAuth, Direct Post app review + prod approval (`PROVIDER_READINESS.md`) |
| TapCast · other live channels | 55% | VERIFIED — CREDENTIALS REQUIRED (live); mock ladder | P-tapcast-* | Per-channel OAuth/scopes/callback/webhook/review — not local OWNER blockers |
| Brand Vocabulary / AI Keywords | 82% | FUNCTIONAL + headed owner-gate (not OWNER-READY); live AI/trend = VERIFIED — CREDENTIALS REQUIRED | P-keywords-* + P-a11y-owner-gate | live trend + OpenAI enhance, dedicated analytics UI, VoiceOver spot |

**Platform overall:** ~**60–65%** — not 100%. No section shows OWNER-READY until blockers clear.

## Exact sequence (unchanged)

1. Isolated DB healthy + seed  
2. Broader headed matrices (`npm run test:e2e:proofs:headed`)  
3. Clear ledger blockers only with proof  
4. Dev credentials selectively  
5. Staging only when authorized  

See `ROUTE_AND_ACTION_RUNTIME_AUDIT.md`, `DEVELOPMENT_WIRING_PLAN.md`, `BUILD_STATUS.md`.
