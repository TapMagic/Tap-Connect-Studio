# Creative Studio Media Provider Contract

**Classification:** `IMPLEMENTATION IN PROGRESS`

## One browser

All creative media selection must converge on `SharedMediaAssetBrowser`, surfaced through `MediaPicker`. Current Owner-route insertion points:

- Card image, hero, logo, and header-logo source
- Creative Composition image
- Creative Composition frame media
- Creative Composition background image
- Existing Email, Campaign, Brand, icon, and builder locations already using `MediaPicker`

Sources are Studio, Brand, Recent, Favorites, Pexels, Logo.dev, Upload, and Advanced URL.

## Server-only provider boundary

- Pexels credentials are read only in `/api/stock/search`.
- Logo.dev credentials are read only in `lib/services/logo-search.ts` and `/api/logos/image`.
- Search responses return authenticated TapConnect proxy URLs for Logo.dev; token-bearing upstream URLs are never returned to the browser.
- `/api/media/import` accepts only allowlisted image hosts or a validated Logo.dev proxy descriptor.
- No provider secret is stored in composition/Card JSON.

## Selection and import

Provider search never changes the Card. A result becomes active only after the Owner:

1. chooses a result for the larger preview;
2. reviews source, dimensions, attribution, and rights;
3. chooses **Import and insert**.

When R2 is configured, Pexels and Logo.dev bytes are copied to TapConnect-controlled storage and provider metadata is persisted on `MediaAsset`. If durable storage is unavailable, the browser must not claim an import succeeded.

## Provider honesty

- Unconfigured, unreachable, and rate-limited providers return distinct unavailable states.
- Pexels 429 responses preserve `Retry-After`.
- Original provider ID, source URL, attribution, dimensions, rights note, and import timestamp are retained.
- Advanced URL remains a clearly labeled fallback and may remain externally hosted.
- Provider media is never selected automatically.

## Current limits

- Favorites and recent history are browser-local convenience state.
- Brand-approved status is currently inferred for imported logo assets; durable approval workflow remains incomplete.
- R2 is the implemented durable store. UploadThing is not represented as active runtime behavior.

