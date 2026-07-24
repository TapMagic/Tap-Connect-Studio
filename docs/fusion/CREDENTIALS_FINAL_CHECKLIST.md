# Credentials final checklist (PO supply — no secret values)

Consolidated inventory of what Product Owner / ops must supply later to activate Fusion pillars. **Never paste secret values into tickets, chat, or this repo.** Missing credentials are not a build blocker — features stay off / mock until certified.

Related: `INTEGRATION_AND_CREDENTIAL_REQUIREMENTS.md`, `ENVIRONMENT_READINESS_MATRIX.md`, `PROVIDER_CERTIFICATION_CHECKLIST.md`, `.env.example`.

## How to use

1. Check boxes only when the credential exists in the secure store (1Password / Railway vars / etc.).
2. Platform Admin enables the matching Feature Registry id **after** sandbox certification.
3. Fusion migrations stay on isolated `tapconnect_fusion_dev` only — **never Railway production DATABASE_URL**.

---

## P0 — always required for local / staging Studio

| Item | Env keys (names only) | Feature / surface | Status |
|------|----------------------|-------------------|--------|
| Isolated Postgres | `DATABASE_URL` → `tapconnect_fusion_dev` | All Prisma | [ ] |
| App URL | `NEXT_PUBLIC_APP_URL` | Links, wallet, MyTap | [ ] |
| Clerk auth | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, sign-in/up URLs | Session gates | [ ] |
| Platform admins | `PLATFORM_ADMIN_EMAILS` | `/admin/platform` | [ ] |

---

## P1 — Automation Team + Billing

| Item | Env keys | Feature id | Status |
|------|----------|------------|--------|
| OpenAI | `OPENAI_API_KEY`, `OPENAI_MODEL` | `ai.autopilot` | [ ] |
| Stripe secret | `STRIPE_SECRET_KEY` | `billing.stripe` | [ ] |
| Stripe publishable | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `billing.stripe` | [ ] |
| Stripe webhook | `STRIPE_WEBHOOK_SECRET` | `billing.stripe` | [ ] |
| Stripe products/prices | (Dashboard IDs — map to `lib/fusion/billing/plans.ts`) | Billing UX | [ ] |

PO also: spend limits, Studio+ plan gating policy, no raw card data in Tap Connect DB.

---

## P1 / P2 — Email + Channel Guardian messaging

