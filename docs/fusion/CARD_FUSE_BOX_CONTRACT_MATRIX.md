# Card Fuse-Box Contract Matrix

**Wave:** Card Fuse-Box Integration  
**Branch:** `tapconnect-v1-v2-fusion`  
**Starting HEAD:** `ae30d3a072576953fa3e025e64aa4b033e5ade44`  
**Date:** 2026-07-26  
**Rule:** A capability is **not** “integrated” because it has a route, component, Prisma model, registry entry, mock, feature flag, or API stub. Integration requires an explicit Card wire with customer entry, relationship/consent, measurable outcome, and honest readiness.

**Core truth:** The Tap Card is the canonical living customer hub and launch surface. The physical Tap Point introduces or reopens the relationship. New pillars must not remain separate menu modules with no visible Card relationship.

**Standing obligations:** CONTINUOUS PRODUCT IMPROVEMENT · GLOBAL COMPETITIVE QUALITY · COMPETITIVE FEATURE ADAPTATION · V1-FIRST · J1 VERIFIED must not regress.

**Classification vocabulary (column 30):**

| Label | Meaning |
|-------|---------|
| **Genuinely Card-wired** | Customer can enter from Card; state, consent, evidence, and host outcomes are real |
| **Partially Card-wired** | Card shows a control that only deep-links or partially completes the outcome |
| **Contract-only** | Spec / Feature Registry / docs exist; no customer Card path |
| **Separate module** | Functional Studio surface with no Card entry |
| **Missing connection** | Capability exists or is planned; no honest Card relationship |
| **Explicitly deferred** | Documented out of this wave / later band |

---

## Implementation sequence (Card-centered slices)

| Order | Slice | Outcome | Risk to J1 | Status |
|------:|-------|---------|------------|--------|
| **0** | This matrix + honesty | Shared contract; no false “connected” claims | None | **THIS DOC** |
| **1** | Action Registry + Support / Ask a Question | Card → question → Contact/Consent → Inbox (+ optional Case) → suggested reply → human send → MyTap/TapProof/Insights | Low | **THIS WAVE** |
| **2** | Fuse-box assembly view (honesty) | Host sees Connected / Partial / Configure / Provider / Consent / N/A per wire | Low | **THIS WAVE (begin)** |
| **3** | Full-screen authoring shell contract | Shared workspace for Card/Email/Offer/Wallet/Journey/Form/Loyalty | Low | **THIS WAVE (contract + begin)** |
| **4** | Format + effects contract by medium | Pages/Canva-grade controls with Native / Safe / Unsupported / Preview-only | Low | **THIS WAVE (contract)** |
| **5** | Offer / Spotlight depth | Card special_offer ↔ Campaign attribution ↔ Insights (beyond URL) | Low–Med | **THIS WAVE (Offer Fuse)** |
| **6** | TapLoop enroll from Card | Loyalty enroll + consent + ledger + MyTap | Med | After Band 4 residuals |
| **7** | TapFlow start from Card | Journey trigger from action binding | Med | After J10 harden |
| **8** | Wallet open / update | Projection + certification-gated pass | High (certs) | Credentials band |
| **9** | Booking / Payments native | Not URL-only | High | Explicitly deferred until providers |
| **10** | TapCast publish from Card | Never claim organic without credentials | High | Rejected for early fuse-box |

---

## Legend for matrix rows

Each capability row answers fields **1–30** (abbreviated headers):

1 Entry · 2 Card surface · 3 Public/personal · 4 State→Card/MyTap · 5 TapSave · 6 Consent · 7 Suppression · 8 Campaign · 9 TapFlow · 10 TapCanvas · 11 TapProof · 12 Events · 13 Insights · 14 Provider · 15 Readiness class · 16 Feature Registry · 17 Entitlement · 18 Permission · 19 Empty · 20 Error · 21 Dep-missing · 22 Recovery · 23 Pause/revoke · 24 Audit · 25 Pulse · 26 V1 reuse · 27 New work · 28 Customer outcome · 29 Host outcome · **30 Status**

---

## Capability matrix

### TapSave

