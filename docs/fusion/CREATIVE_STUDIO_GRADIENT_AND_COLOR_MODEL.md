# Creative Studio Gradient and Color Model

**Classification:** `IMPLEMENTATION IN PROGRESS`

## Typed gradient

`GradientModel` is versioned and renderer-safe:

- kind: linear or radial
- angle
- radial center X/Y
- two to eight typed stops
- stable stop ID
- hex color
- stop position from 0–100
- opacity from 0–1

`normalizeGradient` clamps imported values. `gradientToCss` performs the normal typed
conversion to CSS. Raw CSS remains for legacy composition compatibility and is not the
normal Owner editing control.

## Visible Card Owner workflow

Quick mode:

- start color
- end color
- angle
- reverse
- Reset to Brand

Advanced Gradient Studio:

- linear/radial
- add/remove stops
- visual stop selection
- exact percentage
- stop opacity
- radial center
- curated presets

The Gradient Studio is mounted in Creative Composition → Background on
`/dashboard/card/edit`, and changes use the composition update/history path. Unit tests
cover normalization and CSS conversion; route tests cover opening the quick/advanced
controls. These checks do not exhaust visual output, undo labels, keyboard operation, or
contrast at all stop combinations.

## Pattern and texture model

`SurfacePatternModel` stores registry ID, pattern/texture kind, scale, rotation, opacity, foreground/background colors, and supported blend mode. Registry entries generate CSS procedurally and do not embed third-party imagery.

## Remaining shared-color work

The typed gradient and procedural background models are active in Creative Composition.
They are not yet a shared cross-product design system.

- Typed Creative Composition gradients: `IMPLEMENTATION IN PROGRESS`
- Procedural patterns/textures: `IMPLEMENTATION IN PROGRESS`
- Shared Brand/document/recent/favorite color picker: `NOT IMPLEMENTED`
- One-click contrast correction and complete contrast guidance: `NOT IMPLEMENTED`
- Durable saved palettes/gradients and cross-surface apply: `NOT IMPLEMENTED`
- Manual visual, responsive, keyboard, and assistive-technology review:
  `IMPLEMENTATION IN PROGRESS`

