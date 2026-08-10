# Visual Renderer Truth Audit — OPERATION ENRIQUE HUNT

**Date:** 2026-08-10  
**Branch tip at audit start:** `4abbf049ca017bd7f73e36354c1637b11caff948`  
**Product / Jig freeze under audit (unchanged):** `7b8190583852991b091182bf7bc00811c11fe4de`  
**Main (unchanged):** `7357fd9806d56d07d9ded68eef2beec5ea578052`  
**Evidence:** `tmp/visual-renderer-truth-audit/`  
**Mode:** Forensic only — production visual code not modified.

Classification legend:

| Code | Meaning |
| --- | --- |
| **A** | Production authority — shared, durable, expressive enough to keep |
| **B** | Thin authority — correct ownership; insufficient visual sophistication |
| **C** | Proof stub — concept/control exists; pixel behavior simplified/ceremonial |
| **D** | Duplicate / Enrique wiring — local imitation of another authority |
| **E** | Missing capability — desired expression cannot be produced by current primitives |

---

## A. Executive verdict

Outcome Truth proved **behavioral architecture** (rails, groups, reassembly, Brand Recipe persistence, Hero/Launch durability). It did **not** prove a premium visual engine.

The customer-facing renderer is a **hybrid**:

1. A real shared **Material** stack (`material-engine` → `MaterialSurfaceLayers`) that can paint fills, textures, highlight/shine layers.
2. A parallel **Visual Parts** shell system (rim / mount / icon station / surface tones / depth helpers) that often paints **fixed CSS recipes** beside or instead of Material.
3. Several Host-facing knobs that change **state/data-attrs** more than **pixels**.

**Bottom line:** the engine is **not** currently production-capable for the visual quality the Product names imply (Pounded Copper, Lacquer, Mechanical, Energy Field, relational Depth). It is **proof-capable** for contracts and layout. Improving art direction alone will not close the gap — shared render authorities must be strengthened and consolidated first.

---

## B. Authority map

```text
Page Background ── Visual Plane / CreativeFill (+ optional Material adapter)
                 │
Surface (VP) ──── local surfaceToneStyles gradients (intensity/depth mostly state)
                 │
Mount ─────────── MountShell (registry CSS bg/border/shadow)
                 │
Core Action ───── MaterialSurfaceLayers  ←── Finish deriveFinishSurface (overwrites fill)
                 │                        └── VisualPartsShell rim/accent overlays
Icon Station ──── IconStationShell (local backing/rim CSS; scale/anchor real)
Accent ────────── ornament SVG overlays
Depth ─────────── composeDepthShadow (fixed stacks; intensity ceremonial)
Divider ───────── stroke color + optional botanical endcap SVG
Bottom Stop ───── BottomStopBar EXISTS but is NOT mounted in canvas (attrs/state only)
Hero ──────────── structure/size state; flowShape persist-only
Motion ────────── MotionVisual CSS keyframes; VP Interaction modes thin/dead
Effects ───────── effect-render (separate, real for glyph/surface effects)
```

Source data: `tmp/visual-renderer-truth-audit/authority-map.json`

| Concern | Class | Primary files |
| --- | --- | --- |
| Page Background | **B** | `visual-plane.ts`, canvas page render, `material-engine` adapter |
| Visual Plane | **A** | `visual-plane.ts` |
| Material | **A** | `material-engine.ts`, `material-surface.ts`, `material-surface-layers.tsx` |
| Finish / Color | **B** | `finish-color.ts`, `apply.ts#applyFinishToSurface` |
| Surface / Stage | **C** | `apply.ts#surfaceToneStyles` |
| Depth | **E**/C | `depth.ts` |
| Mount | **B** | `render.ts`, `MountShell` |
| Rim / Edge | **D** | `ornaments.ts`, `resolveRimDescriptor`, shell hard-coded shadows |
| Icon Station | **B** | `IconStationShell` (+ real scale/anchor geometry) |
| Accent | **B** | `ornaments.ts` |
| Divider | **C** | apply stroke stamps + canvas border |
| Bottom Stop | **E** | `BottomStopBar` **unmounted** |
| Hero | **C** | structure/size real-ish; `flowShape` **E** |
| Interaction | **E** | Quiet/Tactile/Mechanical |
| Effects | **A**/B | `effect-render.ts` |
| Edit/Preview/Public | **A** | shared `CreativeCompositionCanvas` |

