# TapConnect Studio — Operator Setup Guide

How to run, review, and (eventually) connect providers. Missing credentials
never block local review and never produce false success.

## 1. Run locally

```bash
npm install
# isolated dev database (never a shared/production DB)
# name MUST match *fusion*dev* — the safety guard refuses anything else
export DATABASE_URL="postgresql://user:pass@127.0.0.1:5432/tapconnect_fusion_dev"
npx prisma db push        # or: npm run db:migrate:deploy on a baselined DB
npm run fusion:seed       # optional demo workspace ([SEED] Demo Cafe)
npm run dev               # Next.js dev server
```

In the Replit workshop environment the `Start application` workflow runs the
same command bound to port 5000 against the isolated `tapconnect_fusion_dev`
database created inside the workspace Postgres.

## 2. Provider readiness model

Every provider surfaces one of these honest states in the product
(`.tc-readiness[data-state]`):

| State | Meaning |
|---|---|
| `local_mock` | No credentials. Deterministic local behavior; nothing external happens. |
| `provider_test` | Test credentials (e.g. Stripe test mode). |
| `configured` | Real credentials present, not yet verified live-ready. |
| `live_ready` | Verified and allowed to act externally. |
| `planned` | Capability announced, not yet available — visibly labeled. |
| `unavailable` | Intentionally off — visibly disabled with explanation. |

## 3. Providers

Copy `.env.example` to `.env.local` and fill only what you need.

### Clerk (authentication)
- Keys: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, sign-in/up URLs.
- **Missing:** `middleware.ts` bypasses Clerk; `lib/auth.ts` creates a local
  dev session (`dev@tapconnect.local`, labeled "Dev mode" banner). Never
  active in production builds with keys present.

### Resend (email)
- Keys: `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` (+ `_PREVIOUS` for rotation),
  `EMAIL_FROM_ADDRESS/NAME`, `EMAIL_RECEIVING_DOMAIN`, `EMAIL_REPLY_ALIAS_DOMAIN`.
- Mode: `EMAIL_RUNTIME_MODE=local_mock` (default).
- **Missing:** authoring, rendering, previews, inbound fixtures, and Reply
  Routing configuration all work; sends are recorded as `mock:true` outbox
  events; no delivery is ever claimed.

### Stripe (checkout / billing)
- Keys: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`; `STRIPE_MODE=test`,
  `STRIPE_LIVE_ENABLED=false` until launch review.
- **Missing:** published offer Cards stay live; checkout routes to
  `/offer/checkout/simulate` with an honest simulation label; cancel and
  return flows preserved; no live charges possible.

### OpenAI (Autopilot / AI)
- Keys: `OPENAI_API_KEY`, `OPENAI_MODEL`; `AI_RUNTIME_MODE=local_mock`.
- **Missing:** deterministic prepared examples and manual editing remain;
  AI controls show provider readiness instead of failing silently.

### Media / storage
- Cloudflare R2 (`R2_*`) or UploadThing (`UPLOADTHING_*`). Missing keys keep
  the Assets library browsable with local/seed media.

### Integrations & observability
- Monday, Zapier (`ZAPIER_WEBHOOK_BASE_URL`), ManyChat, GetResponse and other
  connector keys are optional; integration surfaces group by maturity
  (works now / after setup / local test / planned) rather than pretending.
- `SENTRY_DSN`, `UPTIMEROBOT_MONITOR_URL` are optional observability hooks.

## 4. Safety rails

- The DB safety guard (`lib/fusion/db/safety.ts`) refuses migrations against
  hosted/shared databases and generic DB names.
- `npm run db:push` is intentionally refused; use migrate scripts.
- No live payment, live email, deployment, or customer contact happens from
  this experimental branch.

## 5. Validation

```bash
npx tsc --noEmit        # types
npm run lint            # eslint
npx prisma validate     # schema
npm run test:fusion     # fusion unit tests
npm run build           # production build
npm run smoke:fusion    # route smoke tests (dev server running)
```
