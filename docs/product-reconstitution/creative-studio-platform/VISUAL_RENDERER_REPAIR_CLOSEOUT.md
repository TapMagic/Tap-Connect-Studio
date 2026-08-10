# Visual Renderer Repair Closeout

**Operation:** Evict Enrique  
**Status:** Candidate ready for Product Steward engine review  
**Scope:** Shared customer-facing visual renderer consolidation — not flagship Card art direction.

## Material-response ownership

| Concern | Authority |
| --- | --- |
| What part / where / role / requested finish | Visual Parts (registry + sockets) |
| How material responds to light, depth, edge, surface | Material surface resolve + `MaterialSurfaceLayers` |
| Relational staging between layers | Depth (`composeDepthShadow` / `depthDescriptor`) |
| Decorative Host glow/shadow presets | Effects (`effectLayersCss`) |

Finish interprets Host color + refinement into **Material response channels** (`gradientFill`, `highlight`, `shine`, border, CSS vars). It does **not** own a competing final paint path that bypasses Material.

## Finish → Material

`applyFinishToSurface` → optional Material bridge for texture infrastructure → writes Material channels → `resolveMaterialSurfaceFromProps` → `MaterialSurfaceLayers`.

`surfaceShadowCss` preserves authored CSS depth/finish shadows (string `boxShadow`) instead of collapsing them via `Number(...)`.

## Geometry-aware response

Finish derivation accepts `rect | pill | circle | angular` and varies fill/highlight profiles. Not a second Material engine.

## Depth

- Levels 0–5 retained (Page → Surface → Mount → Core → Icon Station → Accent).
- Intensity is continuous: cast/contact/inset/rim alphas and offsets scale.
- Consumers: Surface tones, Mount descriptor, Icon Station shell, Finish core action shadow.
- Mount payload cast shadows no longer freeze intensity; relational Depth owns cast/contact; optional inset decoration may remain.

## Effects vs Depth vs Material

- **Depth** — spatial relationship between composition layers.
- **Effects** — explicit decorative Host effect presets.
- **Material** — surface fill + local highlight/shine/texture response.

## Surface Intensity / Depth

`applySurfaceParameters` re-derives treatment-specific fills/borders/shadows for Container/Hero Surface. Page Background keys are never rewritten.

## Canonical Rim / Copper

- `resolveRimDescriptor` + `poundedCopperRimBackground` + `rimEdgeBoxShadow`.
- Consumers: Action shell, Icon Station rim, Bottom Stop themed bar, rim outer style helper.
- Local `poundedCopperLike()` removed.

## Mount / Icon Station / Bottom Stop

- Mount: structural plate + shared Depth shadow.
- Icon Station: geometry/backing/rim separation preserved; rim via canonical Rim authority; Depth L4.
- Bottom Stop: `BottomStopBar` mounted in shared Edit/Preview/Public canvas path; themed fill via `themedBottomStopBackground`.

## Hero flow

`HeroFlowShapeLayer` renders `arc` and `geometric_band` (plus swoosh/organic_wave variants) from persisted `heroFlowShape` — no second Hero engine.

## Interaction / Motion

- Quiet / Tactile / Mechanical exposed in Motion drawer; pointer-driven CSS (not perpetual motion presets).
- Mechanical clears dead `press_inset` / perpetual motion wiring.
- Motion Intensity CSS var feeds interaction amplitude and Electric Divider travel strength.
- Reduced motion / simulation: Electric static fallback; interaction transitions suppressed.

## Electric Divider

Restrained travel glow + flicker; reduced-motion static treatment; compact footprint.

## Intentionally deferred

- Flagship Card art direction / Pounded Copper final aesthetic
- New visual families
- Cabinet fill / proof composition polish
- WebGL / PBR engine
- Physical iPhone verification
- Product Owner visual acceptance of compositions

## Removed Enrique wiring

- Ceremonial Depth intensity (constant stack)
- Ceremonial Surface Intensity/Depth (state-only)
- Finish overwrite without Material channel handoff
- Unmounted Bottom Stop
- Persist-only Hero flow
- Dead Mechanical perpetual-motion preset path
- Local Bottom Stop Copper imitation (`poundedCopperLike`)

## Certification evidence

`tmp/visual-renderer-repair-evidence/` (lab ladders + metrics).

### Product / Jig freeze + dual-green

| Item | Value |
| --- | --- |
| Product SHA | `bc8295611d3c7294508dac11b96d11fa17f7b42c` |
| Jig SHA | `bc8295611d3c7294508dac11b96d11fa17f7b42c` |
| Green #1 | port **3130**, pid 52183, 7 passed, retries 0 |
| Green #2 | port **3131**, pid 52179, 7 passed, retries 0 |
| Suites | Visual Renderer Repair · Visual Grammar Outcome Truth · Cabinet Integrity · Practical Authoring |

No Product/Jig changes between Greens.
