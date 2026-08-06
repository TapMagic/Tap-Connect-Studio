# Editor Interaction Hierarchy Audit

Status: assembly candidate — human verification required.  
Branch: `tapconnect-operational-spine-restoration`  
Starting SHA: `54fada53deb351a8edc7081b3b1ac448bdd378ae`  
Evidence basis: Owner screenshots attached to the interaction-hierarchy assembly brief (selection chrome, Templates/Build duplication, Icon library, Buttons library, Card Root fallback, Canva hierarchy references for IA only).

## Product law

Six surfaces must not compete:

| Surface | Role | Must not |
| --- | --- | --- |
| Left rail | Choose library / workspace function | Host property forms |
| Left drawer | Library browse **or** complete target editor | Open a second drawer / right panel |
| Canvas | Select, move, resize, compose | Host ordinary property forms |
| Contextual toolbar | Fast high-frequency actions + launch deep editors | Become the full property editor |
| Common More menu | Shared object operations | Become another property editor |
| Layers | Hierarchy / parentage / order authority | Diverge from canvas hit-testing |

Rhythm: **Choose → Place → Select → Quick change → Left drawer full control → Preview**.

## Defect families (screenshot-proven)

### Selection and targeting

| Defect | Observed | Intended |
| --- | --- | --- |
| Card Root toolbar with no object | Empty composition selection falls through to Root toolbar | No toolbar when nothing selected |
| Card Root as deselection fallback | Clearing selection restores Root tools | Root only via explicit background / Layers / Background / Page size |
| Parent/child ambiguity | Nested children hard to isolate; Container selection paints child chrome risk | Parent boundary alone in parent mode; one child in content mode |
| Oversized handles | Fixed CSS handles inside zoomed phone → enormous at 200% | Constant ~7–10px screen handles |
| Select beneath covers content | Label inside bottom-right of selection box | Outside chrome; never cover important content |
| Neutral click inconsistency | Pasteboard / Escape / empty canvas disagree | Pasteboard → none; Card background → Root; Escape → exit content then clear |

### Toolbar and drawer hierarchy

| Defect | Observed | Intended |
| --- | --- | --- |
| Toolbar doubles as full editor | Large left-placed floating panels from toolbar `focus` | Compact toolbar; major commands open left drawer Edit mode |
| Deep left editor missing | Library rail stays on catalogs while popovers float | Edit mode replaces library content in the same drawer width |
| Duplicate Appearance / Background | Root Background and Appearance share controls; Badge Appearance twice | Exact command → exact drawer route |
| Build duplicates Templates | Both list `SECTION_PRESET_LIBRARY` | Templates owns presets; Build = optional onboarding only |

### Geometry and presets

| Defect | Observed | Intended |
| --- | --- | --- |
| Page height reflows objects | Some UI paths write `pageHeightPx` without preserving pixel bounds | All paths use isolation helper; contraction blocked when unsafe |
| Premium presets bunched / overlapping | Insert without quality gate | Declared geometry + browser overlap reject |
| Container fill / resize surprises | Surface state without visible render; child stretch | Visible Surface; resize policy never invoked by page resize |

### Libraries and materials

| Defect | Observed | Intended |
| --- | --- | --- |
| Color hierarchy incomplete | Native color inputs / shallow swatches | Shared left color system (Brand, document, photo, solid, gradient) |
| Iconify text-only results | Name + collection rows | Visual SVG grid; no auto-place on open |
| Button/Badge child coupling | Label/Icon tied to parent Surface path | Distinct parent / label / icon targets |
| Coupon/Ticket shallow variety | Similar rectangles, different words | Structurally distinct starter layouts |
| Live Device optional | Tests may branch if panel missing | Required visible panel + non-localhost QR |

## Authority map (code)

| Concern | Canonical path |
| --- | --- |
| Rail / library drawer | `components/fusion/card/card-creative-tool-rail.tsx` |
| Build (to retire duplicate catalog) | `components/fusion/card/card-composer-library.tsx` |
| Contextual toolbar | `components/fusion/card/card-contextual-object-toolbar.tsx` |
| Command registry | `lib/fusion/creative-studio/editor-command-registry.ts` |
| Selection law | `lib/fusion/creative-studio/selection-mode.ts` + canvas hit-test |
| Selection chrome | `components/fusion/creative-studio/creative-composition-canvas.tsx` |
| Page geometry | `setRootPageHeightPreservingBounds` in `composer-model.ts` |
| Starter packs | `lib/fusion/creative-studio/starter-preset-registry.ts` |
| Live Device | `live-device-qr-panel.tsx`, `preview/tokens.ts`, `preview/url.ts` |

## Disposition ledger (control families)

Every enabled control must record: object target · level · toolbar command · drawer route · mutation · Edit renderer · Preview renderer · persistence · test · disposition.

| Family | Disposition target |
| --- | --- |
| No-selection | Hide toolbar + handles; library may stay open |
| Card Root | Explicit only; Background / Page size / Guides / More |
| Text | Toolbar quick typography; Color/Effects/Font → deep left |
| Button parent | Edit contents · Surface · Action · Motion · Position · More |
| Button label / icon | Child toolbars; shared Text / Icon editors |
| Icon | Change Icon · Fill · Stroke · Appearance → deep left |
| Container | Edit contents · Layout · Size · Resize · Appearance · Responsive · Position |
| Badge | Shape · Appearance · Action · Motion · Position; wording/icon children |
| Coupon / Ticket | Distinct geometries; wording editable via Text engine |
| Background | Left drawer; None/solid/gradient/media/pattern/texture |
| Live Device | Always-visible panel from Preview header |

## Non-goals for this pass

- Restoring legacy Inspector or permanent right property panel
- Inventing a second editor architecture
- Copying Canva branding or exact visuals
- Production Campaign / Coupon / Ticket / Wallet / messaging / payment actions

## Companion docs

- `DEEP_LEFT_EDITOR_CONTRACT.md`
- `PREMIUM_RENDERING_AND_MATERIAL_SYSTEM.md`
- `PRESET_INSERTION_QUALITY_MATRIX.md`
- `LIVE_DEVICE_OWNER_FLOW.md`
