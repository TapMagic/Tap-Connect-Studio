# TapConnect Creative Platform Completion Implementation Plan

Status: implementation plan only
Starting checkpoint: `df183bd54c89d770ac7b95f3d7687f98c45eab64`
Branch: `tapconnect-creative-platform-completion`
Target: one Owner-ready creative platform centered on the living TapConnect Card

## 1. Executive recommendation

Complete the platform by extending the current Card Creative Composition foundation, not by starting another builder.

The repository already has a real, visible Card composition workflow with a typed composition block, direct selection, proportional positioning, basic layers, grouping, alignment, typed gradients, procedural patterns, registered masks, media selection, labeled Undo/Redo, and the same React renderer in Card Edit, Preview, and Public. Those are the correct foundations.

The completion strategy is:

1. Make `SharedMediaAssetBrowser` the only media-selection experience and make `MediaAsset` the durable source of media truth.
2. Correct provenance, approval, Recent/Favorites, provider errors, and import semantics before adding more visual controls.
3. Evolve the existing `CreativeCompositionBlock` into a versioned shared contract with typed fill, outline, transform, image-treatment, layer, and accessibility fields.
4. Keep the existing Card renderer as the primary DOM renderer; add explicit surface adapters for Campaign/Offer and Email instead of cloning it.
5. Persist reusable designs in dedicated, tenant-scoped, revisioned records. Do not store them as unrelated JSON on Brand, Campaign, or Email records.
6. Deliver visible end-to-end slices. The first slice must prove one imported asset can be selected from the shared browser, used in a Card composition, and reused from the same `MediaAsset` in one Email hero section without invoking or changing the existing Email-delivery path.

Do not replace the Card authoring shell, adaptive drawer, composition canvas, safe mask registry, typography catalog, provider proxy boundary, or preview/public Card path. Replace only duplicated or misleading behavior, especially the legacy controls still embedded in `MediaPicker`, local-only approval/convenience state, and untyped `props: Record<string, unknown>` editing.

## 2. Actual current-state findings

### Audit basis

The audit inspected the Owner routes, components, persistence, API routes, provider services, renderers, and tests at the checkpoint. It also ran the actual rendered Owner workflow against the repository's production build:

- `e2e/creative-studio-capability-completeness.spec.ts`: 3/3 passed for opening the shared browser from a composition image, opening typed Gradient Studio, and opening exact/scaled frame-stroke plus searchable mask controls.
- Creative model/provider unit proofs: 16/16 passed for composition operations, snapping, gradients/patterns, and Logo.dev secret isolation.

These results prove reachability of those controls, not completion of the whole capability.

### Findings that control the plan

1. The permanent browser exists at `components/media/shared-media-asset-browser.tsx`, and `MediaPicker` opens it at `components/media/media-picker.tsx:385-437`.
2. `MediaPicker` still contains a second stock gallery, a second logo gallery, direct URL editing, upload/data-URL fallback, and a second library grid at `components/media/media-picker.tsx:161-383` and `500-730`. This violates the one-browser law and can bypass provider import/provenance.
3. Recent and Favorites are browser-local, not tenant-durable: `lib/media/asset-browser.ts:38-93`.
4. Mask Recent/Favorites are also browser-local: `components/fusion/creative-studio/frame-mask-browser.tsx:11-29`.
5. `MediaAsset` is tenant-related and has initial provenance fields, but it lacks approval status, creator/license fields, storage identity, derivatives, durable favorites/recents, and usage references: `prisma/schema.prisma:584-607`.
6. Provider import copies bytes to R2 and creates `MediaAsset`, which is the right boundary: `app/api/media/import/route.ts:69-147`. However, the request trusts client-supplied descriptive metadata and only URL-host allowlists the source.
7. The Pexels route supports query, page, orientation, provider color, attribution, rate-limit response, and provider-unavailable response: `app/api/stock/search/route.ts:27-137`. The same route silently falls back to Unsplash at `140-187`, which makes a UI tab labeled Pexels provider-ambiguous.
8. Logo.dev credentials remain server-side and image bytes are proxied: `lib/services/logo-search.ts:111-143` and `app/api/logos/image/route.ts:16-78`. Search also mixes Logo.dev, Wikimedia, favicons, and DuckDuckGo in one result list, so provider/source and import eligibility need stricter handling.
9. A discovered or imported Logo.dev asset is incorrectly treated as approved. `libraryCandidate` sets `isBrandApproved: asset.source === "logo_dev"` at `components/media/shared-media-asset-browser.tsx:99-131`; the Brand tab includes it at `243-255`.
10. Brand Kit can further turn any `MediaPicker` selection into an approved primary logo immediately at `components/fusion/brand/brand-kit-workspace.tsx:1012-1036`.
11. Advanced URL validates HTTPS but deliberately remains hotlinked: `components/media/shared-media-asset-browser.tsx:401-418`. It is not imported, probed for content type, or protected from SSRF because the browser inserts the URL directly.
12. Upload to R2 is tenant-prefixed and persisted: `app/api/upload/route.ts:21-85`. The legacy `MediaPicker` falls back to embedded data URLs when R2 fails or is unavailable at `262-320`, so the actual workflow does not guarantee durable shared storage.
13. The typed gradient source is sound: `GradientModel` has kind, angle, radial center, positions, and opacity at `lib/fusion/creative-studio/gradient.ts:1-17`; the visual editor exposes quick and advanced controls at `components/fusion/creative-studio/gradient-studio.tsx:54-375`.
14. Saved/Recent/Favorite gradients and a real contrast correction are absent. “Reset to Brand” resets to a hard-coded default rather than the active Brand palette at `gradient-studio.tsx:136-146`.
15. The background contract supports none, solid, gradient, image, pattern, and texture in the visible composition inspector at `composition-panel-stack.tsx:1671-1938`. Image blur/brightness/contrast exist in the type/default but are not applied by the renderer; scale is applied only for `fit: original`.
16. Procedural patterns are safe and avoid bundled imagery: `lib/fusion/creative-studio/patterns.ts:43-229`. The catalog is useful but not a durable saved-background system.
17. Frames use a curated path registry, not arbitrary SVG: `lib/fusion/creative-studio/composition.ts:34-251`. The shirt is one of many registered proof masks.
18. Frame outlines are SVG strokes with inside/center/outside approximation and `vectorEffect` at `creative-composition-canvas.tsx:144-240`. The model stores a width in the normalized `0 0 100 100` path space, doubles it for inside/outside, and stretches the viewBox non-uniformly. After a frame shrinks, the same normalized width can dominate the smaller object. “Scale stroke” versus exact pixels is therefore not based on an explicit baseline geometry.
19. Independent border/divider nodes are real selectable composition nodes with style, thickness, caps, markers, dimensions, rotation, layers, locking, and Undo labels: `composition.ts:673-683`, `creative-composition-canvas.tsx:265-365`, and `composition-panel-stack.tsx:1287-1458`.
20. Object outlines are not a shared model. Shape uses a CSS border; image has none; frame has a separate SVG-specific outline contract.
21. Image controls visibly support replace, fit, focal point, opacity, flips, media rotation, brightness, contrast, saturation, blur, grayscale, sepia, alt text, decorative semantics, and reset at `composition-panel-stack.tsx:726-979`. Free crop, crop presets, temperature, tint, highlights, shadows, clarity, vignette, general filter presets, and duotone are absent.
22. Source and adjustment state are partially separated through `originalSrc`, but node properties remain an unvalidated `Record<string, unknown>` at `composition.ts:254-273`.
23. Background removal is visibly exposed from every `MediaPicker` at `media-picker.tsx:400-427`, but its active adapter is explicitly a local chroma-key mock at `lib/media/bg-remove/index.ts:13-21` and `local-mock.ts:140-144`. It must not be presented as a production capability.
24. Freeform text-over-image is real and uses the same Card composition renderer in Edit, Preview, and Public: `components/tap/tap-connect-card.tsx:982-1014`, `app/preview/card/[token]/page.tsx:110-140`, and `components/tap/tap-connect-card-public.tsx:65-89`.
25. Structured Campaign columns exist, but they place image above text within a column, not true left/right wrapping: `components/tap/campaign-renderer.tsx:1110-1156`. Email columns currently serialize text-only table cells: `lib/email-promo.ts:152-166`.
26. Shape Studio is not complete. The model and renderer only provide simple solid shapes and a basic CSS stroke; the visible shape inspector exposes only fill: `composition.ts:656-672`, `creative-composition-canvas.tsx:245-263`, `composition-panel-stack.tsx:1273-1285`.
27. The layer list is visible and selectable, but displays primitive names rather than editable names: `composition-panel-stack.tsx:557-584`.
28. Visibility exists in the data/renderer but has no Owner control. Locking, group/ungroup, multi-select, duplicate/delete, order, align/distribute, snapping, pointer move, one-corner resize, and keyboard nudge are visible.
29. Copy/paste, equal-spacing/tidy, distance measurements, edge handles, rotation handle, aspect lock, and composition-local zoom are absent. Card preview Fit/zoom exists separately in `components/card/tap-card-builder.tsx`.
30. Undo/Redo is full-snapshot, labeled, and session-only: `lib/hooks/use-labeled-undo-redo.ts:18-116`. Drag commits one action. Continuous slider/text updates are not consistently passed as batches, so some controls can create excessive history entries.
31. Existing `SavedTemplate` is Campaign-specific JSON and is not the shared reusable-design system: `prisma/schema.prisma:609-623`.
32. Card is the only full composition consumer. Email and Campaign reuse `MediaPicker` and parts of visual-property inheritance, but they do not consume `CreativeCompositionBlock`, typed gradients, frame treatments, or shape treatments.
33. Email persists inside `Campaign.formSettings.emailResponse`, and Campaign persists visual data in broad JSON fields. These remain valid surface documents, but they are not a home for reusable platform entities.
34. Public Campaign uses `CampaignPageRenderer`; Card uses `TapConnectCard`/`CreativeCompositionCanvas`; Email uses a separate string-replacement HTML renderer. There is no shared cross-surface creative renderer contract yet.
35. Rights/provenance are collected during provider import, but Assets discards those fields when constructing its view model and displays generic source text: `app/dashboard/assets/page.tsx:86-96` and `components/fusion/assets/assets-library.tsx:42-79`.
36. Most media rendering uses raw `<img>` without stored renditions or responsive `srcset`; provider thumbnails are lazy, but imported assets are not optimized or deduplicated by content hash.
37. `requireBusiness()` selects the first membership and APIs filter by `businessId`; there is no role check for creative mutation beyond membership. The plan must add explicit creative permissions without changing onboarding.

