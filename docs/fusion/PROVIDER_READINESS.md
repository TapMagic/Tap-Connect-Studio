# Provider readiness — VERIFIED — CREDENTIALS REQUIRED

**Updated:** 2026-07-24 (final local quality-gate closeout)  
**Rule:** Do not request secrets in chat. Complete OAuth/app registration externally, then wire env vars via Admin / `.env.local` on isolated `tapconnect_fusion_dev` only. Never Railway until PO directs.

**Local closeout attestation:** Mock / adapter / readiness / failure paths proved on isolated DB (headed + unit). **No live credential success claimed.** Platform overall remains **NOT OWNER-READY**. Live publish, live messaging, live AI enhancement, and live trend claims remain:

**VERIFIED — CREDENTIALS REQUIRED**

Do **not** classify mock delivery as live OWNER-READY. Do **not** invent live credential proofs.

**Canonical env names:** `lib/fusion/tapcast/registry/channels.ts` + `.env.example`  
**Domain map:** `DOMAIN_AND_CALLBACK_MAP.md` (`https://studio.tapthemagic.com` prod · `http://127.0.0.1:3000` local)  
**Supply list:** `CREDENTIALS_FINAL_CHECKLIST.md` · **Contracts:** `INTEGRATION_AND_CREDENTIAL_REQUIREMENTS.md`

## Classification vocabulary

| Label | Meaning |
|-------|---------|
| **VERIFIED — CREDENTIALS REQUIRED** | Local mock/adapter/readiness finished; live path needs external credentials / review. |
| **IMPLEMENTED BUT NOT OWNER-READY** | Local workflow incomplete for owner gate (a11y/matrix/etc.) — separate from credentials. |
| **MOCK ONLY / NO LIVE PUBLISH** | Honest package or checklist only; no organic live post API claimed. |
| **OWNER-READY (live)** | Forbidden until real provider test + Admin probe green + ledger blockers cleared. |

## Shared Admin connection workflow

1. Settings → Integrations (or TapCast hub) → choose provider  
2. Confirm required env var names shown in readiness probe  
3. Create app in provider console with exact callback/webhook URLs below  
4. Paste client id/secret into local env (never commit)  
5. Connect → Admin readiness probe → Disconnect / Reconnect / Rotate  
6. Certification checklist: mock path still works; live path returns provider error classes honestly

### URL families (register in provider consoles)

| Kind | Local | Production |
|------|-------|------------|
| App origin | `http://127.0.0.1:3000` | `https://studio.tapthemagic.com` |
| OAuth callback (intended) | `{APP_URL}/api/tapcast/oauth/{provider}/callback` | same path on Studio domain |
| Productivity OAuth (intended) | `{APP_URL}/api/connectors/productivity/oauth/{provider}/callback` | same |
| Meta / messaging webhooks (intended) | `{APP_URL}/api/webhooks/meta` | same |
| Stripe webhooks (intended) | `{APP_URL}/api/webhooks/stripe` | same |
| Twilio / Discord / Slack events | `{APP_URL}/api/webhooks/{provider}` | same |

Until live OAuth routes ship, Admin may use **env paste + mock connect**. Redirect URIs must still be pre-registered to the Studio domain before any live connect attempt. Prefer inheriting V1 callbacks already on `studio.tapthemagic.com` when present.

---

## TapCast / mainstream channels — credential classification

Each row: **local mock finished** → live = **VERIFIED — CREDENTIALS REQUIRED** (except Snapchat honesty note).

