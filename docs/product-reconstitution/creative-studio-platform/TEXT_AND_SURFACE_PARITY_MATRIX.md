# Text and Surface Parity Matrix

Status: repair candidate — human verification required.

## Naming

Owner-facing **Text Surface** → **Text Box**.

- **Text**: glyph content and typography / glyph effects
- **Text Box**: backing fill, gradient, border, corners, padding, shadow, glow, opacity

## Shared Text engine targets

Root Text, Button label, Button description, Badge wording, Coupon/Ticket Text children, Form labels, Map captions, Gallery captions.

Google Fonts remain native and shared. No private Button/Badge font systems.

## Text controls

content, font family/variant/weight/size, line/letter/word spacing, alignment, wrapping, capitalization, color, glyph gradient, outline, shadow, glow, opacity, metallic, neon, bevel, emboss, deboss, extrusion/depth, layered shadow, inner shadow, texture, glossy highlight, 3D offset, Reset Text Appearance, Clear formatting.

## Text Box controls

none/transparent, fill, gradient, border (+ width/style), corners, padding, shadow, glow, opacity, Reset Text Box.

Reset Text must not clear Text Box. Reset Text Box must not clear Text glyphs.

## Surface Appearance (canonical)

Targets: Card root Background/Surface, Container, Button, Badge, Coupon, Ticket, Form, Gallery frame, Map frame, Image frame, Icon backing Surface.

Controls: transparent, solid, linear/radial/conic gradient, media, pattern, texture, material, opacity, border (+ style/width), individual corners, shadow, inner shadow, glow, shine, bevel, emboss/deboss, depth, glossy, metallic, overlay, Reset Appearance / preset / Brand.

Only relevant sections appear per capability registry. No generic Text-effect preview on non-Text targets. Metallic applies to compatible Surfaces as well as Text.

## Button / Badge separation

| Mode | Appearance opens |
| --- | --- |
| Button parent | Button Surface |
| Button › Label | Text editor |
| Badge parent | Badge Surface |
| Badge › Wording | Text editor |

Changing Button Surface must not mutate label styling unless a complete Button style preset explicitly includes both and previews that change.

## Background opacity

Applies only to root fill / gradient / background media / pattern / texture / selected overlay. Must not fade foreground Text, Images, Buttons, Badges, Containers, or Utility Layer.

## Gradients

Shared model: solid adapter + linear + radial + conic; multi-stop; per-stop opacity; 0–360°; visual direction; radial center/size; conic center/start; reverse/rotate/mirror/Reset; curated collections (popular, Brand, subtle, bold, luxury, editorial, neon, metallic-inspired, warm retail, cool professional, dark, light, seasonal, recent, favorites, saved).

## End-to-end proof properties

fill, stroke, stroke width, radius, opacity, gradient, shadow, glow, bevel, Text font/color, Button Surface/label, Badge wording, Icon choice/fill/stroke, Background opacity, Container resize policy — each through UI → command → SelectionRef → mutation → editor → Preview → persist → reload.