## 3. Capability truth matrix

Classification describes Owner-ready truth at the checkpoint, not type or test presence.

| # | Capability | Classification | Evidence and reason |
|---|---|---|---|
| 1 | Shared media browser | REUSE WITH MODIFICATION | Visible from `MediaPicker`, all required tabs exist, but legacy duplicate galleries remain and several tabs are not durable. |
| 2 | MediaAsset storage and provenance | REUSE WITH MODIFICATION | Tenant-scoped model and provenance migration exist; approval, license, storage key, derivative, and usage fields are incomplete. |
| 3 | Upload workflows | REUSE WITH MODIFICATION | R2 upload is real; data-URL fallback and PDF/image contract mismatch prevent one durable image path. |
| 4 | Brand assets | REUSE WITH MODIFICATION | Brand Kit and Brand tab exist, but provider discovery is conflated with approval. |
| 5 | Recent and favorite assets | REPLACE | Current implementation is localStorage-only and contains full external candidate records. |
| 6 | Pexels workflow | REUSE WITH MODIFICATION | Search/filter/page/import boundaries exist; provider identity, 401/403 handling, fixtures, and metadata trust need correction. |
| 7 | Logo.dev workflow | REUSE WITH MODIFICATION | Server proxy and secret isolation are valid; mixed-source results, variant honesty, approval, and import records need correction. |
| 8 | Advanced URL entry | REUSE WITH MODIFICATION | HTTPS preview exists; add server validation/import choice and persistent provenance. |
| 9 | Gradient model and Studio | REUSE WITH MODIFICATION | Strong typed/editor foundation; durable saves, recent/favorite, actual Brand reset, and contrast action are missing. |
| 10 | Background model and Studio | REUSE WITH MODIFICATION | Visible typed choices exist; unify fill contract and finish renderer/control gaps. |
| 11 | Image backgrounds | REUSE WITH MODIFICATION | Fit/focal/repeat/overlay are visible; scale, blur, tint, blend, and contrast behavior are incomplete. |
| 12 | Pattern/texture backgrounds | REUSE WITH MODIFICATION | Safe procedural registry and Studio exist; taxonomy, saved state, and renderer parity need work. |
| 13 | Object outlines | MISSING | No common outline contract across image, text, button, and shape. |
| 14 | Frame outlines | REUSE WITH MODIFICATION | Real SVG outline controls exist; geometry and scale semantics need replacement inside the renderer. |
| 15 | Independent border/divider objects | REUSE WITH MODIFICATION | Real nodes and controls exist; add responsive constraints, full handles, copy/paste, and standardized outline fields. |
| 16 | Stroke scaling versus fixed width | REUSE WITH MODIFICATION | Toggle exists, but normalized SVG units and doubled alignment width cause misleading visual scaling. |
| 17 | Frame/mask registry | REUSE AS-IS | Curated registry and safe renderer boundary are correct; extend data, not arbitrary SVG input. |
| 18 | Mask-browser UX | REUSE WITH MODIFICATION | Search/category/thumbnails/favorite/recent exist; persist user state, Brand approval, reset, and canonical categories. |
| 19 | Image replacement and crop | REUSE WITH MODIFICATION | Replace/fit/focal work; crop rectangle and presets are missing. |
| 20 | Image adjustments and filters | REUSE WITH MODIFICATION | Basic reversible CSS adjustments work; professional adjustment set is incomplete. |
| 21 | Non-destructive image state | REUSE WITH MODIFICATION | `originalSrc` and Reset exist; replace with typed source plus treatment and migration validation. |
| 22 | Freeform text-over-image composition | REUSE AS-IS | Visible Card Owner workflow and shared Card edit/preview/public renderer are real. |
| 23 | Structured text/image wrapping | MISSING | Campaign columns and Email tables are partial layout primitives, not wrap contracts. |
| 24 | Shape library and Shape Studio | REPLACE | Primitive placeholder is too narrow; retain node identity but replace props/editor/renderer with shared contracts. |
| 25 | Layer list | REUSE WITH MODIFICATION | Visible and ordered; needs richer rows, keyboard operation, and stable selection. |
| 26 | Layer naming | MISSING | List displays primitive type; no editable `name`. |
| 27 | Visibility and locking | REUSE WITH MODIFICATION | Lock is editable; visibility is only a latent data field. |
| 28 | Multi-select and grouping | REUSE WITH MODIFICATION | Shift/meta selection and group IDs work; group transform/bounds and nested-group policy are incomplete. |
| 29 | Copy, paste, duplicate, delete | REUSE WITH MODIFICATION | Duplicate/delete work; clipboard serialization and paste are missing. |
| 30 | Layer-order controls | REUSE AS-IS | Forward/back/front/back are visible and tested. |
| 31 | Alignment and distribution | REUSE WITH MODIFICATION | Align/distribute work; equal gap, canvas alignment, and tidy are missing. |
| 32 | Snap lines, smart guides, measurements | REUSE WITH MODIFICATION | Edge/center/grid snapping and guides work; labels, distances, and safe-area snapping are missing. |
| 33 | Resize handles and rotation | REUSE WITH MODIFICATION | One corner handle and numeric rotation exist; edge/corner set and rotation handle are missing. |
| 34 | Aspect locking | MISSING | No node transform aspect-lock field or resize behavior. |
| 35 | Keyboard precision | REUSE AS-IS | Arrow and Shift+Arrow produce labeled relative nudges. |
| 36 | Zoom and Fit to canvas | REUSE WITH MODIFICATION | Card preview has Fit/zoom; composition editing lacks isolated pan/zoom and fit. |
| 37 | Reusable compositions and styles | MISSING | No durable tenant-scoped reusable creative entity. |
| 38 | Saved gradients/backgrounds/palettes | MISSING | Presets exist only in code; no Owner saves. |
| 39 | Templates | REPLACE | Static Campaign templates and `SavedTemplate` do not form one shared creative template system. |
| 40 | Card integration | REUSE AS-IS | Actual Card Owner, Preview, temporary Live Device, and Public paths consume the composition renderer. |
| 41 | Email integration | REUSE WITH MODIFICATION | Shared media picker/visual properties are visible; no shared composition/gradient/frame renderer. |
| 42 | Campaign/Spotlight/Offer/Coupon integration | REUSE WITH MODIFICATION | Campaign shares media/theme controls and Offer/Coupon blocks; no shared creative section contract. |
| 43 | Shared Preview/Public renderer usage | REUSE WITH MODIFICATION | Card is shared; Campaign and Email are separate and need adapters. |
| 44 | Responsive behavior | REUSE WITH MODIFICATION | Relative Card layout and explicit mobile fallback exist; constraints and cross-surface parity need completion. |
| 45 | Accessibility | REUSE WITH MODIFICATION | Dialog labels, alt/decorative controls, reading-order proof, and axe dependency exist; keyboard canvas and contrast enforcement are incomplete. |
| 46 | Rights and attribution | REUSE WITH MODIFICATION | Fields/import display exist; generic Assets display, approval conflation, and immutable provider facts need correction. |
| 47 | Performance and asset optimization | MISSING | No derivative/rendition pipeline, content hash, responsive source selection, or imported-asset dedupe. |
| 48 | Undo/Redo and history labels | REUSE WITH MODIFICATION | Labeled session history exists; standard transactions/batching and all-operation coverage need work. |
| 49 | Unit, Fusion, e2e, responsive, accessibility tests | REUSE WITH MODIFICATION | Useful tests exist, but provider/import/durability/cross-surface/a11y/performance proofs are incomplete. |

