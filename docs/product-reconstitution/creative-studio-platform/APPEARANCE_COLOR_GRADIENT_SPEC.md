# Appearance, Color, and Gradient Specification

Color values are canonical CSS hex colors plus explicit alpha; Brand/document palettes are shortcuts, not separate mutation paths. Text glyph color is distinct from the Text box, Icon fill/stroke is distinct from its backing surface, media frame Appearance is distinct from image adjustments, and root Background is a fill rather than a loose Image Element.

The structured `GradientModel` supports linear/radial kind, 0–360° angle, radial center X/Y, two through eight editable stops, stop color, stop position, stop alpha, add/remove, reverse, normalization, and deterministic CSS rendering. Curated presets remain editable models. Root Background exposes transparent, solid, gradient, media library, pattern/texture, fill-only opacity, and reset. Image overlays retain separate overlay color/opacity.

Appearance sections are selected by object capability:

- surfaces: fill/gradient, opacity, border, corners, shadow/glow;
- Text: glyph color/gradient, outline, shadow/glow, box treatment;
- media: frame, border, corners, shadow/glow, opacity and filters;
- Icon: provider glyph, fill, stroke, stroke width, backing surface and opacity;
- Divider: line style, thickness, length, color/gradient, caps and spacing;
- Gallery/Map/Form: parent frame/surface only unless a child is selected.

Reset clears only the named capability and never Action, destination, tracking identity, accessibility, provider metadata, or unrelated content. Preview/Public suppress editor-only placeholders; provider failure uses a labeled development fallback.
