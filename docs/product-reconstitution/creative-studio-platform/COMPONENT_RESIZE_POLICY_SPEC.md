# Component Resize Policy Spec

Status: repair candidate — human verification required.

## Container vs Group

| | Container | Group |
| --- | --- | --- |
| Purpose | Layout, Surface, padding, responsive, bounded presentation | Collective move / proportional scale / rotate |
| Layout | free / stack / row / grid | none |
| Padding / Surface | yes | no automatic Surface |
| Selection | parent / content modes | group expand for true Groups only |
| Ungroup | remove Container keep children | Ungroup restores peers |

## Policies

Default for populated Containers: **Reflow contents**.

| Policy | Frame | Children | Text sizes | Notes |
| --- | --- | --- | --- | --- |
| `reflow` | changes | positions/sizes recalculate from layout constraints | stable | Default; children do not enlarge merely because parent enlarges |
| `frame` | changes | geometry unchanged | stable | Overflow warnings when needed |
| `scale` | changes | proportional scale | scale with declared text scale behavior | Only policy that intentionally enlarges all children |
| `fit-content` | adjusts to child bounds + padding | unchanged | stable | One Undo with policy change |

Policy lives on `node.props.resizePolicy`. Changing policy is one Undo transaction. Active policy is visible under Size.

Coupon / Ticket / Gallery use the same vocabulary where registered in the capability registry.

## Preset insertion requirements

Every populated Container preset must insert with:

- declared layout mode and resize policy
- no overlapping visible children (bounding-box assertion)
- no clipped Text / unintended overflow / children outside parent
- readable contrast, useful spacing, correct layer order
- parent and child selection complete
- clean Preview

Presets audited: Premium Identity, Hero, Offer, Location, Contact, Social Proof, Product, Event, Gallery Presentation, Blank.

## Automated proof

- Unit: `applyContainerResize` for all four policies
- Unit: preset layout overlap geometry
- Playwright: Reflow vs Scale visual size checks; Fit content; Frame-only
