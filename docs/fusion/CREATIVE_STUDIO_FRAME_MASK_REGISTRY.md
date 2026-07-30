# Creative Studio Frame Mask Registry

**Classification:** `IMPLEMENTATION IN PROGRESS`

## Contract

Frame masks are registered, reviewed SVG paths in the `0 0 100 100` coordinate space. `FrameMaskId`, `FRAME_MASK_CATALOG`, and `frameMaskPath` are the only supported runtime mask source.

The renderer never accepts arbitrary SVG markup.

## Owner workflow

Composition → Frame & Mask Studio → Masking Shape provides:

- visual SVG thumbnails
- search
- category filter
- favorites
- recent-first ordering
- current mask highlighting
- keyboard-focusable selection

Current categories include Basic, Rounded, Geometric, Organic, Badges, Labels, Tickets, Coupons, Apparel, Bags, Food, Beverage, Automotive, Real Estate, Buildings, Pets, Sports, Children, Baby, Floral, Decorative, and Seasonal-friendly entries.

## Frame outline

The outline is an SVG path using the same registered mask path, so it follows the mask rather than impersonating it with a rectangular inset box-shadow. The Owner can set width directly and choose:

- Scale stroke with frame
- Keep exact pixel width (`vector-effect: non-scaling-stroke`)
- inside / center / outside treatment
- solid / dashed / dotted
- opacity
- shadow or glow
- media gap/padding

## Deferred

Custom mask upload remains intentionally deferred until SVG sanitization, licensing, accessibility, performance, and renderer compatibility are addressed.

