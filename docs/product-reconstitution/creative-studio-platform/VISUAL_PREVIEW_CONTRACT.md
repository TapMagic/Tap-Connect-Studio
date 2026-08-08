# Visual Preview Contract

Visual choices must show the actual visual result before click.

## Icon

Material and Effect tiles render a representative glyph using the **same** `applyMaterialRecipe` / `applyEffectRecipe` + `effectLayersCss("icon_artwork")` path as the canvas.

Stroke: slider + numeric, live while dragging. Hidden/disabled for fill-only and multicolor Icons.

## Text

Use short representative `Aa` / selected text with current font in Appearance previews.

## Surface (Button / Badge / Container)

Preview the selected/current shape with the candidate treatment — not unrelated generic rectangles when the object is a pill or circle.

## Badge shapes

Tiles use canonical `badgeShapePreviewStyle` / `clipPath` from `badge-shape.ts` — silhouette truth, not colored rectangles with shape names.

## Button / Coupon starters

Thumbnails generated from the same preset props the insert path consumes (`buttonPresetThumbnailStyle`). No thumbnail-only CSS that diverges from insertion.
