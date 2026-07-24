# Integration and Credential Requirements

**Rule:** Missing credentials are not a build blocker. Implement contracts, Admin connection UX, readiness checks, sandbox/mock adapters, and keep features disabled until certified. Never print secret values.

## Fusion modules wired (code)

| Module | Contract path | Admin UX | Feature id |
|--------|---------------|----------|------------|
| Platform KPIs | `lib/fusion/admin/dashboard-metrics.ts` | `/admin/platform` → Executive KPIs | — |
| Connectors | `lib/fusion/connectors/registry.ts` | `/admin/platform` → Connectors | per connector |
| Billing | `lib/fusion/billing/*` | `/admin/platform` → Billing + `/dashboard/billing` | `billing.stripe` |
| Automation Team | `lib/fusion/autopilot/*` | `/admin/platform` → kill switch | `ai.autopilot` |
| Keywords & Hashtags | `lib/fusion/keywords/*` | Brand Kit + contextual panels; Admin kill switch | `ai.keywords` |
| Channel Guardian | `lib/fusion/comms/*` | `/admin/platform` → Channel Guardian | `comms.messaging` |
| Wallet / TapSave | `lib/fusion/wallet/*`, `lib/fusion/tapsave/moments.ts` | `/admin/platform` → Wallet & TapSave | `wallet.apple_google`, `tapsave.core` |
| TapFlow | `lib/fusion/journey/*` | `/dashboard/experiences/journeys` | `journey.tapflow` |

## Present vs needed (fusion `.env`)

| Provider | Env vars (representative) | Typical status | Admin surface |
|----------|---------------------------|----------------|---------------|
| Postgres | `DATABASE_URL` | Required local | — |
| App URL | `NEXT_PUBLIC_APP_URL` | Required | — |
| Clerk | `NEXT_PUBLIC_CLERK_*`, `CLERK_SECRET_KEY` | Often present | Settings |
| Platform admins | `PLATFORM_ADMIN_EMAILS` | Present | `/admin/platform` |
| Cloudflare R2 | `R2_*`, `R2_PUBLIC_URL` | Often present | Integrations |
| UploadThing | `UPLOADTHING_TOKEN` | Optional | Integrations |
| Pexels | `PEXELS_API_KEY` | Optional | Integrations |
| Unsplash | `UNSPLASH_ACCESS_KEY` | Optional | Integrations |
| Logo.dev | `LOGO_DEV_TOKEN` | Optional | Integrations |
| OpenAI | `OPENAI_API_KEY`, `OPENAI_MODEL` | Optional | Automation Team kill switch |
| Resend | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Optional | Integrations |
| Stripe | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Missing — mock mode | Billing readiness panel |
| GetResponse | `GETRESPONSE_API_KEY` | Optional | Integrations |
| Meta messaging | `META_APP_ID`, `META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Missing | Channel Guardian |
| Telegram | `TELEGRAM_BOT_TOKEN` | Missing | Channel Guardian |
| ManyChat | `MANYCHAT_API_KEY` | Missing | Channel Guardian |
| Apple Wallet | `APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID`, `APPLE_PASS_CERT` | Missing | Wallet blockers panel |
| Google Wallet | `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON` | Missing | Wallet blockers panel |
| monday.com (+ Productivity family) | See Productivity & Work Management section | Missing for live | Settings → Integrations |

## Productivity & Work Management

Customer-facing category under **Settings → Integrations → Productivity & Work Management**.

One canonical `ExternalWorkItem` model (`lib/fusion/connectors/productivity/`). Mock adapters + Admin Connectors catalog ship without OAuth apps. Live execution remains **VERIFIED — CREDENTIALS REQUIRED** until each provider app is supplied.

| Provider | Env vars (live) |
| --- | --- |
| monday.com | `MONDAY_CLIENT_ID`, `MONDAY_CLIENT_SECRET` |
| Asana | `ASANA_CLIENT_ID`, `ASANA_CLIENT_SECRET` |
| ClickUp | `CLICKUP_CLIENT_ID`, `CLICKUP_CLIENT_SECRET` |
| Microsoft Planner / Teams / Outlook / OneDrive | `MICROSOFT_GRAPH_CLIENT_ID`, `MICROSOFT_GRAPH_CLIENT_SECRET`, `MICROSOFT_GRAPH_TENANT_ID` |
| Slack | `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` |
| Notion | `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET` |
| Jira | `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET` |
| Trello | `TRELLO_API_KEY`, `TRELLO_API_SECRET` |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |
| Google Calendar | `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET` |
| Google Drive | `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET` |
| Airtable | `AIRTABLE_CLIENT_ID`, `AIRTABLE_CLIENT_SECRET` |
| Zapier / Make / n8n | `ZAPIER_WEBHOOK_SIGNING_SECRET` / `MAKE_WEBHOOK_SIGNING_SECRET` / `N8N_WEBHOOK_SIGNING_SECRET` |

API: `GET/POST /api/connectors/productivity` — connect, create, bridge workflows, knowledge ingest, collab alerts.


## PO checklist — remaining before production activation

### P0 — enable core Fusion control plane
- [ ] Confirm isolated `tapconnect_fusion_dev` migration applied locally (`npm run db:migrate`) — **never Railway prod**
- [ ] Set `PLATFORM_ADMIN_EMAILS` for operators who may toggle Feature Registry
- [ ] Review default-off features in `/admin/platform` → Feature registry before any customer enablement

### P1b — Keywords & Hashtags (`ai.keywords`)
- [ ] Confirm `BrandKit.keywordBrandPack` migration on tapconnect_fusion_dev
- [ ] Brand Kit: suggest → accept → Save Brand Pack (headed proof)
- [ ] Live trend enrichment remains **VERIFIED — CREDENTIALS REQUIRED** until an approved trend provider is connected
- [ ] Never claim causation from keyword analytics correlation stubs

### P1 — Automation Team (`ai.autopilot`)
- [ ] Supply `OPENAI_API_KEY` + model/spend limits in provider dashboard
- [ ] Platform Admin: enable `ai.autopilot` globally with documented reason
- [ ] Confirm Studio+ plan gating matches commercial policy
- [ ] Run one campaign draft in Workbench → Automation Team tab; verify proposal metadata in API response

### P1 — Stripe billing (`billing.stripe`)
- [ ] Create Stripe products/prices matching `lib/fusion/billing/plans.ts` tiers
- [ ] Set `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- [ ] Register webhook endpoint for events in `STRIPE_WEBHOOK_EVENT_MAP`
- [ ] Platform Admin: enable `billing.stripe` after sandbox checkout test
- [ ] PO sign-off: no raw card data stored in Tap Connect DB (customer IDs only)

