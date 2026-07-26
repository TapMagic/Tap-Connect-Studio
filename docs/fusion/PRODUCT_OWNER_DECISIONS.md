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
| 2026-07-26 | CONTINUOUS PRODUCT IMPROVEMENT AND REDESIGN DUTY | Agents expected (not merely authorized) to continuously strengthen design/UX/workflow/architecture/performance/a11y/reliability within charter limits; challenge weak PO/assistant ideas; no protected status for accidental UI authorship. Full text: §4A `GLOBAL_QUALITY_STANDARDS.md` | Locked |
| 2026-07-26 | GLOBAL COMPETITIVE QUALITY REQUIREMENT | Every meaningful surface must be evaluated against the strongest relevant platforms; rival/exceed on capability and workflow maturity — not visual cloning. Completeness ≠ existence or narrow tests. Exceed where unified architecture allows. Full text: §1A `GLOBAL_QUALITY_STANDARDS.md` | Locked |
| 2026-07-26 | COMPETITIVE FEATURE ADAPTATION | Agents may adapt specific useful features/patterns from benchmarks even if not previously listed in TapConnect specs, when mission-aligned, domain-owned, non-duplicative, TapConnect-native, and documented (purpose/benefit/workflows/risks/validation). Function · Presentation · UX lenses. No proprietary cloning. Full text: §1A subsection `GLOBAL_QUALITY_STANDARDS.md` | Locked |
| 2026-07-26 | Card Fuse-Box first slice = Action Registry + Support / Ask a Question | Card is the living hub; Support proves multi-system wire (Contact/Consent/Inbox/Case/Guide/Proof) without live providers; preserves 22 V1 actions; Journey/TapLoop Card wires deferred | Locked |
| 2026-07-26 | Next major commercial slice = Card-to-Campaign Conversion Engine (Offer Fuse) | Card Spotlight projects Campaign-owned offer; claim/keep/lead + mock follow-up + Distribution + Insights; no live Resend/Meta/Wallet; Comms CC / Autopilot / Wallet / Loyalty / TapFlow not next. Resolver: live Campaign takeover + inject Spotlight when bound; else Card-first. Ledger: `CARD_OFFER_FUSE_CONTRACT.md` | Locked |

## CONTINUOUS PRODUCT IMPROVEMENT AND REDESIGN DUTY

**Locked:** 2026-07-26  
**Authoritative full text:** `docs/fusion/GLOBAL_QUALITY_STANDARDS.md` §4A  
**Governing sentence:** Do not merely build the requested product. Continuously make it the strongest coherent version of the product that the approved architecture, current scope, and available evidence support.

Implementation agents are **expected** to continuously evaluate whether current design, UX, workflow, architecture, performance, responsiveness, accessibility, reliability, and feature behavior are the strongest reasonable solution — and to redesign or replace weaker implementations when a superior charter-aligned approach is clear. Existing authorship and prior layout choices have no protected status.

Preserve product intent, approved capability, domain ownership, authoritative data, permissions, security, privacy, auditability, and provider neutrality — not accidental interface structure.

Agents must critically evaluate Product Owner and prior assistant suggestions: challenge weak ideas, recommend stronger alternatives, reject confusion/duplication/fragility/debt/creep, and document consequential redesign reasoning.

**Does not authorize:** removing approved functionality; silent intent changes; competing systems / duplicate SoT; provider-specific cores; speculative complexity; destructive/production-impacting action; invented readiness; hidden limitations; novelty without usability; endless polish without measurable benefit; expansion outside the authorized wave.

Consequential improvements should be judged against measurable outcomes where applicable (fewer steps, lower cognitive load, completion rate, speed, clearer next actions, fewer errors, recovery, a11y, responsive behavior, reduced training, useful capability, maintainability, commercial quality). See GQS §4A for the complete obligation list.

## GLOBAL COMPETITIVE QUALITY REQUIREMENT

**Locked:** 2026-07-26  
**Authoritative full text:** `docs/fusion/GLOBAL_QUALITY_STANDARDS.md` §1A

Every meaningful TapConnect surface, workflow, editor, builder, dashboard, automation, communication system, integration, mobile experience, administrative control, and customer-facing interaction must be evaluated against the strongest relevant platforms in existence.

**Objective:** Rival or exceed the best applicable products in useful capability, workflow completeness, intuitive operation, learnability, interaction smoothness, responsiveness, visual polish, accessibility, speed, reliability, explainability, recovery, extensibility, professional depth, and commercial usefulness — **not** visual imitation.

Named products (Pages/Word, Keynote/PowerPoint, Canva/Adobe Express, Figma/Framer/Webflow/Wix Studio, Power BI/Tableau/Looker/Mixpanel/Amplitude, Klaviyo/Mailchimp/HubSpot/ActiveCampaign/Brevo, ManyChat/Intercom/Front/Zendesk/Help Scout, monday.com/Asana/ClickUp/Linear/Jira/Trello/Notion, Zapier/Make/n8n/HubSpot Workflows, HubSpot/Salesforce/Pipedrive, Shopify/Stripe/Square/Calendly/Toast, Sprout Social/Buffer/Hootsuite/Later/Metricool, Stripe Dashboard/GitHub/Vercel/Cloudflare, Sentry/Datadog/Grafana, Apple HIG/Material Design) are **quality and capability benchmarks**, not cloning targets.