## 4. Reuse/replace/defer matrix

### Preserve and extend

- `CreativeCompositionBlock`, its operations, and Card integration.
- `CreativeCompositionCanvas` as the Card/DOM renderer seed.
- `CompositionPanelStack` and the adaptive authoring shell.
- `GradientModel`, `GradientStudio`, procedural pattern registry, typography catalog.
- `FRAME_MASK_CATALOG`, path-only masks, and mask clipping renderer.
- `SharedMediaAssetBrowser`, R2 upload/import boundary, `MediaAsset`, Pexels and Logo.dev server boundaries.
- Session history primitives and Card publication snapshots.

### Replace in place

- LocalStorage Recent/Favorites with API-backed user/tenant records.
- `MediaPicker`'s duplicate stock/logo/library/URL/upload implementations with a thin trigger plus selected-asset summary.
- Implicit Logo.dev approval with explicit approval transitions.
- Shape `props` and editor with typed shape/fill/outline/effect contracts.
- Frame stroke geometry with explicit pixel/scaled stroke resolution.
- Campaign-only `SavedTemplate` as the future reusable-design source; retain a compatibility adapter during migration.

### Defer or reject

- DEFER: production background removal until a certified runtime and durable derivative pipeline exist.
- DEFER: tight/contour flow wrapping; ship square wrap and deterministic mobile stacking first.
- DEFER: custom font upload and font licensing administration.
- DEFER: collaborative multi-user cursors, branching, and conflict merge.
- DEFER: animation, video timeline, motion authoring, and story generation.
- REJECT: arbitrary SVG upload/execution for masks or shapes.
- REJECT: provider hotlinks as the permanent source for selected Pexels/Logo.dev assets.
- REJECT: a second Email/Campaign builder or renderer.
- REJECT: auto-approval based on provider/source.
- REJECT: production claims for the local mock background remover.

## 5. Route and screen inventory

| Surface | Owner route/screen | Current creative path | Planned role |
|---|---|---|---|
| Card assembly | `/dashboard/card` | Card command center | Entry only; no duplicate editor. |
| Card authoring | `/dashboard/card/edit` | `CardAuthoringWorkspace` → `TapCardBuilder` → `CardLiveToolDrawer` | Primary creative host and first-slice proof. |
| Card preview | `/dashboard/card/preview` and embedded Preview | `TapConnectCard` | Consume shared DOM renderer. |
| Temporary device preview | `/preview/card/[token]` | Snapshot → `TapConnectCard` | Preserve shared renderer and preview safety. |
| Public Card | `/t/[deviceCode]` when no live Campaign | `TapConnectCardPublic` → `TapConnectCard` | Preserve as authoritative Card public path. |
| Assets | `/dashboard/assets` | `AssetsLibrary` | Adopt full provenance/approval/favorite controls; reuse browser cards. |
| Brand Kit | `/dashboard/brand/edit` | `BrandKitWorkspace`, `LogoLibrary`, `MediaPicker` | Explicit discovered/imported/approved logo workflow. |
| Legacy Brand | `/dashboard/brand` | Legacy administration | Compatibility only; do not add a second creative system. |
| Campaign authoring | `/dashboard/campaigns/[id]` | `CampaignEditor`, `CampaignVisualDrawer` | Add shared creative-section consumer. |
| Email authoring | `/dashboard/campaigns/[id]/email` | `EmailAuthoringWorkspace`, `EmailVisualDrawer` | Reuse asset identity and later safe creative-section adapter; this plan does not invoke or alter delivery configuration. |
| Public Campaign | `/t/[deviceCode]` when Campaign owns tap | `CampaignPageRenderer` | Add shared DOM creative-section renderer. |
| Offer public | `/offer/[slug]` | Published offer view | Later consume shared Offer creative section; no checkout enablement. |
| Workbench templates | `/dashboard/workbench` | Static Campaign templates | Compatibility adapter into shared resources; not the new source of truth. |

## 6. Capability-to-code mapping

| Capability area | Existing authority | Planned authority |
|---|---|---|
| Media selection | `SharedMediaAssetBrowser`, `MediaPicker` | Browser plus `useMediaAssetSelection`; `MediaPicker` becomes a trigger wrapper. |
| Media persistence | `MediaAsset`, `/api/media`, `/api/upload`, `/api/media/import` | Extended `MediaAsset`, dedicated media service/repository, provider-owned import facts. |
| Providers | `/api/stock/search`, `/api/logos/*`, `logo-search.ts` | `lib/media/providers/{pexels,logo-dev,fixture}.ts`; routes delegate. |
| Composition | `composition.ts` | Version 2 schema modules under `lib/fusion/creative-platform/`. |
| Gradient | `gradient.ts`, `gradient-studio.tsx` | Preserve; add repository-backed resource saves and shared contrast helper. |
| Background | composition background plus patterns | Typed `CreativeFill` shared by background and shapes. |
| Outline/divider | frame props, shape CSS border, border node | One `CreativeOutline`; separate `DividerNode`. |
| Masks | registry in `composition.ts` | Move definitions to `mask-registry.ts`; same path-only renderer. |
| Image treatment | node props | `ImageSourceRef` plus `ImageTreatment`. |
| Shapes | placeholder props | `ShapeGeometry`, `CreativeFill`, `CreativeOutline`, `CreativeEffects`. |
| Layers/transforms | node fields and operations | `LayerMeta`, `CreativeTransform`, transaction operations. |
| Reusable design | none / `SavedTemplate` | `CreativeResource`, revisions, usage references, API. |
| Card renderer | `CreativeCompositionCanvas` | Split interaction shell from pure `CreativeDomRenderer`. |
| Campaign/Offer renderer | `CampaignPageRenderer` | Embed `CreativeDomRenderer` for typed creative sections. |
| Email renderer | `renderEmailHtml`/`email-promo.ts` | `renderCreativeEmailSection` with compatibility fallback/raster rendition. |

## 7. Data-model mapping

### Media

`MediaAsset` remains the canonical stored asset. Existing surface documents must reference `mediaAssetId` plus a snapshot URL during migration; URL-only legacy fields remain readable.

Add:

- explicit provider and source identity;
- object-storage key and content hash;
- creator/license/attribution fields;
- approval state distinct from discovery/import;
- immutable original dimensions/bytes;
- derivative relationship and rendition kind;
- default alt text and decorative eligibility;
- durable favorites, recent usage, and usage references.

### Creative resources

Use dedicated `CreativeResource` and `CreativeResourceRevision` records. `kind` identifies composition, text style, button style, frame treatment, gradient, background, palette, mask favorite set, Offer layout, Coupon layout, Email section, Campaign section, or template.

The revision payload is allowed because it belongs to a dedicated, schema-versioned resource record and is parsed by a kind-specific Zod schema. Do not place these payloads on arbitrary Business, Campaign, BrandKit, or Email JSON.

### Surface documents

- Card: continue snapshotting the whole `BrandKit.tapCard` document. Composition sections gain `resourceId`, `resourceRevisionId`, and an embedded resolved snapshot for public stability.
- Campaign/Offer/Coupon: content blocks gain a `creative_section` type with the same reference plus resolved snapshot.
- Email: blocks gain `creative_section` only for the email-safe subset or a generated rendition reference.
- Publication snapshots continue embedding resolved output so deleting or revising a resource never silently changes published content.

## 8. Shared media architecture

### Permanent browser

`SharedMediaAssetBrowser` is permanent. Every selector opens it with a context:

```ts
type MediaSelectionContext = {
  businessId: string;
  purpose: "photo" | "logo" | "background" | "frame" | "offer" | "email" | "campaign";
  requireImported: boolean;
  allowedMimeTypes: string[];
  onSelect(asset: ApprovedMediaSelection): void;
};
```

The callback returns `mediaAssetId`, durable URL, dimensions, mime type, approval state, source, and attribution summary. It must not return a provider candidate as if it were a stored asset.

### Source behavior

- Upload: upload directly, then select stored `MediaAsset`.
- Brand: query `approvalStatus=APPROVED` and Brand roles; never infer from source.
- Studio: query all reusable tenant assets.
- Recent: query durable per-user selection events.
- Favorites: query durable per-user favorites.
- Pexels: provider candidates; import before selection.
- Logo.dev: provider candidates; import before selection; still unapproved.
- Advanced URL: preview through a safe server probe, then import a copy before selection. Phase 2 does not add a permanent external-link media type.

### Selection lifecycle

`discovered candidate → previewed → imported MediaAsset → optionally Brand-approved → selected → usage recorded`

Import does not equal approval. Selection does not equal Brand approval. A logo can be selected for a draft without becoming the primary Brand logo.

### Remove duplicated paths

