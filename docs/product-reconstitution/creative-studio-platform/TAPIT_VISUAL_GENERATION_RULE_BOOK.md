# tApIt Visual Generation Rule Book

**Working version:** 0.3  
**Status:** Living internal policy; not final customer copy  
**Scope:** tApIt visual generation, Signature-family source handling, plug-ins/inserts, future co-pilot behavior, and reusable reconstruction knowledge

## Authority and thread boundary

This document captures durable generation policy discovered in this working thread. It does not authorize production implementation.

Use this rule book to define source and logo handling, production types, family-safe generation, color governance, recipe metadata, controlled customer wording, and future implementation contracts.

Do not use it to redesign approved masters, re-ingest existing Signature families, reopen completed family work, or make production changes without explicit authorization. Missing product rules must be recorded as open decisions rather than silently invented.

When visual manufacturing work discovers a reusable method, reconstruction recipe, family constraint, source-handling rule, or implementation limitation, add it here for later governance.

## 1. Preservation language and production types

### 1.1 Exact Asset

Use **Exact Asset** only when the approved original source is placed directly, with no material reinterpretation. Safe scaling, cropping, or masking may be used when they do not alter the identity artwork.

- Customer-facing choice: **Original Asset**
- Customer-facing meaning: “Use my original asset directly.”
- Primary goal: source fidelity

Do not use Exact Asset when generation, reconstruction, material restyling, cleanup, reduction, simplification, or other interpretation is involved.

### 1.2 AI Styled Preserve

Use **AI Styled Preserve** whenever a source is generated, reconstructed, simplified, cleaned, reduced, or adapted into a family style.

- Customer-facing choice: **Styled Preserve**
- Customer-facing meaning: “Preserve my brand identity as closely as possible while adapting it into the selected style system.”
- Preferred internal language: **Preserve Brand Identity** or **Best Possible Brand Preservation**

AI Styled Preserve must never promise exact duplication.

### 1.3 Normalization rule

Internal shorthand such as “preserve exactly,” “make it match,” “use the image,” or “style it like this” must be normalized into one of the two production types before generation begins.

Compatible controlled terms include:

- Original Asset
- Styled Preserve
- Preserve Brand Identity
- Brand-Fit Adaptation
- Exact Placement
- Styled Integration

## 2. Source handling

For a supplied logo, brand mark, icon, image, theme cue, style cue, or descriptive concept:

1. Identify the dominant brand signals: silhouette, recognizable mark, key colors, iconic letterform or monogram, composition logic, and major internal shapes.
2. Preserve the strongest recognizable traits first.
3. Adapt only through the chosen family’s documented material, metal, lighting, plug-in geometry, framing, edge, gloss, glow, and depth rules.
4. When tiny detail cannot survive reliably, preserve the identity signal instead of manufacturing incorrect micro-detail.

Outcome priority is:

1. Brand recognizability
2. Family fit
3. Production cleanliness
4. Compositional balance
5. Small-scale usability

## 3. Weak or complex sources

Low resolution, tiny text, dense crests, detailed illustrations, poor contrast, transparency artifacts, bad crops, partial marks, watermark-like quality, and fragile gradients are degraded-source conditions. They do not cause immediate failure.

Attempt, in order:

1. Simplification
2. Brand-shape preservation
3. Central-motif extraction
4. Monogram or mark emphasis
5. Framed or socketed adaptation
6. Clean reduced-detail interpretation

Prefer preserved identity, premium integration, clean recognition, and phone-scale legibility over pseudo-exact clutter.

## 4. Family-safe plug-ins and inserts

The approved family master remains authoritative. A supplied source adapts to the family; it does not cause the family chassis to be rebuilt.

Plug-ins and inserts may carry a logo, simplified mark, branded icon, stylized symbol, or hobby/industry imagery. They must:

- use the family’s documented plug-in silhouette;
- preserve family metal, finish, structure, and premium edge treatment;
- remain legible at phone scale;
- avoid muddy internal detail and pasted-on appearance;
- preserve master chassis integrity.

The insert base color may vary when permitted. Family metal or trim remains the default visual unifier unless a family rule explicitly authorizes a change.

## 5. Color and pairing governance

No general color-remapping or pairing matrix was supplied in v0.1. Until explicit rules are added:

- source key colors are brand signals to preserve where practical;
- family metal and finish remain authoritative;
- insert base-color variation is conditional, not globally approved;
- no new tint, glow, energy, contrast, or metal-pairing behavior should be inferred from this document.

**Open policy decision:** define approved family-specific palettes, source-color translation rules, contrast thresholds, metal/base pairings, glow pairings, and exception handling.

## 6. Reusable asset recipe metadata

Any asset or family intended for later reuse should carry or be accompanied by:

- asset family name;
- asset type;
- visual role;
- production class;
- master-authority status;
- live socket zones;
- scale intent;
- approved color behavior;
- approved glow or energy behavior;
- source-handling notes;
- plug-in compatibility notes;
- placement constraints;
- whether text, icon, or logo content is baked or live;
- whether the asset is direct-use or reference-only.

Each reusable master should also have a short recipe note answering:

- What defines it visually?
- What may change?
- What must not change?
- How should user-provided source material be integrated?

This metadata is intended to support repeatable ingestion, future reconstruction, and co-pilot consistency. Its production schema and storage authority are not yet authorized or defined.

## 7. Future implementation contract

When implementation is explicitly authorized, production-type selection, ingestion, generation prompts, validation, customer wording, and persisted recipe metadata must share one policy authority. Generative or interpretive paths must fail closed to AI Styled Preserve and must not emit exactness claims. Family-safe validation must reject undeclared master reconstruction or unsupported family transformations.

