# Creative Studio full forensic audit and completion record

Date: 2026-08-03

Required and observed starting revision: `acfdfa34273d57ba213db6bd36e2c1037223cdf6`

Database boundary: isolated `tapconnect_fusion_dev` on `127.0.0.1:5433`

This document records the mandatory first audit sweep before implementation. The current TapConnect screenshots are treated as authoritative product evidence even where a prior automated test passed. Prior Canva captures are used only for interaction, spatial, and workflow comparison, as catalogued in `VISUAL_REFERENCE_AND_DEFECT_AUDIT.md`.

## Executive finding

The Card editor has a credible canonical composition renderer, history, autosave, SelectionRef contract, and many direct-manipulation primitives. The failures are caused by incomplete convergence at the authoring boundary: insertion still accepts an implicit selected Section, nested Button content is stored inside parent props instead of participating in canvas hit-testing, Badge text is rendered by a shape-specific path, Layers is only a selection list, and focused panels are positioned over the document rather than in available workspace gutters. These gaps recreate single-slot behavior through overlap and target ambiguity even though arrays exist in storage.

The root problem is therefore not missing isolated controls. It is the absence of one explicit insertion/selection/navigation kernel at every visible entry point.

## Human-visible evidence disposition

| Evidence | Root cause found | Classification | Required repair and proof |
| --- | --- | --- | --- |
| Section Surface panel covers the Card while side space is unused | `CardContextualObjectToolbar` anchors all focused panels at page center with a fixed top offset; it has no gutter placement contract | MISWIRED / REBUILD | Dock focused capability panel beside the left rail on desktop, use a bottom sheet on phone, close on Escape/tool/object/tab/Preview, prove Card remains unobstructed |
| Multiple Badges cannot be predictably grabbed, moved, resized, or edited | Badges are canonical shape nodes, but insertion cascades on a six-position formula that repeats; shared Text tools only appear for `primitive === "text"` or Button | PARTIAL / WRONG TARGET | Collision-aware insertion, Badge Text capability, exact Badge selection boundary, multiple unique identities and Layers entries |
| Effects can change with no obvious selected object | contextual toolbar is detached from the selection boundary and lacks an always-visible object label for ordinary elements | ACCESSIBILITY-DEFECT / MISWIRED | Label toolbar and panel with exact object name/type; hide toolbar when no valid visible SelectionRef |
| Adding Buttons appears to replace Badges | storage is additive, but repeated insertion coordinates and z-order place new objects directly over older objects | MISWIRED | Explicit `insertObject` with collision-aware cascade and visible selected result; assert count and identities before/after every preset |
| Image insertion renders “Add image URL in inspector” | `NodeVisual` has an ordinary empty-image fallback string tied to retired UI | LEGACY DEPENDENCY / RETIRE | Image insertion must launch or stay in Media selection; empty Image becomes a selected “Choose media” state with no Inspector language |
| Brand logo cannot be grabbed or transformed | the logo is a normal image node, but overlapping selection and parent/Section hit regions make target acquisition unreliable; Layers lacks transform actions | PARTIAL | predictable hit order, ratio lock, direct and Layers selection, visible handles, transform/browser proof |
| Surface controls exist without dependable target manipulation | shared-looking controls patch object-specific fields and panel target visibility is weak | PARTIAL | target-labelled shared capability panel and SelectionRef rejection on rapid switch |
| Legacy single-slot behavior survives | insertion parent is inferred from current selected Section; positional formula repeats after six objects; nested child content is not a first-class selectable path | LEGACY DEPENDENCY / REBUILD | explicit insertion request, no fallback parent, collision-aware placement, selectable nested children |

## Architecture map and defects beyond the screenshots

| Area | Canonical path | Forensic finding | Disposition |
| --- | --- | --- | --- |
| Document mutation | `TapCardBuilder` → labelled history → recovery journal → draft API | authoritative and reusable | KEEP |
| Insertion | `CardCreativeToolRail.add` → `model.onAddElement` → `addComposerElement` → `addElementTo*` | implicit parent fallback; click point absent; repeated placement; no Add/Replace/Convert API distinction | REBUILD |
| Identity | `createCompositionNode` with nanoid | unique for normal insertion; reusable composition and Button child identities need explicit verification | RECONNECT |
| Selection | canvas node pointer handlers + `SelectionRef` | parent nodes selectable; child Button nodes are not DOM/canvas selection entities; no visible current-object title | REBUILD |
| Hit testing | DOM z-index and `Select beneath` | top-order works for siblings; transparent parents and nested children are not comprehensively represented | REBUILD |
| Handles | eight resize handles + rotation overlay | implemented for composition nodes; ratio lock not enforced by object capability | RECONNECT |
| Layers | `CreativeDrawer("layers")` | every top-level canonical node is listed, but no visibility/lock/rename/reorder/parent/nested controls | REBUILD |
| Text | contextual Text controls | works for text primitives; Button label only via parent content mode; Badge wording excluded | REBUILD |
| Surface | Section and Button focused panels | duplicated field implementations; Badge/Map/root parity absent | REBUILD |
| Media | `MediaPicker` and media authority | provider authority exists; empty Image authoring path is legacy and visible | RECONNECT |
| Motion | common props and renderer | common renderer path exists; object eligibility and selection persistence need proof | RECONNECT |
| Clipboard | module composition clipboard and style clipboard | same-container context-menu copy/paste exists; keyboard and cross-tab behavior unproved | RECONNECT |
| Grouping | `groupId` operations | group relationship works without a group Layer entity or group selection boundary | PARTIAL |
| Panels | absolute contextual overlays | object panels cover work and compete with drawer/toasts | REBUILD |
| Save feedback | top-bar state plus large transient message | duplicate success/status message covers work | RETIRE duplicate banner |
| Preview/public | shared composition renderer and existing draft/public spine | strong base; comprehensive multi-object parity remains unproved | RECONNECT |
| Responsive | adaptive shell plus mobile rail | desktop canvas is squeezed/panned on phone; contextual panels are not true bottom sheets | REBUILD |
| Context menu | canvas menu | Copy, style, paste, duplicate, group, z-order, hide, lock, parent moves, wrap, delete exist; missing rename/accessibility/select parent/save reusable | PARTIAL |
| Image failure state | canvas empty image placeholder | expressly references retired Inspector | RETIRE |
| Disabled quick tools | Charts/Captions and conditional background removal | honest disabled states, but configured background removal has no direct selected-image execution here | PARTIAL / HIDE until wired |

