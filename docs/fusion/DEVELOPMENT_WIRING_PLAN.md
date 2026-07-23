# Development wiring plan

**Goal:** Connect fixtures to the panel without touching Railway production.  
**Persistence forever in this phase:** `tapconnect_fusion_dev` only.  
**Badges:** Driven by `lib/fusion/readiness/display-status.ts` + `VERIFICATION_LEDGER`.

## Phase 0 — Honesty (done / in progress)

1. Derive Studio badges from verification + providers (no static OWNER-READY).  
2. Inspectable badge detail (what works / doesn’t / deps / next).  
3. Publish audit docs (this set).  
4. Fix Campaign Builder blank preview (content-block normalizer).

## Phase 1 — Isolated runtime proofs (unblocked without live providers)

Dependency order (do not skip):

1. Ensure Postgres `tapconnect_fusion_dev` listening (`fusion:dev-db` or embedded PG).  
2. Migrate + seed (includes real ContentBlocks).  
3. Headed browser: Card + Campaign builder matrix (edit → save → publish → assign → `/t/…`).  
4. Lead capture → leads list refresh.  
5. Keep Card → TapSave → MyTap preferences.  
6. TapLoop enroll/award/redeem.  
7. TapFlow draft → simulate → (optional) live queue → Insights/outbox.  
8. Inbox case open → reply eligibility → resolve.  
9. Insights KPI + CSV export.  
10. Admin feature kill-switch reflects UI/API.  
11. Record each pass in `VERIFICATION_LEDGER`.

## Phase 2 — Provider reconnection (selective)

For each provider: add **development** credentials to `.env.local` only; run readiness probe; document rollback (unset env + restart).

| Provider | Railway names (existing) | Local vars | Callback local | Webhook | Localhost OK? | Tunnel? | Test account | Readiness test | Rollback |
|---|---|---|---|---|---|---|---|---|---|
| Clerk | `NEXT_PUBLIC_CLERK_*`, `CLERK_SECRET_KEY` | Same, **dev app** | `/sign-in` etc. | Optional | Yes | No | Dev Clerk app | Sign-in + session | Remove keys → demo session |
| OpenAI | `OPENAI_API_KEY` | Dev project key | N/A | No | Yes | No | Pay-as-you-go project | Autopilot generate | Unset key → mock/disabled |
| Resend | `RESEND_*` | Dev key + from | N/A | Optional | Yes | No | Resend free | Send test | Unset → mock |
| Pexels | `PEXELS_API_KEY` | Same or new | N/A | No | Yes | No | Free API | Media search | Unset |
| Unsplash | `UNSPLASH_ACCESS_KEY` | Same | N/A | No | Yes | No | Free | Media search | Unset |
| Logo.dev | `LOGO_DEV_TOKEN` | Same | N/A | No | Yes | No | Free | Logo search | Unset |
| UploadThing | `UPLOADTHING_*` | Dev app | App URL | UT | Yes | Maybe | Hobby | Upload in builder | Unset → local-only |
| Cloudflare R2 | `R2_*` | **Dev bucket** | Public URL | No | Yes | No | CF account | Put/get object | Unset |
| Stripe | `STRIPE_*` | **`sk_test_` only** | Stripe CLI → local | Yes | CLI | CLI | Test mode | Checkout/webhook | Unset |
| GetResponse | `GETRESPONSE_API_KEY` | Dev | N/A | Optional | Yes | No | Confirm use | Probe | Unset |
| Apple Sign-In | (Clerk social) | Clerk dashboard | Clerk | No | Yes | No | Apple services ID | Clerk social | Disable in Clerk |
| Google Sign-In | (Clerk social) | Clerk | Clerk | No | Yes | No | Google OAuth | Clerk social | Disable |
| Apple Wallet | `APPLE_*` | Dev pass type if possible | N/A | No | Device | No | Apple Developer | Issue mock→live | Unset → mock |
| Google Wallet | `GOOGLE_WALLET_*` | Test issuer | N/A | No | Yes | No | Google Pay Console | Issue | Unset → mock |
| Meta / Messenger / IG / WA | `META_*` … | **Dev app** | Tunnel URL | Yes | Limited | **Yes** | Meta test users | Webhook verify | Unset |
| ManyChat | `MANYCHAT_API_KEY` | Dev | Per docs | Maybe | Yes | Maybe | Confirm | Probe | Unset |
| Telegram | `TELEGRAM_BOT_TOKEN` | Dev bot | setWebhook tunnel | Yes | No for webhook | Yes | BotFather | Send | Delete webhook |
| monday / Graph / Slack / Notion / GitHub / Asana / ClickUp / Jira / Trello | `*_CLIENT_*` | Dev OAuth apps | `http://127.0.0.1:3000/api/.../callback` | OAuth | Often | Sometimes | Dev apps | OAuth connect | Revoke + unset |
| TapCast social | `TIKTOK_*` … | Dev apps | OAuth | OAuth | Often | Sometimes | Per network | Connect stub | Unset |

**Safe secret storage:** 1Password / OS keychain → `.env.local` (gitignored). Never commit. Never paste into chat/docs.

## Phase 3 — End-to-end “dots” proofs

Run and ledger the chains in `ROUTE_AND_ACTION_RUNTIME_AUDIT.md` § Cross-pillar. Navigation alone is not enough.

## Phase 4 — Staging (explicit authorization only)

Separate DB + Clerk + domain. Still not Railway prod. Not started in this audit.

## What continues without owner input

- Builder E2E depth on seed data  
- Pillar workflow completion (TapTrail/TapCast/Pulse/referrals)  
- Outbox/Admin/Insights/Autopilot mock paths  
- A11y + unit/integration tests  
- Badge/ledger infrastructure  

## What waits on owner

- Docker Desktop if embedded PG is unacceptable long-term (**PO-NOW-001**)  
- Live provider keys for verification badges (**PO-LIVE-***)  
- Railway variable name export to complete inventory  
- Staging/production authorization
