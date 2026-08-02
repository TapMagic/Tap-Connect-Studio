# Card creative-system reconciliation

Starting branch tip: `ab896398a7eb476e3dd5849e8dde6ea562503200`

## Canonical model

- **Card root surface** — `TapConnectCardConfig` is the only mutable Card draft. Root surface fields and `rootComposition` describe the full Card canvas; root Elements do not require a Section.
- **Section surface** — every optional container is a `TapCardSection` with `type: "surface"`. `surfaceKind` is only a preset/starting arrangement. Layout, size, background, border, radius, shadow, opacity, responsive rules, and `composition.nodes` use one implementation.
- **Element** — a `CreativeCompositionNode` in either `rootComposition.nodes` or a Section's `composition.nodes`. The node owns transform, layer, visibility, lock, group, anchor, semantic kind, appearance, source, accessibility, and governed motion. Moving an Element changes its parent collection without copying its identity or content.
- **Group** — `groupId` is a manipulation relationship shared by nodes. It adds no surface styling.
- **Reusable composition** — an editable `CreativeCompositionBlock` resource containing canonical nodes and surface treatment. Placement deep-clones the resource with new IDs and retains an optional `resourceRef`; instances are independent unless a future linked-update mode is explicitly selected.
- **Brand resource** — a named logo, color, palette, font, media item, template, or composition selected independently. Per-property source is Brand or Custom; Custom persists until reset.
- **Asset** — durable media authority referenced by asset ID with URL fallback. Brand and general libraries are views over that authority, not duplicate files.
- **Template** — a starting Card, Section, Offer, or composition document. Placement produces editable canonical objects.
- **Style preset** — a named set of supported visual properties. Presets remain editable and do not claim photorealism.
- **Motion preset** — governed node/Section motion (`preset`, intensity, speed, delay, repeat policy) with reduced-motion fallback. Motion is dormant in Edit unless motion preview is active.
- **Selected-object contract** — canvas selection, Outline highlight, inspector title/breadcrumb, and keyboard target resolve to the same Card, Section, or Element ID. Multi-selection is a list of Element IDs within one composition.

## Workspace contract

The compact top bar owns workspace identity, mode, save state, publication state, Undo, Redo, Preview draft, Save, Publish, Finish editing, and restrained navigation/history actions. The left rail owns Templates, Build, Elements, Text, Brand, Assets, Backgrounds, Reusable compositions, Layers, and Help. It opens one retained, searchable contextual drawer with nested Back/breadcrumb navigation. The center is always the live Card. The right inspector is selection-driven and exposes only controls that mutate the selected object's canonical fields.

Edit renders authoring chrome, selection, handles, and guides. Preview draft renders the current in-memory draft with all authoring affordances removed and never requires a Tap Point or published revision. Published Card resolves only the current immutable public revision pointer.

Save performs optimistic draft revision persistence. Reload reads that same draft. Publish snapshots the saved draft, creates an immutable revision, and advances the public pointer. Rollback creates/chooses publication history without inventing another Card authority. Campaign, Tap Trace, Email, and Control Room continue to consume the existing publication and Card references.

## Pre-implementation control reconciliation

| Visible control/family | Code path | Selection | Mutation / document field | Preview · reload · public effect | Audit | Disposition |
| --- | --- | --- | --- | --- | --- | --- |
| Save | `tap-card-builder.tsx` → draft API | Card | complete config / `tapCardDraftRevision` | draft · yes · no until publish | WORKING | Keep |
| Publish | builder → publication API | Card | immutable version + public pointer | published renderer | WORKING | Keep |
| Preview as customer | `card-authoring-workspace.tsx` | Card | mode only | exact in-memory draft | WORKING | Rename Preview draft |
| View-only preview | `/dashboard/card/preview` | Card | none | saved draft | WORKING | Keep in overflow |
| Undo / Redo | labeled history | all | complete prior/next config | draft and subsequent save | WORKING | Keep |
| Existing left Build/Outline panel | `card-composer-library.tsx` | all | add/select/reorder | yes · yes · yes | PARTIAL | Split into persistent rail + one drawer |
| Inspector / Appearance aliases | workspace tool registry | all | selected canonical fields | mixed | DUPLICATE | One persistent right inspector; move libraries left |
| Ask TapConnect | tool registry/drawer | none | no Card mutation | none | DEAD | Remove from Card creative rail |
| Freeform toggle | legacy advanced drawer | Card | separate legacy display state | not canonical for this pass | DUPLICATE | Owner-hide; canonical root/Section compositions remain |
| Start blank / Brand / template / clone | builder/live model | Card | replaces/initializes config | yes · yes · yes | WORKING | Templates/Build drawer |
| Add Section presets | `composer-model.ts` | Card | `sections[]` shared surface | yes · yes · yes | WORKING | Build drawer |
| Add root/Section Element | composer model/live model | Card/Section | composition `nodes[]` | yes · yes · yes | WORKING | Elements/Text/Brand/Assets drawers |
| Direct drag/resize/rotate | composition canvas | Element(s) | node transform | yes · yes · yes | WORKING | Keep; retain eight handles/guides |
| Move / Wrap / Remove Section keep Elements | composer model/inspector | Element/Section | parent node collections / sections | yes · yes · yes | WORKING | Reconnect in inspector and menus |
| Group / Ungroup / align / distribute / layers | composition ops/inspector | Elements | `groupId`, transforms, `zIndex` | yes · yes · yes | WORKING | Keep and expose via Layers |
| Brand buttons embedded below inspector | composer inspector | selected object | source/resource/local fields | yes · yes · yes | MISWIRED | Move to always-available Brand drawer |
| Assets embedded below inspector | composer inspector/media picker | selected object | asset ID + URL fallback | yes · yes · yes | MISWIRED | Move to Assets drawer |
| Text/font controls | composer inspector/font picker | text/button | node `props` | yes · yes · yes | PARTIAL | Add effects/curved/material truth |
| Button icon text field | composer inspector | Button | `props.icon` | yes · yes · yes | MISWIRED | Replace primary workflow with visual icon browser |
| Badge library | absent | Element | none | none | DEAD | Implement canonical editable Badge Element |
| Motion controls | absent | Element/Section | none | none | DEAD | Implement governed presets and reduced-motion preview |
| Reusable design browser | appearance panel | selected Section | local resource selection | limited | PARTIAL | Implement save/place independent canonical instances |
| Color truth | composer inspector | Card/Section | color/overlay/source fields | yes · yes · yes | PARTIAL | Report document and rendered values/effects |
| Section height controls | composer inspector/canvas | Section | surface size fields | yes · yes · yes | WORKING | Add edge resize and explicit behavior labels |
| Lifecycle/history/rollback | live drawer/publication | Card | lifecycle/version APIs | yes | WORKING | Keep in overflow/history |

No second editor, canvas engine, Card draft, Brand authority, Asset authority, or publication path is introduced by this reconciliation.
