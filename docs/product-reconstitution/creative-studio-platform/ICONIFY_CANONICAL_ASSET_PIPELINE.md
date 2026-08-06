# Iconify Canonical Asset Pipeline

Status: assembly candidate — human verification required.  
Starting SHA: `7f0f16aedf93bdea7020f28edcee47260b694f8b`

## Pipeline

```
Iconify API response
  → whitelist collection
  → fetch SVG body
  → sanitize SVG
  → normalize viewBox
  → detect fill/stroke/multicolor mode
  → create IconAsset
  → render SVG tile (library / replace drawer)
  → insert or replace Icon content
  → render identical SVG on Card
  → persist source metadata
```

## IconAsset

| Field | Required |
| --- | --- |
| `provider` | yes (`iconify` \| `native`) |
| `collection` | yes |
| `iconName` | yes |
| `canonicalId` | yes (`collection:name`) |
| `body` | yes (sanitized SVG inner / markup) |
| `viewBox` | yes |
| `width` / `height` | yes |
| `renderMode` | yes (`fill` \| `stroke` \| `multicolor`) |
| `license` | when known |
| `source` | yes |
| `fetchedAt` | yes |

## Forbidden

- Diamond / star / provisional glyph as Iconify result preview
- Labeling built-in fallbacks as Iconify results
- Canvas re-fetch that ignores stored SVG body when body is present
- Unsanitized script/event attributes in SVG

## Replace law

Changing Icon keeps: element id, parent, x/y, width/height, rotation, Action, Motion, accessibility, tracking, backing Surface.

## Anchors

- `lib/fusion/creative-studio/icon-asset.ts`
- `lib/fusion/creative-studio/providers/iconify.ts`
- `app/api/creative/icons/route.ts`
- `components/fusion/card/card-creative-tool-rail.tsx`
- `components/fusion/creative-studio/creative-composition-canvas.tsx`
