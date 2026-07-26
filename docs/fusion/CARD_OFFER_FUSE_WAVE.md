# Card Offer Fuse Wave — Delivery Ledger

**Wave:** Card-to-Campaign Conversion Engine  
**Branch:** `tapconnect-v1-v2-fusion`  
**Starting HEAD:** `6f1e1e494e5795bb223c4924e0a5eb1b69e8dedb`  
**Date:** 2026-07-26  
**Classification:** IMPLEMENTED BUT NOT OWNER-READY  
**Contract:** `docs/fusion/CARD_OFFER_FUSE_CONTRACT.md`

**Selection rule (pre-commit correction):** When multiple eligible Campaigns exist, the host must choose one explicitly — never preselect by recency. A sole eligible Campaign may be suggested but still requires conscious confirmation. No eligible Campaign shows an empty state linking to Workbench (no Card-owned duplicate offer).

## Delivered

- Authoritative offer SoT on Campaign `offer_coupon`; Card Spotlight projection + fingerprint / stale detection
- Feature Registry `card.fuse.offer`
- Public claim/keep/lead API + form; mock follow-up via email mock + Guardian/suppression
- Host bind + unified preview + mock Distribution package APIs
- Resolver precedence: live Campaign takeover (+ inject Spotlight when bound) → Card-first → end experience
- Fuse-box Offer wire evidence-based status
- Create recipe “Put an offer on my Card”
- Insights KPIs: offer views / claims / leads / follow-ups
- Seed Spotlight bound to Welcome Offer
- Unit + API smoke + headed e2e specs

## Explicit non-claims

- Live Resend / Meta / TapCast publish
- Wallet certification
- TapLoop enroll from Card
- TapFlow Card bind
- Communications Command Center
- Owner-ready / Owner-accepted
