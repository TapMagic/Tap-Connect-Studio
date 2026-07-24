# Railway production inheritance map

**Date:** 2026-07-24  
**Production Studio domain:** `https://studio.tapthemagic.com`  
**Hard rules:** Names only — never print secret values. Do not migrate or alter the Railway production database. Do not push, deploy, change DNS, or modify Railway until explicitly authorized.

## 1. Live Railway inspection status

| Check | Result |
|-------|--------|
| Railway CLI login in this agent environment | **Unauthorized** (`railway login` required) |
| Live project / environment / service dump | **Not available** this session |
| Repo metadata | `railway.toml` (Nixpacks; start: `npx prisma db push && npm start`; health `/api/health`) |
| Prior inventory | `docs/fusion/RAILWAY_EXISTING_SERVICES_INVENTORY.md` |

**Assumption for cutover planning:** The V1 production Railway environment already holds working provider variables for the live Studio at `studio.tapthemagic.com`. **Do not ask the product owner to recreate credentials that already exist and remain valid.** Upgrade UNKNOWN presence rows by pasting a **names-only** Railway Variables export into §8.

## 2. Classification legend

| Tag | Meaning |
|-----|---------|
| **COMPATIBLE** | Same name fusion expects — reuse as-is on Railway prod after validation |
| **ALIAS** | V1/alternate name supported via `lib/config/env-aliases.ts` during cutover |
| **RENAME** | Prefer setting the fusion canonical name; keep alias until providers updated |
| **PROD_ONLY** | Must stay on production / staging-isolated — never point local Fusion at these |
| **STAGING_SEPARATE** | Prefer separate staging/sandbox credentials or modes |
| **OBSOLETE** | Likely unused by fusion; retain until confirmed unused |
| **MISSING_FUSION** | Needed for a fusion pillar; may still be absent on V1 Railway |
| **UNKNOWN_PRESENCE** | Cannot confirm presence without Railway names-only export |

## 3. Core platform map

| V1 / Railway name (expected) | Fusion canonical | Feature / provider | Classification | Notes |
|------------------------------|------------------|--------------------|----------------|-------|
| `DATABASE_URL` | `DATABASE_URL` | Postgres | **PROD_ONLY** | Never migrate/alter prod during audit. Staging must use a **separate** DB. Local Fusion = `tapconnect_fusion_dev` only |
| `NEXT_PUBLIC_APP_URL` | `NEXT_PUBLIC_APP_URL` | App URLs | **COMPATIBLE** | Must be `https://studio.tapthemagic.com` in production |
| `APP_URL` / `SITE_URL` | → `NEXT_PUBLIC_APP_URL` | App URLs | **ALIAS** | Resolved by `resolveEnv` |
| `RAILWAY_PUBLIC_DOMAIN` / `RAILWAY_STATIC_URL` | (auto) | URL fallback | **COMPATIBLE** | Railway-injected; prefer explicit `NEXT_PUBLIC_APP_URL` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | same | Clerk / auth | **COMPATIBLE** / **STAGING_SEPARATE** for staging | Reuse prod Clerk for prod cutover; staging should use staging instance if available |
| `CLERK_PUBLISHABLE_KEY` | → publishable | Clerk | **ALIAS** | |
| `CLERK_SECRET_KEY` | same | Clerk | **COMPATIBLE** | |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` etc. | same | Clerk routes | **COMPATIBLE** | Paths `/sign-in`, `/sign-up`, `/auth/continue` |
| `PLATFORM_ADMIN_EMAILS` | same | Platform Admin | **COMPATIBLE** | Not a secret |

## 4. Media / storage

| Name | Fusion | Feature | Classification |
|------|--------|---------|----------------|
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | same | Media upload | **COMPATIBLE** / **STAGING_SEPARATE** bucket prefix preferred for staging |
| `CLOUDFLARE_*` / `CF_ACCOUNT_ID` | → `R2_*` | Media | **ALIAS** |
| `UPLOADTHING_TOKEN`, `UPLOADTHING_APP_ID` | same | Upload UX | **COMPATIBLE** |
| `UPLOADTHING_SECRET` | → `UPLOADTHING_TOKEN` | Upload | **ALIAS** |
| `PEXELS_API_KEY`, `UNSPLASH_ACCESS_KEY`, `LOGO_DEV_TOKEN` | same | Stock / logos | **COMPATIBLE** (often safe to share; rate limits) |

## 5. AI / email / billing

| Name | Fusion | Feature id | Classification |
|------|--------|------------|----------------|
| `OPENAI_API_KEY`, `OPENAI_MODEL` | same | `ai.autopilot`, `ai.keywords` enhance | **COMPATIBLE** / budget monitor |
| `OPENAI_KEY` | → `OPENAI_API_KEY` | AI | **ALIAS** |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | same | `comms.email` | **COMPATIBLE** — from-address must match verified domain |
| `GETRESPONSE_API_KEY` | same | Email CRM | **UNKNOWN_PRESENCE** / optional |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | same | `billing.stripe` | **COMPATIBLE** for prod; staging must use **test** keys |
| Stripe alt names | → Stripe canonicals | Billing | **ALIAS** |

## 6. Wallet / messaging / social (TapCast)

| Name family | Fusion | Feature | Classification |
|-------------|--------|---------|----------------|
| `APPLE_*`, `GOOGLE_WALLET_*` | same | `wallet.apple_google` | **PROD_ONLY** certs on prod; staging needs sandbox / mock until certs certified |
| `META_APP_ID`, `META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN`, `META_WEBHOOK_VERIFY_TOKEN` | same | Meta / IG / Messenger / Threads | **COMPATIBLE** — update webhook URL host if domain already correct |
| `FACEBOOK_APP_*` | → `META_*` | Meta | **ALIAS** |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `FACEBOOK_PAGE_ID`, `MESSENGER_PAGE_ID`, `THREADS_USER_ID` | same | Meta surfaces | **COMPATIBLE** |
| `WHATSAPP_*` / `META_WA_*` | WhatsApp | Messaging | **COMPATIBLE** / **ALIAS** |
| `MANYCHAT_API_KEY`, `TELEGRAM_BOT_TOKEN` | same | Messaging | **UNKNOWN_PRESENCE** |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI`, `TIKTOK_ACCESS_TOKEN` | same | `tapcast.tiktok` | **COMPATIBLE** — redirect URI must use studio domain |
| `YOUTUBE_*` / `GOOGLE_CLIENT_*` | YouTube / GBP | TapCast | **COMPATIBLE** / shared Google OAuth |
| `X_API_*` / `TWITTER_*` / `X_CLIENT_*` | X | TapCast | **COMPATIBLE** / **ALIAS** |
| `LINKEDIN_*`, `PINTEREST_*`, `SNAPCHAT_*`, `BLUESKY_*`, `REDDIT_*`, `DISCORD_*` | same | TapCast | **UNKNOWN_PRESENCE** until names-only export |
| `TWILIO_*` | SMS | TapCast / SMS | **UNKNOWN_PRESENCE** |
| `SLACK_BOT_TOKEN` (+ client id/secret) | Slack community | TapCast / productivity | **ALIAS** / **COMPATIBLE** |