A feature is not complete merely because it exists or passes a narrow technical test. Where TapConnect’s unified architecture enables a more coherent experience, exceed the comparison product rather than copy its limitations. Do not copy irrelevant features for parity; do not create feature cosplay or architectural sprawl.

## COMPETITIVE FEATURE ADAPTATION

**Locked:** 2026-07-26  
**Authoritative full text:** `docs/fusion/GLOBAL_QUALITY_STANDARDS.md` §1A (subsection COMPETITIVE FEATURE ADAPTATION)

Implementation agents must evaluate benchmark products for specific features, interaction patterns, workflow mechanisms, presentation methods, and usability improvements that could materially strengthen TapConnect — not only broad quality standards.

A useful idea may be adapted even when not previously listed in the TapConnect specification when it supports the mission, strengthens an approved outcome, improves function/presentation/UX/performance/reliability/accessibility/commercial value, integrates with the existing domain owner and source of truth, avoids duplicated systems and sprawl, is translated into a TapConnect-native experience, and is documented with purpose, expected benefit, affected workflows, risks, and validation plan.

Study benchmarks through three lenses: **Function**, **Presentation**, and **User experience**. Do not copy proprietary visual assets, protected expression, branding, or product-specific limitations; adopt the underlying principle and improve it where the unified platform allows a stronger result.

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

## UX Simplification wave (2026-07-26)

| Change | Why superior | Benchmark | Preserved |
|--------|--------------|-----------|-----------|
| Compact icon rail + remembered expand + contextual secondary tray | Workspace area without losing 7 destinations | Linear / Vercel (§3.14, §2.3) | Locked seven destinations; mobile secondary testids |
| Outcome Home + grounded recommendations | First-time host knows what to do next | Stripe / monday (§2.3, §3.5) | Decision queue + checklist + campaigns |
| Experiences/Assets/Audience/etc. operational workspaces; catalogs collapsible | Hubs are work surfaces, not Feature Registry tourism | Canva / Shopify (§2.1, §3.3) | All section routes + readiness inspect |
| Create recipes before object actions | Intent-first without dishonest create | Canva Create (§3.3) | CREATE_ACTIONS honesty intents + testids |
| Expanded Format workspace on Card builder | Pages-depth outside narrow inspector | Pages / Keynote (§3.1–3.2) | Inspector quick controls |
| TapLoop guided earn/tier editors; JSON advanced | Hosts edit rules without JSON | ManyChat / HubSpot (§3.9–3.10) | JSON escape hatch + same payloads |
| humanizeError + View details | No Prisma/stack as primary host copy | Stripe (§2.8) | Technical detail recoverable |

**Rejected:** changing destination count; removing readiness honesty; top-nav-only; cloning Pages/Canva chrome; J2 expansion.

## Card Fuse-Box wave (2026-07-26)

| Change | Why superior | Benchmark | Preserved |
|--------|--------------|-----------|-----------|
| Durable Card Action Registry + `support` kind | Pillars wire via adapters — not hardcoding into Card chrome | Intercom / Zendesk entry + V1 action floor | All 22 V1 action kinds |
| Ask a Question → Contact/Consent → Inbox (+ Case) | Card becomes living hub, not static profile | ManyChat / Front / Help Scout (§3.7) | J1 lead path; mock Guardian; human send |
| Deterministic suggested reply (approval required) | Assist without silent AI send | Intercom Fin honesty | No live OpenAI required |
| Fuse-box honesty panel on Card page | Never claim Connected without a real wire | Stripe readiness honesty | Separate modules stay labeled N/A |
| Authoring + Format contracts | Shared workspace without second builder | Pages / Canva medium classes | Existing Format workspace + copy/restore Brand |

**Rejected:** second Card system; live Meta as Support requirement; Booking/Payments native; TapCast publish-from-Card; claiming Pages/Canva full parity; durable Brand sync this slice.

## J1 hardening verify notes (2026-07-26)

| Change | Why |
|--------|-----|
| Await `recordOperatorAlert` on assign/publish fail | Durable decision-queue persistence before HTTP response |
| Decision queue shows aggregate + timestamp | Cause / object / time / remediate visible |
| `discardDeadLetter` succeeds only when Prisma updates (isolated DB) | No false memory-only recovery |
| Insights KPI `data-kpi-value` | Proofs no longer parse `14` from “Taps (14d)” label |
| Time-travel wall-clock-in-zone + schedule Check samples | Studio explanation matches resolver across host TZ |
| Public lead submit fallback label + a11y names | Critical axe clean on J1 public/workbench/groups |

## J1 independent re-verify notes (2026-07-26)

| Change | Why |
|--------|-----|
| Renamed time-travel “Proof:” buttons → operator “Check:” schedule diagnostics | Legitimate operator tooling, not test-only chrome in production UI |
| Analytics proof records Insights lag as explicit blocker note when KPI stalls | Honest aggregation-delay caveat (this run: KPI moved 55→56 with TapEvent 52→53) |
| `fusion-proofs` TapSave uses shared `SEED` ids | Closed false-fail from stale hardcoded business/campaign IDs |
| Powered-by contrast (no dimming opacity wrapper) | Public tap axe color-contrast residual closed on J1 routes |

