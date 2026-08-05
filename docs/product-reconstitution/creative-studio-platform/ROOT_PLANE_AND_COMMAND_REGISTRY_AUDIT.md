# Root Plane and Command Registry Audit

Status: implemented architectural candidate; human verification required.

## Root authority

`rootComposition` is the only write target for new free Elements and populated premium presets. `config.sections` remains a read adapter for drafts authored before this convergence. `insertRootContainerPreset` creates one generic `frame` with `componentKind: container`, then writes each preset child as an independent root node sharing a durable group/container identity. The insertion is one history transaction, selects the Container, cascades repeated insertions, and extends the root only when required.

The root height authority is `rootComposition.pageHeightPx` (240–2400px). The page-edge handle updates a local preview continuously, snaps at 8px unless Alt is held, commits once at pointer release, cancels on Escape/pointer cancellation, supports keyboard increments and exact entry, and keeps click `+240px` as secondary behavior. Drawers, pasteboard, utility content, and legacy sections do not participate in the calculation.

## Route audit

| Visible route | Previous panel/mutation | Target | Final registration | Final drawer | Disposition/test |
|---|---|---|---|---|---|
| Root Background | library-only root mutation | Card root | `background.open` | Background | converged; root editor |
| Root Page size | Advanced-only | Card root | `pageSize.open` | Page size | registered; page drag/unit |
| Text Font | local toolbar state | Text target | `font.open` | Typography/Font | registered; server catalog |
| Text Appearance | mixed glyph/effects | Text target | `appearance.open` | target Appearance | generic fallback removed |
| Image Replace/Crop/Adjust | three local routes | Image/Logo | `media.*` | Media subsections | registered |
| Icon picker/fill/stroke | generic Effects | Icon | `icon.open`, `fill.open`, `stroke.open` | Icon/Appearance | repaired |
| Divider style/thickness/color | generic Effects | Divider | `divider.*`, `color.open` | Divider Appearance | repaired |
| Button contents/appearance/action | button-only local panels | Button parent | `component.editChildren`, `appearance.open`, `action.open` | shared sections | registered |
| Coupon/Ticket contents/resize/setup | generic Effects | component parent | component/resize/setup commands | exact sections | repaired |
| Map Setup | absent | Map parent | `map.setup` | Setup | repaired |
| Form fields/layout/behavior | generic Effects | Form parent | `form.editFields`, layout/behavior | exact sections | repaired |
| Gallery media/layout | generic Effects | Gallery parent | `gallery.edit`, `layout.open` | exact sections | repaired |
| Container layout/size/responsive | legacy Section toolbar | root Container | layout/size/responsive commands | exact sections | new root path |
| More operations | duplicated popovers | selected target | `more.open` | More | common target-aware menu |

All registered commands live in `editor-command-registry.ts`. Unknown commands throw; target-incompatible commands throw; unsupported commands are not emitted by the capability definition. There is intentionally no `effects.generic` registration.

## Legacy adapter

`createSectionPreset` and existing section rendering are retained for old drafts and migration review. New premium preset insertion no longer calls it. Existing section controls remain accessible when a legacy Section itself is selected, but no new premium preset is appended to that stream.
