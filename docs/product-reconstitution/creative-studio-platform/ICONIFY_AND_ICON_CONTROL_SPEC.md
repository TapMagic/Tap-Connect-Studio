# Iconify and Icon Control Spec

Status: repair candidate — human verification required.

## Placement default

Sparkles-first placement remains acceptable as the initial default Icon. The Icon drawer must then expose the full native browser.

## Native Icon drawer sections

1. Search icons  
2. TapConnect Recommended  
3. Recent  
4. Favorites  
5. Brand  
6. Actions  
7. Communication  
8. Maps  
9. Commerce  
10. Social  
11. Promotional  
12. Interface  
13. Approved Iconify collections  
14. Full Iconify search  

Approved prefixes: `lucide`, `tabler`, `ph`, `material-symbols`, `ri`.

## Replacement contract

Selecting an Iconify result replaces **only** Icon content while preserving object identity, position, size, rotation, Action, Motion, backing Surface, accessibility, and tracking.

## Distinct command routing

| Command | Focused section |
| --- | --- |
| `icon.open` / Change icon | Icon choice / Iconify browser |
| `fill.open` | Fill color (when fill-capable) |
| `stroke.open` | Stroke color and width (when stroke-capable) |
| `appearance.open` | Backing Surface, border, radius, shadow, glow, opacity |
| `action.open` | Action |
| `motion.open` | Motion |
| `transform.position` | Position |

Fill, Choice, and Appearance must **not** open the same generic drawer.

## Rendering mode detection

Detect: stroke | fill | duotone | multicolor. Show only valid controls for the active mode.

## Button nested Icon

In Button content mode: Add Icon, Remove Icon, Change Icon, Icon position/size/spacing/align, fill/stroke, Icon Motion — all via shared Icon editor.

## Badge nested Icon

Optional Icon on Badge uses the same Icon editor; wording uses shared Text.

## Proof

Iconify search + replacement; SVG-aware fill/stroke; radius/opacity/stroke visible in editor and Preview; distinct routing; reload persistence; desktop / tablet / 390px.
