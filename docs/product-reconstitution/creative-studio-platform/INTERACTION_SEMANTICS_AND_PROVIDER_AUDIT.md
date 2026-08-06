# Interaction Semantics and Provider Audit

Status: repair candidate — human verification required.  
Starting SHA: `92da0d630a1ec9cc24e405fe3933c28aa49ae32f`  
Branch: `tapconnect-operational-spine-restoration`

## Product decision

Do not block Studio completion on a massive original catalog. Wire the editor correctly, complete native Google Fonts and Iconify, deliver a modest structurally varied starter catalog, preserve versioned presets, and add larger design packs later.

## Authoritative human defects

| Defect | Intended | Repair focus |
| --- | --- | --- |
| Page height resize reflows Components | Page geometry only | Isolate `pageHeightPx` from object bounds |
| Preset children overlap | Finished non-overlapping insert | Preserve prior layout validation; assert bounding boxes |
| Background and Appearance same editor | Distinct root Background vs target Appearance | Exact command → drawer section |
| Icon places Sparkles immediately | Icon tool opens library; Quick Add may place Sparkles | Split tool actions |
| Iconify not visible | Searchable results in drawer | Server adapter + visible results UI |
| Icon Choice/Fill/Appearance same panel | Distinct sections | Focused routing already partially wired; finish |
| Transparent missing | Optional None/Transparent fills | All compatible Surface editors |
| Shadow/glow/radius/opacity not visible | Rendered Edit + Preview + persist | Free-layout renderer + style props |
| Map Setup/Action same panel | Setup vs Directions Action | Distinct focuses |
| Test Action inert | Visible feedback | Notify / toast / test panel |
| Map disappears in Preview | Map or location-card fallback | Preview renderer |
| Divider Style/Thickness/Appearance same | Distinct groups | Focused Divider sections |
| Badge Appearance twice | One parent Appearance | Deduplicate toolbar |
| Drawers require hunting for X | Outside click, Escape, selection/tool/Preview change | Contextual dismissal |
| Position incomplete | Align/distribute/spacing/nudge/layer | Complete Position panel |
| Google Fonts empty search | Visible results + previews | Server key adapter + UI |
| Text combinations color-only | Structural variety | Starter library |
| Coupons/Tickets same layout | Structurally distinct presets | Starter Coupon/Ticket packs |
| Patterns shallow | Rendered patterns | Background pattern path |
| State-only property changes | End-to-end render proof | Renderer + persistence tests |

## Command routing contract

| Command | Exact target section |
| --- | --- |
| Background | Card root background fill/media/opacity |
| Appearance | Selected target Appearance only |
| Icon | Choose/replace icon |
| Fill | Icon fill |
| Stroke | Icon stroke + width |
| Icon Appearance | Backing Surface/frame |
| Map Setup | Location/presentation |
| Map Action | Directions behavior |
| Divider Style / Thickness / Color / Appearance | Distinct Divider groups |
| Button Appearance | Button parent Surface |
| Button Label Appearance | Text child |
| Badge Appearance | Badge parent only |
| Badge Wording | Text child |

No silent fallback to an unrelated panel. Stale SelectionRef rejects mutation.

## Provider contracts

- Google Fonts: server-side `GOOGLE_FONTS_API_KEY`; never exposed to browser; searchable results, previews, recent/Brand/favorites/document categories.
- Iconify: no browser key; approved Lucide/Tabler/Phosphor/Remix/Material Symbols; metadata stored; stroke/fill/duotone/multicolor detection.

## Disposition

See companion specs: `STARTER_CREATIVE_LIBRARY_SPEC.md`, `LIVE_DEVICE_PREVIEW_SECURITY_AND_FLOW.md`, `PRESET_PACK_ROADMAP.md`. Automated tests and browser evidence record final disposition per control.
