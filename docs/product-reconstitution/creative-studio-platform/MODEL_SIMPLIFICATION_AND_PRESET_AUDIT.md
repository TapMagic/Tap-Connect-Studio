# Creative Studio model simplification and preset audit

Date: 2026-08-03  
Starting branch: `tapconnect-operational-spine-restoration`  
Starting SHA: `f839a39b945ec6d6c68d52291a4cbd1a7469f7be`

## Executive disposition

The saved model already contains most of the correct kernel: `rootComposition` is a first-class Card-root plane, `type: "surface"` is the shared Section implementation, objects carry canonical identities, and mutation APIs require an explicit parent. The Owner UI obscures that architecture. It presents nine Section species, silently uses the selected Section as an insertion target, exposes overlapping property paths, and renders editor placeholder copy in non-edit output.

The simplified disposition is:

1. Pasteboard is editor chrome only.
2. Card root is the mandatory published surface and default insertion parent.
3. Section is one optional generic container. Named choices are populated presets over that implementation.
4. Elements and Components are selectable canonical composition nodes. Composite Components retain editable child compositions.
5. Utility Layer is governed, named, locked-by-policy content—not a second creative canvas.
6. Appearance is the single property system, with target-relevant subsections and common reset law.

## Current spatial hierarchy

| Current level | Implementation | Owner-visible problem | Final disposition |
| --- | --- | --- | --- |
| Pasteboard | Workspace shell surrounding the Card | Correctly editor-only, but save toast and overlapping palettes consume it | Keep; Light, Dark, Neutral, Checkerboard; never publish |
| Card shell/root | `TapConnectCardConfig` plus `rootComposition` | Root insertion exists, but library code silently redirects to a selected Section | Make `rootComposition` the visible Card plane and unconditional default target |
| Legacy block list | `config.sections` contains legacy blocks and `type: "surface"` | Can read as another mandatory document plane | Preserve compatibility adapter; creative authoring exposes only optional generic Sections |
| Section plane | `TapCardSection(type: "surface")` with `composition` | Nine nearly empty species imply different object laws | One Section implementation; named options become populated presets |
| Element plane | `CreativeCompositionNode[]` | Root and Section paths are inconsistently surfaced | Same selectable object kernel at root or in a Section |
| Button content | `props.contentComposition` | Canonical children exist but ordinary controls still mirror label/icon fields | Keep child composition authoritative; legacy mirrors are adapters only |
| Utility layer | `config.utilityLayer` plus public utility renderer | Operational utilities visually resemble unexplained parallel content | Label in Layers/Edit, locked where governed, non-intercepting, policy-rendered |

## Section inventory and unique behavior audit

All entries below call `createCardSurface`, serialize as `type: "surface"`, receive the same transform/layout/appearance fields, and use a `CreativeCompositionBlock`. None has unique runtime behavior that requires a foundational Section species.

| Exposed name | Old `surfaceKind` | Current unique behavior | Finding | Final disposition |
| --- | --- | --- | --- | --- |
| Blank Section | `blank` | Transparent defaults, shorter empty height | Useful empty container | Keep as the sole empty Section choice |
| Identity Section | `identity` | Different name/height only | No populated identity composition | Convert to Premium Identity preset |
| Hero Section | `hero` | Dark fill and taller default | No required runtime law | Convert to Premium Hero preset |
| Content Section | `content` | Name/default size only | Duplicate empty box | Retire from primary library |
| Actions Section | `actions` | Initial `row` layout | Expressible by generic Section layout | Convert to populated action preset where useful |
| Offer Section | `offer` | Name/default size only | No populated offer composition | Convert to Premium Offer preset |
| Contact Section | `contact` | Name/default size only | Form/contact children provide behavior | Convert to Premium Contact preset |
| Location Section | `location` | Name/default size only | Map child provides behavior | Convert to Premium Location preset |
| Gallery Section | `gallery` | Name/default size only | Gallery is a Component | Retire Section species; provide Premium Gallery Presentation preset |

`surfaceKind` remains readable for backward compatibility during migration, but new preset insertion writes the canonical generic identity and a `presetId`/inserted-preset snapshot rather than relying on species behavior.

## Duplicate capability implementations

| Capability | Current paths | Structural cause | Simplified disposition |
| --- | --- | --- | --- |
| Fill/background/material | rail Backgrounds, card Appearance stack, contextual Surface/Color/Effects, object-specific panels | Property navigation was added per feature | Route shortcuts into one target-aware Appearance task |
| Border/corners/shadow/glow | contextual controls, Button panel, composition panel, Advanced | Each object mini-editor owns a partial copy | Shared Appearance patch/reset helpers and target subsets |
| Transform/position | contextual Position and Advanced exact values | Exact and quick controls were not composed as one capability | Common Position entry; Advanced contains exact transform/accessibility only |
| Text effects | Text effects and Button-label effects | Button label still treated partly as special fields | Nested Button label is canonical Text using the Text capability |
| Reset | isolated “remove effects”, corner reset, transform reset | No shared inserted-preset snapshot/reset contract | Group reset plus Reset Appearance, Reset to inserted preset, Reset to Brand |
| Menus | canvas context menu, toolbar ellipsis, outline menu | Menu actions were authored per surface | One capability-filtered common More menu |

