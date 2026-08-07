# Appearance Toolbar and Aa Contract

Status: assembly candidate — human verification required.  
Starting SHA: `74cbf35605ab419495f582376f8a1058b835f712`

## Text Aa control

Replace the textual **Color** toolbar button for Text targets with a compact live preview:

**Aa**

| Glyph | Box | Preview |
| --- | --- | --- |
| Solid blue | Solid green | Blue Aa on green |
| Gradient / Gold / Neon | Transparent | Treatment on checkerboard |
| Solid | Gradient | Glyph over box gradient |

### Interaction

| Click target | Opens | Tooltip / a11y |
| --- | --- | --- |
| Letters Aa | Text / Appearance / Color (glyph) | “Edit text color” |
| Background swatch | Text Box Appearance | “Edit text box appearance” |

Never show **Aa** and **Color** for the same target simultaneously.

Test ids:

- `contextual-aa` — control root
- `contextual-color` — glyph hit target (opens glyph Color)
- `contextual-aa-box` — box hit target

## Surface swatches

For Button / Badge / Container, a compact surface swatch may sit beside Appearance when useful. Material opens recipe tiles; Appearance opens manual detail. They are not aliases.

## Badge toolbar

`Shape · [Surface swatch] · Appearance · Action · Animate · Position · More`

Wording / Font remain available. Material recipes live under Appearance / Material, not as Badge species.

## Icon toolbar

`Change Icon · Appearance · Action · Animate · Position · More`

Appearance splits Artwork vs Backing Surface. Neon/Glow follows SVG silhouette only.

## No duplicate menus

Audit removes: duplicate Appearance, duplicate Color, Material+Appearance that open the same form, stale Fill/Stroke routes, Badge material-as-species catalog.
