# Component Surface Parity Matrix

Shared Surface Appearance authority: Fill · Gradient · Material · Effects · Border · Opacity · Reset

| Family | Surface fill | Gradient target | Material | Effects | Resize Behavior |
| --- | --- | --- | --- | --- | --- |
| Button | `buttonSurfaceKind` + fill | Surface `gradientStart/End` | shared catalog | shared effects | n/a |
| Badge | fill / gradientFill | surface | shared | shared | n/a (Shape separate) |
| Container | fill / gradientFill | surface | shared | shared | **live** (reflow / frame / scale / fit-content) |
| Coupon | surface props | surface | shared | shared | **hidden** (contentComposition; not yet implemented) |
| Ticket | surface props | surface | shared | shared | **hidden** (same) |
| Text Box | boxFill / boxGradient | text-box only | n/a | box glow/shadow | n/a |
| Icon Backing | boxFill when enabled | backing only | backing materials | artwork effects separate | n/a |

## Controls removed/disabled because behavior unavailable

- Coupon / Ticket **Resize Behavior** toolbar command — policy persisted but canvas never applied `applyContainerResize` to contentComposition. Removed from registry + capabilities until implemented.
- Icon Stroke when `iconRenderMode` is `fill` or `multicolor` — control hidden with explicit unavailable note.
- Button textual **Surface** toolbar door — competed with Appearance; swatch + Appearance remain.