### P2 — Messaging + Channel Guardian (`comms.messaging`)
- [ ] Meta developer app (Messenger, IG, WhatsApp) + webhook URLs
- [ ] Telegram bot + webhook
- [ ] ManyChat API key if using managed adapter
- [ ] Platform Admin: enable `comms.messaging` only after Guardian dry-run on staging

### P2 — Wallet + TapSave
- [ ] Apple Pass Type ID, Team ID, signing cert (secure storage — not in repo)
- [ ] Google Wallet issuer + service account JSON (secure storage)
- [ ] Enable `tapsave.core` then `wallet.apple_google` in dependency order
- [ ] PO: wallet install mock URLs verified before cert swap to live adapters

### P2 — TapFlow journeys (`journey.tapflow`)
- [ ] Apply `JourneyDraft` migration on isolated dev DB
- [ ] Enable `journey.tapflow` for pilot workspace
- [ ] Save/load draft at `/dashboard/experiences/journeys`; validate simulation stub output

### P3 — Productivity & Work Management
- [ ] monday.com OAuth app (redirect URIs, scopes)
- [ ] Asana, ClickUp, Microsoft Graph (Planner/Teams/Outlook/OneDrive), Jira, Trello, Notion, Slack, GitHub — one at a time per PO priority
- [ ] Google Calendar / Drive OAuth apps
- [ ] Airtable OAuth
- [ ] Zapier / Make / n8n signed webhook secrets + public API credentials
- [ ] Certify Slack/Teams alerts, approvals, interactive actions on staging
- [ ] Certify Notion/Drive/OneDrive knowledge ingest → TapGuide / Autopilot
- [x] Mock adapters, ExternalWorkItem, Settings UI, Admin catalog, workflow bridges, unit tests (local)

### P3 — Other
- [ ] Maps/geocoding, booking/POS/CRM, accounting, monitoring — as approved in charter

For each provider: redirects, scopes, app review status, sandbox accounts, webhook secrets, Admin connection path, readiness blocker, security notes — maintain in `ENVIRONMENT_READINESS_MATRIX.md` and `PROVIDER_CERTIFICATION_CHECKLIST.md`.

**PO consolidated supply list (no secret values):** see `CREDENTIALS_FINAL_CHECKLIST.md`.
