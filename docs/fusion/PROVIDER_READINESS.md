# Provider readiness — VERIFIED — CREDENTIALS REQUIRED

**Rule:** Do not request secrets in chat. Complete OAuth/app registration externally, then wire env vars via Admin / `.env.local` on isolated `tapconnect_fusion_dev` only. Never Railway until PO directs.

Live classification for all TapCast + AI providers below remains:

**VERIFIED — CREDENTIALS REQUIRED**

until a real provider test passes. Local mock paths are not OWNER-READY for production.

## Shared Admin connection workflow

1. Settings → Integrations (or TapCast hub) → choose provider  
2. Confirm required env var names shown in readiness probe  
3. Create app in provider console with exact callback/webhook URLs below  
4. Paste client id/secret into local env (never commit)  
5. Connect → Admin readiness probe → Disconnect / Reconnect / Rotate  
6. Certification checklist: mock path still works; live path returns provider error classes honestly

## Channel checklist (summary)

| Channel | Env vars (typical) | Callback / notes |
|---------|-------------------|------------------|
| TikTok | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | Direct Post app review required |
| Instagram / Facebook / Threads / Messenger | `META_APP_ID`, `META_APP_SECRET` | Meta Business + webhook verify token |
| YouTube / Shorts | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | YouTube Data API scope |
| LinkedIn | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | Marketing Developer Platform |
| Pinterest | `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET` | |
| X | `X_CLIENT_ID`, `X_CLIENT_SECRET` | |
| Bluesky | `BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORD` | App password, not account password |
| Google Business Profile | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | GBP API enablement |
| WhatsApp | `META_WA_*` | Cloud API |
| Discord / Slack community | provider bot tokens | Community ops — no publish claims |
| Snapchat | *(unsupported live publish — honest)* | Mock package / checklist only |
| OpenAI (keywords AI enhance) | `OPENAI_API_KEY` | Budget + `ai.autopilot` gate |
| Trend enrichment | approved provider TBD | Never claim trending without it |

Exact scopes, review requirements, and sandbox steps are declared per channel in `lib/fusion/tapcast/registry/channels.ts` (`requiredEnvVars`, `notes`, `documentation`).

## Certification before OWNER-READY (live)

- [ ] OAuth connect/disconnect/reconnect  
- [ ] Token refresh / secret rotation  
- [ ] Publish or draft path for that provider  
- [ ] Failure classification (auth vs rate vs content)  
- [ ] Webhook signature verify (where applicable)  
- [ ] Admin health green with env present  
- [ ] Headed proof recorded in readiness ledger with zero live blockers for that channel  

Until then: **VERIFIED — CREDENTIALS REQUIRED**.
