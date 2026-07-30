# Creative Studio Capability Truth Matrix

**Classification:** `IMPLEMENTATION IN PROGRESS`

**Owner route audited:** `/dashboard/card/edit`

**Controlled-pass baseline:** `46a4747c339dca7582db1f3a019e9af0b8f5c006`

This matrix records behavior reachable through the actual Owner route. A type, adapter,
environment variable, isolated component, Prisma field, or test does not by itself make a
capability complete.

## Visible behavior delivered in this pass

- `MediaPicker` now opens one Media and Asset Browser from Card image/logo and Creative
  Composition image, frame, and background-image flows.
- The browser visibly exposes Studio, Brand, Recent, Favorites, Pexels, Logo.dev, Upload,
  and Advanced URL sources. Recent/favorite state is browser-local, and Brand approval is
  inferred rather than managed by a durable approval workflow.
- Creative Composition exposes typed linear/radial gradients, image-background controls,
  procedural patterns/textures, searchable registered masks, mask-following frame
  outlines, image adjustments, divider controls, text renderer parity, exact geometry,
  and drag-time snap guides.
- Preview/Public load composition fonts, and the narrow Live Device renderer keeps the
  freeform composition unless the Owner explicitly chooses another fallback.
- Pexels error/rate-limit handling, Logo.dev proxy isolation, media provenance fields,
  and R2 import code exist. Live provider and durable-import behavior was not exercised
  because this environment has no Pexels, Logo.dev, or R2 credentials.

## Owner capability matrix

