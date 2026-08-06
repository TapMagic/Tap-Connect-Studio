# Shared Color, Gradient, Border, and Material Contract

Status: assembly candidate — human verification required.  
Starting SHA: `7f0f16aedf93bdea7020f28edcee47260b694f8b`

## Separation law

| Capability | Is | Is not |
| --- | --- | --- |
| Color | Flat color for a named target | Material, Shape, full Appearance |
| Gradient | Multi-stop color motion | Flat image fill |
| Border | Style / width / color / radius | Selection chrome |
| Material | Reusable visual recipe | Badge species, Shape, Color alone |
| Shape | Geometry | Material |

## Color overview rows (each opens a real page)

Current · Transparent/None · Spectrum · Eyedropper · Search · Colors in this design · Brand · Photo · Recent · Favorites · Default solid · Default gradient · Custom

Targets are explicit: Text color, Button fill, Button label, Badge fill, Icon fill/stroke, Container background.

## Gradient

Kinds: linear, radial, conic. Stops ≥ 2. Add/remove/move, position, alpha, direction, angle, centers, reverse, mirror, rotate, save, favorite, reset. Selecting a preview applies a canonical `GradientModel` and opens editable stops.

## Photo Colors

Extract from selected media, document images, Brand images. Empty state: “No hay imágenes disponibles para extraer colores.” Never invent a fake photo palette.

## Border → None

Clears style, width, color, and outline residues used as borders. Does not clear editor selection chrome.

## MaterialRecipe

Canonical props only: fill, gradient, border, border width, radius defaults, highlight, inner/outer shadow, glow, bevel, emboss/deboss, shine, texture, depth, opacity.

Catalog (initial): Flat, Soft raised, Hard raised, Recessed, Beveled, Embossed, Debossed, Glossy, Glass, Frosted glass, Clear glass, Chrome, Brushed silver, Gold, Rose gold, Copper, Gunmetal, Enamel, Neon, Stamped, Paper, Kraft, Holographic, Subtle texture.

Surface engine targets: Button, Badge, Container, Coupon, Ticket, Form, Text Box, Map/Gallery/Image frames, Icon backing.

Text adaptation: glyph gradient, outline, shadow, highlight, bevel, emboss, texture, shine — never rasterize Text.

## Anchors

- `lib/fusion/creative-studio/material-engine.ts`
- `lib/fusion/creative-studio/color-palettes.ts`
- `lib/fusion/creative-studio/border.ts`
- `lib/fusion/creative-studio/gradient.ts`
- `lib/fusion/creative-studio/card-creative-system.ts`
