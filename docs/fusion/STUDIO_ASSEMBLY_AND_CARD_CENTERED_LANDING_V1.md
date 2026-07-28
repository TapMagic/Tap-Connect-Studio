# Studio Assembly + Card-Centered Landing Page V1

**Status:** IMPLEMENTED BUT NOT OWNER-READY  
**Branch base:** `474eccd` (Card-centered Studio)  
**Claims discipline:** locked — no first/only/best/unique superiority claims

## Product story

TapConnect **is** the Card — a living customer relationship hub.

TapConnect Studio is the broader operating system and capabilities that work around the Card (create, connect, keep, operate, prove). Studio does not mean every capability is included in every plan. The Card never becomes one equally weighted icon among many.

Differentiation is demonstrated by the experience, not announced as an unverifiable exclusivity claim.

## Claims discipline

Forbidden in customer-facing copy:

- first / only platform
- unlike every other platform
- unique in the world
- impossible to copy
- patent-protected / category leader / best (without evidence)

Safe positioning: what TapConnect does, how Card and Studio relate, how capabilities assemble, how work is reduced, how integrations and TapProof work, functional contrast vs a static digital profile.

Copy inventory: `lib/marketing/landing-card-centered.ts` + `lib/marketing/product-explorer.ts`  
Enforced by: `lib/fusion/studio-assembly/__tests__/studio-assembly.test.ts` and e2e body scans.

## Animation modes

| Mode | Purpose | ~Duration |
|------|---------|-----------|
| `LANDING_FULL` | Public hero + settles into explorer | 10–15s |
| `FIRST_STUDIO_ENTRY` | First Studio experience / replay | 6–8s |
| `EVERYDAY_ENTRY` | Ordinary return | 1.5–2.5s |

One shared state machine: `lib/fusion/studio-assembly/state-machine.ts`.

## Storyboard & timing

1. Nearly dark  
2. Warm Card glow  
3. Card resolves (extreme close-up on landing — ~85–95% viewport)  
4. Tap/NFC pulse  
5. Capability signals emerge (semantic order)  
6. **Meaningful capability demonstration** (Tap Points → Campaign Spotlight → TapSave → Audience → Email route → Autopilot organize → Integrations bridge → TapProof)  
7. **Weightless crescendo** (~0.5–1.0s — calm, no continuous orbit)  
8. Full-value frame (“One Card. A complete operating system working around it.”)  
9. **Cinematic camera pullback** — page chrome (already rendered, dimmed) sharpens; Assembly remains the same object  
10. Icons settle into the interactive product map  
11–12. (Auth modes) Card forward + unfold into Home  
13. Green next action last  

Landing skips Card→Home unfold. Skip / scroll accelerate into pullback → settled map. Reduced motion: short in-place path.

Timings: `lib/fusion/studio-assembly/timing.ts`

## Owner launch gaps (honest)

- **Legal routes not published:** Privacy, Terms, Accessibility statement, dedicated Support — footer uses non-linked honest labels (not dead `#` links).
- **Sibling logos missing from this repo:** Tap Magic Pet Finder logo and TapStay logo — cross-sell uses typographic product names only (`data-logo-status="typographic-missing-approved-asset"`). Provide approved assets under `public/` when available.
- **Proof pack:** `tmp/studio-assembly-landing-page-precommit/` (frames 01–38 + `motion-cinematic-pullback-reveal.webm`).

## Capability meanings & destinations

| Capability | Zone | Destination |
|------------|------|-------------|
| Brand Kit | brand | Assets (`assets`) |
| Tap Points | tap_points | Tap Points |
| Campaigns | campaign | Experiences |
| TapSave | card | Home / Card |
| Audience | audience | Audience |
| Email | email | Experiences |
| Autopilot | autopilot | Home next-action (`autopilot_next`) |
| Insights / TapProof | insights | Insights |
| Integrations | integrations | Settings (cross-cutting) |
| Trust Fabric | settings | Underlay (`trust_underlay`) — not an equal orbital peer |

