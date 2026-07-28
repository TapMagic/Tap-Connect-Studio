# Penthouse Wave 1 — Whole-Product Audit

Branch `replit-penthouse-transformation` @ `e0a258b`. App run locally against
the isolated `tapconnect_fusion_dev` database with seeded demo workspace
(`[SEED] Demo Cafe`), no provider credentials (all providers in honest
local-mock states). Personas walked: first-time visitor, prospective buyer,
daily operator, phone, keyboard, reduced-motion.

Classification:
- **A** — local and expected to work
- **B** — provider-dependent with honest local/test mode
- **C** — intentionally unavailable and clearly explained
- **D** — broken (must be fixed)

## Public surfaces

| Surface | Class | Notes |
|---|---|---|
| `/` landing + Studio Assembly | A | Cinematic Assembly runs; Skip visible; reduced-motion dissolve path present; SEO-readable static copy below. |
| Story rail (Card/Create/Connect/Keep/Operate/Prove) | A | Anchors work; keyboard focusable; 44px targets. |
| Interactive product explorer | A | Selection lifts icon, opens panel; keyboard + hash updates. |
| Static Card-centered map | A | Renders without JS-dependence for comprehension. |
| Product deep dives + screenshots | A | Real scrubbed screenshots in `public/marketing/product/`. |
| Integration ticker | A | Pauses on hover/focus; reduced-motion wraps statically. |
| TapConnect vs Studio selector, tier cards | A | No invented prices, no "Most Popular"; placeholders labeled not-finalized. |
| Published offer Cards `/offer/tapconnect`, `/offer/studio` | B | Stripe absent → `local_mock` checkout via `/offer/checkout/simulate`, honestly labeled; cancel/return preserved. |
| Checkout return/cancel | B | Context preserved through simulated session ids. |
| Pet Finder / TapStay sections | A | Typographic identity (no invented logos); external URLs env-driven, non-links when unset. |
| Footer | A | Truthful links/non-links. |
| Metadata/SEO | A | JSON-LD org + software app; canonical; OG/Twitter images. |

## Authenticated Studio (local dev session — Clerk absent)

| Surface | Class | Notes |
|---|---|---|
| Auth entry | B | `middleware.ts` bypass + `dev@tapconnect.local` session, clearly labeled "Dev mode: Clerk auth not configured" banner. Never active with keys present. |
| First-entry Assembly → Home | A | FIRST_STUDIO_ENTRY mode plays, settles to Card Command Center. |
| Home / Card Command Center | A | Card relationship header, live state, next action, Autopilot recommendation, needs-attention. |
| Global Create + command palette (⌘K) | A | Outcome-driven entries; Escape/focus management correct. |
| Navigation rail | A | Zone labels + calm green active indicator (`studio-nav-active`); no rainbow fills. |
| Notifications bell | A | Opens real notifications menu (outbox-backed) — formerly dead (ID-002), fixed pre-wave. |
| Help | A | `StudioHelpDrawer` opens real help content — formerly misrouted (ID-008), fixed pre-wave. |
| Card `/dashboard/card`, editor, preview, public Card | A | Fuse-box assembly, authoring, phone-frame preview all local. |
| Brand Kit `/dashboard/brand/edit` (+ legacy `/dashboard/brand`) | A | Legacy admin form is demoted/secondary. |
| Assets `/dashboard/assets` | A/B | Library browsable with seed media; uploads provider-dependent (R2/UploadThing) with honest state. |
| Tap Points `/dashboard/tap-points`, `/dashboard/devices` | A | Fleet health, assignment local. |
| Campaign Workbench `/dashboard/workbench`, `/dashboard/campaigns` | A | Authoring local. "Save as user template" bookmark: **C** — disabled + labeled "(coming soon)"; added `aria-label` this wave. |
| Email workspace + Email & Replies | B | `EMAIL_RUNTIME_MODE=local_mock`; authoring/previews/routing config work; sends recorded as `mock:true`; no delivery claimed. |
| TapInbox / Cases / Communications | A | Thread + case flows on local fixtures. |
| Audience / Relationships / Consent / Suppression | A | Seeded relationship + consent records. |
| Autopilot | B | OpenAI absent → deterministic prepared recommendations; `lib/services/ai-generate.ts` throws only behind `isAiReady()` gates (UI checks readiness first). |
| Insights / TapProof | A | Provenance-tracked KPIs from persisted sources; truthful empty states where no evidence. |
| Integrations | B | Grouped by maturity; no implied readiness from logos. |
| Settings / Trust | A | Feature-gated Autopilot budget/ledger panels hidden (not dead) when disabled — acceptable progressive disclosure, revisit labeling in wave 3. |
| Pulse (ops console) | A | Health + activity feed local. |
| Decision Queue | A | Anchored from Home; approve/decline local. |
| Experiences catalog (Canvas, Journeys, TapCast, Orders) | A/C | Labs surfaces marked experimental; Orders is an explicit mock commerce simulation. |

## Class-D findings

Systematic sweep (dead handlers, missing routes, console-only feedback,
false success):

1. **None open.** The two historical dead controls in the defect inventory
   (notifications bell ID-002, help icon ID-008) were fixed before this
   wave; verified working in the running app.
2. Residual risk items verified honest, not broken:
   - Mastodon channel: backend enum only, canonical mapping `null`, no UI
     control exposed — nothing dead is clickable.
   - `db:push` script: intentionally refuses with explanation (guard rail,
     not a dead control).
3. Minor accessibility fix applied: disabled template-save icon button now
   has an `aria-label` matching its tooltip.

## Route smoke (dev, seeded)

`/`, `/offer/tapconnect`, `/offer/studio`, `/dashboard`, `/dashboard/card`,
`/dashboard/insights`, `/dashboard/assets`, `/dashboard/tap-points`,
`/dashboard/integrations`, `/dashboard/settings`, `/dashboard/audience`,
`/dashboard/pulse` → all **200**. `/pricing` → 307 redirect (intentional).

## Cross-cutting observations feeding waves 2–3

- Zone distinction is strong at token level; a few Studio pages still use
  plain `bg-card` panels instead of `tc-surface` materials → wave 3.
- TapSave previously borrowed the Card zone; now has its own retention-teal
  zone (`zone-tapsave`), distinct from CTA green.
- Icon family lacked distinct TapProof / Relationships / Communications
  marks → added this wave.
- Landing deep dives and tier cards already meet the "no false claims"
  marketing rules (tested in `icons-and-offers.test.ts`).
