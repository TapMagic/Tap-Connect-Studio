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

`normalizeGradient` clamps imported values. `gradientToCss` is the only normal conversion to CSS. Raw CSS remains only as legacy composition import compatibility and is not the Owner editing workflow.

## Owner workflow

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

Every change is committed through the Card composition history path with a labeled operation.

## Pattern and texture model

`SurfacePatternModel` stores registry ID, pattern/texture kind, scale, rotation, opacity, foreground/background colors, and supported blend mode. Registry entries generate CSS procedurally and do not embed third-party imagery.

## Remaining shared-color work

The typed gradient and procedural background models are active in Creative Composition. A complete shared Brand/document/recent/favorite color picker, contrast one-click correction, and saved palette registry remain `IMPLEMENTED BUT INCOMPLETE`.