---

## C. Control → pixel truth table

| Control | State changes? | Render descriptor? | DOM/CSS? | Material pixels? | Proportional? | Intended authority? | Class |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Base Color | Y | Y (finish re-derive) | Y | Y via Material layers | Y | Finish → Material | **B** |
| Richness | Y | Y | Y | Y | Y (descriptor-sensitive) | Finish | **B** |
| Depth (Finish axis) | Y | Y | Y | Y | Y | Finish | **B** |
| Temperature | Y | Y | Y | Y | Y | Finish | **B** |
| Contrast | Y | Y | Y | Y | Y | Finish | **B** |
| Light Response | Y | Y | Y | Y | Y | Finish | **B** |
| Finish Lacquer/Acrylic | Y | Y | Y | Y | Partial (fixed-angle gradient) | Finish (+ Material bridge overwrite) | **B** |
| Surface On/Off | Y | Y (treatment) | Y on containers | Y fill change | Coarse | Surface tones | **C** |
| Surface Treatment | Y | Y | Y | Y | Named fixed recipes | `surfaceToneStyles` | **C** |
| Surface Intensity | Y | **N** style | **N** | **N** | No | claimed Surface | **C** ceremonial |
| Surface Depth | Y | **N** style | **N** | **N** | No | claimed Depth | **C** ceremonial |
| Depth intensity API | arg | **N** (0.01–1 identical) | N | N | No | `composeDepthShadow` | **C**/E |
| Mount selection | Y | Y | Y | overlay | Distinct recipes | MountShell | **B** |
| Rim selection | Y | Y | Y | overlay | Yes but forked | ornaments + local shell | **D** |
| Icon geometry/backing/rim | Y | Y | Y | shell CSS | Partial | IconStationShell | **B**/D |
| Icon scale / anchor | Y | Y size/transform | Y | Y geometry | Y | layout helpers | **A**/B |
| Accent | Y | Y SVG | Y | Y | Limited inventory | ornaments | **B** |
| Divider treatment | Y | stroke/endcap | Y | Y thin | Named color stamps | apply + canvas | **C** |
| Divider motion (Electric) | claimed | weak | mostly static color | No energy travel proven | No | — | **C**/E |
| Bottom Stop | Y attrs | Bar unused | compact box only | No shared copper path | No | unmounted bar | **E**/D |
| Action visual role | Y | layout/scale hints | partial | — | Partial | rails/role | **B** |
| Interaction Quiet/Tactile/Mechanical | Y | motionPreset side-effect | Tactile may pulse; Mechanical dead | No hover/press material | No | MotionVisual | **E** |
| Hero structure/size | Y | attrs + starter geometry | partial | — | Coarse | Hero apply | **C** |
| Hero flow shape | Y | **no renderer** | N | N | No | — | **E** |
| Material catalog presets | Y | Y | Y | Y | Often richer than VP finishes | Material | **A** |
| Motion intensity | Y | data-attr only | N style | N | No | MotionVisual | **C** |

Harness: `tmp/visual-renderer-truth-audit/control-sensitivity.json`

Key measured results:

- `composeDepthShadow(2, 0.25)` **===** `composeDepthShadow(2, 1)` (only `intensity<=0` → `"none"`).
- Surface Intensity/Depth state patch → **identical** style props (`uniqueOutputs: 1`).
- Finish richness / depth / lightResponse → **distinct** derived descriptors (`uniqueOutputs: 3`).
- Icon scale 0 / 0.5 / 1 → sizes **22 / 35 / 48** px (real).

---

## D. Classification table (systems)

| System | Class |
| --- | --- |
| Material engine + MaterialSurfaceLayers | **A** |
| Visual Plane fill model | **A** |
| Effects (`effect-render`) | **A**/B |
| Finish ≠ Color derivation | **B** |
| Mount shells | **B** |
| Icon Station geometry/scale/anchor | **B** (visual chrome **D** for rims) |
| Accent SVG | **B** |
| Page Background capabilities | **B** (capability present; some proofs underused it) |
| Surface treatments | **C** |
| Divider named styles | **C** |
| Hero structure | **C**; flowShape **E** |
| Depth model | **C**/E |
| Bottom Stop | **E** (+ **D** if bar were mounted) |
| VP Interaction modes | **E** |
| Rim copper/chrome forks | **D** |
| BottomStop `poundedCopperLike` | **D** |
| Finish overwriting Material bridge fill | **D**/C |