| # | Contract |
|---|----------|
| 1 | Keep / Save on public Card or campaign Keep CTA |
| 2 | vcard + Keep flows (not a dedicated action kind today) |
| 3 | Public Keep creates relationship; personalized MyTap continues |
| 4 | Relationship + moments; Card projection on MyTap |
| 5 | Owns relationship retention |
| 6 | Channel-specific on later prefs; Keep records relationship |
| 7 | Prefs / suppression respected on outbound |
| 8 | Campaign Keep blocks / attribution |
| 9 | Optional later trigger `relationship.kept` |
| 10 | Contract-only board node |
| 11 | Keep evidence via TapEvent / moments |
| 12 | `tapsave.keep`, `audience.contact.upserted` |
| 13 | Retention views |
| 14 | None for mock Keep |
| 15 | Existing and working (mock); wallet live = credentials |
| 16 | `tapsave.core` |
| 17 | Plan-gated later |
| 18 | Public + `audience:edit` host |
| 19 | “Save this Card” empty CTA |
| 20 | Keep failure toast + retry |
| 21 | Feature-off honesty |
| 22 | Re-tap Card |
| 23 | Pause relationship / withdraw prefs |
| 24 | Platform audit + moments |
| 25 | Field confirm Keep |
| 26 | V1 Keep / vCard paths |
| 27 | Fuse label honesty only this wave |
| 28 | Saved living hub |
| 29 | Relationship visible in Audience |
| **30** | **Partially Card-wired** |

### MyTap

| # | Contract |
|---|----------|
| 1 | After Keep / support / lead — opaque `/mytap/[token]` |
| 2 | Projection of Card + relationship state |
| 3 | Personalized only (token) |
| 4 | Shows Card + support/loyalty status when wired |
| 5 | Child of TapSave relationship |
| 6 | Surface for preference review |
| 7 | Preference center target |
| 8 | Campaign-attributed moments |
| 9–10 | Optional later |
| 11 | Projection evidence incomplete unless confirmed events |
| 12 | `mytap.viewed` (when present) |
| 13 | Relationship health |
| 14 | None |
| 15 | Existing and working |
| 16 | via tapsave / audience |
| 17–18 | Public token |
| 19 | Empty hub copy |
| 20 | Invalid token |
| 21 | N/A |
| 22 | Re-enter from Card Keep |
| 23 | Relationship pause |
| 24 | Timeline |
| 25 | Low |
| 26 | Fusion projection |
| 27 | Support state surface (this wave) |
| 28 | Ongoing hub |
| 29 | Where-used / Audience link |
| **30** | **Partially Card-wired** |

### Wallet

| # | Contract |
|---|----------|
| 1 | Post-Keep CTA / future Card action |
| 2 | Not first-class Card action today |
| 3 | Personalized after relationship |
| 4 | Pass status on MyTap |
| 5 | Relationship-scoped |
| 6 | WALLET consent channel |
| 7 | Pass update suppression |
| 8 | Offer → pass later |
| 9–10 | Deferred |
| 11 | Pass event evidence |
| 12 | `wallet.pass.*` |
| 13 | Wallet funnel |
| 14 | Apple / Google Wallet |
| 15 | Mock UX; live = **VERIFIED — CREDENTIALS REQUIRED** / certification |
| 16 | wallet features |
| 17 | Plan + provider |
| 18 | Host wallet manage |
| 19 | “Wallet not configured” |
| 20 | Provider error classes |
| 21 | Requires provider |
| 22 | Reissue / mock fallback |
| 23 | Revoke pass |
| 24 | WalletPassEvent |
| 25 | Field check-in later |
| 26 | V1 wallet foundations where present |
| 27 | Action binding later |
| 28 | Pass in device wallet |
| 29 | Audience wallet list |
| **30** | **Missing connection** (mock module) / live **explicitly deferred** |

### TapSave Moments

