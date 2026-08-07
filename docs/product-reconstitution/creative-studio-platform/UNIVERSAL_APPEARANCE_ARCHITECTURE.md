# Universal Appearance Architecture

Status: assembly candidate — human verification required.  
Starting SHA: `74cbf35605ab419495f582376f8a1058b835f712`

## Central law

| Layer | Determines |
| --- | --- |
| Object | What it is (Badge, Button, Text, Icon, Container…) |
| Shape / structure | Geometry and layout |
| Appearance | How it looks |

Gold / Glass / Chrome / Neon / Raised are **Appearance recipes**, never object species.

## Appearance tree

```
APPEARANCE
├── Color
├── Gradient
├── Material
├── Border
├── Effects
├── Opacity
└── Advanced
```

Targets expose only valid capabilities. One canonical catalog; adapters specialize per target.

## Targets

| Group | Targets |
| --- | --- |
| Card / Page | Card Background |
| Surfaces | Container, Button, Badge, Coupon, Ticket, Form, Text Box, Map/Gallery/Image frames, Icon Backing |
| Text glyphs | Root Text, Button Label/Description, Badge Wording, Coupon/Ticket/Form text children |
| Icon artwork | Bare Icon, nested Button/Badge Icons |

Same recipe id may render differently per target (GOLD+SURFACE vs GOLD+TEXT vs GOLD+ICON).

## UX law

Quick beautiful defaults (tiles) first → Advanced numeric tuning second.  
Never require 12 engineering sliders before something looks good.

## Identity preservation

Changing Material / Appearance must not alter: Element ID, object type, Shape, wording, font, icon, image, Action, Motion, Tracking, Accessibility, parent, x/y, width/height, rotation.

## Anchors

- `lib/fusion/creative-studio/material-engine.ts` — MaterialRecipe + adapters
- `lib/fusion/creative-studio/appearance.ts` — reset / groups
- `lib/fusion/creative-studio/gradient.ts` — GradientStudio model
- `lib/fusion/creative-studio/border.ts` — Border None
- `components/fusion/card/card-contextual-object-toolbar.tsx` — toolbar + deep-left panels
- `components/fusion/creative-studio/creative-composition-canvas.tsx` — Edit/Preview render parity
