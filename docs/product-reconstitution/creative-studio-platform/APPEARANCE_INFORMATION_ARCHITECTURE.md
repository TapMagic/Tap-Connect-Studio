# Appearance Information Architecture

**Category source:** `lib/fusion/creative-studio/appearance-ia.ts`  
**Engine (unchanged):** `material-engine.ts` + target adapters + GradientStudio + Border helpers.

## Rules

1. Categories are chosen per target family — **not** a fixed count.
2. One concept per category; no duplicate Quick Effects vs Effects vs Advanced Effect drawer.
3. Selecting an Effect opens tuning on the **same** Effect page (`tuningFieldsForEffect`).
4. Rare controls sit under Fine tune on that page.
5. Click is authoritative navigation; hover is never required.

## Implemented category sets (examples)

| Family | Categories |
| --- | --- |
| Text | Color, Material, Effects, Text Box |
| Icon | Artwork, Effects, Backing Surface |
| Surface (Button/Badge/Coupon/…) | Fill, Material, Effects, Border |
| Group | Color, Material, Effects (fan-out only) |

UI overview: `data-testid="appearance-category-overview"`.

## Effect rendering

`lib/fusion/creative-studio/effect-render.ts` builds target-aware layers so Neon Edge / Soft Glow / Aura / Double Neon / Electric / shadows / dimensional treatments are distinguishable. `surfaceShadowCss` prefers these layers when `effectPreset` is set.
