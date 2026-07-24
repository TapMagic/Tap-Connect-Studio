# Route and action runtime audit

**Date:** 2026-07-24 (reconciled)  
**Method:** Studio IA inventory + code wiring + readiness derivation + headed proofs.  
**Ledger:** `lib/fusion/readiness/display-status.ts` section rows (not empty). Platform is **not** OWNER-READY overall — live providers remain **VERIFIED — CREDENTIALS REQUIRED**.  
**DB:** `tapconnect_fusion_dev` only.  
**Badge rule:** Static IA `maturity: "owner_ready"` is **provisional**; UI shows derived readiness until ledger proof with zero blockers.  
**Reconcile:** Accepted checkpoints TapCast `714ecff`, Keywords `49faf51`, TapCanvas/TikTok `7a29a06`. Cross-system proofs: `e2e/cross-system-integration.spec.ts` (4/4).

Legend for **Actual status**: `loads` · `seed` · `mock` · `api` · `scaffold` · `broken_link` · `cred_gate`

---

## HOME (`/dashboard`)

| Route / item | Visible (IA) | Actual | Primary action | Persistence | Blocker |
|---|---|---|---|---|---|
| Dashboard | FUNCTIONAL* | loads + seed metrics | Open hubs | N/A | Browser proof |
| `#decision-queue` | functional | partial UI | Review decisions | partial | Full queue wiring |
| `#readiness` | functional | integrations probe | Open Integrations | env-driven | Credentials optional |
| `#upcoming` | was owner_ready | schedule snippet | Jump to Groups | seed | Proof |
| Fleet health link | functional | Tap Points hub | Navigate | — | — |
| Workbench / Autopilot entry | functional | panel + mock AI | Generate | DB when accept | OpenAI optional |

\*UI never shows OWNER-READY without ledger.

---

## EXPERIENCES

| Route | Visible→Actual | Data | Primary | Secondary | Downstream | Blocker |
|---|---|---|---|---|---|---|
| `/dashboard/experiences` | hub | nav only | Open sections | — | all below | — |
| `/dashboard/card` | was OR → FUNCTIONAL | seed/DB | Edit card | Format, media | Public `/t/…` | Headed builder E2E |
| `/dashboard/workbench` | was OR → FUNCTIONAL | campaign blocks | Edit/preview | AI, time-travel | Publish→devices | Blank preview **fixed** via `normalizeContentBlocks` |
| `/dashboard/campaigns` | was OR → FUNCTIONAL | DB list | Open editor | Create | Groups/devices | Proof |
| `/dashboard/campaigns/[id]` | functional | DB | Save/publish | Assign | Resolver | Proof |
| `/dashboard/groups` | was OR → FUNCTIONAL | DB | Schedule windows | Devices | Public resolve | Proof |
| `/dashboard/experiences/journeys` | FUNCTIONAL | draft+engine | Draft/simulate | Live queue | Outbox/Insights | Feature flag + proof |
| `/dashboard/experiences/orders` | BETA | mock commerce | List/cancel | Refund | Insights | Stripe live |
| TapTrail / Whiteboard / TapCast | ALPHA/DEV | mostly UI | Open | — | weak | Implementation |
| Versions / Publications / Resolver | FUNCTIONAL | V1 paths | Preview | Publish | Devices | Proof |

**Campaign Builder blank preview (root cause + fix):** Seed/legacy blocks used V1 shapes (`heading`/`text`/`offer` + `props`, missing `enabled`). Renderer filtered them as off/unknown → empty center. Fixed by `lib/services/normalize-content-blocks.ts` + seed ContentBlocks + renderer default-enabled. **Do not** promote Cards/Campaigns/Experiences to OWNER-READY until headed E2E (add/edit/format/media/save/publish/assign/public) is ledgered.

---

## TAP POINTS

| Route | Actual | Notes / blocker |
|---|---|---|
| `/dashboard/tap-points` | hub + fleet metrics | FUNCTIONAL pending proof |
| `/dashboard/devices` | V1 CRUD + seed | was mislabeled OR |
| `/dashboard/scan` | Scan Mode works on seed | was mislabeled OR |
| Sets / Rotations / Placement / Transfer | mostly Groups/devices aliases | incomplete dedicated UX |
| `/dashboard/pulse` | stubs / alpha | offline SW incomplete |
| Capacity / Testing / Replacement | scaffold→functional mix | fleet depth |

