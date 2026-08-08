# Appearance Taxonomy

**Authority:** `lib/fusion/creative-studio/material-engine.ts` + `effect-render.ts`

A treatment has **one** canonical semantic home.

## MATERIAL

Fill / border / surface recipes: Matte, Glossy, Glass, Frosted Glass, Chrome, Silver, Gold, Copper, Enamel, Paper, Brushed Metal, Holographic, Neon (fill recipe), Tube Neon, Halo, dimensional Raised / Recessed / Beveled / Embossed / Debossed.

Dimensional treatments live under **Material → Dimensional** only.

## EFFECT

Named optical treatments: Soft Shadow, Deep Shadow, Soft Glow, Neon Edge, Double Neon, Aura, Electric, Outline Glow, Floating, Inner Glow, Gloss Highlight, Dimensional Edge.

## Deduplication (this pass)

Removed from Material catalog (aliases collapse to Neon / Halo fill recipes):

- `neon_edge`, `soft_glow`, `double_neon`, `aura`, `electric`

Those names remain exclusively in `EFFECT_RECIPES`.

## Appearance doors

For Surface parents (Button, Badge, Container, Coupon, Ticket):

- Toolbar: **[Surface swatch] · Appearance · Action · Animate · Position · More**
- Swatch opens Appearance → Fill
- Appearance opens the full canonical Surface Appearance
- Separate textual **Surface** command removed from Button toolbar (was competing with Appearance)

Button Surface gradient writes `buttonSurfaceKind` + `gradientStart/End` — never Label glyph `gradientFill`.
