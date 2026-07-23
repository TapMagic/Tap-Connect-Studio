# TapConnect Studio — environment variables
# Copy to .env.local for local development. Set the same keys in Railway.
# Missing keys do not block architecture, Admin UX, mocks, or readiness checks.
# Never commit real secrets.

# ─── Required ────────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://user:pass@host:5432/tapconnect"
NEXT_PUBLIC_APP_URL="https://your-app.up.railway.app"

# ─── Auth (Clerk) ─────────────────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/auth/continue
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/auth/continue

# Comma-separated platform admin emails (unlimited workspace + /admin + /admin/platform)
PLATFORM_ADMIN_EMAILS=richsoehner@gmail.com,dannygenerate@gmail.com

# ─── Media / storage ──────────────────────────────────────────────────────────
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

UPLOADTHING_TOKEN=
UPLOADTHING_APP_ID=

PEXELS_API_KEY=
UNSPLASH_ACCESS_KEY=
NEXT_PUBLIC_HAS_UNSPLASH=false
LOGO_DEV_TOKEN=

# ─── AI / Autopilot ───────────────────────────────────────────────────────────
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# ─── Email ────────────────────────────────────────────────────────────────────
RESEND_API_KEY=
RESEND_FROM_EMAIL="TapConnect Studio <hello@tapthemagic.com>"
GETRESPONSE_API_KEY=

# ─── Stripe (billing connector — architected; wire when ready) ────────────────
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# ─── Wallet ───────────────────────────────────────────────────────────────────
APPLE_TEAM_ID=
APPLE_PASS_TYPE_ID=
APPLE_PASS_CERT=
APPLE_PASS_CERT_PASSWORD=
APPLE_WWDR_CERT=
GOOGLE_WALLET_ISSUER_ID=
GOOGLE_WALLET_SERVICE_ACCOUNT_JSON=

# ─── Meta / messaging ─────────────────────────────────────────────────────────
META_APP_ID=
META_APP_SECRET=
META_PAGE_ACCESS_TOKEN=
META_WEBHOOK_VERIFY_TOKEN=
INSTAGRAM_BUSINESS_ACCOUNT_ID=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
MANYCHAT_API_KEY=
TELEGRAM_BOT_TOKEN=
SMS_PROVIDER_API_KEY=

# ─── Social (TapCast) ─────────────────────────────────────────────────────────
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
X_API_KEY=
X_API_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
PINTEREST_APP_ID=
PINTEREST_APP_SECRET=
SNAPCHAT_CLIENT_ID=
BLUESKY_HANDLE=
BLUESKY_APP_PASSWORD=
GOOGLE_BUSINESS_PROFILE_ACCOUNT_ID=

# ─── Productivity connectors ──────────────────────────────────────────────────
MONDAY_CLIENT_ID=
MONDAY_CLIENT_SECRET=
ASANA_CLIENT_ID=
ASANA_CLIENT_SECRET=
CLICKUP_CLIENT_ID=
CLICKUP_CLIENT_SECRET=
MICROSOFT_GRAPH_CLIENT_ID=
MICROSOFT_GRAPH_CLIENT_SECRET=
MICROSOFT_GRAPH_TENANT_ID=
JIRA_CLIENT_ID=
JIRA_CLIENT_SECRET=
TRELLO_API_KEY=
TRELLO_API_SECRET=
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# ─── Maps / commerce / ops (optional) ─────────────────────────────────────────
GOOGLE_MAPS_API_KEY=
BOOKING_PROVIDER_API_KEY=
POS_PROVIDER_API_KEY=
CRM_PROVIDER_API_KEY=
SIMPLECONSIGN_API_KEY=
SENTRY_DSN=

# Railway often provides these automatically for public URL fallback:
# RAILWAY_PUBLIC_DOMAIN=
# RAILWAY_STATIC_URL=