Delete the legacy stock gallery, logo gallery, collapsible library, direct live URL field, and data-URL fallback from `MediaPicker` after all call sites use the browser. Keep drag/drop as a browser initial action, not a parallel persistence path.

## 9. Pexels approach

Keep provider credentials and upstream requests server-side.

### Adapter contract

`PexelsProvider.search({ query, page, perPage, orientation, color })` returns normalized candidates and a typed status. Only pass values supported by Pexels:

- orientation: landscape, portrait, square;
- color: Pexels-supported color string/hex;
- pagination from Pexels `next_page`;
- no invented style, people, license, or semantic filters.

### Owner states

- Initial: explain search and attribution.
- Loading: retain prior results, mark request busy.
- Empty: “No Pexels photos matched.”
- 401/403: credential invalid/not authorized; do not imply no results.
- 429: show retry-after and disable retry until elapsed.
- 5xx/network: provider unavailable with Upload/Studio recovery.
- Credentials absent: honest unavailable state; fixture mode may be enabled only by server test configuration.

### Import

The client sends a short-lived signed candidate token, not arbitrary metadata. The token contains provider ID, selected rendition URL, source page, photographer facts, dimensions, expiry, and business ID. `/api/media/import` verifies it, re-resolves the provider host, downloads with timeout/size/content-type checks, stores to R2, and persists immutable provenance. No selected Pexels asset remains dependent on a provider hotlink.

The UI must display “Photo by {photographer} on Pexels” with source links before import and in Assets after import.

Remove Unsplash fallback from the Pexels tab. If Unsplash remains, expose it as a separately named provider/source in a later slice.

## 10. Logo.dev approach

Preserve the current server proxy and token isolation.

### Search behavior

- Accept business name or domain.
- Return Logo.dev results only under a Logo.dev provider grouping.
- Return Wikimedia/favicons only under clearly separate fallback groupings; do not label them Logo.dev.
- Offer only actual Logo.dev query variants supported by the current integration: `theme=auto|light|dark`, `greyscale`, and supported size. Do not claim multiple brand artwork variants if Logo.dev returns the same mark treatment.
- Proxy previews through `/api/logos/image`; never return the upstream token-bearing URL.

### Import and approval

- Import selected bytes to R2 and create `MediaAsset(source=LOGO_DEV, approvalStatus=UNREVIEWED)`.
- Show trademark/source notice and source URL.
- Require a separate “Approve for Brand” action, permission check, confirmation, and audit fields.
- Setting a primary Brand logo requires an approved asset and a tenant-scoped `mediaAssetId`; enforce this in `/api/brand`, not only the UI. Deprecate `/api/upload`'s `asLogo` shortcut because it bypasses approval. Draft Card/Email/Campaign placement may use unapproved imported assets with an editor warning, but publishing can be configured to require approval for identity-purpose placements.

### Reuse locations

Business/Brand setup, Brand Kit, Card identity, Creative Composition image/frame, Offer, Coupon, Email, and Campaign all call the same browser with `purpose: "logo"`; no surface-specific logo search.

## 11. Rights and attribution

Persist provider facts, not generic prose only:

- `provider`
- `providerAssetId`
- `sourcePageUrl`
- `creatorName`
- `creatorUrl`
- `licenseCode`
- `licenseUrl`
- `attributionText`
- `rightsNote`
- `importedAt`
- `approvalStatus`, `approvedAt`, `approvedById`

Provider adapters own these values. Clients cannot overwrite them during import.

Uploaded assets use `licenseCode=OWNER_SUPPLIED` and a responsibility notice. Advanced URLs use `EXTERNAL_UNVERIFIED` unless imported with verified metadata. Logo.dev uses a trademark-rights notice, not a claim of copyright license.

Assets, browser preview, and publication metadata show the same attribution. Public rendering includes visible attribution only where provider/license requires it; otherwise retain it in asset details and export manifests.

## 12. Gradient model

Keep `GradientModel` as the single source and move it to the shared platform namespace without changing version 1 semantics.

Complete:

- quick start/end controls;
- 2–8 stops;
- stop position and opacity;
- linear/radial and radial center;
- angle and reverse;
- active Brand palette;
- durable Recent/Favorites/saved gradients;
- curated presets;
- live preview;
- contrast warning against selected foreground;
- “Use suggested readable text” action;
- Reset to current Brand default, not hard-coded TapConnect default.

All DOM surfaces render through `gradientToCss`. Email uses `renderEmailGradient`: supported CSS/VML where safe, mandatory solid fallback, and generated rendition for masked/freeform sections. Raw CSS remains import compatibility only.

## 13. Background model

Create:

```ts
type CreativeFill =
  | { kind: "none" }
  | { kind: "solid"; color: ColorValue }
  | { kind: "gradient"; gradient: GradientModel }
  | { kind: "image"; media: ImageSourceRef; treatment: BackgroundImageTreatment }
  | { kind: "pattern"; pattern: SurfacePatternModel }
  | { kind: "texture"; pattern: SurfacePatternModel };
```

`BackgroundImageTreatment` includes fit, focal point, position, scale, repeat, blur, tint, overlay opacity, supported blend mode, and decorative/alt semantics.

Supported blend modes are the existing safe subset: normal, multiply, screen, overlay, soft-light. Email adapters flatten unsupported combinations to a generated rendition.

Procedural patterns remain code-defined and license-safe. Do not bundle photographic “paper,” “wood,” or “fabric” textures without documented licenses; use procedural approximations until a licensed asset pack is approved.

## 14. Outline/frame/divider model

Keep three distinct concepts.

```ts
type CreativeOutline = {
  widthPx: number;
  color: string;
  opacity: number;
  style: "solid" | "dashed" | "dotted";
  placement: "inside" | "center" | "outside";
  radiusPx?: number;
  scaleMode: "scale_with_object" | "fixed_px";
  baselineShortEdgePx?: number;
};
```

- Object outline: optional on image, shape, text box, and button where supported.
- Frame outline: follows the mask path.
- Divider: independent node with transform, dimensions, thickness, style, color, opacity, caps/markers, layer metadata, and responsive constraints.

### Oversized frame-border correction

The existing frame uses `strokeWidth` in a stretched 100-unit viewBox and doubles inside/outside width. Replace that calculation:

- `fixed_px`: render `vector-effect="non-scaling-stroke"` and use CSS-pixel width.
- `scale_with_object`: resolve `effectiveWidthPx = widthPx * currentShortEdge / baselineShortEdgePx`.
- use a uniform mask coordinate transform; do not non-uniformly stretch stroke geometry;
- implement inside/center/outside with safe clip/mask geometry rather than width doubling as the sole approximation;
- clamp effective width to less than half the short edge;
- Reset restores the Brand/default outline.

## 15. Mask registry and library

Move catalog data to `lib/fusion/creative-platform/masks/registry.ts`, preserving path-only definitions and the current fallback.

Each entry adds:

- id, label, category, tags;
- path/viewBox;
- thumbnail strategy;
- approved-by-platform flag;
- optional Brand recommendation metadata.

Canonical categories: Basic, Geometric, Badges, Tickets and Coupons, Apparel, Food and Beverage, Beauty and Wellness, Automotive, Real Estate and Home, Pets and Animals, Hospitality and Travel, Sports, Seasonal, Organic and Decorative.

The browser keeps thumbnails, search, category, fast switching, and shirt proof. Add durable Recent/Favorites, explicit Brand-approved filter, keyboard grid navigation, and Reset. Registry additions require path validation tests; arbitrary SVG markup, scripts, external references, and uploaded mask code remain rejected.

## 16. Image-adjustment model

```ts
type ImageSourceRef = {
  mediaAssetId: string;
  fallbackUrl: string;
  originalWidth?: number;
  originalHeight?: number;
};

type ImageTreatment = {
  crop?: { x: number; y: number; width: number; height: number; aspect?: string };
  focalPoint: { x: number; y: number };
  fit: "cover" | "contain" | "fill";
  scale: number;
  position: { x: number; y: number };
  flipX: boolean;
  flipY: boolean;
  rotationDeg: number;
  opacity: number;
  adjustments: {
    brightness: number;
    contrast: number;
    saturation: number;
    temperature: number;
    tint: number;
    highlights: number;
    shadows: number;
    clarity: number;
    blurPx: number;
    vignette: number;
  };
  filterPresetId?: string;
  duotone?: { shadow: string; highlight: string; strength: number };
  altText: string;
  decorative: boolean;
};
```

Source never changes when a treatment changes. Replace source only through the browser. Reset clears treatment to defaults and retains source. Crop uses normalized coordinates; UI offers free crop and common ratios.

CSS-capable adjustments render live. Highlights/shadows/clarity/duotone that cannot be represented consistently require a generated rendition before publication; controls remain hidden until that path exists.

Background removal is hidden outside development fixtures until a safe runtime creates a durable derivative `MediaAsset` with `parentAssetId`.

## 17. Text/image relationship model

### Freeform overlay

