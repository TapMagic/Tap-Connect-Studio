# Card Offer Fuse — Contract Matrix & Resolver Decision

**Wave:** Card-to-Campaign Conversion Engine  
**Working title:** Card Offer Fuse / Conversion Loop  
**Branch:** `tapconnect-v1-v2-fusion`  
**Starting HEAD:** `6f1e1e494e5795bb223c4924e0a5eb1b69e8dedb`  
**Date:** 2026-07-26  
**Feature Registry:** `card.fuse.offer`  
**Classification:** IMPLEMENTED BUT NOT OWNER-READY (mock Distribution / follow-up; no live Resend/Meta/Wallet)

**Rule:** Never mark the Offer fuse **Connected** without a real Card wire (bound Campaign-owned offer + public act path + evidence).

---

## 1. Source of truth

| Layer | Owner | Contents |
|-------|-------|----------|
| **Authoritative offer** | **Campaign** | Initiative, objective, timing, eligibility, terms, value, offer definition (`offer_coupon` block), lifecycle |
| **Card Spotlight** | **Card projection** | Customer-facing teaser + CTA; inherits authoritative facts; may hold medium-specific presentation (kicker, style) |
| **Email / TapCast mocks** | **Distribution variants** | Medium-specific presentation of the **same** offer; never separately authored offer facts |
| **TapProof / Insights** | Evidence | Unified funnel events attributed to Campaign + Card section |

**Forbidden:** Re-entering offer title/code/terms in Card, email, and social as independent SoTs.

---

## 2. Projection rules

1. Host binds Card `special_offer` → Campaign (+ optional `offer_coupon` block id).
2. On bind / refresh projection: copy authoritative facts into Spotlight fields (`offerTitle`, `offerDescription`, `offerCode`, `offerExpires`, `offerCta`).
3. Preserve intentional medium-specific presentation when present: `text` (kicker), `specialStyle`, host override `headline`/`description` teaser — mark as presentation, not facts.
4. Store `offerFactsFingerprint` (hash of authoritative facts) on the section at sync time.
5. **Stale detection:** if current Campaign fingerprint ≠ stored fingerprint → status `stale` → host must Review / Refresh projection (never silent overwrite of host teaser overrides).
6. Changes to the Campaign offer require Preview → Validate → Approve/Publish path before public Card shows the new facts (refresh projection + Card/Campaign publish).

---

## 3. Resolver precedence (deterministic)

When a Tap Point could serve both a living Card Spotlight and a Campaign takeover:

| Priority | Condition | Customer result | Attribution |
|---------:|-----------|-----------------|-------------|
| **1** | Live Campaign resolves (group schedule → device schedule → default assignment) and `isCampaignLive` | **Campaign takeover** owns the page surface | `campaignId` = live campaign |
| **1a** | Brand Kit Card has a bound Spotlight (`offerMode: campaign` + `linkedCampaignId`) and feature `card.fuse.offer` is on | **Inject Card Spotlight projection** above campaign blocks (Campaign-owned facts; Card section id for evidence) | `campaignId` + `sectionId` + `offerBlockId` |
| **2** | No live Campaign, Brand Kit has a living (non-retired) Card with sections | **Card-first public experience** (full TapConnectCard including Spotlight) | Card + bound `campaignId` when Spotlight is bound |
| **3** | No live Campaign, no living Card | Existing end-experience cascade (`resolveTapContent`) | As today |
| **4** | Inactive / missing device | Status pages | — |

**Host explanation (plain language):**  
“A live Campaign on the Tap Point takes over the page. Your Card Offer still shows as Spotlight on that page when bound. If nothing is live, customers see your Card.”

**Fallback:** If Spotlight is bound but Campaign is missing/archived → show Configure/Partial honesty; do not invent offer facts.

**Scheduling:** Unchanged — group/device schedule decides which Campaign is live; Spotlight follows the bound Campaign’s facts regardless of which device URL was snapshotted historically (re-resolve at serve time).

---

## 4. Customer entry

