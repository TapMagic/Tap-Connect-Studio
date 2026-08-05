# Universal Element and Composition Audit

Audit date: 2026-08-04  
Starting revision: `06890b745f55d03017267fd1137f58ccc28c237e`  
Branch: `tapconnect-operational-spine-restoration`

## First sweep

The Studio already has a partially converged authoring kernel. `TapConnectCardConfig.rootComposition` is the direct Card-root plane, `CreativeCompositionNode` is the shared positioned shell, Sections use the same composition node model, `SelectionRef` rejects stale mutations, and canvas/Layers/Preview read the same node arrays. The current implementation is therefore a useful migration base, not a reason to restore the former editor.

The first sweep also found four platform-level breaks that must be fixed before object-specific work is trustworthy:

1. The Card root has a persisted minimum height but no visible bottom extension handle or root-level Fit to content command.
2. The view-toolbar command is labelled “Hide” while retaining an empty sticky toolbar shell.
3. “Edit selection” and the `inspector` tool alias still route to `SelectionPanelStack`, which presents Inspector-era language and object-specific drill-ins.
4. Several object families are represented canonically but their capability metadata is still inferred from overloaded `primitive` and `props.elementKind` fields instead of an explicit universal contract.

## Current authority map

| Concern | Current authority | First-sweep result | Disposition |
| --- | --- | --- | --- |
| Card page | `TapConnectCardConfig.rootCanvasMinHeightPx` | Persisted, defaults to 520px, automatically grows for root nodes | Keep; add direct resize and Fit to content |
| Root Elements | `rootComposition.nodes` | Direct placement and free x/y manipulation work | Keep as canonical root |
| Section children | `section.composition.nodes` | Same node shell; optional Section already supported | Keep; call it Container/Section in Owner UI |
| Element geometry | `CreativeCompositionNode` | One transform model for all current objects | Extend with explicit policies/contracts |
| Component children | `props.contentComposition` | Button and structured components have editable child data | Normalize access and capability routing |
| Selection | `SelectionRef` plus selected node ids | Generation-safe writes exist | Keep; remove fallback Inspector routing |
| Layers | root and Section composition arrays | Reads canonical order and exposes nested component children | Keep; continue as stack/tree authority |
| Appearance | contextual toolbar plus shared appearance stack | Mostly canonical, but legacy aliases remain | Route all normal entry points to shared target-aware controls |
| Media | shared media library plus node-specific controls | Provider browser exists; routing must remain distinct | Preserve provider integrations and separate replace/crop/adjust/frame |
| Preview/Public | `TapConnectCard` with interaction mode | Same document model; edit chrome is suppressed | Keep; exclude empty component placeholders |
| Persistence | Card draft API and revisioned documents | Root and Section compositions persist | Keep canonical writes and legacy reads |
| Legacy editor | `SelectionPanelStack`, `CardComposerInspector`, `inspector` alias | Still reachable by ordinary paths | Excise normal routes; leave no reserved right column |

## Visible command inventory

| Label/entry | Target | Capability | Mutation/panel path | Undo | Preview | Defect and final disposition |
| --- | --- | --- | --- | --- | --- | --- |
| Add Text/Image/Logo/Icon/Badge/Button | Card or chosen Section | Content/lifecycle | `insertObject` → canonical composition | One transaction | Renders content | Keep; root remains default |
| Appearance (toolbar) | Current Element/Section | Appearance | contextual focused panel | One transaction per change | Visual result renders | Keep |
| Appearance (left/tool route) | Current selection/document | Appearance | `AppearancePanelStack` | One transaction per change | Visual result renders | Converge on same target authority |
| Edit button contents | Button parent | Content | contextual Button content controls | One transaction per change | Child content renders | Rename to “Edit contents”; never open old editor |
| Edit selection | Selection | Mixed/legacy | `content` → `SelectionPanelStack` | Mixed | N/A | Remove; selection itself drives contextual tools |
| Inspector alias | Selection | Mixed/legacy | alias to `content` | Mixed | N/A | Remove from normal routing |
| Replace | Image/Logo content | Media | Media browser | One transaction | Selected media renders | Keep distinct |
| Crop/Fit | Image/Logo content | Media transform | Crop/Fit controls | One transaction | Crop renders | Keep distinct |
| Adjust | Image/Logo content | Image adjustment | Adjustment controls | One transaction | Adjustments render | Keep distinct |
| Position | Element/Section | Transform | contextual position controls | One transaction | Geometry renders | Keep |
| More | Compatible selection | Shared lifecycle/advanced | common More menu | Command dependent | Customer-safe | Keep and capability-filter |
| Hide (view toolbar) | Editor chrome | Editor preference | local state | Not document history | Not shown | Replace with Collapse/Show and reclaim space |
| Bottom page handle | Card root | Page size | Missing | Missing | N/A | Add; one drag is one history transaction |
| Fit to content | Card root | Page size | Missing | Missing | N/A | Add canonical calculation |