Use composition nodes and layers. Support front/behind, grouping, alignment, and responsive constraints. Card, Campaign creative, Spotlight, Offer, and Coupon can use the DOM renderer.

### Structured flow

Add a separate `CreativeFlowSection`:

- image left/text right;
- image right/text left;
- image top/text bottom;
- text top/image bottom;
- square wrap with gutter;
- mobile stack order;
- image width ratio and alignment.

Campaign, Offer, Coupon, Email, and structured Card sections may use flow. Email renders a presentation table with mobile stacking and alt text. Do not put document wrapping inside freeform composition nodes.

Tight/contour wrap remains deferred until renderer and accessibility behavior are deterministic.

## 18. Shape model

Replace placeholder shape props with:

```ts
type ShapeNode = {
  geometry: { kind: "rectangle" | "rounded" | "ellipse" | "triangle" | "polygon" | "star" | "arrow" | "badge" | "speech" | "organic"; parameters?: Record<string, number> };
  fill: CreativeFill;
  outline?: CreativeOutline;
  effects?: { shadow?: Shadow; glow?: Glow; blendMode?: SupportedBlendMode };
};
```

Use the same transform/layer fields as all nodes. Expose exact dimensions, radius where valid, opacity, rotation, flip, aspect lock, and layering. Image fill uses `ImageSourceRef`/`ImageTreatment`. “Convert to frame” is available only for closed registry-backed paths and creates a frame node with the same geometry ID.

Arbitrary path text is not accepted from Owners.

## 19. Layers and precision-canvas model

Add `name`, `locked`, `visible`, `groupId`, and responsive constraints to a typed `LayerMeta`. Maintain one flat render list in version 2; groups are explicit nodes with child IDs and computed bounds. Reject cycles.

Complete operations:

- rename, hide/show, lock/unlock;
- multi-select, group/ungroup;
- clipboard copy/paste with new IDs;
- duplicate/delete;
- order operations;
- align to selection or canvas;
- distribute centers and equal gaps;
- tidy into equal spacing;
- edge/center/grid/safe-area snap;
- distance measurements;
- eight resize handles and rotation handle;
- aspect lock;
- Arrow 1 px-equivalent and Shift+Arrow 10 px-equivalent at current canvas scale;
- zoom 25–400%, Fit, and reset 100%.

Every operation is a pure transaction returning `{next, label}`. Pointer drag/resize/rotate shows drafts and commits once on pointer-up. Slider scrubs batch into one history item. Selection, drawer navigation, zoom, and pan do not enter document history.

## 20. Reusable-design model

`CreativeResource` is tenant-owned. `createdById` and `updatedById` capture ownership. `scope` is `BUSINESS` initially; platform/global resources are read-only seeded records, not cross-tenant rows.

Rules:

- naming unique per business/kind among non-deleted resources;
- immutable numbered revisions;
- draft/approved/deprecated status;
- Brand approval records approver and timestamp;
- duplicate creates a new resource at revision 1;
- edit creates a revision;
- delete is soft-delete and blocked when a published usage requires it;
- usage references are explicit;
- surface insertion pins a revision and embeds a resolved snapshot;
- permissions checked server-side for read, create, edit, approve, delete;
- portability uses a versioned export manifest containing resource payload plus referenced asset IDs/provenance, never secrets.

Kinds cover compositions, text styles, button styles, frame treatments, gradients, backgrounds, palettes, mask favorites, Offer layouts, Coupon layouts, Email sections, Campaign creative sections, and templates.

## 21. Cross-surface renderer contract

Split current `CreativeCompositionCanvas` into:

1. `CreativeInteractionCanvas`: selection, drag, guides, handles, keyboard.
2. `CreativeDomRenderer`: pure rendering of a validated composition.
3. `CreativeEmailRenderer`: compatible structured output and rendition fallback.

Input:

```ts
type CreativeRenderDocument = {
  schemaVersion: 2;
  canvas: { aspectRatio: number; background: CreativeFill; safeAreaPx: number };
  nodes: CreativeNode[];
  mobile: MobileCompositionPolicy;
  accessibility: { readingOrder: string[] };
};
```

Card, Campaign, Spotlight, Offer, Coupon, Preview, and Public use `CreativeDomRenderer`. Email uses the same document but:

- renders supported structured text/image/button primitives as email HTML;
- renders unsupported freeform/mask/blend combinations to a durable PNG/WebP rendition linked to the resource revision;
- keeps alt text and attribution metadata;
- always supplies solid-color and image-blocked fallbacks.

The cross-surface proof fixture uses one asset ID, typography token, gradient, and frame treatment. Card and Campaign/Offer render live DOM; Email references the rendition generated from the same resource revision. This is reuse, not a separate Email design model.

## 22. Permissions and tenant boundaries

All APIs call `requireBusiness()` and scope every query/mutation by `business.id`. Never update by unscoped ID after only client validation.

Map permission helpers to the repository's actual `UserRole` values:

- `creative:read`: `OWNER`, `MANAGER`, `MARKETING`, and `VIEWER`;
- `creative:edit`: `OWNER`, `MANAGER`, and `MARKETING`;
- `creative:approve_brand`: `OWNER` and `MANAGER`;
- `creative:delete`: `OWNER` and `MANAGER`, with usage guard;
- `creative:manage_providers`: platform admin only.

`STAFF_SCANNER` receives no Creative Platform permission. No new role enum is required in this wave.

Because current auth chooses the first membership, multi-business switching is outside this phase; services still accept the resolved business ID only. Provider candidate tokens bind business ID and expire. Storage keys begin with business ID. Cross-tenant asset/resource IDs return 404, not authorization detail.

## 23. Responsive behavior

- Store transforms normalized to the canvas, but resolve stroke and keyboard movement in display pixels.
- Card composition default remains proportional “scale.”
- Optional `stack` and `hide_decorative` policies must apply consistently in embedded Preview, temporary Preview, and Public when the selected breakpoint activates; remove the current “only when explicitly forced” mismatch before calling the policy complete.
- Structured flow sections stack at a configured breakpoint with deterministic image/text order.
- Drawers become bottom sheets; browser tabs remain horizontally scrollable.
- Test at 320, 390, 768, 1024, and 1440 CSS pixels.
- Safe areas and minimum touch targets remain at least 44×44 CSS pixels.

## 24. Accessibility

- Browser and mask grids implement roving focus or standard listbox keyboard navigation.
- Dialogs trap focus, restore opener focus, close on Escape, and expose labelled loading/error status.
- Canvas nodes are keyboard selectable and movable; controls expose current dimensions/rotation.
- Layer order and screen-reader reading order are separately editable; decorative nodes are omitted.
- Non-decorative images require alt text before publish.
- Contrast checks cover text/background, CTA/text, and gradient worst-case sampling. Warnings include a one-click readable correction.
- Motion respects reduced-motion preferences.
- Email output preserves alt text, table presentation roles, logical reading order, and image-blocked fallback.
- Add axe checks to all three proof surfaces.

## 25. Performance

- Generate `thumbnail`, `small`, `medium`, and `large` renditions on import/upload; keep original.
- Persist dimensions, byte size, mime, content hash, storage key, and parent/derivative relation.
- Deduplicate imports within a business by provider ID and content hash.
- Browser uses paginated APIs, thumbnail URLs, lazy loading, and abortable searches.
- DOM renderer memoizes validated nodes and avoids re-parsing per pointer move.
- Use draft state during pointer interaction and one document commit on release.
- Public surfaces select an appropriate rendition and include dimensions to prevent layout shift.
- Provider requests use timeout, response-size cap, content-type validation, and bounded concurrency.
- Email rendition generation is asynchronous with explicit pending/failed states; publishing cannot reference a missing rendition.

## 26. Error/loading/empty/recovery states

Define shared status codes and Owner copy for:

- library loading/empty/network failure;
- upload unavailable/type rejected/too large/storage failure;
- provider credentials absent/invalid/forbidden/rate-limited/outage/empty;
- candidate expired/import retry/import duplicate;
- source URL invalid/blocked/not image/too large/unreachable;
- approval required/permission denied;
- deleted or unavailable asset;
- rendition pending/failed;
- resource validation/version conflict/usage-blocked delete;
- preview/public unsupported legacy payload.

Every state names consequence and recovery. No provider fixture or missing credential is shown as “no results.” Failed import inserts nothing.

## 27. Exact database changes

Modify `Business` relations for new creative records and extend `MediaAsset`:

```prisma
enum MediaApprovalStatus { UNREVIEWED APPROVED REJECTED }
enum MediaLicenseCode { OWNER_SUPPLIED PEXELS NO_LICENSE_ASSERTED EXTERNAL_UNVERIFIED OTHER }
enum CreativeResourceKind {
  COMPOSITION TEXT_STYLE BUTTON_STYLE FRAME_TREATMENT GRADIENT BACKGROUND
  PALETTE MASK_FAVORITES OFFER_LAYOUT COUPON_LAYOUT EMAIL_SECTION
  CAMPAIGN_SECTION TEMPLATE
}
enum CreativeResourceStatus { DRAFT APPROVED DEPRECATED }
enum CreativeSurfaceKind { CARD EMAIL CAMPAIGN SPOTLIGHT OFFER COUPON }

model MediaAsset {
  // existing fields retained
  storageKey       String?
  contentHash      String?
  provider         String?
  providerAssetId  String?
  sourcePageUrl    String?
  creatorName      String?
  creatorUrl       String?
  licenseCode      MediaLicenseCode?
  licenseUrl       String?
  attributionText  String?
  rightsNote       String?
  approvalStatus   MediaApprovalStatus @default(UNREVIEWED)
  approvedAt       DateTime?
  approvedById     String?
  defaultAltText   String?
  parentAssetId    String?
  renditionKind    String?
  parentAsset      MediaAsset? @relation("MediaDerivatives", fields: [parentAssetId], references: [id], onDelete: SetNull)
  derivatives      MediaAsset[] @relation("MediaDerivatives")
  favorites        MediaAssetFavorite[]
  recents          MediaAssetRecent[]
  usages           CreativeAssetUsage[]
  @@unique([businessId, provider, providerAssetId])
  @@index([businessId, approvalStatus, createdAt])
  @@index([businessId, contentHash])
}

model MediaAssetFavorite {
  id           String @id @default(cuid())
  businessId   String
  userId       String
  mediaAssetId String
  createdAt    DateTime @default(now())
  @@unique([businessId, userId, mediaAssetId])
  @@index([businessId, userId, createdAt])
}

model MediaAssetRecent {
  id           String @id @default(cuid())
  businessId   String
  userId       String
  mediaAssetId String
  lastUsedAt   DateTime @default(now())
  useCount     Int @default(1)
  @@unique([businessId, userId, mediaAssetId])
  @@index([businessId, userId, lastUsedAt])
}

model CreativeResource {
  id                String @id @default(cuid())
  businessId        String
  kind              CreativeResourceKind
  name              String
  activeNameKey     String? @unique
  status            CreativeResourceStatus @default(DRAFT)
  currentRevisionId String?
  createdById       String
  updatedById       String
  approvedById      String?
  approvedAt        DateTime?
  deletedAt         DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  revisions         CreativeResourceRevision[] @relation("ResourceRevisions")
  currentRevision   CreativeResourceRevision? @relation("CurrentResourceRevision", fields: [currentRevisionId], references: [id])
  usages            CreativeResourceUsage[]
  @@index([businessId, kind, status])
}

model CreativeResourceRevision {
  id            String @id @default(cuid())
  resourceId    String
  version       Int
  schemaVersion Int
  payload       Json
  createdById   String
  createdAt     DateTime @default(now())
  resource      CreativeResource @relation("ResourceRevisions", fields: [resourceId], references: [id], onDelete: Cascade)
  currentFor    CreativeResource[] @relation("CurrentResourceRevision")
  @@unique([resourceId, version])
}

model CreativeResourceUsage {
  id                 String @id @default(cuid())
  businessId         String
  resourceId         String
  resourceRevisionId String
  surface            CreativeSurfaceKind
  subjectId          String
  documentPath       String
  published          Boolean @default(false)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  @@unique([businessId, surface, subjectId, documentPath])
  @@index([businessId, resourceId])
}

model CreativeAssetUsage {
  id           String @id @default(cuid())
  businessId   String
  mediaAssetId String
  surface      CreativeSurfaceKind
  subjectId    String
  documentPath String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  @@unique([businessId, surface, subjectId, documentPath, mediaAssetId])
  @@index([businessId, mediaAssetId])
}
```

Add normal relations to `Business`, `User`, and `MediaAsset` in the actual schema. Set `activeNameKey` to a normalized `${businessId}:${kind}:${name}` key while active and to `null` on soft delete; PostgreSQL's normal nullable composite uniqueness does not enforce one active row.

## 28. Exact migrations

1. `creative_media_truth`:
   - add media enums/columns;
   - backfill `provider="pexels"` where `source=stock` and source URL/provider facts identify Pexels;
   - backfill `provider="logo_dev"` where source is Logo.dev;
   - copy current `providerId` to `providerAssetId`, `sourceUrl` to `sourcePageUrl`, `attributionName` to `creatorName`, and `attributionUrl` to `creatorUrl`;
   - map existing rights text conservatively;
   - set all existing assets `UNREVIEWED`; if a Business primary `logoUrl` exactly matches a tenant `MediaAsset.url`, that existing row may be backfilled `APPROVED` with a migration report. If there is no matching asset, keep the legacy URL readable but create no synthetic approved asset; require Owner import and approval before the primary logo can be changed;
   - add indexes after backfill.
2. `creative_media_activity`:
   - create Favorites, Recent, and AssetUsage tables with cascades and tenant indexes.
3. `creative_resources`:
   - create enums/resource/revision/usage tables;
   - no automatic conversion of arbitrary `SavedTemplate` rows.
4. `creative_resource_backfill`:
   - optional controlled script converts valid `SavedTemplate` rows into `TEMPLATE` resources, writes a compatibility map, and leaves original rows until acceptance.
5. Do not migrate localStorage Recent/Favorites because they are device-local, may contain unimported provider URLs, and cannot be trusted as tenant data.

All migrations run only against isolated development first, then use normal deploy migration. No `db push`.

## 29. Exact API changes

### Media

- `GET /api/media`: cursor pagination; filters `source`, `approval`, `favorite`, `recent`, `purpose`, `query`; returns complete normalized DTO and rendition URLs.
- `POST /api/media/upload`: canonical upload endpoint; validate image MIME by bytes; create original plus queued renditions. Keep `/api/upload` as a temporary delegating compatibility route.
- `POST /api/media/import`: accept signed provider candidate token; import only server-resolved candidate facts.
- `POST /api/media/url/probe`: SSRF-safe HTTPS probe with DNS/private-range blocking, redirects bounded, content-type/size response.
- `POST /api/media/url/import`: imports a successfully probed token.
- `PUT /api/media/[id]/favorite` and `DELETE /api/media/[id]/favorite`.
- `POST /api/media/[id]/used`: upsert Recent and usage.
- `POST /api/media/[id]/approve`, `/reject`: `OWNER`/`MANAGER` only.
- `PATCH /api/brand`: when changing primary logo, require `mediaAssetId`, tenant ownership, and `approvalStatus=APPROVED`; URL alone is not authority.
- `/api/upload`: remove/deprecate `asLogo`; upload creates an unreviewed asset and never changes primary Brand identity.

### Providers

- Keep `/api/stock/search` temporarily; delegate Pexels calls to `PexelsProvider` and stop Unsplash fallback.
- Prefer new `/api/media/providers/pexels/search`.
- Keep `/api/logos/search` and `/api/logos/image`; delegate to `LogoDevProvider`, return grouped provider/source status.
- Search responses include signed candidate tokens.

### Creative resources

- `GET/POST /api/creative-resources`
- `GET/PATCH/DELETE /api/creative-resources/[id]`
- `POST /api/creative-resources/[id]/revisions`
- `POST /api/creative-resources/[id]/approve`
- `POST /api/creative-resources/[id]/duplicate`
- `GET /api/creative-resources/[id]/usages`
- `POST /api/creative-renders` for durable email/export rendition, added only in the cross-surface slice.

Card continues saving through `/api/brand`; Campaign/Email continue saving through `/api/campaigns/assign` during this wave, but both call a shared usage-index service transactionally after document validation.

## 30. Exact component changes

- `SharedMediaAssetBrowser`: server-backed tabs, signed candidates, durable Favorite/Recent, explicit approval, provider-specific status, focus management.
- `MediaPicker`: reduce to selected summary, Browse/Replace/Clear, and browser invocation. Remove duplicate galleries and background-removal button.
- `AssetsLibrary`: consume full asset DTO; show real provider, creator, source, license, attribution, approval, favorites, renditions, and usage records.
- `BrandKitWorkspace`/`LogoLibrary`: imported/unreviewed/approved states; no automatic approval on selection.
- `GradientStudio`: active Brand reset, saved/recent/favorite resources, contrast action.
- Add `BackgroundStudio` extracted from `CompositionPanelStack`.
- Add `OutlineStudio`, shared by object and frame.
- `FrameMaskBrowser`: server-backed favorites/recent and Brand-approved filter.
- Add `ImageMediaStudio` with typed crop/treatment.
- Replace shape pane with `ShapeStudio`.
- Add `LayersPanel` with rename/visibility/lock/group and keyboard semantics.
- Refactor `CreativeCompositionCanvas` into interaction plus pure renderer.
- Keep `CompositionPanelStack` as the contextual host, importing these shared studios rather than duplicating controls.
- Add `ReusableDesignBrowser` and Save as reusable action.
- Add `CreativeFlowSectionEditor`.

## 31. Exact renderer changes