| # | Contract |
|---|----------|
| 1 | Indirect via Keep / support / lead |
| 2 | Not a Card button |
| 3 | Personalized timeline |
| 4 | Moments list on MyTap |
| 5 | Core retention timeline |
| 6 | Source metadata |
| 7 | N/A |
| 8 | Campaign id on moment |
| 9 | Triggerable later |
| 10 | Board annotation later |
| 11 | Moment = evidence source |
| 12 | moment kinds |
| 13 | Retention timeline |
| 14 | None |
| 15 | Existing |
| 16 | tapsave |
| 17–18 | Internal |
| 19 | No moments yet |
| 20 | Write failure silent→retry |
| 21 | N/A |
| 22 | Re-record from Card action |
| 23 | N/A |
| 24 | Moment rows |
| 25 | Optional |
| 26 | Fusion model |
| 27 | `support_requested` moment (this wave) |
| 28 | History of relationship |
| 29 | Audience timeline |
| **30** | **Partially Card-wired** |

### TapFlow

| # | Contract |
|---|----------|
| 1 | Future Card action binding / public trigger API exists |
| 2 | **No** Card action kind today |
| 3 | Public trigger vs authenticated |
| 4 | Execution state → MyTap later |
| 5 | Relationship context on run |
| 6 | Per-node purposes |
| 7 | Guardian on sends |
| 8 | Campaign can start journey |
| 9 | Owns nodes/triggers |
| 10 | Sibling board |
| 11 | Execution evidence |
| 12 | `journey.*` |
| 13 | Journey funnel |
| 14 | Optional OAuth effects |
| 15 | Local functional; live OAuth credentials |
| 16 | journey features |
| 17–18 | journey:edit |
| 19 | Empty journey |
| 20 | Validation errors |
| 21 | Provider-gated steps |
| 22 | Resume / recover execution |
| 23 | Pause journey |
| 24 | JourneyExecution |
| 25 | Field trigger later |
| 26 | Cody spine + Fusion journeys |
| 27 | Card binding = later slice |
| 28 | Guided outcome |
| 29 | Journey studio |
| **30** | **Separate module** / Card wire **explicitly deferred** |

### TapCanvas

| # | Contract |
|---|----------|
| 1 | Host-only today |
| 2 | None |
| 3 | N/A public |
| 4 | None |
| 5–8 | Planning graph only |
| 9 | Sibling |
| 10 | Owns board |
| 11 | Weak |
| 12 | canvas events |
| 13 | Limited |
| 14 | None local |
| 15 | Alpha local |
| 16 | canvas features |
| 17–25 | Host authoring |
| 26 | Fusion VisualBoard |
| 27 | Card wire deferred |
| 28 | N/A customer |
| 29 | Connected planning |
| **30** | **Separate module** |

### TapInbox

| # | Contract |
|---|----------|
| 1 | **Card Support / Ask a Question** (this wave) · also lead capture side-effect |
| 2 | New `support` action + Spotlight optional |
| 3 | Public ask → personalized thread on MyTap |
| 4 | Thread status on MyTap |
| 5 | Relationship on thread |
| 6 | EMAIL (service/support purpose) |
| 7 | CommunicationSuppression before reply |
| 8 | Optional campaign attribution on thread metadata |
| 9 | Future `inbox.message` trigger |
| 10 | Optional |
| 11 | Thread/message evidence |
| 12 | `inbox.thread.created`, `inbox.message.outbound`, `card.support.submitted` |
| 13 | Support volume / resolution |
| 14 | Mock email; live Resend/Meta = credentials |
| 15 | Mock **existing and working**; live **VERIFIED — CREDENTIALS REQUIRED** |
| 16 | `comms.inbox` (+ email/messaging) |
| 17 | Comms entitlement |
| 18 | `messaging:send` host |
| 19 | Empty inbox / “Ask us” CTA |
| 20 | Guardian block / validation |
| 21 | Feature-off / provider-unavailable → human-only still works on mock |
| 22 | Reopen from Card / MyTap |
| 23 | Close thread / suppress |
| 24 | Inbox audit + PlatformAudit |
| 25 | Notify operator later |
| 26 | Lead→thread bridge; **not** V1 inbox |
| 27 | Card entry + suggested reply + fuse status (**this wave**) |
| 28 | Question answered |
| 29 | Thread in Inbox |
| **30** | **Partially → Genuinely Card-wired** after this wave |

### TapCase

