# Duplicate Authority Audit (Phase B)

Baseline: `854996fbe549722d39d751d9bea6bb5ffd782a49`  
Companion: `EDITOR_BEHAVIORAL_PARITY_MATRIX.md`

| Implementation | Classification | Disposition |
| --- | --- | --- |
| `material-engine.ts` MATERIAL_CATALOG / EFFECT_RECIPES | CANONICAL | Retained |
| `effect-render.ts` effectLayersCss / dimensionalSurfaceCss | CANONICAL | Wired into Button/Badge/Icon/text-box/curve |
| `gradient.ts` + GradientStudio | CANONICAL | Retained |
| `border.ts` | CANONICAL | Retained |
| `color-palettes.ts` | CANONICAL | Retained; display coerce via `toColorInputValue` |
| `appearance-ia.ts` | CANONICAL | Live Appearance taxonomy |
| `group-authority.ts` fanOutWithAdapter | CANONICAL | Per-descendant adapters |
| `icon-asset.ts` / Iconify API | CANONICAL | Studio nested consumers |
| `deep-left-editor.ts` | CANONICAL | Single drawer ownership |
| `editor-command-registry.ts` | CANONICAL | Completeness vs capability toolbarCommands |
| Button Surface `gradientStart/End` quick fields | VALID ADAPTER | Fast surface path; Appearance → GradientStudio remains authority |
| Coupon insert gradient defaults | VALID ADAPTER | Insertion seed only; Appearance mutates via shared Gradient |
| `components/design/icon-picker.tsx` | VALID ADAPTER | BrandKit/campaign — not Studio nested Icon consumer |
| `card-creative-system.ts` MATERIAL_PRESETS / applyGlyphEffect | LEGACY | Still imported for Button label quick presets; migrate remaining call sites |
| `appearance.ts` APPEARANCE_GROUPS | LEGACY | Not live UI; tests only |
| Badge Appearance → Shape alias | REMOVED | Appearance opens shared IA; Shape remains Shape |
| Button Material label for Appearance IA | REMOVED | Renamed to Appearance |
| Coupon `component-content-routing` + `coupon-content-editor` dual mount | REMOVED | Coupon/ticket use dedicated content editor only |
| Primary-node fan-out clone | REMOVED | Replaced by `fanOutWithAdapter` |
| Toolbar remount on `selectionGeneration` | REMOVED | Key uses tool/adapt mode only |
| Deep-left 32ms poll ownership | REMOVED (prior) | MutationObserver / one-shot open retained |

## Remaining LEGACY (honest)

1. Divider Appearance private form — works; migrate to Appearance IA follow-up.
2. `applyGlyphEffect` on Button label effects strip — decorative bridge; Appearance IA is preferred.
3. Panel stacks in shell drawer — parallel host; contextual toolbar + deep-left is the live path.