## Single-slot and wrong-target search

- Canonical Section and root compositions store arrays, so storage is not inherently single-slot.
- `addComposerElement` resolves `targetSectionId`, then silently falls back to the selected Surface. That violates explicit-parent insertion law.
- `createCardElement(kind, index)` repeats x/y coordinates after six insertions and does not inspect occupied geometry. New objects can visually replace older ones without replacing their records.
- Button label/Icon children are serialized in `props.contentComposition`, but the canvas selects only the Button parent. They cannot participate in universal hit-testing or Layers navigation.
- Badge wording is a `props.text` field on a shape node and therefore bypasses the shared Text toolbar.
- Empty image nodes render a retired-Inspector instruction.
- The Layers drawer displays flat buttons; nested content and operational state are invisible.

## Initial repair order

1. Formalize explicit Add/Replace/Convert/Move/Wrap kernel functions and collision-aware placement.
2. Route every rail/library insertion through an explicit destination; never infer from stale selection.
3. Make Button children and Badge text addressable through child SelectionRefs and Layers.
4. Complete Layers as the canonical navigation surface with name, type, parent, visibility, lock, order, duplicate, and delete.
5. Dock focused capability panels in an available gutter and remove duplicate save banners.
6. Remove every retired-Inspector string and reconnect Image/Logo/Map paths to shared Media/Transform.
7. Prove a visibly constructed multi-object Card, Preview, reload, desktop/tablet/phone, keyboard, and Axe.

## Acceptance boundary

No Campaign deployment, scheduling, QR operations, Coupon/Ticket/Form/Wallet expansion, Messenger, social publishing, or Autopilot execution is authorized in this pass. Unsupported capability controls remain hidden or explicitly disabled.

## Final repair disposition

The initial findings were repaired through one canonical object kernel in `lib/fusion/card/object-kernel.ts`. `insertObject`, `replaceObject`, `convertObject`, `moveObject`, `wrapObjects`, `unwrapSection`, `duplicateObject`, and `deleteObject` now provide immutable, identity-preserving operations. Insertion requires an explicit Card-root (`null`) or Section target, rejects unknown parents, and scans occupied geometry before choosing a visible placement. This removes the stale-selection fallback and the six-position overlap loop that produced apparent replacement.

The ordinary Card authoring route now has these verified outcomes:

- Badge and Button presets add; they do not replace existing nodes. The master scenario retains three distinct Badges while adding three distinct Buttons.
- Layers is a hierarchical operational surface for root and Section nodes, with selection, visibility, locking, rename, order, duplicate, and delete controls.
- Button label and icon children have stable child identities in Layers and produce child-path SelectionRefs. Direct canvas manipulation intentionally retains the Button as the action boundary; child content is selected through Layers or Button content mode.
- Badge wording uses the shared Text controls and the Badge body uses the shared Surface controls.
- Image insertion opens Assets instead of producing a blank Inspector-dependent node. Selected Images expose the shared media replacement control; Brand logos remain ordinary selectable composition nodes.
- focused Section, object, and Advanced panels dock in the desktop right gutter and become mobile bottom sheets. Selection/tool changes invalidate the open panel context; Escape closes overlays.
- duplicate save-success covering messages are gone. Saved/draft status remains in quiet chrome.
- the editor instance identifier is generated with React `useId`, removing the observed server/client hydration mismatch.

## Browser and release evidence

`e2e/card-direct-manipulation-forensic.spec.ts` is the master acceptance and passed in Chromium. It constructs the multi-object Card visibly, asserts identity/count/geometry after every additive stage, navigates nested Layers, exercises Badge Text/Surface, media replacement, Brand logo selection, docked Section Surface, phone bottom-sheet behavior, Preview cleanliness, and Axe serious/critical results. Evidence screenshots are written to `tmp/card-direct-manipulation-forensic/` during the run.

The connected in-app Browser runtime reported no available browser instances, so an existing signed-in GUI session could not be driven. Repository Playwright Chromium was used as the browser truth source; the final candidate remains explicitly gated on human visual verification.

Final automated gates:

- master Playwright acceptance: 1 passed
- focused object-kernel/model tests: 11 passed
- full Node suite: 963 passed, 0 failed
- repository ESLint: passed with 0 errors and 7 existing warnings; generated Next/Playwright output is explicitly ignored
- TypeScript: passed
- Next.js 16 production build: passed (89 static pages generated)
- Prisma schema validation: passed; 22 migrations applied; no schema drift
- `git diff --check`: passed
