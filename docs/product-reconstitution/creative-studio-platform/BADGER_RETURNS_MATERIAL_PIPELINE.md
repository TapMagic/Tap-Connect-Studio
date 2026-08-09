# Badger Returns — Material Pipeline + Product Steward Constitution

**Status:** Engineering + Practical dual-green candidate (see closeout SHA table).  
**Human Verification:** Required. Do not treat automated green as Product Owner acceptance.

## Starting SHA

`4b8efc06c4052207c1c219ee722ba05ba1c16d7d`

## Material pipeline root cause

`applyRecipeFill` stored the full recipe gradient in `gradientFill` **and** extracted only the first two color stops into `gradientStart` / `gradientEnd`. Button rendering rebuilt gradients from `gradientStart`/`gradientEnd` only, discarding multi-stop structure. Highlight layers were ignored on Buttons; `shine` used a generic overlay. `materialPreviewCss` showed the full recipe gradient → **preview better than applied**.

## Canonical architecture

| Piece | Role |
| --- | --- |
| `lib/fusion/creative-studio/material-surface.ts` | Canonical `MaterialSurfaceDescriptor` + `resolveMaterialSurfaceFromProps` / `FromRecipe` |
| `components/.../material-surface-layers.tsx` | Shared highlight + shine overlays for tiles and targets |
| Button / Badge / shape consumers | Consume the descriptor; adapters only for geometry |
| Toolbar Material swatches | `MaterialSurfaceSwatch` — same fill authority + layers |

`gradientFill` is the multi-stop fill authority. `gradientStart`/`gradientEnd` are editor mirrors only.

## Catalog overload

See `MATERIAL_CATALOG_OVERLOAD_RECOMMENDATIONS.md` (report only; no deletions).

## Product Steward doctrine

- Entry: `AGENTS.md`
- Durable laws: `PRODUCT_STEWARD_CONSTITUTION.md`

## Live Device honesty

`reachableForPhone` = phone-attempt candidate (non-loopback).  
`candidateKind`: invalid | locally_unreachable | lan_candidate | configured_public_candidate.  
`physicallyVerified` is always false at URL resolution. No remote tunnel probing.
