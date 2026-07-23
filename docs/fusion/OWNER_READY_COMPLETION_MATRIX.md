# Owner-ready completion matrix

**Branch:** `tapconnect-v1-v2-fusion`  
**Date:** 2026-07-23  
**Rule:** Percentages are objective-check based. Routes/docs/schemas do **not** inflate completion.  
**DB:** isolated `tapconnect_fusion_dev` only. Railway untouched / not a migration target.

## Scoring method

Each pillar scores across 8 gates (equal weight): DEFINED · CONTRACTED · SCAFFOLDED · WIRED · FUNCTIONAL · INTEGRATED · VERIFIED (runtime) · OWNER-READY (browser + persistence ledger).

`OWNER-READY` gate requires a `VERIFICATION_LEDGER` entry with `browserE2ePassed` + `persistencePassed` and zero blockers. **Ledger is currently empty** → no pillar may show OWNER-READY in UI.

| Pillar | % | Stage | Missing | Owner action | Continue without PO? |
|--------|---|-------|---------|--------------|----------------------|
| V1 Card / Campaign Builder | 75% | FUNCTIONAL (preview fix landed) | Headed E2E: format, stock search, upload, publish→assign→public | Browser proof P-16; media keys for stock | Yes |
| Campaign Groups + schedule + time-travel | 80% | FUNCTIONAL | Full browser matrix | Confirm seed `?at=` still passes after reseed | Yes |
| Tap Points / Devices / Scan | 80% | FUNCTIONAL | Placement/transfer UX depth; browser fleet proof | None now | Yes |
| Pulse | 45% | INTEGRATED incomplete | Offline SW, production PWA | None now | Yes |
| TapSave / MyTap | 70% | FUNCTIONAL | Browser Keep→MyTap persistence proof | None now | Yes |
| Wallet | 55% | VERIFIED — CREDENTIALS REQUIRED | Apple/Google certs; live issue | Dev certs when ready (PO-LIVE) | Yes (mock) |
| TapInbox / TapCase | 65% | FUNCTIONAL | Prisma thread proof; Meta not live | None now | Yes |
| Email / suppression | 60% | VERIFIED — CREDENTIALS REQUIRED | Resend + domain | Resend when verifying live | Yes (mock) |
| TapLoop loyalty | 70% | FUNCTIONAL | Browser enroll/award/redeem proof | None now | Yes |
| TapFlow | 65% | FUNCTIONAL | Live provider effects; browser publish+execute proof | Enable `journey.tapflow` in Admin | Yes |
| TapTrail / TapCast / Whiteboard advanced | 25–40% | DEVELOPMENT / ALPHA | Full workflows | None now | Yes |
| TapCommerce | 55% | FUNCTIONAL (mock) | Stripe live; booking/invoices | Stripe test keys later | Yes |
| Insights / TapProof | 70% | FUNCTIONAL | Browser KPI + CSV proof | None now | Yes |
| Autopilot | 60% | FUNCTIONAL | OpenAI live; Knowledge RAG; ledger persist | OpenAI when verifying | Yes (mock/kill-switch) |
| Assets / Brand / media | 70% | FUNCTIONAL | Pexels/Unsplash/Logo.dev/R2/UploadThing | Stock/upload keys later | Yes (local upload paths) |
| Platform Admin / Feature Registry | 75% | FUNCTIONAL | Clerk roles; browser Admin proof | PLATFORM_ADMIN_EMAILS when Clerk on | Yes (dev session) |
| Billing / entitlements | 40% | VERIFIED — CREDENTIALS REQUIRED | Stripe products/webhooks | Stripe test | Yes (readiness UI) |
| Comms Meta/IG/WA/Telegram | 20% | DEVELOPMENT | Apps + Guardian live | Meta review later | Yes |
| Landing | 0% | EXPLICITLY DEFERRED | Charter | None | Yes |

**Platform overall (equal pillar weight, no OWNER-READY gate passed):** ~**58%** toward move-in. Not 100%.

## Exact sequence to 100%

1. Keep isolated DB healthy; reseed after seed script changes (content-block normalizer).  
2. Complete headed browser proof queue P-01…P-28 on `tapconnect_fusion_dev`.  
3. Record passes in `VERIFICATION_LEDGER` (code) — only then UI may show OWNER-READY.  
4. Connect **development** credentials provider-by-provider (never Railway prod DB).  
5. Staging authorization (separate decision) — not this phase.  
6. Production — after staging.

See also: `ROUTE_AND_ACTION_RUNTIME_AUDIT.md`, `DEVELOPMENT_WIRING_PLAN.md`, `PRODUCT_OWNER_REQUIREMENTS.md`.
