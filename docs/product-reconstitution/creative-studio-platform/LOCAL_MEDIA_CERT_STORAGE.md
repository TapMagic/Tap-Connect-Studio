# Local durable media for certification

## Purpose

Production-style local certification (`npm run build` + `npm run start`) must prove OS drop, clipboard paste, replace, and SVG ingestion without requiring Cloudflare R2 credentials.

## Behavior

When `TAPCONNECT_DEV_AUTH=1` and R2 is not configured (or `CREATIVE_PROVIDER_MODE=fixture` with that auth flag under `next start`):

- `isMediaUploadReady()` → true
- `localMediaStorageEnabled()` → true
- Objects land under `tmp/creative-media-storage/`
- Public URLs use `/api/media/local?key=…`

## Provider fixtures

`CREATIVE_PROVIDER_MODE=fixture` + `TAPCONNECT_DEV_AUTH=1` also enables Pexels/Logo.dev fixture candidates for UI route proof when live API keys are absent.

Live provider keys remain preferred when available. Fixture results must not be reported as live provider exhaustiveness.

## External blockers still open

- `OPENAI_API_KEY` — Writing Assist real inference (see `WRITING_ASSIST_EXTERNAL_BLOCKER.md`)
- Live `PEXELS_API_KEY` / `LOGO_DEV_TOKEN` — optional for live-provider certification beyond fixture routes
