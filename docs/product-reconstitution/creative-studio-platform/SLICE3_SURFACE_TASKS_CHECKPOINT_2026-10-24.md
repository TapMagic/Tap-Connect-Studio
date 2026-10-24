# Slice 3.1 — Surface Styling and Contextual Tasks

Status: local construction checkpoint, not Product Owner acceptance or release certification. Builds on 3.0 commit `3fac3a8c`. No schema or authority replacement.

## Shared repairs

- Surface treatment transitions clear conflicting Material/gradient/image references durably. Single-property changes update only their owned fields, preserving imported radius, zero opacity, rich shadows, image identity, geometry, content and hierarchy.
- Recipe application clears obsolete Container adapter mirrors. Source-backed recipes now use canonical `photographyVisualPlane`; native verification exposed an obsolete image shape that could crash rendering. Added renderability coverage.
- Root Material projection respects authored opacity/fill overrides. Applying a Material no longer forces full bleed.
- Root and Container use the same small chooser of existing Gunmetal and authentic Worn Saddle Leather recipes, with canonical Material/Visual Plane previews. No new catalog or renderer.
- Existing contextual task state selects Container Surface, Placement or Contents. Tabs remain reachable without scrolling; the contextual toolbar exposes each task directly. Root has Surface and Layout tasks. Outer placement and internal layout remain distinct.
- Container clipping now applies to its content plane in both Edit and Preview, while the outer manipulation chrome remains accessible. Non-Material shadow rendering consumes the existing rich-shadow authority.

## Native verification

Chrome, verified local server port 3050. Fixture `cmvlvb1b502e7to9k6hzzalc4`, created through Blank in 3.0. No seeded JSON or database mutations.

1. Root: choose Inset, apply leather; Inset stays selected. Then apply Gunmetal.
2. Container: apply leather; set radius 28, opacity 80%, then border 3px. Radius/opacity remain unchanged. Undo border returns 1px; Redo restores 3px.
3. Container: Gunmetal → Solid → Gradient → Luxury Noir. Old image and Material are cleared; native controls and rendered paint agree.
4. Placement opens Flow width/outer spacing/alignment; Contents opens inner layout/padding/clipping; Surface opens appearance. No separate Inspector/task authority.
5. At 390×844, each task button measures 122×44px and all remain visible. Surface → Contents works. This is viewport/mouse evidence, not physical-touch certification.
6. Saved, reloaded and opened Preview; root and Container styling persisted.

Screenshots: [proof directory](proofs/slice3-native-2026-10-23/), files `31`–`36`. `31` predates the final Root task tab presentation but proves Material preserves Inset. `35` shows the final mobile task navigation. These are checkpoint evidence, not a finished composition.

The initial native pass exposed the obsolete source-image shape and a duplicate import during integration; both were corrected before the passing run. No failed interaction counted as a pass.

## Verification

- Five behavioral Surface regression tests pass, including the new native-discovered renderability case.
- Working Card/Studio suite: **676 passed, 0 failed**, including two unrelated WIP tests. Authentic local Cabinet originals are present here.
- TypeScript passes. Final integrated clean-source build and clean-checkout suite follow after 3.2; the known missing original Cabinet dependency remains unresolved and must not be concealed.
- No release, deployment, publication, Access, QR or production operation.

## Remaining gates

Continue authorized 3.2 native authoring. Finished visual quality and PO acceptance remain open. Reference image absent: exact fidelity BLOCKED. Physical touch, OS keyboard/IME, cross-browser, assistive technology and novice usability study unverified. No timing improvement estimates are presented as measurements. Production hash verification remains BLOCKED. Cabinet original artifact packaging requires separate approval.