---

## E. Material / Finish findings

**Material (A):** Shared recipe → props → `resolveMaterialSurfaceFromProps` → `MaterialSurfaceLayers` (fill + texture + highlight + shine). Used by Button/Badge/Container/Page. This is the strongest production pixel path.

**Finish (B):** `deriveFinishSurface` is a real host-color derivation (lacquer multi-stop linear gradient; acrylic translucent-ish stops). Refinement axes **do** change descriptors. Limitations:

- Fixed gradient angles (not a light source).
- No roughness / environment reflection / Fresnel / multi-highlight geometry response.
- `applyFinishToSurface` bridges a Material preset then **overwrites** catalog fill with derived gradient — Material is a carrier, not the finish model.
- `finishSurfaceCssVars` is unused.
- Catalog lacquer Material recipe ≠ Host-derived lacquer (dual recipes).

**Geometry-aware lighting:** Material/Finish paint the **same gradient language** into different clip silhouettes. Lighting does **not** re-solve for pill vs angular vs circle. Clip ≠ shape-aware BRDF.

---

## F. Depth findings

`composeDepthShadow(level, intensity)`:

```ts
// intensity <= 0 → "none"
// else → identical joined fixed stacks (comment: "keep simple for proof")
```

Relational levels 0–5 exist as **descriptor tables**. Consumers mostly use levels **1–2**. Levels 3–5 are largely unused at render. Intensity is ceremonial. Surface Depth slider does not call depth composition.

**Class: C/E — conceptual model + fixed shadow stacks, not relational lighting.**

---

## G. Surface findings

Treatments (`quiet_field`, `panel_plaque`, `recess_well`, `energy_field`, `plinth_base`, `copper_harmonized`) are **named local gradient/shadow recipes** in `surfaceToneStyles`.

- Intensity / Depth Host sliders: **ceremonial** (state + assembly recipe fields only).
- Buttonish hosts intentionally **skip** applying tone styles (identity protection) — Surface On a Button may set state without restaging fill.
- Energy Field uses stacked gradients + cyan radials — proof of localized light **imitation**, not a light model.
- Photo-background staging depends on Page BG authority; Surface remains a rectangle treatment on top unless Host composes carefully.

**Class: C (thin named recipes + ceremonial intensity/depth).**

---

## H. Mount findings

Mounts resolve to background + border + padding + shadow (+ zIndex). Dark Plaque / Beveled Plate / Mission Control differ as **CSS recipes**, not material systems. Depth-aware only via optional `composeDepthShadow(2)` fallback. Not family-aware beyond preset strings.

**Class: B.**

---

## I. Rim / Edge findings

- Shared copper ornament: `poundedCopperRimBackground()` (multi radial/conic procedural CSS) — one of the better recipes.
- Shell applies **additional** hard-coded inset shadows (copper vs chrome) not taken from Material.
- Icon Station rim uses **yet another** ring shadow recipe and does **not** call `poundedCopperRimBackground()`.
- `rimOuterStyle` helpers appear unused by the live shell.
- No layered bevel depth model, irregular edge response, or independent inner/outer material channels beyond padding+background.

**Class: D (forked) + B (shared copper fn exists).**

---

## J. Pounded Copper findings

| Consumer | Path |
| --- | --- |
| Rim (Action shell) | `poundedCopperRimBackground()` + local shell shadows |
| Icon Station rim | hard-coded ring shadows (imitation) |
| Divider botanical | copper SVG endcaps + `#c56a2d` stroke |
| Bottom Stop bar | `poundedCopperLike()` linear gradient (**and bar unmounted**) |
| Material catalog `copper` | separate brushed gradient in Material presets |
| Surface copper_harmonized | local brown stage gradient |

