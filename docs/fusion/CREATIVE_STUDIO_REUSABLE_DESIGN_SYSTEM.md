# Creative Studio Reusable Design System

**Classification:** `IMPLEMENTATION IN PROGRESS`

## Product rule

The product direction is one family of registries for media, fonts, colors, gradients,
patterns, textures, masks, shapes, treatments, compositions, sections, and templates.
The current product does not yet satisfy that rule across Card, Offer, Coupon, Email,
Campaign, Brand, and Assets.

## Current foundations

- Media: `SharedMediaAssetBrowser` is reachable through `MediaPicker` at the audited Card
  and Composition insertion points; universal cross-surface adoption is incomplete.
- Fonts: professional font catalog and composition font loader are active.
- Gradients: typed presets and editor are active in Creative Composition only.
- Patterns/textures: procedural catalog is active in Creative Composition only.
- Masks: registered safe SVG catalog is active in Creative Composition frames.
- Card actions: existing action catalog is separate from a reusable visual-style system.

Each foundation remains `IMPLEMENTATION IN PROGRESS`; presence of a registry does not
mean a durable Owner reuse workflow exists.

## Future reusable record contract

Future durable saved records must include:

- ID, name, kind, category, version
- preview thumbnail
- favorite and Brand-approved state
- typed payload (never raw giant media)
- created/updated timestamps
- usage count and last-used timestamp
- duplicate/edit/delete/apply operations

Applying a record must:

- create a labeled Undo/Redo transaction;
- preserve approved existing content unless the Owner explicitly confirms replacement;
- retain media provenance;
- remain editable;
- use the shared Edit/Preview/Public renderers.

## Current truth

Whole-card publication snapshots and Campaign `SavedTemplate` records exist, but they
are not a durable Creative Studio saved-style/composition/template workflow on the
actual Card route.

- Save/apply Creative styles: `NOT IMPLEMENTED`
- Save/apply Creative compositions: `NOT IMPLEMENTED`
- Editable Creative Composition templates: `NOT IMPLEMENTED`
- Durable thumbnails, versioning, usage count, favorite/Brand approval, duplicate/edit/
  delete/apply operations: `NOT IMPLEMENTED`
- Shared cross-surface media/font/gradient/pattern/mask foundations:
  `IMPLEMENTATION IN PROGRESS`

No existing type, Campaign template, publication snapshot, or isolated catalog should be
represented as a completed reusable design system.

