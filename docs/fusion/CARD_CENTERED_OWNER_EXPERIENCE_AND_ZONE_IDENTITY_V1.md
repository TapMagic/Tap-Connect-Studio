# Card-Centered Owner Experience + Zone Identity V1

**Status:** IMPLEMENTED BUT NOT OWNER-READY  
**Starting head:** `7133088177dee65b11dd14241d9b84fff28af1b4`  
**Branch:** `tapconnect-v1-v2-fusion`

## Card-centered product law

The Card is the living customer relationship hub. Everything else exists to create the Card, connect customers to it, keep the relationship, operate it, and prove what it accomplished.

Supporting workspaces answer near the top:

1. Which Card does this support?
2. What is this doing for the Card relationship?
3. What should the host do next?

## Home Card Command Center

`/dashboard` first fold shows the primary Card relationship via `HomeCardCommandCenter`:

- Card name and public state
- Open / Edit / View public
- Tap Point health, Spotlight, TapSave
- Compact proof strip (taps, saves, contacts, claims)
- **One** green next action from real state
- Needs-attention item when present (priority over other next actions)
- Optional Autopilot prepared suggestion when nothing is blocked

Home is not a dense analytics dashboard.

## Card relationship anchor

Reusable `CardRelationshipAnchor` reads `CardRelationshipContext` (same Card SoT: `BrandKit.tapCard`). Used on Experiences, Campaign, Email, Audience, Integrations, Brand classic, and related surfaces. Includes Return to Card.

## Experiences hierarchy

Locked primary nav unchanged. Inside Experiences:

1. **Primary:** Card, Campaigns, Email
2. **Relationship support:** TapSave/Keep, Wallet (provider-gated), TapFlow
3. **Labs / legacy / experimental:** collapsed `<details>` — Whiteboard, TapTrail, mock Orders, TapCanvas, TapCast

## Focused Brand default

- Ordinary Brand path: `/dashboard/brand/edit` (Assets CTA, IA Brand Kit section, setup progress)
- Classic form: `/dashboard/brand` labeled **Legacy Brand administration**
- No durable linked Brand sync; snapshot/mixed inheritance honesty preserved

## Campaign / Email ↔ Card

- Campaign Workbench shows Card relationship anchor + offer role; versions collapsed by default; Advanced remains a tool (not default open)
- Email workspace shows parent Campaign, Card, offer freshness, reply handling, local approval, no-live-send; HTML/plain/Advanced under collapsed Technical tools

## Integrations maturity groups

1. Works now  
2. Available after setup  
3. Local or provider test  
4. Planned  

Each tile states receives / sends / direction / knows afterward / setup required / runtime / maturity. Email & Replies honesty: Prisma durable, provider not production-configured, campaign sending disabled. Monday/Zapier show exact capability, not logo implication.

## Empty-state standard

`TruthfulEmptyState` / `EMPTY_STATES`: what is missing, why, whether normal, one useful action, evidence note when applicable. No fake demo activity.

## Zone-color map

| Zone | Atmosphere | Role |
|------|------------|------|
| Card | graphite / ivory / champagne | Central relationship hub |
| Brand | dusty blush / champagne / stone | Identity |
| Campaign | olive / tobacco / brass | Activation |
| Email | ink / steel / blue-gray | Communication |
| Audience | slate blue / ink | Memory & consent |
| Service | charcoal / smoke / rust | Inbox / cases |
| Autopilot | midnight / moss | Prepared work |
| Insights | deep teal / graphite | Proof |
| Integrations | graphite / tobacco / copper | Handoff |
| Tap Points | navy / steel / cyan | Entry & fleet |
| Settings | charcoal / silver | Trust & config |

## Semantic token system

`lib/fusion/studio/zone-tokens.ts` + CSS vars in `app/globals.css`:

- `--zone-*-glow` / atmosphere
- `--studio-go` / secondary / status colors
- Classes: `.zone-*`, legacy `*-zone-glow`, `.studio-nav-active`

Zone color never encodes product state. Host Brand colors stay inside customer previews only.

## Green action rule

One primary green GO per decision surface. Zone accents are atmosphere/labels only. Status colors remain for real status.

## Navigation restraint

Main rail stays calm. Active destination uses `.studio-nav-active` (green edge + tint). No rainbow nav item fills.

## Card-first Create flow

Start recipes / Create menu: Build Card → Promote (Campaign) → Prepare Email → Connect Tap Point → outcomes → Advanced/Labs.

## Mobile expectations

Phone-width Home/Experiences/Integrations: readable command center, 44px targets, no horizontal overflow, Labs collapsed, maturity groups understandable. Authoring may remain desktop-optimized.

## Maturity boundaries

- Not Owner-ready / not Owner-accepted
- No live Email send, production DNS/webhooks, Wallet migration, social/TapCast migration, SMS, Gmail/Microsoft connectors, durable Brand sync, pricing, production deploy

## Deferred

Live provider certification, full phone-first authoring redesign, rainbow-free polish pass on every secondary tray chip, additional screenshot matrices beyond `tmp/card-centered-owner-experience/`.
