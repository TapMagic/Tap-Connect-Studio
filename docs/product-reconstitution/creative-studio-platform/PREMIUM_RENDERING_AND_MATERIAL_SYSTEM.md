# Premium Rendering and Material System

Status: assembly candidate — human verification required.  
Starting SHA: `54fada53deb351a8edc7081b3b1ac448bdd378ae`

## Law

No enabled Appearance / Material / Color / Gradient control may update stored state without a visible Edit and Preview change. Persistence and reload must preserve the same visual result.

## Shared color system (left drawer)

Home sections:

1. Search (name or HEX)
2. Current color + Transparent/None where valid
3. Spectrum / custom picker
4. Eyedropper when browser supports
5. Colors in this design
6. Brand palette
7. Photo colors (thumbnail + extracted swatches)
8. Recent / Favorites
9. Default solid colors (curated neutrals + hue families)
10. Default gradient colors (cool / warm / mono / metallic / neon / all)
11. Saved colors

Target labels must be explicit: Text color · Button fill · Button label color · Icon fill · Icon stroke · Container background · Card background.

## Gradient editor

Linear / radial / conic; ≥2 stops; add/remove; draggable rail; position; stop opacity; visual direction; numeric angle; radial center/size; conic center/start; reverse / rotate / mirror; save / favorite / Reset. Curated pages are editable starting points — never flattened images.

## Material presets (compatible Surfaces)

flat · soft raised · hard raised · recessed · beveled · embossed · debossed · glossy · glass · frosted glass · clear glass · metallic · chrome · brushed silver · gold · rose gold · copper · gunmetal · enamel · neon · stamped · paper · kraft · leather-like · holographic · subtle texture

Combined properties: fill/gradient, border, highlight edge, inner/outer shadow, glow, bevel, shine, texture, depth.

Applying a material updates: Edit renderer · Preview renderer · persisted document · reload.

## Text appearance vs Text Box

| Concern | Controls |
| --- | --- |
| Glyph | Color, gradient fill, outline, shadows, glow, neon, bevel, emboss, opacity |
| Text Box | None/Transparent, fill, gradient, border, corners, padding, shadow, glow, opacity |

One Text engine for Button labels, Badge wording, Coupon/Ticket copy, Form labels, Map/Gallery captions.

## Button / Badge materials

Buttons and Badges use the same material vocabulary with family-specific shapes. States (default / hover / pressed / focus / disabled) must be previewable from the left drawer. Raised must look pressable; pressed must visually depress — not merely change a border color.

## Background media and textures

None/Transparent · solid · linear/radial/conic · curated gradients · media · pattern · texture. Treatments: cover/contain/crop, focal point, brightness/contrast/saturation/blur, tint, overlay. Texture previews: grain, paper, linen, brushed metal, glass, dots, grid, diagonal, halftone, geometric, holographic, soft noise, gradient mesh.

## Control disposition

| Control | Edit | Preview | Persist | Disposition |
| --- | --- | --- | --- | --- |
| Solid fill | Surface CSS | Same | Document node props | Required |
| Gradient | `gradientToCss` | Same | Gradient model | Required |
| Shadow / glow / radius / opacity | Free-layout style props | Same | Document | Required — fail if state-only |
| Material preset | Expands to canonical props | Same | Document | Required |
| Transparent/None | Explicit | Explicit | Document | Required where compatible |
| Unsupported exotic effect | Hidden | — | — | Do not show no-op |

## Forbidden

- Generic Effects fallback that ignores target family
- State-only materials
- Flattened gradient/material images as the editable object
