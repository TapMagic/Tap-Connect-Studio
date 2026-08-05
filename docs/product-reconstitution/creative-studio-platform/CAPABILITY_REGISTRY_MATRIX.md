# Capability Registry Matrix

`OBJECT_CAPABILITY_REGISTRY` is executable product policy, not a loose feature flag set.

| Family | Fast toolbar | Full editor authority | Child selection | Resize |
|---|---|---|---|---|
| Card root | Background, Page size, Guides, Appearance, More | root fill and geometry | no | page height, fit |
| Text | content, typography, color, action, motion, position | shared Text/Appearance | parent or child | free |
| Image/Logo/Video | replace, crop/fit, adjust, appearance | shared Media/frame | no | free |
| Icon | icon, fill, stroke, appearance | native/Iconify + Icon Appearance | parent or child | free/ratio |
| Shape | appearance, action, motion, position | Surface | no | free |
| Divider | style, thickness, color, appearance | Divider Appearance | no | free |
| Badge | wording, shape, appearance | one Badge catalog + Text child | yes | free |
| Button | contents, appearance, action, motion | Surface/states + canonical children | yes | free |
| Coupon/Ticket | contents, appearance, resize, setup | component parent + canonical children | yes | reflow/scale/frame/fit |
| Map | Setup, appearance, action, position | saved/custom location and presentation | no | free |
| Gallery | media, layout, appearance, position | gallery frame and media ordering | yes | reflow/frame/fit |
| Form | fields, layout, appearance, behavior | fields/states/draft readiness | yes | reflow |
| Container | layout, size, appearance, responsive, order | root-positioned generic Container | yes | free/reflow/fit |
| Group | position, action, motion | common transform/action/motion | yes | free |
| QR | setup, appearance, action | governed QR draft configuration | no | free |
| Utility | setup, visibility | governed utility state | no | none |

The registry also declares target levels, appearance sections, content editor type, action/motion support, reset groups, and resize policies. `objectFamilyForNode` is the only node-to-family resolver used by the editor.
