# Creative Studio Capability Truth Matrix

**Classification:** `IMPLEMENTATION IN PROGRESS`

**Owner route audited:** `/dashboard/card/edit`

**Audit baseline:** rescue branch `tapconnect-creative-studio-rescue`, confirmed remote/local base `46a4747c339dca7582db1f3a019e9af0b8f5c006`, plus preserved local inspector finish work.

## Reading this matrix

This is an Owner-workflow audit, not an inventory of types or dormant components. `Edit`, `Preview`, `Public`, and `Phone` mean the capability is visibly rendered and usable in that surface—not merely serializable. `Undo` means the actual Card authoring history receives a coherent labeled entry.

Allowed capability classifications in this audit:

- `OWNER-READY`
- `IMPLEMENTED BUT INCOMPLETE`
- `DATA MODEL ONLY`
- `PROVIDER OR ADAPTER EXISTS BUT IS NOT WIRED`
- `MISSING`
- `INTENTIONALLY DEFERRED`
- `REJECTED`

## Controlled pass delta

Implemented on the actual Owner route during this pass:

- one shared Media and Asset Browser surfaced through Card image/logo and Creative Composition image/frame/background workflows;
- Pexels orientation/color/pagination metadata, explicit 429 handling, and durable R2 import when configured;
- Logo.dev authenticated image proxy so token-bearing provider URLs never reach the client;
- persisted media dimensions, source, provider ID, attribution, rights note, and import timestamp;
- typed linear/radial multi-stop Gradient Studio replacing normal raw-CSS editing;
- typed image backgrounds plus focal point, fit, repeat/tile, and overlay controls;
- curated procedural pattern/texture browser;
- frame outline rendered from the actual mask path with direct width, alignment, scale-stroke/exact-pixel, pattern, opacity, shadow, and glow;
- expanded searchable visual mask catalog with favorites and recent history;
- non-destructive composition-image source plus fit/focal/flip/rotation/basic adjustments/reset and decorative semantics;
- independent divider wavy/double/custom styles, markers, caps, opacity, and exact geometry;
- composition text renderer parity for italic, underline, strikethrough, spacing, line height, case, and justification;
- custom composition font loading in view-only Preview and Public surfaces;
- drag-time smart edge/grid guides and exact X/Y/W/H/rotation inputs;
- route-level proofs for the shared browser, typed gradients, frame stroke mode, and mask search.

Still not complete in this pass: structured flow wrapping, full shape studio, unified durable layer naming/reorder, shared saved-style/composition storage, and editable template layer. Those rows remain incomplete or missing below; the global classification remains `IMPLEMENTATION IN PROGRESS`.

## Owner capability matrix

