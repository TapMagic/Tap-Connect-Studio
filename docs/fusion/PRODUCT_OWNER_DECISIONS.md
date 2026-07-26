# Product Owner Decisions Log

| Date | Decision | Default / rationale | Status |
|------|----------|---------------------|--------|
| 2026-07-23 | Complete product envelope now; modular execution | Do not shrink universe in specs | Locked |
| 2026-07-23 | Activate ready features via Admin toggles | Toggle ≠ unfinished plumbing | Locked |
| 2026-07-23 | V1 AI replaced cleanly | Autopilot / Automation Team | Locked |
| 2026-07-23 | Fusion branch is sole writable product tree | Cody + Design Lab read-only | Locked |
| 2026-07-23 | No push/merge/deploy without explicit authorization | Local-only construction | Locked |
| 2026-07-23 | Host UI: Automation Team / Workers (not generic “AI”) | Pending final PO wording approval | Default |
| 2026-07-23 | Prefer Tap Point / Device language; avoid marketing NFC/QR as secret sauce | Prior PO direction | Default |
| 2026-07-23 | Cody Slice 1: import platform spine only; expand registries to V1 parity floor | See `CODY_SELECTIVE_IMPORT.md` | Locked |
| 2026-07-23 | DeviceUnit vs TapPoint separation imported from Cody | V1 DeviceSlot remains during migration bridge | Default |
| 2026-07-23 | Landing page rebuilt last | Charter §38 | Locked |
| 2026-07-23 | Missing API keys do not block architecture/mocks/Admin UX | Features stay disabled until certified | Locked |
| 2026-07-23 | Restore Workbench blocks missing from ADDABLE menu | age_gate, feedback_form, image_gallery | Accepted |
| 2026-07-23 | Studio IA seven destinations | Home, Experiences, Tap Points, Audience, Insights, Assets, Settings | Locked |
| 2026-07-23 | TikTok nested under TapCast | TapCast = omnichannel authority; TikTok = first-class channel inside TapCast workspace (not Experiences sibling). Create → TikTok content enters via `/dashboard/experiences/tapcast/tiktok`. | Locked |
| 2026-07-23 | Pricing tiers remain reviewable; Stripe connector boundary first | Current V1 plan numbers kept until PO pricing review | Open |

## Open for PO (non-blocking)

1. Final host-facing name for Automation Team vs Automation Workers  
2. Pricing tier names/prices/inclusion chart (review pass)  
3. Which productivity connectors ship first beyond monday.com (recommended: Slack + monday + GitHub)  
4. Wallet priority: Apple Pass vs Google Wallet order for beta

## J1 wave consequential improvements (2026-07-26)

| Change | Why superior | Benchmark | Preserved |
|--------|--------------|-----------|-----------|
| Workspace readiness from first-tap setup + failures (never “Studio ready” from empty outbox) | Trustworthy ops chrome | Stripe / Vercel / Cloudflare (§3.14) | Notifications still surface outbox recovery |
| Create menu `intent` create/open/unavailable | Honest destinations; Campaign starts workbench | Canva / Pages discoverability (§2.6) | All prior hrefs remain reachable as Open when not true create |
| Publish/assign failures → FusionOutbox FAILED operator topics | Decision queue remediation without new SoT | Observability (§3.15) | Existing outbox retry/discard |
| Card `lifecycleStatus` in tapCard JSON + where-used panels | Archive/retire minimum without migration race | Object lifecycle | Campaign archive unchanged |
| Seed writes `tmp/fusion-seed-ids.json` | Headed proofs track reseeds | Test architecture | Env overrides still win |

