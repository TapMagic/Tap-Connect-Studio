# Badge and Button Appearance Target Matrix

Status: assembly candidate — human verification required.  
Starting SHA: `7f0f16aedf93bdea7020f28edcee47260b694f8b`

## Badge structure

```
Badge parent
├── Shape
├── Surface / Material
├── Wording Text
└── optional Icon
```

These four parts are independent. Metallic is a Material, not a Badge species.

Example: `shape=seal`, `material=gold`, `wording=VIP`, `icon=crown` → change shape to ribbon, material to glass; wording and icon remain.

### Badge toolbars

| Target | Commands |
| --- | --- |
| Parent | Shape · Material · Appearance · Action · Animate · Position · More |
| Wording | Font · Size · Color · Effects · Animate · Position · More |
| Icon | Change Icon · Fill · Stroke · Appearance · Animate · Position · More |

Material opens visual recipes. Appearance opens manual detail. They are not aliases.

## Button structure

```
Button parent
├── Surface / Material
├── Label Text
├── optional Description Text
├── optional Icon
└── Action
```

| Target | Editor |
| --- | --- |
| Parent Surface | Shared Material engine |
| Label | Shared Text editor |
| Icon | Shared Icon editor (No Icon / Add / Change / Remove) |
| Action | Independent of appearance |

Parent Appearance must not retarget label color. Label color must not retarget Surface.

## Post-insertion edit law

After insert, Owner can in any order: change Shape, Material, fill, gradient, border, wording, font, text material, add/change/remove Icon.

## Command matrix

| Object | Level | Toolbar | Deep route | Mutation | Edit | Preview | Persist | Test | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Badge | parent | Shape | badge/shape | `badgeShape` | clip/radius | same | props | unit | repair |
| Badge | parent | Material | material/* | `applySurfaceMaterial` | fill/shadow | same | props | unit | repair |
| Badge | wording | Color | color/* | wording color | glyphs | same | props | unit | repair |
| Badge | icon | Change Icon | icon/change-icon | IconAsset replace | SVG | same | props | unit | repair |
| Button | parent | Surface / Material | material/* | surface recipe | button CSS | same | props | unit | repair |
| Button | label | Font / Color | color / font | label props only | label | same | props | unit | repair |
| Button | icon | Add/Change/Remove | icon/* | icon props | icon | same | props | unit | repair |

## Anchors

- `lib/fusion/creative-studio/material-engine.ts`
- `lib/fusion/creative-studio/button-composition.ts`
- `components/fusion/card/card-creative-tool-rail.tsx`
- `components/fusion/card/card-contextual-object-toolbar.tsx`