| Item | Env keys | Feature id | Status |
|------|----------|------------|--------|
| Resend | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | `comms.email` | [ ] |
| GetResponse (optional) | `GETRESPONSE_API_KEY` | Integrations | [ ] |
| Meta app | `META_APP_ID`, `META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN`, `META_WEBHOOK_VERIFY_TOKEN` | `comms.messaging` | [ ] |
| Instagram | `INSTAGRAM_BUSINESS_ACCOUNT_ID` | `comms.messaging` | [ ] |
| WhatsApp | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` | `comms.messaging` | [ ] |
| Telegram | `TELEGRAM_BOT_TOKEN` | `comms.messaging` | [ ] |
| ManyChat | `MANYCHAT_API_KEY` | `comms.messaging` | [ ] |
| SMS provider | `SMS_PROVIDER_API_KEY` | `comms.messaging` | [ ] |

PO also: webhook URLs, template approval, Guardian quiet hours / consent policy.

---

## P2 — Wallet + TapSave

| Item | Env keys | Feature id | Status |
|------|----------|------------|--------|
| Apple Wallet | `APPLE_TEAM_ID`, `APPLE_PASS_TYPE_ID`, `APPLE_PASS_CERT`, `APPLE_PASS_CERT_PASSWORD`, `APPLE_WWDR_CERT` | `wallet.apple_google` | [ ] |
| Google Wallet | `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON` | `wallet.apple_google` | [ ] |
| TapSave enablement | (feature flag only) | `tapsave.core` first | [ ] |

Cert material stays in secure storage — not committed. Mock adapters remain functional until cert swap.

---

## P2 — Journeys / TapFlow

| Item | Notes | Feature id | Status |
|------|-------|------------|--------|
| JourneyDraft migration | Apply on isolated fusion DB | `journey.tapflow` | [ ] |
| Pilot workspace enable | Feature Registry override + reason | `journey.tapflow` | [ ] |

---

## P2 / P3 — Media & stock

| Item | Env keys | Status |
|------|----------|--------|
| Cloudflare R2 | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | [ ] |
| UploadThing | `UPLOADTHING_TOKEN`, `UPLOADTHING_APP_ID` | [ ] |
| Pexels | `PEXELS_API_KEY` | [ ] |
| Unsplash | `UNSPLASH_ACCESS_KEY`, `NEXT_PUBLIC_HAS_UNSPLASH` | [ ] |
| Logo.dev | `LOGO_DEV_TOKEN` | [ ] |

---

## P3 — Social (TapCast) — supply only when prioritized

Live classification for every row below: **VERIFIED — CREDENTIALS REQUIRED** until certified. Mock publish ≠ live OWNER-READY. Full remaining requirements (scopes, callbacks, webhooks, review, business verification, prod approval, test procedure): `PROVIDER_READINESS.md`.

| Provider | Env keys | Status |
|----------|----------|--------|
| TikTok | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI`, `TIKTOK_ACCESS_TOKEN` | [ ] |
| YouTube | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` | [ ] |
| X | `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET` | [ ] |
| LinkedIn | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | [ ] |
| Pinterest | `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET` | [ ] |
| Snapchat | `SNAPCHAT_CLIENT_ID` | [ ] mock-only organic — do not treat as live publish |
| Bluesky | `BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORD` | [ ] |
| Google Business | `GOOGLE_BUSINESS_PROFILE_ACCOUNT_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | [ ] |
| Meta (IG/FB/Threads/Messenger) | `META_APP_ID`, `META_APP_SECRET`, page/IG ids, webhook verify | [ ] |
| OpenAI (Keywords / Autopilot) | `OPENAI_API_KEY`, `OPENAI_MODEL` | [ ] |
| Trend provider | (approved vendor TBD) | [ ] |

---

## P3 — Productivity connectors

| Provider | Env keys | Status |
|----------|----------|--------|
| monday.com | `MONDAY_CLIENT_ID`, `MONDAY_CLIENT_SECRET` | [ ] |
| Asana | `ASANA_CLIENT_ID`, `ASANA_CLIENT_SECRET` | [ ] |
| ClickUp | `CLICKUP_CLIENT_ID`, `CLICKUP_CLIENT_SECRET` | [ ] |
| Microsoft Graph | `MICROSOFT_GRAPH_CLIENT_ID`, `MICROSOFT_GRAPH_CLIENT_SECRET`, `MICROSOFT_GRAPH_TENANT_ID` | [ ] |
| Jira | `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET` | [ ] |
| Trello | `TRELLO_API_KEY`, `TRELLO_API_SECRET` | [ ] |
| Notion | `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET` | [ ] |
| Slack | `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` | [ ] |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | [ ] |

---

## P3 — Ops / commerce optional

| Item | Env keys | Status |
|------|----------|--------|
| Google Maps | `GOOGLE_MAPS_API_KEY` | [ ] |
| Booking / POS / CRM | `BOOKING_PROVIDER_API_KEY`, `POS_PROVIDER_API_KEY`, `CRM_PROVIDER_API_KEY` | [ ] |
| SimpleConsign | `SIMPLECONSIGN_API_KEY` | [ ] |
| Sentry | `SENTRY_DSN` | [ ] |

---

## Explicit non-goals for PO credential supply

- Do **not** provide Railway production `DATABASE_URL` for Fusion migrate/dev.
- Do **not** store Apple/Google signing private keys in git or chat.
- Do **not** enable `ai.autopilot` / `comms.messaging` / `wallet.apple_google` without Admin reason + sandbox dry-run.

When every P0–P1 box for a pillar is checked and Admin enablement is recorded, that pillar may be marked credentials-ready in `ENVIRONMENT_READINESS_MATRIX.md`.