This section records the intended contract only; it does not select a code location, database schema, migration, UI, or rollout plan.

## 8. Open decisions and unresolved terms

- Cabinet Noir inherits only the shared rules above until its family-specific rules are supplied.
- Future button families inherit only the shared rules above until their own immutable and variable traits are documented.
- Color/pairing governance remains open as noted in section 5.
- Exact thresholds for “safe” crop, mask, cleanup, and small-scale legibility remain open.
- Review, approval, provenance, rollback, and versioning workflows for generated assets remain open.
- The phrase “no-Enrique damage control” appears in the handoff but has no formal product definition. No additional rule is inferred from it; the documented master-integrity rules remain controlling until the term is clarified.

## 9. Reference cases: iPromote That and BreadBreakers

**Reference pages inspected:** 2026-08-16  
**Evidence:** [iPromote That](https://tapthemagic.com/business-template/ipromote-that/) and [BreadBreakers](https://tapthemagic.com/breadbreakers/)

These are **competitive benchmark references only**. They are not TapConnect assets, approved masters, templates, families, source material, or proof of an original manufacturing method. They must not be copied, re-ingested, reconstructed, or redesigned through this rule-book thread.

### 9.1 Competitive benchmark rule

iPromote That and BreadBreakers establish a competitive visual floor. Future tApIt and TapConnect visual generation must materially exceed this bar; merely matching it is insufficient.

“Exceed” means the resulting system must deliver a stronger overall outcome while retaining at least the benchmark’s useful qualities: immediately recognizable actions, conspicuous brand presence, differentiated branded surfaces, rich tactile depth, strong visual energy, and clear phone-scale intent.

This is an outcome benchmark, not a layout or style template. Clearing the floor does not authorize copying its artwork, composition, ornamental choices, palette, typography, or baked-raster implementation. TapConnect must achieve a more polished, coherent, adaptable, editable, accessible, and production-governed result through its own family authorities and generation rules.

### 9.2 Observable shared assembly pattern

Both pages use linked raster artwork as the visible action surface. The action destination remains live in the surrounding link, while label, iconography, trim, lighting, and brand treatment may be baked into the raster.

Both cases include:

- a brand-bearing hero or identity area;
- a click-to-call action;
- a downloadable vCard action;
- a Google review action;
- additional brand-specific actions.

The shared click-to-call artwork is reused across both pages. The Google review artwork is also reused. The vCard artwork is independently branded for each organization.

### 9.3 Observable brand adaptation

The iPromote That case emphasizes black, white, warm bronze, amber, and gold, with a metallic monogram and a dark world-map field. Its vCard surface uses a dark jewel-like field, gold trim, warm highlights, and baked contact-card iconography.

The BreadBreakers case emphasizes cyan, blue, lime, green, white, and silver. Its vCard surface carries the organization’s identity card, botanical elements, a blue-green field, silver trim, and a green download medallion. Its hero uses the supplied monogram over a dark photographic field.

The cases therefore demonstrate that a common action role does not require one universal brand treatment. The brand-bearing insert and palette may vary while the action remains recognizable as the same functional class.

### 9.4 Metadata implications

These cases reinforce the need to record separately:

- action destination and behavior;
- whether visible label, icon, and logo content is baked or live;
- source identity asset and provenance;
- shared utility authority versus customer-specific artwork;
- family or construction authority;
- approved brand palette and provider-required colors;
- direct-placement versus interpreted-generation history;
- source and rendered dimensions;
- minimum safe scale and any prohibited upscaling.

The live output alone cannot establish whether a branded surface was produced through Exact Asset or AI Styled Preserve. That production type must come from provenance and operation history, not visual guesswork.

### 9.5 Candidate rules requiring approval

The following are explicitly **candidates**, not active policy:

- A provider-owned identity treatment, such as Google’s multicolor mark, may need to retain its provider colors even when the surrounding family palette differs.
- Shared utility artwork may remain neutral or provider-authentic while customer-owned identity surfaces carry the customer palette.
- A family may permit a customer-colored field or insert while retaining one family-consistent metal or trim treatment as the visual unifier.
- An all-baked raster action should declare its editability limits so future co-pilot behavior does not imply that label, icon, or logo content is live.
- Generated output should avoid rendering a raster above its approved effective resolution unless an approved reconstruction or higher-resolution source exists.

These candidates require explicit approval or family-specific evidence before moving into sections 1–7 as normative rules.

## 10. Change log

### 0.3 — 2026-08-16

- Classified iPromote That and BreadBreakers as competition and reference-only benchmarks.
- Established them as a visual floor that future tApIt and TapConnect output must materially exceed.
- Prohibited copying, ingestion, reconstruction, or treatment as TapConnect masters/templates.
- Clarified that the benchmark governs outcomes, not layout or stylistic imitation.

### 0.2 — 2026-08-16

- Added iPromote That and BreadBreakers as non-authoritative reference cases.
- Captured shared utility versus customer-specific branded surface behavior.
- Recorded provenance, baked/live content, provider color, and resolution implications.
- Kept inferred color and construction behaviors explicitly pending approval.

### 0.1 — 2026-08-16

- Captured Exact Asset and AI Styled Preserve.
- Captured source-signal and degraded-source handling.
- Captured family-safe plug-in construction.
- Captured required reconstruction metadata.
- Recorded color governance and undefined implementation details as open decisions.
- Established this document as a non-production, living rule-book authority.