| Capability | Owner use case | Actual Owner UX location | Current component / service | Typed model | Renderer support | Edit | Preview | Public | Phone | Accessibility | Undo / Redo | Tests | Provider dependency | Remaining work | Classification |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Dominant Card canvas | Author the living Card without leaving context | Center canvas | `TapCardBuilder`, `CardAuthoringWorkspace` | `TapConnectCardConfig` | Shared Card renderer | Yes | Yes | Yes | Responsive preview widths | Keyboard route controls; canvas semantics partial | Yes | rescue/evidence route specs | None | Complete selection semantics and precision controls | IMPLEMENTED BUT INCOMPLETE |
| Contextual Inspector | Edit the current Card, section, or composition object | Compact rail → one side inspector | `AdaptiveWorkspaceShell`, `NestedPanelShell`, panel stacks | `WorkspaceShellSnapshot` | N/A—authoring chrome | Yes | N/A | N/A | Bottom sheet | Back/Close labels, Escape, reduced motion; focus containment partial | N/A | `creative-studio-sliding-inspector.spec.ts` | None | Owner verification of preserved width/glow; complete focus loop | IMPLEMENTED BUT INCOMPLETE |
| Live Device / QR | Compare phone output with current draft without publishing | Persistent action bar → Live Device | `LiveDeviceQrPanel`, preview token APIs | Signed preview token payload | Shared Card renderer and composition canvas | Yes | Yes | No publication | Physical phone supported | QR has adjacent status/instructions | Draft edits represented, not a history action | fidelity/QR specs | Reachable HTTPS endpoint for physical phone | Final physical fidelity re-scan | IMPLEMENTED BUT INCOMPLETE |
| Shared media browser | Select one reusable visual source everywhere | Not yet one coherent browser; legacy picker and Assets page are separate | `MediaPicker`, `AssetsLibrary` | `MediaAsset` is minimal | URL rendering exists | Partial | URL only | URL only | Legacy dialog responsive | Basic dialog labels/Escape; grid keyboard model incomplete | Selection can be history-aware only through host | builder owner gate | R2 optional | Unify upload, Brand, Studio, recent, favorites, Pexels, Logo.dev, metadata, preview, import | IMPLEMENTED BUT INCOMPLETE |
| Upload / Studio assets | Upload once and reuse | Media picker; `/dashboard/assets` | `/api/upload`, `/api/media`, `AssetsLibrary` | Prisma `MediaAsset` | URL rendering | Partial on Card image paths | Yes after selection | Yes after save | Responsive grids | Upload labels and error states exist | Host-dependent | assets/builder tests | R2 for durable large uploads | Add dimensions, provider metadata, rights, favorite/recent, common browser | IMPLEMENTED BUT INCOMPLETE |
| Brand assets | Prefer approved identity media | Brand Kit and header logo paths; not unified in browser | `BrandKitWorkspace`, `MediaPicker` | Business logo / Brand Kit models | Logo URL rendering | Partial | Yes | Yes | Partial | Basic labels | Host-dependent | brand authoring specs | None for uploads | Add Brand-approved asset records and shared source tab | IMPLEMENTED BUT INCOMPLETE |
| Pexels search | Find approved stock imagery inside the creative task | Legacy `MediaPicker` only; not composition inspector | `/api/stock/search` | Local response type only | Remote URL renders | Partial / hidden from actual composition path | URL only | URL only | Legacy modal | Attribution text exists; result grid keyboard incomplete | Host-dependent | builder probe only | `PEXELS_API_KEY` | Typed provider contract, filters, pagination, rate limits, retries, metadata, import/cache, all logical insertion points | PROVIDER OR ADAPTER EXISTS BUT IS NOT WIRED |
| Logo.dev lookup | Find a company logo and add it to Brand assets | Legacy `MediaPicker` only | `/api/logos/search`, `lib/services/logo-search.ts` | `LogoSearchHit` | Remote URL renders | Partial / not Brand-import workflow | URL only | URL only | Legacy modal | Labeled search/results; keyboard grid incomplete | Host-dependent | builder probe only | `LOGO_DEV_TOKEN` | Prevent token-bearing image URLs reaching client; proxy/import, variants, Brand approval, shared browser | PROVIDER OR ADAPTER EXISTS BUT IS NOT WIRED |
| Media provenance / rights | Know origin, attribution, license, and reuse safety | Assets page text only | `AssetsLibrary.sourceMeta` | Not persisted beyond `source` | N/A | No in inspector | No | No | N/A | Text status only | N/A | None specific | Provider metadata | Persist provider ID/source URL/author/license/import time and render attribution | DATA MODEL ONLY |
| Non-destructive media transforms | Crop and adjust without replacing original | Composition Image / Frame panels | node `props` | Unvalidated `Record<string, unknown>` | Fit/focal/scale partial | Partial | Partial | Partial | Scale fallback | Alt field partial | Yes through block patch | composition specs | None | Typed original reference, crop, ratios, transforms, adjustments, reset | IMPLEMENTED BUT INCOMPLETE |
| Background removal | Remove a real image background only when runtime exists | Legacy media picker | `BgRemovePanel` | Provenance helper | Derived image renders | Not wired into composition inspector | URL only | URL only | Modal | Basic | Legacy picker only | bg-remove tests elsewhere | Runtime/provider | Wire into shared browser; keep unavailable state honest | PROVIDER OR ADAPTER EXISTS BUT IS NOT WIRED |
| Typed gradients | Build accessible gradients without raw CSS | Composition → Background currently raw CSS input | None shared | Background stores raw `value` string | CSS string renders | Raw string only | Yes | Yes | Yes | No stop keyboard model or contrast help | Yes as raw block patch | minimal render tests | None | Typed stops/kind/angle/center; quick and advanced studio; migration parser | MISSING |
| Solid backgrounds | Apply a simple fill | Appearance → Colors; Composition → Background | `AppearancePanelStack`, `CompositionPanelStack` | Card fields + composition background | Yes | Yes | Yes | Yes | Yes | Native color input only | Yes | rescue specs | None | Shared color system, contrast, Brand reset | IMPLEMENTED BUT INCOMPLETE |
| Image backgrounds | Use a photo as Card/composition backdrop | No complete actual inspector path | Composition kind allows image but UI does not complete it | Raw background union | Composition renderer ignores image kind | No | No | No | No | Missing alt/decorative semantics | No | None | Shared media browser | Typed shared model and full renderer controls | DATA MODEL ONLY |
| Patterns / textures | Apply licensed or procedural visual finish | No actual route | None | None | None | No | No | No | No | Missing | No | None | None if procedural | Curated registry, controls, renderer, favorites/recent | MISSING |
| Shared color experience | Reuse Brand/document/recent/saved colors with contrast help | Appearance and individual property inputs | Multiple native color inputs | Multiple string fields | Yes for existing fields | Fragmented | Yes | Yes | Yes | Contrast assistance missing | Usually | scattered | Eyedropper browser support optional | Shared picker, palettes, contrast, history, Brand reset | IMPLEMENTED BUT INCOMPLETE |
| Object outline | Outline image, text, shape, button independently | Composition specialized panels | node `props` | Untyped property bag | Shape stroke only | Partial | Partial | Partial | Partial | Control labels partial | Yes | composition tests | None | Typed width/style/alignment/sides/radius/shadow/glow/reset | IMPLEMENTED BUT INCOMPLETE |
| Frame outline | Follow mask and retain exact/scaled stroke | Composition → Frame | `CompositionPanelStack`, SVG mask renderer | Untyped `borderWidth` / `borderColor` | Mask path stroke exists | Width/color partial | Yes | Yes | Yes | Inputs labeled | Yes | frame owner-gate specs | None | Inside/center/outside, style, gap/padding, scale-stroke/exact-pixel correction | IMPLEMENTED BUT INCOMPLETE |
| Independent divider | Add/select/move/layer a divider independent of media | Composition → Add Border / Border panel | border primitive | `primitive: "border"` + property bag | Basic line render | Basic | Yes | Yes | Yes | Selectable; detailed semantics partial | Yes | composition ops/e2e partial | None | Markers, caps, styles, exact geometry, visibility/lock/responsive controls | IMPLEMENTED BUT INCOMPLETE |
| Frame / mask library | Browse safe curated masks | Composition → Frame → Masking Shape | `FRAME_MASK_CATALOG` | Closed `FrameMaskId` union | Registered SVG path render | 12 masks | Yes | Yes | Yes | Buttons; search/grid keyboard missing | Yes | frame tests | None | Expand categorized registry, search, thumbnails, favorites/recent/Brand-approved, lazy loading | IMPLEMENTED BUT INCOMPLETE |
| Arbitrary SVG mask upload | Upload a custom shape | No UX by design | None | None | None | No | No | No | No | Unresolved | No | None | Sanitization/licensing | Remains blocked until sanitization, rights, a11y, performance, compatibility | INTENTIONALLY DEFERRED |
| Background removal placeholder success | Pretend a cutout happened without runtime | Must never exist | Rejected behavior | N/A | N/A | No | No | No | No | N/A | N/A | Provider failure tests required | Real runtime required | Keep truthful unavailable state | REJECTED |
| Freeform text/image overlay | Build promotional artwork with layered text and imagery | Creative Composition | `CreativeCompositionCanvas`, composition inspector | `CreativeCompositionBlock` | Shared composition renderer | Yes | Yes | Yes | Scale by default; explicit fallback | Reading-order helper exists; overlap warning missing | Yes | composition/fidelity specs | None | Anchors/constraints, semantic order warning, more complete property studios | IMPLEMENTED BUT INCOMPLETE |
| Structured text/image flow wrapping | Create editorial/email/offer layouts with image left/right/above/below | Not available as one shared layout model | Separate email/card section systems | No shared typed flow model | Ad hoc | No shared UX | Inconsistent | Inconsistent | Inconsistent | Semantic order not unified | Inconsistent | None shared | None | Typed flow model, wrap/gutter/mobile order, shared renderers | MISSING |
| Shape Studio | Add styled visual shapes | Composition → Add Shape / Shape panel | composition shape branch | Untyped shape name/property bag | Rounded/square/circle-like CSS only | Basic | Yes | Yes | Yes | Selection works; visual library keyboard missing | Yes | minimal | None | Searchable registry, thumbnails, fills/stroke/shadow/glow/dimensions/reset | IMPLEMENTED BUT INCOMPLETE |
| Typography | Apply professional font and text formatting | Text / Typography panel | `ProfessionalTypographyPanel`, font catalog/loader | Node props and Card text fields | Font loader + composition renderer | Strong partial | Yes | Yes | Yes | Native controls; contrast/wrapping semantics partial | Yes | typography/rescue specs | Font network availability | Complete states, responsive ranges, highlight/outline/shadow/glow, capability honesty | IMPLEMENTED BUT INCOMPLETE |
| Button / CTA styling | Style and safely test an action | Button panel / composition button | `ButtonPanelStack`, Card action catalog | Card action fields + node props | Card/button renderers | Partial | Yes | Yes | Yes | Focus/action semantics exist; states incomplete | Yes | button/action specs partial | Action provider may be unavailable | Consolidate style states, saved styles, safe Test Action, provider-unavailable style | IMPLEMENTED BUT INCOMPLETE |
| Canvas selection and movement | Select, move, resize and rotate objects | Composition canvas | `CreativeCompositionCanvas` | Relative node box | Edit renderer | Pointer move/resize; rotation model | Yes | Yes | Yes | Keyboard move exists; resize/rotation keyboard incomplete | Coherent commit on pointer end | composition ops/e2e | None | Edge resize, rotation handle, exact geometry, transaction audit | IMPLEMENTED BUT INCOMPLETE |
| Guides / snapping / measurements | Align precisely with spatial feedback | Composition canvas | Limited canvas handlers | No guide model | Edit-only overlays incomplete | Partial | N/A | N/A | Tablet/phone edit behavior incomplete | Visual guides need non-color cues | Coherent action labels needed | minimal | None | Smart/center/edge/spacing guides, distances, grid, rulers, snap toggle | IMPLEMENTED BUT INCOMPLETE |
| Multi-select / group / layering | Operate related objects as a unit | Canvas + Composition inspector | composition operations | node `groupId`, z-index, locked/visible | Shared renderer honors order | Yes partial | Yes | Yes | Yes | Group identity and keyboard operation partial | Yes | composition ops/e2e | None | Tidy/equal spacing, copy/paste, complete controls | IMPLEMENTED BUT INCOMPLETE |
| Layers panel | Structural backup for selection and order | Composition inspector has list/controls, not full panel | composition panel | Node list | N/A | Partial | N/A | N/A | Partial | Reading-order helper exists; conflict warning missing | Yes | partial | None | Thumbnail/name/search/drag+keyboard reorder/show/hide/group indicators/reading-order warning | IMPLEMENTED BUT INCOMPLETE |
| Reusable styles / compositions | Save a successful treatment and apply elsewhere | No coherent Creative Studio UX | Existing campaign `SavedTemplate` is not a shared design registry | Campaign-specific Prisma model | Not shared | No | N/A | N/A | No | Missing | Applying must be history-aware | None | Storage | Shared typed registry, thumbnails, metadata, apply/reset/version/usage | MISSING |
| Creative templates | Start from editable, non-destructive business patterns | Existing campaign template gallery, not composition workflow | `TemplateGallery` | Campaign templates | Campaign only | Not in Card composition | No | No | No | Existing gallery partial | Must confirm destructive apply | campaign tests | None | Shared template layer over primitives; safe apply confirmation | PROVIDER OR ADAPTER EXISTS BUT IS NOT WIRED |
| Edit / Preview / Public separation | Work safely without accidental publication | Persistent safety/action bar and route modes | preview toolbar, public Card routes | Studio mode types | Shared render path | Yes | Yes | Yes | Yes | Mode labels/status | N/A | rescue/evidence specs | None | Final route parity and no-publication regression | IMPLEMENTED BUT INCOMPLETE |
| Manual animation authoring | Add bounce/fade/typewriter controls | Prohibited | None | None | None | No | No | No | No | N/A | N/A | Absence maintained | None | Keep absent; functional panel transitions only | REJECTED |

