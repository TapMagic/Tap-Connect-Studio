# Creative Studio Media Provider Contract

**Classification:** `IMPLEMENTATION IN PROGRESS`

## Actual Owner-route surface

`SharedMediaAssetBrowser` is surfaced through `MediaPicker` at these verified code
insertion points:

- Card image/logo source controls that already use `MediaPicker`
- Creative Composition image
- Creative Composition frame media
- Creative Composition background image

The browser visibly exposes Studio, Brand, Recent, Favorites, Pexels, Logo.dev, Upload,
and Advanced URL. It is not yet proven to be the universal picker for every Email,
Campaign, Brand, Offer, icon, template, and Assets workflow.

## Server-only provider boundary

- Pexels credentials are read only in `/api/stock/search`.
- Logo.dev credentials are read only in `lib/services/logo-search.ts` and `/api/logos/image`.
- Logo.dev search code returns TapConnect proxy URLs rather than token-bearing upstream
  URLs; this has unit coverage with a mocked provider token/fetch.
- `/api/media/import` accepts only allowlisted image hosts or a validated Logo.dev proxy descriptor.
- No provider secret is stored in composition/Card JSON.

## Selection and import

Provider search never changes the Card. A result becomes active only after the Owner:

1. chooses a result for the larger preview;
2. reviews source, dimensions, attribution, and rights;
3. chooses **Import and insert**.

When R2 is configured, the implemented route copies allowlisted provider bytes to
TapConnect-controlled storage and persists metadata on `MediaAsset`. In this closeout
environment all R2 settings are missing, so that behavior is unverified. The current
unavailable response must not be described as a successful import.

## Provider honesty

- Unconfigured, unreachable, and rate-limited providers return distinct unavailable states.
- Pexels 429 responses preserve `Retry-After`.
- Original provider ID, source URL, attribution, dimensions, rights note, and import timestamp are retained.
- Advanced URL remains a clearly labeled fallback and may remain externally hosted.
- Provider media is never selected automatically.

## Current limits

- Favorites and recent history are browser-local convenience state.
- Brand-approved status is currently inferred for imported logo assets; durable approval workflow remains incomplete.
- Pexels and Logo.dev credentials are not available in the closeout environment.
- Live provider results, real rate limits, real proxy bytes, attribution payloads, and
  durable import have not been exercised end to end.
- Provider tests use controlled mocks and validate contracts, not provider availability.
- R2 is the only implemented durable provider-import store. UploadThing is not active
  runtime behavior.
- Advanced URL may remain externally hosted and carries no rights or durability claim.

## Capability classifications

- Shared browser on the Card Owner route: `IMPLEMENTATION IN PROGRESS`
- Live Pexels workflow: `IMPLEMENTATION IN PROGRESS`
- Live Logo.dev workflow: `IMPLEMENTATION IN PROGRESS`
- Durable provider import: `IMPLEMENTATION IN PROGRESS`
- Universal cross-Studio media workflow: `IMPLEMENTATION IN PROGRESS`