| # | Contract |
|---|----------|
| 1 | Optional from Support request type |
| 2 | Same Support action (case when type warrants) |
| 3 | Host case; customer sees status via MyTap/thread |
| 4 | Case status projection |
| 5 | relationshipId on case |
| 6 | Inherited from thread |
| 7 | Same as inbox |
| 8 | Campaign meta |
| 9 | Case status triggers later |
| 10 | Optional |
| 11 | Case lifecycle evidence |
| 12 | `inbox.case.*` |
| 13 | Case SLA / volume |
| 14 | None required |
| 15 | Existing mock lifecycle |
| 16 | `comms.inbox` |
| 17–18 | messaging |
| 19 | No open cases |
| 20 | Illegal transition |
| 21 | Inbox off |
| 22 | Reopen case |
| 23 | Close/resolve |
| 24 | Case + audit |
| 25 | Assign field agent later |
| 26 | Fusion-native |
| 27 | Auto-open rules from Card support (**this wave**) |
| 28 | Issue tracked to resolution |
| 29 | Case queue |
| **30** | **Partially → Genuinely Card-wired** (when opened from Card) |

### TapGuide

| # | Contract |
|---|----------|
| 1 | Assisted reply inside Inbox (not customer Card entry) |
| 2 | None direct |
| 3 | Host assistance |
| 4 | N/A |
| 5–8 | Grounding from Brand / Knowledge |
| 9–10 | Later |
| 11 | Suggestion confidence |
| 12 | `guide.suggestion.*` |
| 13 | Assist metrics |
| 14 | OpenAI optional |
| 15 | Deterministic local this wave; live AI credentials |
| 16 | ai.* gated |
| 17–18 | ai:generate |
| 19 | No grounding → template reply |
| 20 | AI unavailable → deterministic fallback |
| 21 | Requires provider honesty |
| 22 | Human rewrite |
| 23 | Reject suggestion |
| 24 | Accept/reject audit |
| 25 | N/A |
| 26 | Autopilot proposal patterns |
| 27 | Deterministic suggested reply for support (**this wave**) |
| 28 | Faster accurate answers |
| 29 | Reviewable draft |
| **30** | **Contract-only → Partially Card-wired** (assist on Card-origin threads) |

### TapLoop

| # | Contract |
|---|----------|
| 1 | Future “Join rewards” Card action |
| 2 | Missing |
| 3 | Public enroll / personalized balance |
| 4 | Points on MyTap |
| 5 | Enrollment on relationship |
| 6 | Loyalty / marketing consent |
| 7 | Promo suppression |
| 8 | Campaign earn rules |
| 9 | Earn/burn nodes |
| 10 | Optional |
| 11 | Ledger evidence |
| 12 | `loyalty.*` |
| 13 | Loyalty KPIs |
| 14 | None for ledger |
| 15 | Functional ledger |
| 16 | taploop features |
| 17–18 | loyalty |
| 19 | Not enrolled |
| 20 | Reverse/idempotency errors |
| 21 | Feature-off |
| 22 | Re-enroll |
| 23 | Pause enrollment |
| 24 | Ledger immutable |
| 25 | Redemption scan later |
| 26 | Fusion TapLoop |
| 27 | Card enroll action later |
| 28 | Earn/redeem |
| 29 | Audience TapLoop |
| **30** | **Separate module** / **missing connection** |

### TapCommerce / Orders / Invoices / Payments

| Capability | **30** | Card today | Notes |
|------------|--------|------------|-------|
| TapCommerce | Separate module | `shop` = URL | Mock checkout exists; not Card checkout |
| Orders | Separate module | None | Experiences orders |
| Invoices | Missing / deferred | None | |
| Payments | Credentials / deferred | None | Stripe billing ≠ Card pay |

Shared: consent for purchase receipts; Guardian N/A for processor; TapProof on purchase proof when wired; **do not** claim Card payment this wave.

### TapCast

| # | Contract |
|---|----------|
| 1 | Social kinds open outbound URLs — **not** publish |
| 2 | instagram/facebook/… kinds |
| 3 | Public links |
| 4 | None |
| 5–11 | Publish evidence only on TapCast hub |
| 12 | tapcast.* on hub |
| 14 | Per-channel |
| 15 | Mock ladder; live credentials; Snapchat organic **MOCK ONLY** |
| **30** | **Partially Card-wired** (link only) — publish **explicitly deferred** |

