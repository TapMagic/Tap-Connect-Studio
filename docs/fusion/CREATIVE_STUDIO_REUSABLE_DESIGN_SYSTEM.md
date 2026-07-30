# Creative Studio Reusable Design System

**Classification:** `IMPLEMENTATION IN PROGRESS`

## Product rule

TapConnect must use one family of registries for media, fonts, colors, gradients, patterns, textures, masks, shapes, treatments, compositions, sections, and templates. A Card, Offer, Coupon, Email, and Campaign must not invent parallel pickers for the same design primitive.

## Active shared registries

- Media: `SharedMediaAssetBrowser` through `MediaPicker`
- Fonts: professional font catalog and lazy loader
- Gradients: typed presets
- Patterns/textures: procedural catalog
- Masks: safe SVG registry
- Card actions: Card action catalog

## Reusable record contract

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

Whole-card publication snapshots and campaign `SavedTemplate` exist, but there is not yet one durable Creative Studio saved-composition/style/template registry on the actual Card route. This capability remains `MISSING` in the capability matrix and must not be represented as Owner-ready.

