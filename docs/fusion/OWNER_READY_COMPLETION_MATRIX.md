# Owner-ready completion matrix

**Branch:** `tapconnect-v1-v2-fusion`  
**Updated:** 2026-07-24  
**PO attestation:** Headed Playwright **13/13 passed** on isolated `tapconnect_fusion_dev` (`http://localhost:3000`). Railway untouched.  
**Rule:** Those 13 proofs validate **suite-covered workflows only**. Platform is **not** OWNER-READY overall. `VERIFICATION_LEDGER` retains blockers on every section.

## Scoring method

Eight gates per pillar. `OWNER-READY` requires ledger `browserE2ePassed` + `persistencePassed` + **zero blockers**.

| Pillar | % | Stage | Suite proof | Remaining blockers |
|--------|---|-------|-------------|-------------------|
| Public tap / distribution | 70% | FUNCTIONAL + headed | P-public-seed-tap | a11y, responsive, analytics, full gate |
| Campaign group schedule | 75% | FUNCTIONAL + headed | P-campaign-group-schedule | Studio time-travel UI, fallback |
| Home / readiness honesty | 65% | FUNCTIONAL + headed | P-studio-home | decision queue, a11y |
| Campaign builder | 60% | FUNCTIONAL | P-16-editor; P-builder-save open | save/publish/assign/format matrix |
| Card builder | 55% | FUNCTIONAL | P-16-card shell | full Pages matrix |
| Leads capture | 70% | FUNCTIONAL + headed | P-03-lead-capture | consent UI, public form matrix |
| TapSave / MyTap | 70% | FUNCTIONAL + headed | P-03-tapsave-keep | prefs/moments, wallet headed |
| Wallet (mock) | 50% | VERIFIED — CREDENTIALS (live) | wire + P-wallet-mock | live certs; Audience list headed |
| TapLoop | 70% | FUNCTIONAL + headed | P-10-taploop | program UI, reverse, enroll UI |
| TapFlow | 70% | FUNCTIONAL + canvas lifecycle | P-06 + P-tapcanvas-tapflow-lifecycle | live visitor executor, provider effects, full Journeys UI |
| Inbox | 55% | FUNCTIONAL | P-09 shell | reply/Guardian/TapCase |
| Insights | 55% | FUNCTIONAL | P-11 + export matrix | drill-down, provenance |
| Platform Admin | 70% | FUNCTIONAL | P-12 + killswitch matrix; P-keywords-killswitch + P-keywords-owner-gate-killswitch; P-tapcanvas-killswitch (ai.keywords + canvas.tapcanvas + journey.tapflow) | expand disable→503→re-enable to remaining kill-switches |
| Controls / responsive / a11y | 40% | DEVELOPMENT | P-controls, P-responsive, P-a11y | public `<main>`, full axe |
| Productivity & Work Mgmt | 70% | VERIFIED — CREDENTIALS (live) | P-productivity-* | live OAuth apps |
| TapCanvas | 82% | IMPLEMENTED BUT NOT OWNER-READY | P-tapcanvas-* + weekly-matrix / conversational-funnel / tapflow-lifecycle / reverse-repair-deep / killswitch | full SR/axe, live TapCast publish, live visitor executor, owner-gate zero blockers |
| TapCast · TikTok | 60% | VERIFIED — CREDENTIALS (live); mock persisted | P-tiktok-mock-persist | TIKTOK_* OAuth, Direct Post cert |
| Brand Vocabulary / AI Keywords | 80% | FUNCTIONAL + headed owner-gate (not OWNER-READY) | P-keywords-brand-pack + P-keywords-surfaces-* + P-keywords-owner-gate-* + shared P-tapcanvas-killswitch | live trend/AI, a11y, dedicated analytics UI |

**Platform overall:** ~**60–65%** — not 100%. No section shows OWNER-READY until blockers clear.

## Exact sequence (unchanged)

1. Isolated DB healthy + seed  
2. Broader headed matrices (`npm run test:e2e:proofs:headed`)  
3. Clear ledger blockers only with proof  
4. Dev credentials selectively  
5. Staging only when authorized  

See `ROUTE_AND_ACTION_RUNTIME_AUDIT.md`, `DEVELOPMENT_WIRING_PLAN.md`, `BUILD_STATUS.md`.