## Object-family inventory

| Family | Element shell / content | Children | Default resize | Appearance | Action | Layers / Preview |
| --- | --- | --- | --- | --- | --- | --- |
| Text/Heading/Subheading | Node geometry / text props | None | Reflow | Glyph and optional frame | Supported | Ordinary node / ordinary text |
| Image/Logo/QR/Video | Node geometry / media props | None | Scale proportionally; frame resize where supported | Frame plus image adjustment | Supported where compatible | Ordinary node / selected media only |
| Icon/Badge/Shape | Node geometry / vector or wording props | Badge wording/icon where present | Scale proportionally or Fit content | Fill, stroke, material, shadow/glow | Supported | Ordinary node / ordinary visual |
| Button/Wallet/TapSave/RSVP | Parent node / structured props | Surface, Text, optional Icon/description | Reflow or Fit content | Parent surface/state | Parent-owned | Parent plus nested children / one action target |
| Coupon/Ticket | Parent frame / governed component data | Text, artwork, QR, terms, Button | Reflow default; scale/frame/fit supported by contract | Parent surface/frame | Parent plus deliberate child targets | Parent plus children / no empty placeholders |
| Gallery/Map/Form | Parent node / component data | Media or form children | Frame or custom responsive | Parent-relevant sections only | Compatible parent/children | Parent plus children / only populated content |
| Container/Section | Section shell / composition nodes | Elements and Components | Reflow or Fit content | Surface/layout | Deliberate only | Canonical tree parent / published region |
| Group | Group node / child identities | Independently addressable members | Scale composition | Compatible group appearance | Supported | Canonical tree entry / collective transform |

## Compatibility and removal plan

- Existing `TapConnectCardConfig` and `CreativeCompositionNode` payloads remain readable.
- New authoring continues to write `rootComposition` and Section `composition` only.
- Published revisions are never rewritten by read adaptation.
- `elementKind`, `componentKind`, and nested composition fields remain version-1 adapters while explicit contract helpers become the sole capability decision point.
- `CardComposerInspector` and `SelectionPanelStack` are not normal editing destinations. Once all compatibility-only imports are removed, delete them and their stale tool aliases.
- Google Fonts and Iconify should adapt provider results into ordinary Text/Icon nodes; they must not introduce provider-specific object types.

## Safety notes

This pass does not execute Campaigns, publish customer content, issue Wallet passes, validate Tickets, submit Forms, process payments, or touch production data. The configured database at audit time is local `tapconnect_fusion_dev`.

## Implementation outcome

- Blank Card now opens one 420px canonical root plane; the duplicate builder-only empty surface was removed.
- Root height is stored as `rootComposition.pageHeightPx`, survives parsing, supports click/keyboard/pointer-drag extension, Fit to content, and labeled undo/redo. `rootCanvasMinHeightPx` remains a legacy read fallback.
- Text insertion chooses a readable initial color from its actual parent surface.
- Text and ordinary Image/Frame Elements can own independent Actions that render only in Preview/Public activation modes.
- Image Replace, Crop/Fit, Adjust, frame Appearance, Action, and Motion are distinct contextual routes.
- The view toolbar collapses to one small restore handle and reclaims its former row.
- Layers is the ordinary selection hierarchy. The former Inspector and Selection Panel implementations, their ordinary routes, and their superseded block-first acceptance test were deleted.
- Structured Button and Coupon/Ticket/Gallery/Form child compositions retain their canonical identities and capability declarations; deeper object-family visual acceptance remains part of the human verification matrix rather than being inferred from unit tests.
