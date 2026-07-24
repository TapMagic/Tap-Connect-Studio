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
| TapFlow | 55% | FUNCTIONAL | P-06 shell + lifecycle matrix | full lifecycle UI |
| Inbox | 55% | FUNCTIONAL | P-09 shell | reply/Guardian/TapCase |
| Insights | 55% | FUNCTIONAL | P-11 + export matrix | drill-down, provenance |
| Platform Admin | 60% | FUNCTIONAL | P-12 + killswitch matrix | disable→503→re-enable headed |
| Controls / responsive / a11y | 40% | DEVELOPMENT | P-controls, P-responsive, P-a11y | public `<main>`, full axe |
| Productivity & Work Mgmt | 70% | VERIFIED — CREDENTIALS (live) | P-productivity-* | live OAuth apps |
| TapCanvas | 55% | IMPLEMENTED BUT NOT OWNER-READY | P-tapcanvas-persist, P-tapcanvas-campaigns | promotion matrix, a11y, TapFlow-in-canvas |
| TapCast · TikTok | 60% | VERIFIED — CREDENTIALS (live); mock persisted | P-tiktok-mock-persist | TIKTOK_* OAuth, Direct Post cert |

**Platform overall:** ~**58–62%** — not 100%. No section shows OWNER-READY until blockers clear.

## Exact sequence (unchanged)

1. Isolated DB healthy + seed  
2. Broader headed matrices (`npm run test:e2e:proofs:headed`)  
3. Clear ledger blockers only with proof  
4. Dev credentials selectively  
5. Staging only when authorized  

See `ROUTE_AND_ACTION_RUNTIME_AUDIT.md`, `DEVELOPMENT_WIRING_PLAN.md`, `BUILD_STATUS.md`.