---

## AUDIENCE

| Route | Actual | Notes |
|---|---|---|
| `/dashboard/leads` | V1 leads CRUD | was mislabeled OR |
| `/dashboard/audience` | workspace shell | contacts/consent/TapSave/TapLoop panels |
| Contacts / Relationships / Consent / Preferences | API + lib | incomplete dedicated routes (hub anchors) |
| TapSave / MyTap | API + `/mytap/[id]` | Keep Card CTA; proof pending |
| `/dashboard/audience/wallet` | mock adapter | CREDENTIALS for Apple/Google |
| Moments | service | FUNCTIONAL |
| Email / suppression | mock + utils | Resend for live |
| `/dashboard/audience/inbox` | cases + guardian | Meta not live |
| TapCase / TapGuide | inbox-linked | TapGuide scaffolded |
| TapLoop / Loyalty / Rewards | ledger APIs | Referrals scaffolded |
| Purchases / Commerce / Bookings / Invoices | orders surface | invoices/bookings scaffold |

---

## INSIGHTS

| Route | Actual | Notes |
|---|---|---|
| `/dashboard/insights` | metrics + TapProof + recovery | FUNCTIONAL |
| `/dashboard/analytics` | V1 analytics | was mislabeled OR |
| KPI/chart/drill-down/filter/export | partial | export API exists; browser proof pending |
| Evidence sources | TapProof display | confidence wiring partial |
| Commerce insights | beta | depends on orders |

---

## ASSETS

| Route | Actual | Notes |
|---|---|---|
| `/dashboard/brand` | Brand Kit V1 | was mislabeled OR |
| `/dashboard/assets` | media hub | upload local paths; stock APIs gated |
| Pexels / Unsplash / Logo.dev | integrations flags | CREDENTIALS for live search |
| Fonts / backgrounds / templates | mixed V1 | |
| Block packs / rights | scaffold/alpha | |

---

## SETTINGS

| Route | Actual | Notes |
|---|---|---|
| `/dashboard/settings` | workspace shell | |
| Businesses / locations / members | partial | locations scaffold |
| Roles / permissions | authz matrix | Clerk roles when Clerk on |
| `/dashboard/billing` | Stripe readiness UI | CREDENTIALS |
| `/dashboard/integrations` | provider matrix | |
| Channels / API / webhooks | scaffold→functional | |
| Imports/exports / privacy / security | functional stubs | |
| Audit | `/admin/platform/audit` | |
| Automation Team | settings panel | Autopilot team |
| Feature Registry | `/admin/platform` | kill-switch |
| Platform Admin | `/admin/platform/*` | PLATFORM_ADMIN_EMAILS |

---

## Global Create / Search

Create menu and ⌘K index use IA hrefs. Maturity labels now go through `safeDisplayLabel` / `resolveSectionReadiness` (no static Owner-ready).

---

## Cross-pillar “dots” (connection vs navigation)

| Chain | Status |
|---|---|
| Card → Campaign → Group → schedule → Tap Point → `/t/…` | Wired in V1 services; seed demo works; headed proof incomplete |
| Public → lead → consent → Contact → Relationship | Partial (leads strong; relationship projection newer) |
| Keep Card → TapSave → MyTap → Wallet | TapSave/MyTap wired; Wallet mock |
| Campaign → Email → Inbox → timeline | Email mock; Inbox separate |
| Contact → TapLoop → award → redeem | APIs + unit tests; browser proof pending |
| Tap → TapFlow → outbox → Insights | Engine + queue; live effects guarded |
| Commerce → loyalty → Insights | Soft links |
| Outbox → Admin health → recovery | Functional panels |
| Autopilot accept → persist → publish | Accept/apply/undo; OpenAI optional |
| Admin feature state → UI/API | Registry resolve; not all surfaces gated yet |
| TapProof in workflows | Insights-facing; not everywhere |

---

## Console / server / hydration

Flight-test era: landing 500 when Clerk missing (fixed). Builder blank was data-shape (fixed). No current ledger of zero-console headed runs — treat as **unproven**.