## Provider and secret audit

| Provider | Server-only entry point | Client exposure finding | Honest unavailable behavior | Import durability | Baseline status |
|---|---|---|---|---|---|
| Pexels | `/api/stock/search` reads `PEXELS_API_KEY` | Key is not returned; result URLs are returned | Generic 503/empty behavior exists but rate-limit detail is lost | Legacy picker records the remote hotlink rather than importing bytes | PROVIDER OR ADAPTER EXISTS BUT IS NOT WIRED |
| Logo.dev | `/api/logos/search` and `lib/services/logo-search.ts` read `LOGO_DEV_TOKEN` | **Defect:** generated `img.logo.dev` URLs include the token query parameter and are returned to the client | Wikimedia/favicon fallbacks exist | Legacy picker records remote URL; no Brand-approved import | IMPLEMENTED BUT INCOMPLETE |
| R2 | `/api/upload` uses server credentials | Credentials stay server-side | 503 state exists | Durable upload works when configured | IMPLEMENTED BUT INCOMPLETE |

## Priority conclusion

The current route proves a capable freeform composition foundation, but it is not yet a complete premium authoring platform. The first blocking product gap is the absence of one shared, metadata-rich, durable Media and Asset Browser in the real composition workflow. Pexels and Logo.dev already have partial server adapters; they must be normalized behind that browser, with Logo.dev token isolation fixed before the result can be Owner-ready.

