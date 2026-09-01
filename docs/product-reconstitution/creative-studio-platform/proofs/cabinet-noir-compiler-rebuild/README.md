# Cabinet Noir compiler rebuild proof

This package records the rendered acceptance evidence for the Cabinet Noir
Curated System compiler correction. CN-006 through CN-009 are visual reference
authority only; every runtime image in the corrected assembly still comes from
the certified modular source registry.

## Root cause

The compiler treated `contentEnd`—the start of the next logical action
cadence—as the place where terminal furniture should begin. CN-040 and CN-045
are designed to *close around the final projected unit*, so placing them at the
next cadence created a full empty bay between the last live row and its bottom
closure. The same mistake was compounded for odd Twin Rail output: the
non-action CN-010 transition was placed after the full transparent source
canvas, and CN-045 was placed after another full canvas.

The shared Curated assembly contract now distinguishes `termination-start`
from `content-end`. Even layouts attach terminal furniture at the start of the
last projected action unit. Odd layouts project their full-width action and
transition through an explicit recipe overlap, then close terminal furniture
around the transition unit. No family-specific CSS, renderer heuristic, or
source-asset edit is involved.

## Phone-density topper integration

Product Owner review established phone density as the final authority and
rejected a topper that merely touched the structural crown while the first
action still read as a separate object. Alpha-envelope measurement found 104
native pixels of non-functional air between the Single crown and first action
face, and 49–56 native pixels in Twin Rail. More importantly, the first Twin
action sat below the crown's large open chassis instead of participating in it.

The shared Curated geometry contract now provides a
`contentOriginOffsetPx`. It shifts the entire governed content run—actions,
repeat rails/spine, odd transition, and terminal closure—relative to fixed
topper/crown furniture. Cabinet Noir declares `-256px` for Single Stack and
`-450px` for Twin Rail. This produces controlled occlusion while preserving
identity content, action labels, sockets, deterministic reflow, and certified
source bytes. It is a recipe/compiler authority, not family-specific CSS.

At the 390px authority width:

| Density measurement | Before | Corrected | Result |
| --- | ---: | ---: | --- |
| Single crown material → first action face | 15.9px gap | 23.2px overlap | first row tucks beneath the bridge pendant and rails |
| Single 4-action assembly height | 574.3px | 535.2px | 39.1px non-functional height removed |
| Twin crown material → first action faces | 8.8–10.1px gap | 70.6–71.8px overlap | first paired row occupies the crown chassis rather than floating below it |
| Twin 4-action assembly height | 462.6px | 381.7px | 80.9px non-functional height removed |
| Twin 6-action assembly height | 509.2px | 428.4px | 80.8px non-functional height removed |

## Measured seams

Measurements use alpha > 32 material envelopes. Phone values use the actual
390 px composition scale (`0.1527116` for Single Stack and `0.1795580` for Twin
Rail). Negative gap means deliberate material overlap.

| Interface | Before native px | After native px | After at 390 px | Result |
| --- | ---: | ---: | ---: | --- |
| Single identity → crown socket | 1.0 | 1.0 | 0.15 | continuous within antialiasing envelope |
| Single bridge rail → repeat rail | 2.68 | 2.68 | 0.41 | continuous within phone tolerance |
| Single action 1 → 2 | 12 | 12 | 1.83 | compact visual face seam; structural rails continuous |
| Single action 2 → 3 | 0 | 0 | 0 | closed |
| Single action 3 → 4 | 12 | 12 | 1.83 | compact visual face seam; structural rails continuous |
| Single final action → CN-040 center closure | 440.61 | -39.39 | -6.02 | empty terminal bay removed |
| Twin identity → crown socket | 2.21 | 2.21 | 0.40 | continuous within phone tolerance |
| Twin crown rail → first repeat rail | 1.21 | 1.21 | 0.22 | continuous within phone tolerance |
| Twin left level 1 → 2 | 33 | 33 | 5.93 | compact face spacing; outer rail/spine continuous |
| Twin right level 1 → 2 | 13 | 13 | 2.33 | compact face spacing; outer rail/spine continuous |
| Twin final right action → CN-045 outer closure | 307.36 | 47.36 | 8.50 | terminal bay removed; curved rail visibly joins closure |
| Twin final left action → CN-045 outer closure | 320.36 | 60.36 | 10.84 | terminal bay removed; curved rail visibly joins closure |
| Odd full-width action → CN-010 transition | 252 | 8 | 1.44 | disconnected odd output closed |
| Odd CN-010 transition → CN-045 closure | 495 | -229.14 | -41.15 | cap now surrounds the transition instead of floating below it |

## Rendered evidence

- `before-single-4-full.png` and `before-single-4-bottom.png`: current baseline
  before terminal-anchor correction.
- `after-single-4-full.png`: corrected 4-action Single Stack at the 390 px
  specimen width.
- `after-single-4-crown-first.png`, `after-single-4-adjacent-rows.png`, and
  `after-single-4-bottom.png`: crown, row cadence, and terminal closeups.
- `before-twin-4-full.png` and `before-twin-6-full.png`: prior disconnected
  runtime evidence retained from the Slice 4 proof package.
- `after-twin-4-full.png` and `after-twin-6-full.png`: corrected even Twin Rail
  specimens at 390 px.
- `after-twin-4-crown-first.png`, `after-twin-4-bottom.png`,
  `after-twin-6-adjacent-rows.png`, and `after-twin-6-bottom.png`: attachment,
  repeat, spine, and termination closeups.
- `after-twin-5-odd-closure.png`: odd/even mutation proof showing the full-width
  fifth action, non-action finisher, and terminal furniture as one closed unit.
- `phone-density-single-4-full.png`: authoritative compressed Single Stack with
  the first action partially occluding the lower crown furniture.
- `phone-density-twin-4-full.png` and `phone-density-twin-6-full.png`:
  authoritative compressed Twin Rail proofs with the first paired row inside
  the crown chassis.
- `phone-density-twin-5-odd.png`: odd-action proof after the same shared content
  origin correction.

## Verification

- Full repository regression: 1,290 passed, 0 failed.
- 83 Signature/Cabinet Noir registry, resolver, authoring, adapter, contract,
  renderer, save/reload, publication, rollback, and entitlement tests pass.
- Resolver assertions now lock Single and Twin termination placement to the
  final projected unit and lock odd transition/cap placement to the projected
  odd cadence.
- Resolver assertions lock every action chassis and terminal component to the
  shared recipe content origin, preventing future topper/row drift.
- Registry hash verification confirms all 44 certified production PNGs still
  match their handoff bytes. `git diff` contains no certified source PNG.

## Source files changed by this correction

- `lib/fusion/creative-studio/signature-assets/layout-recipes.ts`
- `lib/fusion/creative-studio/signature-assets/assembly.ts`
- `lib/fusion/creative-studio/signature-assets/cabinet-noir.ts`
- `lib/fusion/creative-studio/__tests__/signature-assembly-resolver.test.ts`