## 7. Productivity connectors

All `MONDAY_*`, `ASANA_*`, `CLICKUP_*`, `MICROSOFT_GRAPH_*`, `JIRA_*`, `TRELLO_*`, `NOTION_*`, `SLACK_CLIENT_*`, `GITHUB_*`, `GOOGLE_CALENDAR_*`, `GOOGLE_DRIVE_*`, `AIRTABLE_*`, Zapier/Make/n8n signing secrets:

| Classification | Guidance |
|----------------|----------|
| **COMPATIBLE** if already on Railway | Reuse; update OAuth redirect URIs to `https://studio.tapthemagic.com/...` only if currently pointing elsewhere |
| **STAGING_SEPARATE** | Prefer staging OAuth apps for rehearsal |
| **MISSING_FUSION** | Mock adapters work; live = VERIFIED — CREDENTIALS REQUIRED until present |

## 8. Presence upgrade (PO — names only)

Paste Railway Variables export **names only** (redact all values) below after export:

```
# Environment: production | staging
# Service: <web>
# Names:
# - ...
```

Until then, treat presence as **UNKNOWN_PRESENCE** except where V1 production behavior already proves a provider works (Clerk, R2, Resend, etc. — inferred from live Studio, not from printed secrets).

## 9. Backward-compatible aliases (code)

Implemented in `lib/config/env-aliases.ts` + used by `getAppUrl()` / `isClerkConfigured()`:

- Resolves fusion canonical names from legacy alternates when the canonical key is unset.
- Admin readiness should report **names + presentVia (canonical|alias|missing)** — never values.
- Aliases are temporary for cutover; prefer setting canonical names on Railway when convenient (no recreation of secrets — rename/copy within Railway UI).

## 10. Explicit non-actions

- [x] No Railway DB migration during this audit  
- [x] No Railway variable modification this session  
- [x] No deploy / DNS / push  
- [ ] Staging environment created (requires PO authorization)  
- [ ] Production cutover (requires PO authorization + checklist)  

## Related docs

- `docs/fusion/DOMAIN_AND_CALLBACK_MAP.md`
- `docs/fusion/PRODUCTION_CUTOVER_CHECKLIST.md`
- `docs/fusion/RAILWAY_EXISTING_SERVICES_INVENTORY.md`
- `docs/fusion/PROVIDER_READINESS.md`
