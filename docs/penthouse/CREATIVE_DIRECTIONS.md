# Penthouse Creative Directions — Explored & Selected

Wave 1 of the TapConnect Penthouse Transformation. Three genuinely different
coherent directions were developed against the existing Fusion foundation
(dark oklch token system, zone atmospheres, `tc-surface` material levels,
proprietary rounded-line icon family, Studio Assembly).

Evaluation criteria: Card centrality · comprehension · distinction · premium
quality · accessibility · performance · mobile · conversion · whole-product
consistency.

---

## Direction A — "Atelier Light" (refined architectural neon)

**Concept:** The Card is a lit object in a darkened architectural gallery.
Warm champagne key light on the Card; every capability zone is a room with
its own restrained accent lighting. Neon is *architectural* — crisp 1–2px
illuminated edges and controlled bloom, never signage.

- **Card presentation:** vertical Card under a warm directional key light,
  ivory/champagne edge, reflected Card light on nearby surfaces.
- **Lighting:** dark neutral faces + semantic edge light + 18–32px bloom.
- **Materials:** three-level `tc-surface` system (signature stage / major /
  supporting) with inner bevels and dimensional shadows.
- **Typography:** existing geist sans, tightened hierarchy; uppercase
  micro-labels for zones; large calm display sizes for stage moments.
- **Map geometry:** radial Card-centered map; capabilities orbit the Card.
- **Motion tone:** settle easing (`cubic-bezier(0.22,1,0.36,1)`), staged
  reveals, calm during work; the Assembly is the one cinematic moment.

**Assessment:** Strongest Card centrality (light literally centers it);
builds directly on the shipped zone/atmosphere/token investment; premium
without nightclub risk; performs well (CSS-only); accessible (contrast
carried by edges + labels, not fills).

## Direction B — "Precision Hardware" (illuminated instrument panel)

**Concept:** Studio as a precision instrument — machined graphite panels,
hairline seams, indicator LEDs, engraved labels. Zones read like modules of
one device.

- **Card presentation:** Card docked in a machined bay, cool platinum edge.
- **Lighting:** flat panels, hairline seams, tiny high-chroma indicator dots.
- **Typography:** condensed technical labels, tabular numerals everywhere.
- **Map geometry:** rectilinear grid/rack; capabilities as slotted modules.
- **Motion tone:** instant, mechanical; almost no travel.

**Assessment:** Excellent for the console/Insights surfaces and status
hierarchy, but weakest Card centrality (the Card becomes one module in a
rack — violates product law), and reads "developer tool," which the brief
explicitly forbids for the commercial surfaces.

## Direction C — "Warm Editorial" (premium technology magazine)

**Concept:** Large editorial typography, generous whitespace, warm paper-on
-dark contrast, photographic evidence panels; capabilities told as chapters.

- **Card presentation:** Card as a photographed hero object, soft shadow.
- **Lighting:** minimal; hierarchy through type scale and spacing.
- **Typography:** oversized serif-accented display, long-form measures.
- **Map geometry:** linear scroll narrative, chaptered sections.
- **Motion tone:** slow parallax reveals.

**Assessment:** Beautiful landing potential and strong reading comprehension,
but fractures before/after login (editorial rhythm collapses in dense
operational Studio surfaces), weak zone distinction, and giant empty areas
contradict the premium definition. Motion tone conflicts with reduced-motion
persuasion requirement.

---

## Selected: Direction A — "Atelier Light"

**Rationale (professional decision, no Owner approval required):**

1. **Card centrality** — light is the hierarchy device; the Card holds the
   key light everywhere; no competing center emerges (B fails this).
2. **Whole-product consistency** — the same edge/bloom/material vocabulary
   works in marketing heroes and dense operational consoles (C fails this).
3. **Preserves authoritative systems** — deepens the existing `zone-tokens`,
   `tc-surface`, and Assembly investments instead of replacing them.
4. **Accessibility & performance** — CSS-only lighting; contrast lives in
   text/labels/edges, not atmospheres; reduced-motion keeps brightness and
   border emphasis while removing travel.
5. **Conversion** — the "lit object in a gallery" frame makes tier cards and
   the offer journey feel like product reveals, not pricing tables.

**Implementation contract (this wave):**

- Three material levels: `tc-surface-l1` (signature stage), `tc-surface-l2`
  (major product surfaces), `tc-surface-l3` (supporting) — now global via
  `app/globals.css`, usable in Studio, not just landing.
- Semantic zone system: green = action only (`--studio-go`); zone palettes
  per brief including the new distinct **TapSave** retention teal
  (`zone-tapsave`), visibly different from CTA green.
- Interaction states: hover lift, focus ring (green, 2px, offset), pressed
  (1px settle), selected (edge + bloom), disabled (0.55 opacity, no lift,
  `not-allowed`).
- Motion standards: `--motion-fast/base/slow` + `--ease-settle`; reduced
  motion removes travel, keeps brightness/border/selection/focus.
- Empty-state standard: `.tc-empty-state` — truthful, oriented, one forward
  action.
- Provider readiness standard: `.tc-readiness[data-state]` with honest
  states `local_mock · provider_test · configured · live_ready · planned ·
  unavailable`.
- Card-relationship anchor: `.tc-card-anchor` (inline) + `.tc-card-marker`
  (sticky) so every major workspace states which Card it serves.
- Icon family: proprietary rounded-line set (1.75 stroke, 24 grid) now covers
  all required concepts, including distinct **TapProof**, **Relationships**,
  and **Communications** marks.

Waves 2–3 (public experience, authenticated Studio) apply this direction
across every surface.