**Verdict:** Not one shared hammered-metal authority. Mostly procedural CSS approximations with **Enrique forks**. Production hammered metal would require at least: irregular micro-facet/normal response or texture map, edge bevel, directional light, and one rim/backing consumer path — all currently **missing (E)** beyond multi-stop gradients.

Do not rename; do not “improve Copper” in this pass.

---

## K. Icon Station findings

**Real:** scale → size px; anchor transforms; overflow; primary/secondary content independence (Outcome Truth).  
**Thin/Duplicate:** backing is registry CSS string, not MaterialSurfaceLayers; rim is local rings; no glass cover stack; lighting not directional; portrait depth separation is mostly z-index + overflow shadow imitation.

**Class: B geometry / D rim-chrome.**

---

## L. Interaction findings

| Mode | Persist | Hover/Press | Motion |
| --- | --- | --- | --- |
| Quiet | mode | none | none |
| Tactile | mode + default `subtle_pulse` | none | continuous CSS animation if motion active |
| Mechanical | mode + `press_inset` | none | **`press_inset` absent from `MOTION_PRESETS` / keyframes → dead** |

`motionIntensity` is a data attribute only. No material press inset.

**Class: E.**

---

## M. Divider findings

Named styles mostly set stroke color/width; botanical adds endcap SVG. Electric is cyan stroke — **not** proven energy-travel motion in the Visual Parts path. Reduced-motion substitution for Electric travel is not a real VP motion system.

**Class: C.**

---

## N. Hero findings

Structure / size intent persist and influence starter geometry / attrs. Themed borders can consume rim parts when applied. **`heroFlowShape` / `vpHeroFlow` persist but have no clip/path/visual consumer** — pure ceremonial field.

**Class: C structure; E flowShape.**

---

## O. Background findings

Page Background authority **can** render solid, gradient, image, pattern, texture, and Material-adapted fills via Visual Plane / canvas page path.

Outcome Truth gallery weakness for grunge/photo is primarily:

**A + partial C:** proof builders often under-applied existing Background capability (e.g. G focused on Surface On; B used dark gradient starter language more than a true brick/photo environment).

**Not** “Background engine missing photo” — image kind exists.  
**Also not** solved by art-direction polish alone if Surface/Mount depth remain ceremonial.

---

## P. Edit / Preview / Public findings

All modes share `CreativeCompositionCanvas` + Visual Parts shells. Differences: edit chrome, motion enablement, action safety — not a richer Preview-only paint path. **Parity of path: A.** Richness of that path: limited by authorities above.

---

## Q. Duplicate / Enrique wiring list

1. Chrome rim gradient string duplicated vs Material chrome recipe.
2. Copper hex / gradient family repeated across ornaments, shells, divider, BottomStop `poundedCopperLike`, Material copper preset, surface copper stage.
3. Rim shadow recipes: descriptor helpers vs VisualPartsShell vs IconStationShell (three treatments).
4. Finish lacquer derivation vs Material `gloss_lacquer` catalog (bridge then overwrite).
5. Depth stacks vs Effects shadows vs Mount payload shadows (overlapping elevation languages).
6. BottomStopBar local copper imitation (and component unused).

---

## R. Proof stubs

- Inventory comments: “tiny proof inventory”, lacquer proof tokens, composition-proofs A–G.
- `composeDepthShadow` intensity “keep simple for proof”.
- Surface Intensity/Depth Host sliders.
- Hero `flowShape`.
- VP Interaction Mechanical → dead preset.
- BottomStopBar unmounted (state/attrs / compact frame only).
- Electric divider “energy” naming vs stroke color.

---

## S. Thin authorities

- Finish lacquer/acrylic (real but fixed-angle, non-PBR).
- Mount recipes.
- Surface named tones.
- Icon Station backing.
- Page Background (capable, under-exercised in proofs).
- Effects (real but separate from VP depth).

---

## T. Missing visual capabilities (E / NO)

Directional lighting · roughness · environment reflection · true hammered irregularity · glass transmission/refraction · shape-aware specular · Bottom Stop live shared renderer · Hero flow geometry · VP hover/press material interaction · continuous depth intensity · Surface intensity/depth → pixels.

See `capability-matrix.json`.

---

## U. Production authorities worth preserving

