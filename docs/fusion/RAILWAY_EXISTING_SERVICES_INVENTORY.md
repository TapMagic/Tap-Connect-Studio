# Railway existing services inventory (read-only)

**Date:** 2026-07-23  
**Access:** Railway CLI **not available** in this agent environment (`railway: command not found`). No Railway MCP. Inventory is therefore derived from **repo metadata only** — not a live Railway dashboard dump.  
**Hard rules:** Do not print secret values. Do not connect local Fusion to Railway DB. Do not migrate, alter, or deploy Railway. Product owner should paste a redacted Railway Variables export (names only) to upgrade UNKNOWN rows.

## Repo-visible Railway metadata

| Item | Value | Notes |
|------|--------|------|
| Config file | `railway.toml` | Nixpacks build; `prisma generate` + `npm run build` |
| Deploy start | `npx prisma db push && npm start` | **Production V1 path** — Fusion must **never** point migrate/`db push` at this DB |
| Healthcheck | `/api/health` | Timeout 120s |
| Project name / env IDs | UNKNOWN | Requires Railway dashboard / CLI login |
| Services list | UNKNOWN | Typical: web app + Postgres (+ maybe Redis) — confirm with PO |
| Production vs staging | UNKNOWN | Assume existing project is **production/shared V1** until confirmed |

## Variable names (from `.env.example` / fusion env docs)

Classification key:

- **SAFE** — SAFE TO REUSE IN LOCAL DEVELOPMENT (non-secret public or dedicated test keys)
- **DEV** — REQUIRES SEPARATE DEVELOPMENT CREDENTIAL
- **PROD** — PRODUCTION ONLY — DO NOT USE LOCALLY
- **UNKNOWN** — PRODUCT OWNER CONFIRMATION REQUIRED
- **OBSOLETE** — likely unused
- **MISSING** — needed for Fusion pillar but not in example / not confirmed on Railway

| Variable name | Provider | Likely app use | Classification | Local-safe? | Notes |
|---|---|---|---|---|---|
| `DATABASE_URL` | Postgres (Railway) | V1/prod persistence | **PROD** | No | Never use for Fusion. Local = `tapconnect_fusion_dev` @ `127.0.0.1:5433` |
| `NEXT_PUBLIC_APP_URL` | App | Absolute URLs, callbacks | **DEV** / staging URL | Use `http://127.0.0.1:3000` locally | Prod Railway domain is PROD |
| `RAILWAY_PUBLIC_DOMAIN` / `RAILWAY_STATIC_URL` | Railway | Public URL fallback | **PROD** | No for Fusion callbacks | Auto-injected on Railway |
| `NEXT_PUBLIC_CLERK_*` / `CLERK_SECRET_KEY` | Clerk | Auth | **DEV** preferred | Dev/staging Clerk app | Prod Clerk users = PROD |
| `PLATFORM_ADMIN_EMAILS` | App | Platform Admin | **SAFE** (emails) | Yes | Not a secret; confirm list |
| `R2_*` | Cloudflare R2 | Media | **DEV** bucket preferred | Separate prefix/bucket | Prod bucket = PROD |
| `UPLOADTHING_TOKEN` / `UPLOADTHING_APP_ID` | UploadThing | Uploads | **DEV** | Yes with test app | |
| `PEXELS_API_KEY` | Pexels | Stock | **SAFE**/DEV | Usually yes | Rate limits; fine for local |
| `UNSPLASH_ACCESS_KEY` / `NEXT_PUBLIC_HAS_UNSPLASH` | Unsplash | Stock | **SAFE**/DEV | Yes | |
| `LOGO_DEV_TOKEN` | Logo.dev | Logos | **SAFE**/DEV | Yes | Publishable-style token |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | OpenAI | Autopilot | **DEV** project preferred | Budgeted test key | Never paste in chat |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Resend | Email | **DEV** | Sandbox/domain | Prod domain = careful |
| `GETRESPONSE_API_KEY` | GetResponse | Email CRM | **DEV**/UNKNOWN | Confirm if still used | |
| `STRIPE_*` | Stripe | Billing | **DEV** test keys | `sk_test_` only | Live keys = PROD |
| `APPLE_*` / `GOOGLE_WALLET_*` | Wallet | Passes | **PROD**/DEV certs | Separate pass type if possible | Certs never in git |
| `META_*` / `INSTAGRAM_*` / `WHATSAPP_*` | Meta | Messaging | **DEV** test app | Tunnel for webhooks | App review = later |
| `MANYCHAT_API_KEY` | ManyChat | Messaging | UNKNOWN | Confirm | |
| `TELEGRAM_BOT_TOKEN` | Telegram | Bot | **DEV** bot | Yes | Separate bot |
| `SMS_PROVIDER_API_KEY` | SMS | Optional | UNKNOWN | | |
| TapCast social keys (`TIKTOK_*`, `YOUTUBE_*`, …) | Social | TapCast | **DEV** | Most need OAuth apps | Scaffolded |
| Productivity OAuth (`MONDAY_*`, `ASANA_*`, …) | Various | Connectors | **DEV** | Localhost/tunnel | Scaffolded |
| `GOOGLE_MAPS_API_KEY` | Google | Maps | **DEV** restricted key | Yes with HTTP referrer localhost | |
| `SENTRY_DSN` | Sentry | Errors | **DEV** project preferred | Optional | |
| `BOOKING_*` / `POS_*` / `CRM_*` / `SIMPLECONSIGN_*` | Ops | Optional | UNKNOWN/MISSING | | |

## Callback / webhook domains (inferred)

| Provider | Current (prod) | Required local | Tunnel? |
|---|---|---|---|
| Clerk | Railway public URL | `http://127.0.0.1:3000` + Clerk allowlist | No for local HTTP |
| Stripe | Railway `/api/.../webhook` | Stripe CLI forward to localhost | CLI preferred |
| Meta | Railway verify URL | ngrok/cloudflare tunnel | **Yes** |
| Resend | Domain DNS on prod | Optional webhook | Usually no for send-only |
| UploadThing | App URL | Local + UT dashboard | Check UT docs |

## Services classification summary

| Integration | Reuse locally? |
|---|---|
| Railway Postgres | **PRODUCTION ONLY — DO NOT USE LOCALLY** |
| Railway web deploy | **PRODUCTION ONLY** — do not redeploy from Fusion branch without authorization |
| Stock APIs (Pexels/Unsplash/Logo.dev) | Often **SAFE TO REUSE** if keys are unrestricted |
| Clerk / Stripe / OpenAI / Resend / R2 / UploadThing | **REQUIRES SEPARATE DEVELOPMENT CREDENTIAL** (or confirmed test keys) |
| Wallet / Meta production apps | **PRODUCTION ONLY** or dedicated sandbox |
| Social / productivity OAuth | Mostly **UNKNOWN** until PO confirms which exist on Railway |

## Gaps

1. Live Railway project/environment/service inventory — **MISSING** (CLI/dashboard access).  
2. Exact variable presence vs `.env.example` — **UNKNOWN**.  
3. Obsolete variables — cannot detect without dashboard.  

**PO action to upgrade this doc:** Export Railway Variables as **names only** (redact values) for each service/environment and attach to this file.
