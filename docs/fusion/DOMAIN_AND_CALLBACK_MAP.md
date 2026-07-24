# Domain and callback map

**Production Studio domain (authoritative):** `https://studio.tapthemagic.com`  
**Local Fusion:** `http://127.0.0.1:3000` (or `localhost`)  
**Staging (recommended before prod):** `https://<staging-host>` — separate Railway environment + **separate database**

Never print secrets. Do not change DNS or provider consoles until authorized.

## 1. Public URL families

| Surface | Production path pattern | Resolver |
|---------|-------------------------|----------|
| Studio app | `https://studio.tapthemagic.com` | `NEXT_PUBLIC_APP_URL` / `getAppUrl()` |
| Sign-in / sign-up | `/sign-in`, `/sign-up` | Clerk + env path vars |
| Auth continue | `/auth/continue` | Clerk after-sign URLs |
| Tap Point / NFC | `/t/{deviceCode}` | `getDeviceUrl` / `getDevicePath` |
| Public Card / campaign | Campaign/public routes under Studio origin | App router |
| Media / assets | `R2_PUBLIC_URL` (+ UploadThing if used) | Must stay on CDN host already configured in V1 |
| Wallet / MyTap | App + wallet deep links | Wallet env + app URL |
| Health | `/api/health` | Railway healthcheck |

**Cutover rule:** Set production `NEXT_PUBLIC_APP_URL=https://studio.tapthemagic.com` so email links, QR/Tap Point absolute URLs, and OAuth redirects stay on the existing Studio domain. Do not switch customers to a `*.up.railway.app` host.

## 2. Authentication (Clerk)

| Item | Production value |
|------|------------------|
| Application URL | `https://studio.tapthemagic.com` |
| Allowed origins | Must include `https://studio.tapthemagic.com` |
| Sign-in URL | `https://studio.tapthemagic.com/sign-in` |
| Sign-up URL | `https://studio.tapthemagic.com/sign-up` |
| After sign-in / sign-up | `https://studio.tapthemagic.com/auth/continue` |
| Staging | Separate Clerk application **or** extra allowed origins for staging host only |

**Inheritance:** Reuse existing production Clerk keys on Railway for production cutover. Do not recreate the Clerk application if it already serves `studio.tapthemagic.com`.

## 3. Webhooks & provider callbacks

| Provider | Typical path (confirm in code/dashboard) | Production absolute URL |
|----------|------------------------------------------|-------------------------|
| Stripe | `/api/.../webhook` (billing connector) | `https://studio.tapthemagic.com` + path |
| Meta (IG/FB/Messenger/WhatsApp) | Meta webhook verify endpoint | Must match Meta app configuration already used by V1 |
| Clerk | Hosted by Clerk; redirects back to Studio | Domain allowlist above |
| TikTok OAuth | `TIKTOK_REDIRECT_URI` | Must be Studio HTTPS URL already registered |
| Google / YouTube / GBP | OAuth redirect URIs | Studio HTTPS |
| LinkedIn / Pinterest / X / Reddit | OAuth redirect URIs | Studio HTTPS |
| Productivity OAuth (monday, Asana, …) | Per-connector callback | Studio HTTPS |
| UploadThing | App URL in UT dashboard | Studio HTTPS |
| Telegram | Bot webhook URL | Studio HTTPS if used |

**Action when inheriting V1 credentials:** Prefer **updating redirect/webhook host only if** the provider still points at an obsolete host. If V1 already uses `studio.tapthemagic.com`, leave callbacks unchanged.

## 4. Email / Wallet / Cards

| Channel | Domain dependency |
|---------|-------------------|
| Resend `RESEND_FROM_EMAIL` | Sending domain DNS (SPF/DKIM) — keep existing Tap The Magic / Studio verified domain |
| Card share / Tap Point QR | Absolute URLs from `getAppUrl()` → Studio domain |
| Apple / Google Wallet | Pass associated domains / origins — production certs stay on prod |
| R2 public media | `R2_PUBLIC_URL` host must remain reachable; do not rewrite to Railway ephemeral URLs |

## 5. Staging domain rules

| Rule | Detail |
|------|--------|
| Separate host | e.g. `studio-staging.…` or Railway staging URL |
| Separate `DATABASE_URL` | Never staging → prod Postgres |
| Separate Stripe test keys | `sk_test_` / `pk_test_` |
| Clerk | Staging instance or allowlisted staging origin |
| Webhooks | Staging-specific endpoints or Stripe CLI / Meta test app |
| `NEXT_PUBLIC_APP_URL` | Staging host — not production Studio |

## 6. Local development

| Item | Value |
|------|-------|
| App | `http://127.0.0.1:3000` |
| DB | `tapconnect_fusion_dev` @ `127.0.0.1:5433` only |
| Callbacks | Clerk allowlist localhost; Stripe CLI; Meta via tunnel if testing live webhooks |
| Credentials | Dev/sandbox preferred; never prod Wallet certs or prod Stripe live keys in local |

## 7. Verification checklist (domains)

- [ ] `NEXT_PUBLIC_APP_URL` production = `https://studio.tapthemagic.com`
- [ ] Clerk allowed origins include Studio domain
- [ ] Sample Tap Point `/t/{code}` resolves on Studio domain
- [ ] Public Card URL opens on Studio domain
- [ ] Email link host = Studio domain
- [ ] Stripe webhook endpoint host = Studio domain (after fusion path confirmed)
- [ ] Meta webhook host = Studio domain (if Meta live)
- [ ] R2 / media URLs load
- [ ] Wallet install / MyTap links use expected hosts
- [ ] No customer-facing `*.up.railway.app` links in new emails or QR after cutover

## Related

- `docs/fusion/RAILWAY_PRODUCTION_INHERITANCE_MAP.md`
- `docs/fusion/PRODUCTION_CUTOVER_CHECKLIST.md`