| Provider | Classification | Dev app | Customer OAuth / connect | Scopes (least-privilege target) | Callback URL | Webhook URL | Provider review | Business verification | Production approval | Exact remaining requirement | Test procedure |
|----------|----------------|---------|--------------------------|----------------------------------|--------------|-------------|-----------------|----------------------|---------------------|----------------------------|----------------|
| **TikTok** | VERIFIED — CREDENTIALS REQUIRED | TikTok for Developers app; Content Posting / Direct Post | Yes — Login Kit + customer account authorize | `user.info.basic`, `video.upload`, `video.publish` (Direct Post) | `{APP_URL}/api/tapcast/oauth/tiktok/callback` via `TIKTOK_REDIRECT_URI` | — (no publish webhook required) | **Yes — Direct Post / Content Posting review** | Often required for commercial publish | TikTok production app approval for Direct Post | Supply `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, optional `TIKTOK_ACCESS_TOKEN`; complete Direct Post review | Mock draft/post/funnel (P-tiktok-*); then live: OAuth → upload → Direct Post → failure classes |
| **YouTube Shorts** | VERIFIED — CREDENTIALS REQUIRED | Google Cloud project + YouTube Data API v3 | Yes — Google OAuth (customer channel) | `https://www.googleapis.com/auth/youtube.upload`, `youtube.readonly` | `{APP_URL}/api/tapcast/oauth/youtube/callback` | — | OAuth consent screen verification if sensitive scopes | Google Cloud org / brand verify if public app | Quotas + consent production | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` | Mock package → live Shorts upload → verify listing |
| **Instagram Reels** | VERIFIED — CREDENTIALS REQUIRED | Meta Developer app | Yes — Facebook Login → IG Business/Creator | `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement` | Meta OAuth redirect on Studio domain | `{APP_URL}/api/webhooks/meta` + `META_WEBHOOK_VERIFY_TOKEN` | Meta App Review for publish permissions | Meta Business verification often required | Live mode + Advanced Access | `META_APP_ID`, `META_APP_SECRET`, `INSTAGRAM_BUSINESS_ACCOUNT_ID`, page token | Mock container draft → live Reels publish → webhook receive |
| **Facebook Pages** | VERIFIED — CREDENTIALS REQUIRED | Same Meta app | Yes — Page admin authorize | `pages_manage_posts`, `pages_read_engagement`, `pages_show_list` | Meta OAuth redirect | `{APP_URL}/api/webhooks/meta` | App Review for Page publish | Business verification for Advanced Access | Live mode | `META_*` + `FACEBOOK_PAGE_ID` | Mock Page package → live Page post/Reel |
| **Threads** | VERIFIED — CREDENTIALS REQUIRED | Meta app + Threads API | Yes — Threads user link | Threads publish scopes per Meta Threads docs | Meta/Threads OAuth redirect | Optional | Threads API access + review as required by Meta | Meta Business as applicable | Production Threads access | `META_*` + `THREADS_USER_ID` | Mock text/image → live Threads create |
| **X (Twitter)** | VERIFIED — CREDENTIALS REQUIRED | X Developer Portal project/app | Yes — OAuth 1.0a or 2.0 user | `tweet.read`, `tweet.write`, `users.read`, `offline.access` (+ media) | `{APP_URL}/api/tapcast/oauth/x/callback` | — | Elevated / pay tiers for write often required | Org verify if required by X tier | Production app keys | `X_API_KEY`, `X_API_SECRET`, access tokens | Mock 280-char package → live post + media |
| **LinkedIn** | VERIFIED — CREDENTIALS REQUIRED | LinkedIn Developer app + Marketing Developer Platform | Yes — member/org authorize | `w_member_social` and/or `w_organization_social` | `{APP_URL}/api/tapcast/oauth/linkedin/callback` | — | Product access request (Share / Marketing) | Company Page admin for org posts | Production MDP products approved | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, access token | Mock UGC → live share as member/org |
| **Pinterest** | VERIFIED — CREDENTIALS REQUIRED | Pinterest Developers app | Yes — user authorize | `boards:read`, `pins:read`, `pins:write` | `{APP_URL}/api/tapcast/oauth/pinterest/callback` | — | Trial → standard access as needed | — | Production app | `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET`, access token | Mock Pin → live create Pin |
| **Bluesky** | VERIFIED — CREDENTIALS REQUIRED | No classic OAuth app — AT Protocol session | App password on customer account (not account password) | Session createRecord (app password) | — | — | — | — | — | `BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORD` | Mock skeet → live createRecord |
| **Google Business Profile** | VERIFIED — CREDENTIALS REQUIRED | Google Cloud + GBP API enablement | Yes — Google OAuth (location manager) | `https://www.googleapis.com/auth/business.manage` | `{APP_URL}/api/tapcast/oauth/google_business/callback` | — | OAuth verification if external | Google Business Profile ownership | API enable + production consent | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_BUSINESS_PROFILE_ACCOUNT_ID`, refresh token | Mock local post → live GBP local post |
| **Snapchat** | **MOCK ONLY / NO LIVE PUBLISH** — still label live credentials path as VERIFIED — CREDENTIALS REQUIRED if Marketing API later | Snap Kit / Marketing API (if ever) | N/A for organic public post | N/A for organic | N/A | — | Marketing API separate from organic | — | Do not claim organic post | Honest prepared package + open composer only; `SNAPCHAT_*` unused for organic | Package + checklist only — **never claim live organic publish** |
| **Messenger** | VERIFIED — CREDENTIALS REQUIRED | Meta Messenger Platform | Yes — Page | `pages_messaging`, webhooks | Meta OAuth | `{APP_URL}/api/webhooks/meta` | App Review messaging | Business verification common | Live + Advanced Access | `META_*`, `MESSENGER_PAGE_ID`, verify token | Mock DM package → live send + webhook |
| **WhatsApp Cloud** | VERIFIED — CREDENTIALS REQUIRED | Meta WhatsApp Cloud API | WABA + phone number | WhatsApp outbound / templates | Meta embedded signup / tokens | `{APP_URL}/api/webhooks/meta` | Template message approval | Business verification | Production messaging | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `META_APP_ID` | Mock template → live template send |
| **Instagram DM** | VERIFIED — CREDENTIALS REQUIRED | Meta IG Messaging | Yes — IG Business | `instagram_manage_messages` (+ related) | Meta OAuth | `{APP_URL}/api/webhooks/meta` | App Review | Business verification | Live mode | `META_*`, `INSTAGRAM_BUSINESS_ACCOUNT_ID` | Mock DM → live send (not Reels) |
| **SMS (Twilio)** | VERIFIED — CREDENTIALS REQUIRED | Twilio account | Account SID/token (not OAuth) | — | — | `{APP_URL}/api/webhooks/twilio` (status) | A2P 10DLC / toll-free verification (US) | Brand/campaign registration where required | Production numbers | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | Mock SMS → live send + delivery webhook |
| **Discord** | VERIFIED — CREDENTIALS REQUIRED | Discord Developer Application + Bot | Bot invite to guild | Bot intents / `applications.commands` as needed | OAuth2 redirect if user-install | `{APP_URL}/api/webhooks/discord` or channel webhook URL | — | — | Bot in target guild | `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, optional `DISCORD_WEBHOOK_URL` | Mock announce → live channel message |
| **Slack (Community)** | VERIFIED — CREDENTIALS REQUIRED | Slack app (distinct from Productivity Slack) | Workspace install | `chat:write`, `channels:read`, `incoming-webhook` as needed | Slack OAuth redirect | `{APP_URL}/api/webhooks/slack` + `SLACK_SIGNING_SECRET` | Slack app distribution review if public | — | Workspace install production | `SLACK_BOT_TOKEN`, `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` | Mock channel post → live `chat.postMessage` |
| **Reddit** | VERIFIED — CREDENTIALS REQUIRED | Reddit app | Yes — user OAuth | `submit`, `identity`, `read` | `{APP_URL}/api/tapcast/oauth/reddit/callback` | — | App type + rate limits | — | Production credentials | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, refresh token | Mock + manual checklist → live submit |