- Material engine + MaterialSurfaceLayers
- Visual Plane / CreativeFill page+container fills
- Finish ≠ Color derivation concept (strengthen, don’t fork again)
- Icon Station geometry/scale/anchor law
- Action Group layout / rails (behavioral — already Outcome True)
- Assembly recipe structural capture
- Shared Edit/Preview/Public canvas path
- Ornament SVG + `poundedCopperRimBackground` as **candidates** to become the single copper rim authority (after consolidation)

---

## V. Explicit items NOT requiring repair (as engine defects)

- Existence of flat Foundation starters (plain primitives are valid).
- Outcome Truth behavioral proofs (rails/grid/stack/Both) — those are real.
- Having both Material and Visual Parts **layers** — wrong is duplication of *material response*, not layering itself.
- Ugly screenshots caused solely by choosing Foundation flat buttons without applying Finish/Material — **bad proof composition**, not missing Button primitive.
- Rebuilding Background from scratch when image/gradient/Material page fills already exist.

---

## Proposed repair order (DO NOT EXECUTE)

Distinguish:

| Kind | Example |
| --- | --- |
| **ENGINE DEFECT** | depth intensity no-op; BottomStopBar unmounted; Mechanical dead preset; surface intensity ceremonial |
| **BAD PROOF COMPOSITION** | A–G proofs using flat starters / not applying photo BG |
| **BAD ART DIRECTION** | taste; spacing; copy — out of scope until engine truth |

### Highest-leverage sequence

1. **Consolidate material response ownership** — Finish/Rim/Mount/Surface must compose Material (or a single elevated Material-capable layer), not fork gradients.
2. **Make Depth real or remove the Host lie** — intensity must modulate pixels or Intensity controls must not ship as continuous authority.
3. **Mount BottomStopBar / delete local copperLike** — route themed stop through shared copper/rim authority.
4. **Unify Rim consumers** — Action shell + Icon Station + Divider metal edges share one rim descriptor → one pixel path.
5. **Surface Intensity/Depth** — either drive tone/lighting parameters or demote to non-Host engineering fields.
6. **Hero flowShape** — render or stop persisting as a visual claim.
7. **Interaction Mechanical** — wire a real press/motion preset or stop claiming Mechanical.
8. **Only then** expand families (wood, glass, hammered) on the strengthened engine.
9. **Recompose proofs** using Material/Finish/Background capabilities that already exist — separate from engine repair.

---

## Red-team self-check

- Shared ≠ production-ready: Material is shared **and** capable; Depth is shared **and** ceremonial.
- Ugly ≠ broken: Foundation flat starters are allowed; false “Pounded Copper” sophistication is not.
- Proof composition ≠ engine: Background can do photos; G proof under-applied them.
- Older Material/Effects inspected: yes; VP often bypasses them for rims/mounts/surfaces.
- Enum names ≠ support: `press_inset`, `heroFlowShape`, `surfaceIntensity` prove the point.
- Extremes tested via harness: depth/finish/surface/icon scale.

---

**No Product Owner visual acceptance claimed. No aesthetics repaired. Enrique located.**

---

## Remediation status appendix (Evict Enrique)

Forensic findings above remain the historical record. Repair implementation status:

| Finding | Status |
| --- | --- |
| Finish overwrites Material fill | **Repaired** — Finish feeds Material channels + layers |
| Depth intensity ceremonial | **Repaired** — continuous intensity scales cast/contact/inset/rim |
| Surface Intensity/Depth ceremonial | **Repaired** — `applySurfaceParameters` re-derives treatment paint |
| Copper/Chrome forked | **Repaired** — canonical Rim + `poundedCopperRimBackground`; `poundedCopperLike` removed |
| BottomStopBar unmounted | **Repaired** — mounted in shared canvas path |
| heroFlowShape persist-only | **Repaired** — `HeroFlowShapeLayer` |
| Mechanical → dead preset | **Repaired** — pointer-driven CSS; Motion drawer hosts Quiet/Tactile/Mechanical |
| Electric Divider name-only | **Repaired** — restrained travel/glow + reduced-motion static |

Closeout: `VISUAL_RENDERER_REPAIR_CLOSEOUT.md`  
Evidence: `tmp/visual-renderer-repair-evidence/`

Art direction / flagship Card / new families remain deferred.
