# Studio Groups and Nested Responsive Containers — implementation proof

## Outcome

The canonical Card composition now distinguishes two durable concepts:

- **Group** — a surface-free transform/layout relationship between compatible sibling Modules. It persists responsive geometry, anchor, local z-order, layout, density, gaps, scale mode, and lock state while children retain their identities.
- **Container** — an authored parent region with optional Surface, responsive sizing, padding/gap/alignment, explicit overflow, and vertical Flow, horizontal Flow, grid, or Layered content.

Containers may contain Modules, Groups, and Containers to a governed maximum of three Container levels below Card Surface. Layered parents retain direct move/resize and overlap; Flow parents retain structured order.

## 390px deterministic composition

The proof Card uses the approved Worn Saddle Leather Surface and existing Love & Theft production components without changing their masters, treatments, or assets.

Hierarchy:

```text
Card Surface · Layered · Full Bleed
  Hero Container · transparent · horizontal
    Left Container · 35%
      Artist image
      Love & Theft heading
    Right Container · 65%/66% · layered
      Compact action Group · 2 columns × 3 rows
        Spotify / Watch / Tour / Tickets / Merch / Contact
  Overlapping image
  Overlapping heading
  Twin Rail
```

Measured result:

| Measurement | Initial | Compact / phone-resolved |
|---|---:|---:|
| Right parent | — | 212.70 × 310px |
| Group x / y | 1% / 2% | 20% / 2% |
| Group width | 97% | 78% / 165.91px |
| Group height | 56% | 45.03% / 139.59px |
| Local z-order | 2 | 2 |
| Row / column gap | 4px / 6px | 4px / 6px |
| Child size | — | 80.38 × 48px each |

The compact group consumes about 20% less parent width and 20% less parent height than its initial authored bounds while every resolved action remains above the 44px interaction minimum.

## Evidence

- [Preview at 390px](proofs/studio-layered-composition/12-nested-regions-preview-390.png)
- [Compact Group at left in Edit](proofs/studio-layered-composition/13-nested-group-compact-left-390.png)
- [Same Group moved right in Edit](proofs/studio-layered-composition/14-nested-group-compact-right-390.png)
- [Measured responsive geometry](proofs/studio-layered-composition/nested-responsive-geometry-proof.json)
- [Independent actions](proofs/studio-layered-composition/05-group-a-independent.png)
- [Grouped actions](proofs/studio-layered-composition/06-group-b-grouped.png)
- [Dense and resized Group](proofs/studio-layered-composition/07-group-c-resized-dense.png)
- [Group moved as one object](proofs/studio-layered-composition/08-group-d-moved.png)
- [Saved and reloaded Group](proofs/studio-layered-composition/09-group-e-saved-reloaded.png)
- [Phone authoring handles](proofs/studio-layered-composition/10-phone-group-authoring.png)

The acceptance journey restores the pre-test local draft in `finally`; proof generation does not leave fixture content behind.

## Verification

- TypeScript: `npx tsc --noEmit`
- Unit/contract suite: `npm test` — 1,422 passed
- Layered composition journey: 2 passed in Chromium
- Targeted ESLint: 0 errors (two existing `no-img-element` warnings in the shared renderer)
- Save/reload exact equality for Group records and node parent-relative geometry
- Preview and Live Device parity through the shared `CreativeCompositionCanvas` renderer