**Env reference (publishing):** see `.env.example` TapCast block + Meta/Twilio/Discord/Slack vars.

---

## AI / trend integrations

| Integration | Classification | Dev app | Customer OAuth | Scopes | Callback | Webhook | Review / verification | Exact remaining requirement | Test procedure |
|-------------|----------------|---------|----------------|--------|----------|---------|----------------------|----------------------------|----------------|
| **OpenAI (Keywords AI enhance / Autopilot)** | VERIFIED — CREDENTIALS REQUIRED | OpenAI platform project + API key | N/A (platform key; workspace budget) | Model access per org | — | — | Org limits / billing | `OPENAI_API_KEY`, `OPENAI_MODEL`; Admin spend gate; enable `ai.autopilot` / use under `ai.keywords` enhance only after budget policy | Local grounded suggest works **without** key; with key: enhance path + kill-switch; never claim trends |
| **Trend enrichment** | VERIFIED — CREDENTIALS REQUIRED | **Approved provider TBD** (PO must name vendor) | Per chosen vendor | Per vendor | Per vendor | Per vendor | Per vendor ToS | Connect approved trend provider; until then **no trending claims** in UI/copy | Grounded suggestions only; assert label stays VERIFIED — CREDENTIALS REQUIRED |
| **Brand Vocabulary local** | Local grounded path functional (not live AI OWNER-READY) | — | — | — | — | — | — | Live AI/trend remain credentials-gated; a11y + analytics UI still open for OWNER-READY | P-keywords-* headed proofs without inventing trends |

---

## Adjacent credential-gated pillars (same label)

| Pillar | Classification | Exact remaining requirement |
|--------|----------------|------------------------------|
| Resend email | VERIFIED — CREDENTIALS REQUIRED | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, sending-domain DNS |
| Stripe billing | VERIFIED — CREDENTIALS REQUIRED | Keys + webhook secret + products/prices + `billing.stripe` enable |
| Apple / Google Wallet | VERIFIED — CREDENTIALS REQUIRED | Pass certs / issuer JSON in secure store (not git) |
| Meta Channel Guardian messaging | VERIFIED — CREDENTIALS REQUIRED | Same Meta app + webhooks + template/policy gates |
| Productivity OAuth family | VERIFIED — CREDENTIALS REQUIRED | Per-provider client id/secret + redirect + scopes (see `INTEGRATION_AND_CREDENTIAL_REQUIREMENTS.md`) |

---

## Certification before OWNER-READY (live)

- [ ] Platform developer application created (sandbox + prod plan)  
- [ ] Customer OAuth / connection path works (or app-password where applicable)  
- [ ] Scopes least-privilege documented and granted  
- [ ] Callback URL matches Studio domain (`DOMAIN_AND_CALLBACK_MAP.md`)  
- [ ] Webhook URL + signature verify (where applicable)  
- [ ] Provider review / App Review complete when required  
- [ ] Business verification complete when required  
- [ ] Production approval / live mode / Advanced Access  
- [ ] OAuth connect/disconnect/reconnect + token refresh / secret rotation  
- [ ] Publish or draft path for that provider (or honest mock-only for Snapchat)  
- [ ] Failure classification (auth vs rate vs content)  
- [ ] Admin health green with env present  
- [ ] Headed proof recorded in readiness ledger with zero live blockers for that channel  

Until then: **VERIFIED — CREDENTIALS REQUIRED**. Mock success ≠ live OWNER-READY.
