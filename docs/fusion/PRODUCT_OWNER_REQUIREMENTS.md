# Product owner requirements

**Date:** 2026-07-23  
**Rule:** Only list what the product owner must supply. Implementation choices stay with engineering.  
**Local persistence:** `tapconnect_fusion_dev` only — never Railway production `DATABASE_URL`.

---

## NEEDED NOW

### PO-NOW-001 — Reliable local Postgres for this machine

| Field | Value |
|-------|--------|
| Provider | Local Postgres / Docker |
| Exact need | Docker Desktop **or** confirmed Postgres 16 on `127.0.0.1:5433`, DB `tapconnect_fusion_dev`, user/pass `tapconnect`/`tapconnect` |
| Env var | `DATABASE_URL=postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev` |
| Where to enter | `.env.local` (gitignored) |
| Secret? | Local password only — not a cloud secret |
| Unlocks | Migrate/seed/browser OWNER-READY proofs |
| Without it | Embedded PG workaround may work for demos; formal proofs fragile |
| Other work continues? | **Yes** |

### PO-NOW-002 — Redacted Railway variable names (optional but upgrades inventory)

| Field | Value |
|-------|--------|
| Provider | Railway dashboard |
| Exact need | Export **variable names only** per service/environment (no values) |
| Where | Attach to `RAILWAY_EXISTING_SERVICES_INVENTORY.md` |
| Secret? | Names are not secrets; values must stay redacted |
| Unlocks | Accurate SAFE/DEV/PROD classification |
| Without it | Inventory stays UNKNOWN for live Railway services |
| Other work continues? | **Yes** |

If Docker/embedded Postgres is already working for the owner’s machine and Railway export can wait:

**No product-owner credential input is currently required to continue implementation.** Continue wiring, tests, and headed proofs on isolated DB.

---

## NEEDED FOR LIVE PROVIDER VERIFICATION

Do **not** reuse production-only secrets. Prefer development/test applications.

| ID | Provider | Create | Env vars | Where | Secret? | Unlocks | Without it |
|----|----------|--------|----------|-------|---------|---------|------------|
| PO-LIVE-001 | OpenAI | Dev project + budget | `OPENAI_API_KEY`, `OPENAI_MODEL` | `.env.local` | Yes | Live Autopilot + Keywords AI enhance | Mock/kill-switch; Keywords local grounded works without OpenAI |
| PO-LIVE-001b | Approved trend provider | Dev app + ToS-approved source | TBD (never scrape illegally) | `.env.local` | Yes | Live Keywords trend enrichment | Keywords trends stay **VERIFIED — CREDENTIALS REQUIRED**; local grounded hashtags still work |
| PO-LIVE-002 | Resend | API key + from domain | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | `.env.local` | Yes | Live email | Email mock |
| PO-LIVE-003 | Stripe | **Test** mode keys + webhook | `STRIPE_SECRET_KEY` (`sk_test_`), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | `.env.local` + Stripe CLI | Yes | Billing/checkout | Readiness UI |
| PO-LIVE-004 | Pexels | API key | `PEXELS_API_KEY` | `.env.local` | Soft | Stock search | Upload/local |
| PO-LIVE-005 | Unsplash | Access key | `UNSPLASH_ACCESS_KEY` | `.env.local` | Soft | Stock search | Same |
| PO-LIVE-006 | Logo.dev | Token | `LOGO_DEV_TOKEN` | `.env.local` | Soft | Logo search | Same |
| PO-LIVE-007 | UploadThing | Dev app | `UPLOADTHING_TOKEN` | `.env.local` | Yes | Cloud upload | Local paths |
| PO-LIVE-008 | Cloudflare R2 | **Dev** bucket | `R2_*` | `.env.local` | Yes | Object storage | Local/UT |
| PO-LIVE-009 | Clerk | **Dev/staging** application | `NEXT_PUBLIC_CLERK_*`, `CLERK_SECRET_KEY`, `PLATFORM_ADMIN_EMAILS` | `.env.local` + Clerk dashboard URLs | Yes | Real auth/roles | Dev session fallback |
| PO-LIVE-010 | Apple Wallet | Pass Type ID + certs | `APPLE_*` | Vault → `.env.local` | Yes | Live passes | Mock wallet |
| PO-LIVE-011 | Google Wallet | Issuer + SA JSON | `GOOGLE_WALLET_*` | Vault → `.env.local` | Yes | Live passes | Mock wallet |
| PO-LIVE-012 | Meta family | Dev app + tokens | `META_*`, IG/WA vars | `.env.local` + tunnel | Yes | Live messaging | Inbox mock |
| PO-LIVE-013 | Telegram | Dev bot | `TELEGRAM_BOT_TOKEN` | `.env.local` | Yes | Bot channel | Disabled |
| PO-LIVE-014 | GetResponse | Confirm if still used | `GETRESPONSE_API_KEY` | `.env.local` | Yes | CRM sync | Unused |
| PO-LIVE-015 | Social TapCast | Per-network apps | `TIKTOK_*` … | `.env.local` | Yes | TapCast live | Scaffold |
| PO-LIVE-016 | Productivity | OAuth apps | `MONDAY_*` … | `.env.local` | Yes | Connectors | Scaffold |

**Safe handling:** Store in password manager; copy once into `.env.local`; never commit; never paste into issues/chat; rotate if exposed.

---

## NEEDED BEFORE STAGING

| Item | Detail |
|------|--------|
| Staging hostname / DNS | Dedicated URL ≠ prod Railway |
| Staging Clerk application | Separate from prod users |
| Staging database | New Postgres — **not** Railway prod |
| Sender domain verification | Resend/DNS |
| Legal pages URLs | Privacy / terms for consent |
| Stripe test products mapped to plans | Price IDs |
| Webhook endpoints on staging domain | Stripe/Meta/etc. |

---

## NEEDED BEFORE PRODUCTION

| Item | Detail |
|------|--------|
| Live Stripe | `sk_live_` only after staging |
| Wallet production approval | Apple/Google |
| Meta app review | Messenger/IG/WA |
| Monitoring / backups / Sentry | Ops |
| Privacy/terms finalized | Legal |
| Billing plan decisions | Entitlements |
| Production credential vault | Railway/prod secrets — **authorized deploy only** |

---

## PRODUCT DECISIONS (unresolved owner choices only)

Cross-check `PRODUCT_OWNER_DECISIONS.md` / input queue. At audit time, no new blocking product decision beyond:

1. Whether embedded Postgres is acceptable until Docker is installed (ops preference).  
2. Which messaging channels are in Fusion v1 scope vs later (Meta vs email-first).  
3. Stripe product ↔ plan mapping when billing verification starts.

Ordinary IA, badge derivation, and builder fixes do **not** need owner decisions.

---

## Keywords / Brand Vocabulary (Workstream C — status)

| Item | Status |
|------|--------|
| Local grounded suggest/accept/reject/edit/lock/archive/restore | Implemented on isolated DB — no PO credential required |
| Named Brand Pack create/reuse + locale | Implemented |
| Channel-specific TT/IG/FB/YT + campaign/location trigger scope | Implemented + headed owner-gate proofs |
| Admin kill switch `ai.keywords` | Implemented (UI + API 503 + audit + canvas `bind_keyword_trigger` 503); shared proof with `canvas.tapcanvas` / `journey.tapflow` |
| Live OpenAI enhance / live trends | **VERIFIED — CREDENTIALS REQUIRED** — see PO-LIVE-001 / PO-LIVE-001b |
| OWNER-READY | **Not yet** — retain a11y + live provider blockers |
