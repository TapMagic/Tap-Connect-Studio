# Top Shelf Enhanced Package → Studio Authority Mapping

Package: Top Shelf Enhanced Component Package v1.0  
Canonical recipe: `recipe/enhanced/top-shelf-premium-action/v1`  
Curated family (candidate): `family_top_shelf_premium_action`  
Lifecycle: `certified` · Expression tier: `enhanced`

## Specimen frame confirmation

The faint rounded rectangular frame visible in early review PNGs came from
`CreativeCompositionCanvas` evidence chrome (`rounded-xl border border-white/10`).
It is **not** part of the Top Shelf product hull, canonical recipe, or package CSS.
Product layers are: Ambient Halo · Metallic/Glass Chassis · Upper Reflection · Icon Ring · Typography · optional Action Cue.
Isolate evidence screenshots target `[data-vp-topshelf=true]` only.

## Component ID mapping

| Package source | Stable Studio component ID | Existing authority | Notes |
|---|---|---|---|
| ButtonBase (metallic/glass face) | `surface/top-shelf-metallic-glass/v1` | Finish + Body (`body_capsule`) | Multi-stop face + inset depth via package CSS; Finish channel owns Anchor Color |
| OuterGlowRing | `effect/ambient-halo/v1` | Effects / underlight-adjacent Visual Part | Halo intensity parameter; not omnidirectional Outline |
| GlossOverlay | `effect/upper-gloss-reflection/v1` | Material highlight / Effects | Top-half reflection layer preserved |
| IconRing | `housing/simple-glass-icon-ring/v1` | Icon Station geometry (round) | Glass ring housing; placement Left/Right via Icon Station position |
| PremiumActionButton copy stack | `typography/two-level-action-copy/v1` | Text authority | Label + description; content owned by Host |
| tactile hover/press CSS | `interaction/tactile-press/v1` | `interaction_tactile` | Mapped; reduced-motion preserved from package CSS |
| TopShelfButton / CircularRingButton | — | out of slice | Not registered in this vertical slice |

## Recipe assembly

`recipe/enhanced/top-shelf-premium-action/v1` composes:

- `surface/top-shelf-metallic-glass/v1`
- `effect/ambient-halo/v1`
- `effect/upper-gloss-reflection/v1`
- `housing/simple-glass-icon-ring/v1`
- `typography/two-level-action-copy/v1`
- `interaction/tactile-press/v1` → `interaction_tactile`

## Drawer filing

Curated → Enhanced → Top Shelf Premium Action (`vp-part-family_top_shelf_premium_action`)

Contextual handles reuse existing drawers:

- Surface / Material → Finish + Color
- Lighting / Effects → halo controls (in Curated contextual panel)
- Icon Housing → Icon / Image + ring placement
- Typography → Text passthrough
- Interaction → Motion / `interaction_tactile`

## Content independence

Apply / parameter / reset touch appearance only. Never rewrite label, description, icon identity, actionType, href, phone, campaign binds, tracking, or a11y fields.
