# MaterialRecipe Target Adapters

Status: assembly candidate — human verification required.  
Starting SHA: `74cbf35605ab419495f582376f8a1058b835f712`

## Canonical type

`MaterialRecipe` in `lib/fusion/creative-studio/material-engine.ts`.

Recipe fields may include: id, label, category, supportedTargets, fill, gradient, border*, highlight, inner/outer shadow, glow*, bevel, emboss/deboss, shine, depth, texture, opacity, text/artwork adaptation metadata.

## Apply API

```ts
applyMaterialRecipe(target, recipeId, props, options?)
```

| Target kind | Adapter behavior |
| --- | --- |
| `surface` | Writes surface fill/gradient/border/shadow/glow/shine; preserves Shape, wording, Action, Icon |
| `glyph` | Glyph gradient / outline / text-shadow / glow; never Text Box props |
| `icon_artwork` | Fill/stroke + path-aware drop-shadow glow (SVG silhouette) |
| `icon_backing` | Backing Surface material only when backing enabled |
| `background` | Page/Card background fill/gradient/texture/effects subset |
| `text_box` | Box fill/gradient/border/shadow/glow only |

## Catalog categories

Basic · Dimensional · Gloss/Glass · Metallic · Light/Neon · Physical/Texture

Visible list is target-aware via `supportedTargets` / `materialsForTarget`.

## Effect recipes

Quick tiles (None, Soft Shadow, Neon Edge, Double Neon, Aura…) map into numeric effect props. Advanced exposes glow radius, intensity, shadow offset, blur, opacity.

## Render parity

Adapters write node props consumed by `CreativeCompositionCanvas` for Edit and Preview. No thumbnail-only or editor-CSS-only materials.

## Matrix

| Target | Capability | Toolbar | Deep-left | Mutation | Edit | Preview | Persist | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Badge Surface | Material | Material / swatch | effects / material | `applyMaterialRecipe(surface)` | canvas | same | props | unit+e2e |
| Button Surface | Material | Material | effects | surface adapter | canvas | same | props | unit+e2e |
| Text glyph | Material | Aa → Appearance | color / effects | glyph adapter | canvas | same | props | unit+e2e |
| Text Box | Material | Aa background | text-box | text_box adapter | canvas | same | props | unit+e2e |
| Icon artwork | Treatment | Appearance | icon-appearance | icon_artwork | drop-shadow | same | props | unit+e2e |
| Icon backing | Material | Appearance | icon-appearance | icon_backing | box styles | same | props | unit+e2e |
| Container | Material | Appearance | surface/effects | surface | canvas | same | props | unit+e2e |
| Page Background | Material | Appearance | surface | background | page CSS | same | config | unit+e2e |