## Current root insertion behavior

The object kernel is correct: `insertObject({ parentId: null })` means Card root, an unknown parent throws, and root/Section moves preserve identity. The visible drawers are not correct. `CreativeDrawer` and `CardComposerLibrary` derive the target from `model.selected?.type === "surface"`, so merely selecting a Section changes later insertion. This is stale implicit intent.

Final behavior: every ordinary library click inserts on Card root. While a Section is actively selected, a visible insertion-target control offers **Add to Card** or **Add to selected Section**; it never changes silently.

## Utility-layer behavior

`CardUtilityLayerSettings` is a page-level operational authority for Keep, support/question, contact/vCard, map, booking, and shop utilities. It survives Campaign/Experience resolution and is not part of `rootComposition` or a Section. The current creative Layers tree does not make that law sufficiently explicit.

Final behavior: Layers includes a named Utility Layer node, describes it as governed, exposes policy-compatible visibility, shows a lock state, and never treats it as a drop target or parallel growing canvas.

## Object-specific editing paths

- Text, Image, Button, and composition objects have separate panel stacks.
- The contextual toolbar also contains substantial inline editors.
- Advanced repeats transform plus exposes developer capability chips.
- Outline menus implement another object-action surface.
- Button label/icon have a canonical child composition, but several controls still patch legacy parent props directly.

Final behavior: the compact toolbar contains only high-frequency entries; one focused gutter palette performs the task; common object commands share one menu; Advanced contains exact transform, accessibility, and tracking without diagnostics.

## Placeholder render paths

`CreativeCompositionCanvas` currently renders `Choose media from Assets` in Edit and `Image` outside Edit for empty image nodes. Frame media also emits setup copy while editing. Because the same renderer serves Preview, substituting `Image` for absent media leaks an editor placeholder into customer-facing composition.

Final behavior: absent optional media returns no document content in Preview/Public. Edit-only insertion chrome appears only for an actively selected object or explicit component-content mode and is marked as editor UI.

## Current toolbar and menu composition

The toolbar has useful selection-aware branching but mixes task launchers with dense property implementations. Its More/Advanced path exposes non-actionable capability chips (`content`, `surface`, `transform`, and similar). Canvas and outline menus each carry partial copies of duplicate/delete/order commands.

Final composition:

- Text: Edit, Font, Size, Appearance, Motion, Position, More.
- Button: Edit contents, Appearance, Action, Motion, Position, More.
- Section: Layout, Size, Appearance, Position/order, More.
- Badge: Edit wording, Appearance, Motion, Position, More.
- Image/Logo: Replace, Crop/Fit, Adjust, Appearance, Motion, Position, More.
- Other Components use Setup/Edit, Appearance, relevant behavior, Position, More.
- More is capability-filtered; no inert commands and no Owner-facing diagnostics.

## Preset quality audit

Current Section choices do not earn separate tiles: most insert empty generic surfaces. Current Button presets are a useful start but cover only five combinations. Badge wording exists but shape/material discovery is thin. Coupon and Ticket are exposed mainly as artwork element names, not editable Component libraries. Text offers five list rows rather than a visual combination library, and the AI drawer proposes deterministic visual patches rather than editable authored Text/presets.

Final preset law: every named preset creates real, individually selectable child objects with polished hierarchy. The only empty preset is Blank Section. AI previews a canonical proposal before insertion and preserves Undo; generated terms are marked for Owner review and never become active Campaign/legal authority.

## Final simplified disposition

| Concern | Keep | Convert | Retire/hide |
| --- | --- | --- | --- |
| Root object kernel and `SelectionRef` validation | Yes | — | — |
| `rootComposition` | Yes | Make default visible insertion plane | — |
| `type: "surface"` | Yes | Name as generic Section | — |
| Named `surfaceKind` entries | Backward read | Populated preset metadata | Foundational species in new authoring |
| Gallery/Map/Coupon/Ticket/Form | Canonical nodes/components | Add editable child compositions and libraries | Section identity |
| Button child composition | Yes | Make Text child authoritative throughout | Special label mini-editor as independent engine |
| Appearance implementations | Property compatibility | One target-aware UI and reset contract | Duplicate Owner-facing routes |
| Advanced capability chips | Internal debug only | Gate behind explicit development flag if needed | Owner UI |
| Empty media placeholders | Edit chrome only | Selected/content-edit insertion target | Preview/Public strings |
| Save success toast | Error channel only | Quiet top-bar Saving/Saved state | Floating success notification |

## Prohibited-scope confirmation

This audit authorizes no deployment, Campaign execution, messaging, payment processing, production Tap Point assignment, Wallet issuance, Ticket validation, Form submission, destructive database operation, or production-data access.
