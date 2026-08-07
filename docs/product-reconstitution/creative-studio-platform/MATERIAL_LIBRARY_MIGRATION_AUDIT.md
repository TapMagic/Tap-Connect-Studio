# Material Library Migration Audit

Status: assembly candidate — human verification required.  
Starting SHA: `74cbf35605ab419495f582376f8a1058b835f712`

## Pre-migration defect

Badge library presented Material recipes (Flat, Soft raised, Gold, Glass, Chrome…) as if they were Badge types. Starter Badges also leaked Neon / Metallic / Glass as species.

## Migration rules

| Before | After |
| --- | --- |
| Badge tile “Gold” | Material recipe `gold` applied to Badge Surface |
| Badge tile “Glass” | Material recipe `glass` |
| Starter “Neon” Badge | Shape Pill + wording LIVE + material `neon` (or design preset “VIP/Sale” with shape) |
| Glyph `gold_foil` | Normalized → catalog `gold` via glyph adapter |
| Glyph `neon_tube` | Normalized → `neon` / effect recipe Neon Edge |

## Badge library primary catalog

Shapes / designs only: Pill, Round, Seal, Ribbon, Corner ribbon, Shield, Burst, Starburst, Tag, Award, VIP, Sale, New, Verified, Limited, Custom.

Optional **initial material** picker remains secondary; material stays editable after insert.

## Dual catalog collapse

`MATERIAL_PRESETS` (glyph) continues as a compatibility facade that routes through `applyMaterialRecipe("glyph", …)`. Canonical authority is `MATERIAL_CATALOG` + effect recipes.

## Ownership matrix

| Concern | Owner |
| --- | --- |
| Recipe definitions | `material-engine.ts` |
| Glyph adaptation | `applyMaterialRecipe` glyph adapter + `applyGlyphEffect` bridge |
| Badge insert UI | `card-creative-tool-rail.tsx` BadgeLibrary |
| Toolbar / Aa | `card-contextual-object-toolbar.tsx` |
| Render | `creative-composition-canvas.tsx` |
| Persistence | composition node props (`materialPreset`, fill/gradient, effects) |

## Acceptance

Post-insert Gold → Glass must preserve Shape + wording. Shape Pill → Ribbon must preserve Glass. Save/reload + Preview must match Edit.