1. Tap Tap Point → public page (per resolver above).
2. See Spotlight (value, terms, CTA) — not a buried link-only tile when fuse is on.
3. Act: **Claim** / **Keep Card** / **Submit lead** (consent when marketing email or lead capture).
4. Confirmation on Card or MyTap: Saved / Requested / Available.
5. Optional consented mock follow-up referencing same offer.
6. Ask a Question remains available via utility layer.

---

## 5. Host path

1. Create → **“Put an offer on my Card”** recipe → Card assembly / edit Offer wire.
2. Create or bind Campaign-owned offer (`offer_coupon`).
3. Preview Card Spotlight + email mock + TapCast mock package + confirmation + Insights attribution model.
4. Publish / assign Tap Point.
5. Optional: prepare Distribution package (mock).
6. Measure Insights funnel.

---

## 6. Consent & suppression

| Action | Consent |
|--------|---------|
| Offer view | None |
| Claim code only (no email) | None (analytics only) |
| Lead / claim with email | EMAIL consent GRANTED required for follow-up; lead form requires `consentGiven` |
| Mock follow-up | Guardian + suppression; marketing purpose; human-approval flag on package |
| Keep | Existing TapSave consent path |

---

## 7. Events & Insights

| Event | Evidence |
|-------|----------|
| `card.offer.viewed` | ClickEvent / governed event |
| `card.offer.claimed` | ClickEvent + optional Lead `couponClaimed` |
| `card.offer.lead` | Lead + Contact/Relationship |
| `card.offer.followup_queued` | Outbox email mock |
| `card.offer.distribution_prepared` | Audit + package metadata |

Insights KPIs: offer views, claims, leads, follow-ups prepared — `confirmed` when persisted.

---

## 8. Fuse-box statuses

| Status | When |
|--------|------|
| **Connected** | Feature on + Spotlight bound to Campaign with authoritative offer + ≥1 claim/lead evidence |
| **Partial** | Feature on + bound (or Spotlight present) but no conversion evidence yet |
| **Configure** | Feature on + no bound Spotlight / no Campaign offer |
| **Provider required** | N/A for acceptance (mocks suffice); live email/social later |
| **Consent required** | Follow-up attempted without consent / suppressed |
| **N/A** | Feature off |

---

## 9. Failure & recovery

| Failure | Customer | Host |
|---------|----------|------|
| Feature off | Spotlight falls back to V1 link/expand behavior | Fuse shows N/A |
| Campaign missing | Honest “offer unavailable” | Configure wire |
| Stale projection | Still shows last published projection | Review / refresh |
| Consent denied | Claim without email OK; follow-up blocked | Consent required |
| Suppression | Follow-up blocked | Guardian reason |

---

## 10. Capability matrix (abbreviated 1–30)

| # | Contract |
|---|----------|
| 1 | Spotlight on public Card / injected on Campaign takeover |
| 2 | `special_offer` section + claim form |
| 3 | Public + personalized MyTap confirmation |
| 4 | Offer status on MyTap when claimed/kept |
| 5 | Keep path preserved |
| 6 | Consent on lead/follow-up |
| 7 | Suppression on outbound mock |
| 8 | Campaign owns authoritative offer |
| 9 | Deferred TapFlow bind |
| 10 | Contract-only canvas node |
| 11 | TapProof via governed events |
| 12 | `card.offer.*` events |
| 13 | Offer funnel KPIs |
| 14 | None for mock acceptance |
| 15 | Mock distribution / follow-up |
| 16 | `card.fuse.offer` |
| 17 | Plan later |
| 18 | Public claim + host bind |
| 19 | Recipe empty CTA |
| 20 | Humanized errors |
| 21 | Feature-off honesty |
| 22 | Re-bind / refresh projection |
| 23 | Unbind Spotlight |
| 24 | Platform audit |
| 25 | Scan Mode QA |
| 26 | `special_offer` + `offer_coupon` + email mock + TapCast mock |
| 27 | Bind contract, claim API, resolver, Insights, Distribution package |
| 28 | Claimed / saved offer |
| 29 | One offer → Card → proof |
| **30** | **Genuinely Card-wired** (mock channels) |

---

## 11. Non-goals (this wave)

Live Resend · Live Meta/TapCast · Wallet certs · Stripe · Autopilot · TapLoop enroll · TapFlow Card bind · Comms CC · New Conversion nav destination.