### Email / Messaging

| Capability | **30** | Notes |
|------------|--------|-------|
| Email (`mailto` action) | Partially Card-wired | Opens mail client — not TapInbox thread |
| Email marketing | Separate module | Campaign email builder; Resend credentials |
| Messaging | Separate module | Guardian + mock; live Meta/SMS credentials |

Support slice uses **Inbox email channel (mock)** rather than `mailto:` for Ask a Question.

### Booking / Appointments / Reviews / Offers / Forms / Loyalty / Support / Referrals

| Capability | **30** | Card surface today | Honest note |
|------------|--------|--------------------|-------------|
| Booking / Appointments | Missing connection | `calendar` / `book` URL placeholders | Create Booking unavailable in IA |
| Reviews | Partially Card-wired | `review` → Google URL | No review ingest |
| Offers | Partially Card-wired | `special_offer` link/expand/campaign | Not journey fuse |
| Forms | Separate module | Campaign email_capture / feedback | Lead path J1; not Card action kind |
| Loyalty | Separate module | None | See TapLoop |
| Support | Missing → **this wave** | None before wave | Primary slice |
| Referrals | Explicitly deferred | None | J23 |

---

## Provider readiness (wave honesty)

| Provider | Classification |
|----------|----------------|
| Clerk | Existing; local bypass possible; production keys configured in V1 Railway — **do not expose** |
| Resend | Existing mock; live **VERIFIED — CREDENTIALS REQUIRED** |
| Stripe | Billing path; live credentials required |
| OpenAI | Local grounded/deterministic OK; enhance **credentials required** |
| Stock/logo/icon | Upload works; Pexels/Unsplash credentials optional |
| Wallet | Mock; certification + credentials |
| Social / messaging | Mock; live credentials; Snapchat organic mock-only |
| Support send (this wave) | **Mock / local always functional**; live channel optional later |

---

## AI / automation honesty (this wave)

| Mode | Used? |
|------|-------|
| Deterministic rules suggested reply | **Yes** (default) |
| Local mock send | **Yes** |
| Live OpenAI | **No** (Phase 2 / credentials) |
| Approval-required before send | **Yes** |
| Human takeover | **Yes** (Inbox composer) |
| Silent send of AI text | **Forbidden** |

Every suggestion: preview · grounding · confidence · accept · reject · edit · partial accept · audit · failure recovery.

---

## Misleading UI (must not reinforce)

- `calendar` / `shop` / `book` looking “native” while URL-only  
- IA Card `owner_ready` vs builder residuals  
- Hub adjacency implying Card fuse  
- Feature `implementation: production_ready` overclaim vs OWNER-READY  
- Fuse-box tiles marked Connected without wires  

---

## First slice acceptance (Support)

Complete only when Product Owner can walk:

Card → Ask a Question → persistence → Contact/Relationship → Consent → Inbox thread → optional Case → deterministic suggestion → human edit/approve → mock send → timeline/MyTap state → TapProof/Insights event → feature-off / provider-unavailable / consent-denied / recovery — **without** regressing J1 VERIFIED.

---

## Phase 2 candidates discovered

| Candidate | Problem | Inspiration | Adaptation | Complexity | Rec |
|-----------|---------|-------------|------------|------------|-----|
| Card Offer Spotlight depth | Offer not attributed as living wire | Shopify / Canva | Bind special_offer → Campaign + Insights | M | After Support |
| TapLoop Card enroll | Loyalty invisible on Card | Loyalty apps | Enroll action + consent | M | Band 4+ |
| Conversation reopen chip on Card | Returning customer friction | Intercom | Personalized Card action when open thread | S | Soon after Support |
| Durable Brand inheritance | Copy/restore only | Figma libraries | Linked fields + impact | L | Phase 2 |
| Live grounded TapGuide | Deterministic only | Intercom Fin | Provider-gated + approval | L | Credentials |

## Explicitly rejected (this wave)

- Second Card system / competing builder  
- Live Meta/SMS as required for Support slice  
- Booking/Payments native checkout  
- TapCast publish-from-Card  
- Freeform canvas depth  
- Claiming Pages/Canva full parity without medium classification  
- Push / deploy / Railway / production cutover  