| Capability | Actual Owner-route behavior | Remaining truth | Classification |
|---|---|---|---|
| Dominant Card canvas and Edit/Preview modes | Visible and interactive on `/dashboard/card/edit`; Preview has desktop/tablet/phone controls | Public parity and complete selection semantics still need manual Owner review | `IMPLEMENTATION IN PROGRESS` |
| Sliding Contextual Inspector | Appearance, selection, and composition stacks visibly push/back/close | Focus containment and manual keyboard/screen-reader review are incomplete | `IMPLEMENTATION IN PROGRESS` |
| Live Device draft preview | Preview token, QR panel, update/revoke path, and phone-sized renderer are wired | Physical-phone visual fidelity re-scan remains open; direct LAN is network-blocked | `IMPLEMENTATION IN PROGRESS` |
| Shared Media and Asset Browser | Reachable from Card image/logo and composition image/frame/background-image controls | It is not yet the universal picker for every Brand, Assets, Email, Campaign, Offer, and template flow | `IMPLEMENTATION IN PROGRESS` |
| Studio/upload assets | Existing assets and upload source are visible | Durable upload/import requires missing R2 credentials; no credentialed verification was possible | `IMPLEMENTATION IN PROGRESS` |
| Brand assets | Brand source is visible in the shared browser | Durable approval, rejection, variants, and governance workflow are not implemented | `IMPLEMENTATION IN PROGRESS` |
| Pexels search | Pexels source, query/filter UI, pagination contract, metadata, and unavailable states are wired | `PEXELS_API_KEY` is missing; live search, attribution payloads, 429 behavior, and import were not exercised end to end | `IMPLEMENTATION IN PROGRESS` |
| Logo.dev lookup | Logo.dev source and server proxy URL are wired; token-isolation unit coverage exists | `LOGO_DEV_TOKEN` is missing; live provider lookup/proxy bytes and Brand approval were not exercised | `IMPLEMENTATION IN PROGRESS` |
| Durable provider import | `/api/media/import` validates allowlisted sources and writes to R2 when configured | All R2 credentials are missing, so the Owner sees an honest unavailable state and no durable import was verified | `IMPLEMENTATION IN PROGRESS` |
| Media provenance/rights | Prisma and API support dimensions, provider ID, source URL, attribution, rights, and import time; preview shows supplied metadata | Migration deployment and credentialed provider persistence were not verified; rights are informational, not legal clearance | `IMPLEMENTATION IN PROGRESS` |
| Advanced URL | Visible fallback that can insert an externally hosted URL | No ownership, durability, or rights verification is performed | `IMPLEMENTATION IN PROGRESS` |
| Background removal | Legacy `MediaPicker` path remains reachable where enabled | No real removal runtime is configured or verified; shared-browser integration is incomplete | `IMPLEMENTATION IN PROGRESS` |
| Typed gradients | Quick and advanced linear/radial controls are visible in Composition Background and render through the shared composition renderer | Shared palette, contrast repair, saved gradients, and exhaustive keyboard testing remain open | `IMPLEMENTATION IN PROGRESS` |
| Solid and image backgrounds | Solid, gradient, image, pattern, and texture choices are visible; image fit/focal/repeat/overlay controls render | Card-wide parity and complete responsive/manual visual proof remain open | `IMPLEMENTATION IN PROGRESS` |
| Patterns/textures | Searchable procedural catalog is visible and renders without bundled third-party imagery | Saved/favorite durable state and broader cross-surface reuse are absent | `IMPLEMENTATION IN PROGRESS` |
| Frame outlines | Registered mask path is used for scaled/exact stroke, alignment, style, opacity, gap, shadow, and glow | Browser/renderer visual calibration at all scales is not complete | `IMPLEMENTATION IN PROGRESS` |
| Frame/mask browser | Search, category, favorites, recent ordering, thumbnails, and selection are visible | Favorites/recent are local; custom mask upload and Brand-approved mask governance are absent | `IMPLEMENTATION IN PROGRESS` |
| Arbitrary SVG mask upload | No Owner route exists | Deferred pending sanitization, licensing, accessibility, performance, and renderer compatibility | `NOT IMPLEMENTED` |
| Composition image transforms | Fit, focal point, flips, rotation, basic adjustments, reset, alt/decorative controls are visible | True crop workflow, typed source lineage, and complete keyboard operation are absent | `IMPLEMENTATION IN PROGRESS` |
| Independent divider | Multiple styles, markers, caps, opacity, and geometry controls are visible | Full responsive constraints and exhaustive renderer tests remain open | `IMPLEMENTATION IN PROGRESS` |
| Composition typography | Font catalog plus case, spacing, line height, decoration, and justification are visible and rendered | Highlight/outline/shadow/glow and complete wrapping/contrast assistance are incomplete | `IMPLEMENTATION IN PROGRESS` |
| Precision movement and guides | Exact X/Y/W/H/rotation and edge/grid snap guides are wired in edit mode | Rulers, spacing measurements, richer constraints, and non-pointer parity are incomplete | `IMPLEMENTATION IN PROGRESS` |
| Grouping/layering | Selection, ordering, lock/visibility, grouping, and group movement foundations exist | Unified durable naming, drag/keyboard reorder, conflict warnings, tidy/equal spacing, and copy/paste are incomplete | `IMPLEMENTATION IN PROGRESS` |
| Structured text/image flow wrapping | No shared Owner workflow | Typed left/right/above/below flow, gutter, mobile order, and cross-surface renderer are absent | `NOT IMPLEMENTED` |
| Full Shape Studio | Basic composition shapes render and expose limited controls | Searchable registry, thumbnails, complete fill/stroke/effects, and shared shape reuse are absent | `IMPLEMENTATION IN PROGRESS` |
| Reusable styles/compositions | No durable Creative Studio save/apply workflow exists on the Card route | Typed records, thumbnails, versioning, usage, apply/reset, and history transactions are absent | `NOT IMPLEMENTED` |
| Editable Creative templates | Campaign templates exist outside this workflow | No non-destructive Creative Composition template layer is wired to the Card Owner route | `NOT IMPLEMENTED` |
| Shared color system | Existing controls and Brand reset are fragmented across panels | Unified Brand/document/recent/favorite palette, contrast guidance, and saved palettes are absent | `IMPLEMENTATION IN PROGRESS` |
| Manual animation authoring | No such controls are exposed | Intentionally outside this pass; only functional panel transition motion is present | `NOT IMPLEMENTED` |

## Provider and secret boundary

| Boundary | Verified code behavior | Unverified live behavior | Classification |
|---|---|---|---|
| Pexels | Server-only key access; explicit unavailable and 429 response shapes | Real query, real rate limit, real attribution, and R2 import | `IMPLEMENTATION IN PROGRESS` |
| Logo.dev | Browser receives a TapConnect proxy URL rather than a token-bearing upstream URL | Real search and image proxy with provider credentials | `IMPLEMENTATION IN PROGRESS` |
| R2 | Server-only S3-compatible client and honest 503 when unavailable | Upload/import, public URL, persistence, and migration in a credentialed environment | `IMPLEMENTATION IN PROGRESS` |

## Conclusion

The pass materially expands the real Card Owner route, but major cross-surface reuse,
template/style persistence, structured flow, full Shape Studio, provider credential
verification, physical-phone fidelity, and manual accessibility/visual review remain
open. The controlled closeout classification therefore remains
`IMPLEMENTATION IN PROGRESS`.