- `CreativeDomRenderer` validates/parses once and renders typed nodes.
- Frame renderer resolves mask path and outline geometry in actual pixels.
- Image renderer applies complete supported treatment and rendition selection.
- Shape renderer uses safe registry geometry and shared fill/outline/effects.
- Divider renderer remains a separate node renderer.
- Background renderer consumes `CreativeFill`.
- `TapConnectCard` calls `CreativeDomRenderer` for composition sections.
- `CampaignPageRenderer` calls it for `creative_section`.
- Offer/Coupon/Spotlight block renderers call it for compatible sections.
- Preview routes use the same components as public with interaction disabled.
- `CreativeEmailRenderer` converts structured supported content and references a generated rendition for unsupported freeform content.
- Legacy version 1 parser remains read-only and upgrades in memory; save writes version 2 after explicit migration.

## 32. Exact Card/Email/Campaign integration points

### Card

- `/dashboard/card/edit` remains the first host.
- `TapCardSection.composition` gains version 2 and optional resource reference.
- `TapCardBuilder` records `mediaAssetId` and resource usage on save.
- `TapConnectCard` renders the shared document in Edit/Preview/Public.

### Email

- `EmailDocument` block gains `creative_section`.
- First slice only changes hero image selection to persist `mediaAssetId` alongside URL and reuse the same imported asset. It does not invoke, enable, disable, or reconfigure the repository's existing delivery path.
- Cross-surface slice adds `CreativeEmailRenderer` and rendition status.
- Continue saving authoring state to `formSettings.emailResponse`. Tests must not perform lead capture or call delivery code, and outbound transports must be stubbed/denied in test.

### Campaign/Spotlight/Offer/Coupon

- Add `creative_section` to `BlockType`.
- `CampaignEditor` adds from reusable designs and uses shared media browser.
- `CampaignPageRenderer` renders shared DOM document.
- Offer/Coupon use the same block contract; checkout/payment paths remain untouched.
- Spotlight is a Campaign/Offer presentation, not another creative model.

## 33. Exact tests

### Unit

- Zod parse/upgrade for every versioned creative type.
- Gradient/fill/outline/image/shape serialization and renderer style resolution.
- Outline pixel/scaled geometry at multiple object sizes.
- Crop/transform/group bounds/clipboard IDs/tidy/snap/distance operations.
- Provider normalization and signed candidate verification.
- URL probe SSRF/private-IP/redirect/content-type/size tests.
- Approval transition and permission tests.
- Resource revision/usage/delete-guard tests.

### Fusion/API

- Cross-tenant media/resource IDs return 404.
- Pexels 200/empty/401/403/429/5xx fixture responses.
- Logo.dev configured/unavailable/theme/greyscale fixture responses and token isolation.
- Import writes R2 adapter bytes and exact immutable provenance.
- Favorite/Recent survive reload and remain user/tenant scoped.
- Card/Campaign/Email save usage references.
- Legacy version 1 composition reads and round-trips to version 2.

### e2e Owner

- Browser all sources, keyboard navigation, provider errors, preview, import, Favorite, Recent, approval.
- Same asset imported once, selected on Card, then selected from Studio assets in Email hero.
- Gradient Studio complete controls, Brand reset, save/favorite, contrast correction.
- Background/image/pattern workflow.
- Object/frame/divider distinction and frame resize stroke proof.
- Mask search/category/favorite/recent/reset.
- Image replace/crop/treatment/reset.
- Layers rename/visibility/lock/group/copy/paste/order/align/tidy/snap/measure/handles/aspect/rotation/nudge/zoom/Fit.
- Save/reload/public parity and Undo single-action labels.
- Card + Email + Campaign/Offer shared-resource proof.

### Responsive/accessibility/performance

- Playwright viewports 320/390/768/1024/1440.
- axe on browser, editor, Card public, Email preview, Campaign public.
- keyboard-only acceptance path.
- browser page-size and import payload limits.
- public LCP asset rendition and layout-shift assertions with tolerant budgets.

## 34. Provider fixture strategy

Create deterministic adapters under `lib/media/providers/fixtures/`, not mocks hidden in UI components.

Fixtures:

- Pexels pages 1/2 with stable IDs, dimensions, photographer/source/license fields;
- Pexels empty, 401, 403, 429 with retry-after, 500, timeout;
- Logo.dev name/domain, auto/light/dark/greyscale, unavailable, 404, invalid content type;
- import image bytes for PNG/JPEG/WebP, too-large payload, wrong MIME, timeout.

Unit tests inject adapters directly. E2E selects fixture adapters only through server environment (`CREATIVE_PROVIDER_MODE=fixture`) and a server-owned scenario map. Production ignores fixture scenario headers/query parameters. Fixture assets are repository-owned test images with explicit license comments.

## 35. Seed/demo strategy

- Seed one uploaded-style `MediaAsset`, one Pexels fixture import, and one unreviewed Logo.dev fixture import for the isolated development business.
- Seed one approved palette, gradient, frame treatment, and reusable composition.
- Seed one Card composition using the approved asset/resource.
- Seed one Email hero referencing the same asset ID.
- Seed one draft Campaign/Offer creative section referencing the same resource revision.
- Mark every seed with deterministic IDs/names and `demo` metadata in the dedicated resource payload; seed remains idempotent.
- Do not set Campaign LIVE, send Email, enable payment, or modify production data.

## 36. Rollback strategy

- Each slice is independently revertible and keeps legacy readers.
- Media migration adds nullable fields first; old routes remain delegating until call sites are migrated.
- Version 1 composition parser remains throughout the wave.
- New resource references always include embedded resolved snapshots, so disabling resource APIs does not break published output.
- Feature flags gate browser v2, composition v2 editing, resource library, and cross-surface creative sections separately.
- Rollback disables the flag and keeps new rows; no destructive down migration is required.
- R2 imports are not deleted during rollback. Orphan cleanup is a later explicit job.
- Existing publication snapshots remain the restore mechanism for Card/Campaign documents.

## 37. Owner acceptance walkthrough

1. Open Card authoring and add/select a Creative Composition.
2. Add an image and open the one shared media browser.
3. Search Pexels fixture, filter orientation/color, inspect attribution, import, and insert.
4. Reopen browser; prove the asset is in Studio and Recent. Favorite it and reload; prove persistence.
5. Search Logo.dev, inspect treatment variants, import, and prove it is not Brand-approved.
6. Approve it from Brand Kit with Owner confirmation; prove the Brand tab changes.
7. Apply a typed gradient, add/move/remove a stop, save/favorite it, correct a contrast warning, reset to Brand.
8. Apply solid/image/pattern background and reset.
9. Add image, frame, shape, and independent divider. Prove their outlines/divider behavior are distinct.
10. Shrink a frame and toggle scale-with-object versus exact-pixel outline; prove neither remains unintentionally oversized.
11. Search/apply/favorite the shirt mask and another category; reload.
12. Replace/crop/adjust/reset an image without changing the source asset.
13. Rename/hide/lock/group/copy/paste/order/align/tidy nodes; use guides, measurements, handles, aspect lock, rotation, keyboard nudge, zoom, and Fit.
14. Undo each meaningful operation and verify one human-readable action per operation.
15. Save, reload, open Preview, temporary device Preview, and Public Card; compare output.
16. Open the Email authoring route and select the same stored asset for a hero section. Save locally; do not send.
17. Open a draft Campaign/Offer section and insert the same reusable creative resource.
18. Confirm asset/resource usage shows Card, Email, and Campaign/Offer references.

## 38. Known risks

- Existing JSON documents contain URL-only media and untyped node props; migration must be tolerant and reversible.
- Email-client support cannot match DOM freeform rendering without generated renditions.
- SVG stroke placement is not natively equivalent across browsers; pixel proofs are required.
- R2 public URLs may lack an image transformation service; rendition generation may require a worker or server image dependency.
- Provider terms and attribution requirements can change; adapters must keep policy text isolated.
- The current Logo.dev search guesses `.com`/`.io` domains for names, which can return the wrong company.
- Current auth's first-membership business selection limits multi-tenant switching, though tenant filters still protect records.
- Publication and usage indexing must be transactional or reconciled.
- Large composition snapshots can grow BrandKit/Campaign JSON; resource references and renditions reduce but do not eliminate this.
- Existing localStorage “approved”/favorite state cannot be trusted or migrated automatically.

## 39. Explicit deferrals

- Production background removal and AI image editing.
- Video DAM, timeline, and animation.
- Arbitrary SVG masks/shapes.
- Custom font uploads.
- Tight/contour flow wrap.
- Multi-user live collaboration and merge.
- Complete Email or Campaign rebuild.
- Email sending, Campaign sending, payment/checkout enablement.
- Onboarding and landing-page changes.
- Production data backfill or deployment.
- Automatic provider asset approval.
- Public template marketplace and cross-tenant sharing.
- Full design export formats beyond the shared rendition required for Email.

## 40. Proposed implementation commit sequence

### Slice 1 — Media truth and visible cross-surface reuse