Choreography source: `lib/fusion/studio-assembly/capabilities.ts`  
Zone colors: existing `ZONE_TOKENS` / `--zone-*` — no second motion palette. Green reserved for GO / next action.

## Card-to-Home transformation

Authenticated modes: Card scales forward, layers fade, real `HomeCardCommandCenter` remains underneath; next-action resolves last. Not a pasted video or unrelated dashboard crossfade.

## Public interactive explorer

Data-driven SoT: `lib/marketing/product-explorer.ts`  
UI: `components/marketing/product-explorer.tsx`  
Supports mouse, keyboard, touch, hash deep-links (`#explorer-{id}`), maturity honesty, plan availability placeholders (not entitlement enforcement).

## TapConnect / Studio selector

`components/marketing/tapconnect-studio-selector.tsx`  
TapConnect mode → core capabilities only. Studio mode → full explorer + assembly scope. Same Card; availability varies by plan; no rebuild on upgrade.

## Login frequency, skip, replay

Prefs (localStorage):

- `tapconnect.studio.assembly.firstSeen`
- `tapconnect.studio.assembly.skipEveryday`

Helpers: `lib/fusion/studio-assembly/prefs.ts`  
Install: `StudioEntryAssembly` on `/dashboard` only (not every route).  
Replay: Help drawer + `?assembly=replay` / `?assembly=first`.

## Reduced motion

`prefers-reduced-motion`: no orbit travel emphasis, no large zoom, short fades, labels in place, Skip/Replay remain. Same product explanation preserved.

## Failure safety

Assembly is enhancement. On fail/skip: Home loads, nav works, no blank trap, no infinite load, errors swallowed for users (`failed` → null overlay).

## Analytics

Restrained CustomEvent + debug log: `lib/fusion/studio-assembly/analytics.ts`  
Events: started / skipped / completed / replayed / explorer capability & feature / selector / CTAs. No private Card body.

## Performance

CSS-first (no Framer Motion / WebGL / hero video). Lazy below-fold not required for text sections. Mobile simplifies orbit → list. Measure via local Lighthouse / build weight notes in wave report.

## Mobile / a11y / SEO

- Phone: stacked explorer, 44px targets, no essential orbit-only info  
- Skip early, live status, visible focus, axe serious/critical = 0 target  
- Real H1/H2 text, metadata, JSON-LD, canonical `/`, noscript-friendly summary in `app/page.tsx`

## Deferred

- Pricing / entitlement enforcement  
- Live email send, production DNS/webhooks  
- Gmail/Microsoft, Wallet, TapCast, SMS  
- Final plan pricing language  

## Brand system + commercial journey completion

- Proprietary TapConnect SVG icon family: `lib/fusion/icons`, `components/fusion/icons`
- Same icons in Assembly, explorer, static map, nav, tier cards
- Static platform map: `components/marketing/static-platform-map.tsx`
- SVG export: `lib/marketing/platform-map-export.ts` → `tmp/studio-assembly-landing-page/platform-map-export.svg`
- Deep dives + tier cards without final prices: `lib/marketing/landing-deep-dives.ts`, `offer-catalog.ts`
- Published offer Cards: `/offer/[slug]` — owns product story before checkout
- Checkout: `/api/public/offer/checkout` → local simulate → `/api/public/offer/verify` → `/offer/return`
- Rule: own the journey; Stripe (when live) only the transaction — no public Payment Links
- Cross-sell: Pet Finder + TapStay via `NEXT_PUBLIC_PET_FINDER_URL` / `NEXT_PUBLIC_TAPSTAY_URL` (fallback tapthemagic.com)

## Implementation boundaries

Do not begin another feature wave. Do not mark Owner-ready. Do not commit large proof binaries unless policy requires.
Do not activate live Stripe charges or create production Stripe Products/Prices in this wave.