1. `model: add durable media provenance, approval, favorites and recent activity`
2. `providers: normalize Pexels and Logo.dev with deterministic fixtures`
3. `api: secure provider candidate import and URL probing`
4. `ui: make shared media browser authoritative`
5. `card: select imported MediaAsset in composition`
6. `email: reuse stored MediaAsset in hero section without sending`
7. `tests: prove import, durability, approval honesty and Card/Email reuse`

### Slice 2 — Gradient and Background Studio

8. `model: consolidate typed fills and Brand reset`
9. `ui: complete saved gradient and background workflows`
10. `render: unify Card/Campaign DOM fill rendering`
11. `tests: prove contrast, responsive and public parity`

### Slice 3 — Outlines, dividers, masks, and image treatment

12. `model: add typed outlines and image treatments`
13. `render: correct frame stroke geometry`
14. `ui: complete Outline, Divider, Mask and Image studios`
15. `tests: prove resize, reset, rights and accessibility`

### Slice 4 — Shapes and precision canvas

16. `model: add safe shape geometry and layer metadata`
17. `canvas: complete handles, clipboard, tidy, measurements, aspect and zoom`
18. `history: standardize single labeled transactions`
19. `tests: prove keyboard, responsive and Undo behavior`

### Slice 5 — Reusable design persistence

20. `model: add creative resources, revisions and usage`
21. `api: add resource CRUD, approval and duplication`
22. `ui: save, browse and insert reusable designs`
23. `tests: prove tenant boundaries, revisions and rollback`

### Slice 6 — Cross-surface creative renderer and structured flow

24. `render: extract shared DOM renderer and Email adapter`
25. `campaign: add shared creative section`
26. `email: add safe creative section rendition`
27. `flow: add structured image and text layouts`
28. `tests: prove one resource across Card, Email and Campaign/Offer`

## 41. Complete Codex implementation prompt for the first completion slice

```text
IMPLEMENTATION SLICE 1 — SHARED MEDIA TRUTH AND CARD/EMAIL REUSE

Repository: TapMagic/Tap-Connect-Studio
Workspace: /Users/rcs/Development/tap-connect-studio-fusion
Branch: tapconnect-creative-platform-completion
Starting point: the approved Creative Platform Completion plan commit

Read AGENTS.md and the relevant Next.js 16.2.10 guides in node_modules/next/dist/docs before changing application code.

Goal:
Make SharedMediaAssetBrowser the authoritative media-selection workflow, make MediaAsset/provenance/approval/Recent/Favorites durable and truthful, support deterministic Pexels and Logo.dev readiness, import selected provider media into TapConnect-controlled R2 storage, use one selected MediaAsset in a Card Creative Composition, and reuse the same MediaAsset in one Email hero section. Do not invoke or alter the existing Email-delivery path.

Boundaries:
- Work only on tapconnect-creative-platform-completion.
- Do not merge, deploy, publish, change the landing page, begin onboarding, enable payment, enable Email sending, send Campaigns, contact customers, modify production data, commit secrets, or force-push.
- Do not build another media picker or asset library.
- Do not auto-approve discovered/imported provider assets.
- Provider credentials remain server-side.
- Pexels/Logo.dev selected media must be imported; no permanent hotlink dependency.
- Background removal stays hidden/deferred because only the local mock exists.

Implement:

1. Prisma/media truth
- Extend MediaAsset with storageKey, contentHash, provider, providerAssetId, sourcePageUrl, creatorName, creatorUrl, licenseCode, licenseUrl, attributionText, rightsNote, approvalStatus, approvedAt, approvedById, defaultAltText, parentAssetId, renditionKind. Logo.dev uses provider identity plus `NO_LICENSE_ASSERTED` and structured trademark/source rights; it is not encoded as a copyright license.
- Add MediaAssetFavorite, MediaAssetRecent, and CreativeAssetUsage with businessId/user or surface/subject/document path/mediaAssetId and tenant indexes.
- Add the normal Prisma relations.
- Create normal migrations. Backfill existing provider fields conservatively. Mark a primary Business logo approved only when its URL exactly matches a tenant MediaAsset; leave unmatched legacy URLs readable but require Owner import/approval before replacement.
- Do not use db push.

2. Provider adapters and fixtures
- Add typed PexelsProvider and LogoDevProvider adapters.
- Preserve Logo.dev server proxy/token isolation.
- Pexels supports query, page, orientation, supported color, attribution, 401/403, 429 retry-after, 5xx/outage, empty.
- Remove silent Unsplash fallback from the Pexels-labelled path.
- Logo.dev groups Logo.dev separately from Wikimedia/favicon fallbacks and exposes only real auto/light/dark/greyscale behavior.
- Add deterministic fixtures for success, page 2, empty, 401, 403, 429, outage, timeout, invalid MIME and too-large import.
- Fixture mode is server-environment controlled and impossible to activate through production client input.

3. Secure import
- Provider search returns a short-lived signed candidate token bound to businessId.
- /api/media/import verifies the token, resolves server-owned metadata, validates host/protocol/content type/size/timeout, stores bytes to R2, and creates MediaAsset with immutable provenance.
- The client cannot supply creator/license/provider facts as authority.
- Deduplicate per business/provider/providerAssetId.
- Failed import inserts nothing.

4. Shared browser
- Keep components/media/shared-media-asset-browser.tsx as the permanent browser.
- Replace localStorage Recent/Favorites with APIs.
- Brand tab means explicit approvalStatus=APPROVED, never source=logo_dev.
- Import is separate from approval.
- Implement loading, empty, credential absent, 401/403, 429, outage, and retry states with consequence/recovery copy.
- Show preview, dimensions, provider, creator/source links, license/rights, approval status.
- Upload, Brand, Studio, Recent, Favorites, Pexels, Logo.dev, and Advanced URL remain visible.
- Advanced URL uses a server-safe probe and imports a durable copy before selection; do not create an external-hotlink exception in Slice 1.
- Dialog traps/restores focus and supports keyboard navigation.

5. Remove duplicate media selection
- Reduce components/media/media-picker.tsx to selected asset summary, Browse/Replace/Clear, and SharedMediaAssetBrowser invocation.
- Remove its second stock gallery, logo gallery, library grid, live direct URL editing, data-URL fallback, and Remove background production control.
- All current Card, Brand, Email, and Campaign MediaPicker call sites continue opening the shared browser.

6. Card proof
- Composition image/frame/background selection stores mediaAssetId plus fallbackUrl, not URL alone for new edits.
- Keep version-1 URL reads compatible.
- Save through the existing Card save path.
- Record Recent and a `CreativeAssetUsage(surface=CARD)` reference transactionally after successful document save.
- Public/Preview continue rendering the durable R2 URL through the existing Card renderer.

7. Email proof
- Email hero block stores mediaAssetId alongside imageUrl for new edits.
- The Email media drawer selects from the same SharedMediaAssetBrowser/Studio assets.
- Select the exact asset imported in the Card proof and save through existing /api/campaigns/assign.
- Record Recent and a `CreativeAssetUsage(surface=EMAIL)` reference transactionally inside the successful `/api/campaigns/assign` save path.
- Do not invoke or change sending/provider enablement. E2E must not perform lead capture, and test outbound transports must be stubbed/denied.

8. Brand approval
- Importing Logo.dev creates UNREVIEWED.
- Brand Kit shows unreviewed state and requires explicit `OWNER`/`MANAGER` Approve for Brand before setting primary identity.
- `/api/brand` requires a tenant-owned approved `mediaAssetId` for primary-logo changes; deprecate `/api/upload` `asLogo`.
- Never infer approval from provider/source.

9. Assets
- Show exact provider, creator, source URL, license, attribution, approval, Favorite, Recent, and where-used from durable records.

Tests:
- Unit: provider normalization, candidate signing, URL/host/content limits, approval transitions.
- API/Fusion: tenant isolation; Pexels/Logo.dev fixture statuses; import provenance; Favorite/Recent reload durability; Card/Email asset usage persistence; Brand primary-logo approval enforcement; no secret in response; failed import no row.
- e2e: import Pexels fixture in Card composition; reload and find in Studio/Recent/Favorites; import Logo.dev and prove unapproved; approve explicitly; open Email authoring and reuse same MediaAsset ID in hero; save locally; assert no send.
- responsive: browser at 390 and 1440.
- accessibility: axe and keyboard/focus checks.

Verification:
- Run Prisma generate and migration status against the isolated development database only.
- Run targeted unit/Fusion tests, targeted Playwright tests, lint on changed files, and a production build.
- Inspect git diff and confirm no secrets or unrelated changes.

Commit sequence:
Use the seven Slice 1 commits listed in section 40. Do not squash unless the Owner asks.

Closeout:
Report commits, migrations, exact files, tests/results, screenshots/evidence, known limitations, and confirm the slice did not invoke or change Email delivery, Campaign delivery, payment, or publishing. Stop for Owner acceptance before Slice 2.
```

---

Implementation must not begin until Owner confirmation.
