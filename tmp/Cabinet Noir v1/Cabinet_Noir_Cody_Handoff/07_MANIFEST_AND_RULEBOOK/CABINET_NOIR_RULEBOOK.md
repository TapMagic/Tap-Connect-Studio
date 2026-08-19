# Cabinet Noir Signature Family — Production Rule Book

**Authority:** certified production assets in this package.  
**Purpose:** govern Studio deployment and future tApIt manufacturing without visual drift.

---

## 1. Family thesis

Cabinet Noir is premium, manufactured UI furniture. It should read as a tactile luxury object built from layered lacquer/enamel surfaces, dimensional metal construction, restrained hardware, coherent environmental light, and deliberately controlled asymmetry.

It is **not** a generic plaque, flat web button, casino sign, sci-fi HUD, steampunk cosplay, memorial plate, or ornamental Victorian object.

The family must remain phone-first. Silhouette, depth, material separation, content safety, and scanability outrank microscopic ornament.

---

## 2. Source-of-truth hierarchy

1. Certified pristine PNG masters in this package.
2. This Rule Book and Asset Manifest.
3. Certified assembled preset/reference assets (CN-006/007/008/009).
4. Studio metadata/registries implementing these contracts.
5. Future generated derivatives.

Lower-priority sources may **not** override higher-priority sources.

---

## 3. Immutable furniture vs live content

### Immutable furniture
Certified chassis, bezels, rails, bridges, finishers, bottom caps, topper furniture, plug chassis, and structural lighting/reflection baked into those masters.

Studio/tApIt must not redraw or reinterpret them.

### Live content
- action labels
- optional Hero subline text
- identity logo/portrait/mark inserted into an identity socket
- semantic/platform plug selected for an action socket
- destinations, analytics bindings, accessibility labels, states, entitlements

Live text/content is layered by Studio and must never be baked into reusable furniture masters.

---

## 4. Socket contracts

### `semanticPlugSocket@1.0.0`
- Canonical chassis: CN-012.
- Geometry: faceted/octagonal.
- Used in Hero and Standard Actions.
- Exactly one socket per action: LEFT **or** RIGHT, never both.
- Left/right action masters are independent certified assets; do not runtime-mirror one master to create the other.
- Stock plug foreground normally inherits the selected certified Cabinet Noir family metal.

### `identityHeaderSocket@1.0.0`
- Canonical furniture family: CN-037 + certified alternates.
- Geometry: large circular recessed identity field.
- Used for business logo, monogram, portrait, crest, mascot, identity artwork.
- It is not a semantic plug and does not consume an action-row socket.
- All CN-037 variants expose the same logical socket/safe-area and bridge attachment contract.

### Custom tApIt identity manufacturing modes
**Exact Asset** — preserve source colors/identity as directly as practical.  
**Styled Preserve** — translate material/depth into Cabinet Noir while preserving recognizable identity.

If Styled Preserve would materially damage a logo, seal, word-heavy crest, or source fidelity, tApIt must recommend Exact Asset or request a better source rather than inventing a substitute.

Initial launch exposes **Exact Asset only**. `styled-preserve` remains architecturally defined but implementation-deferred until source-quality validation, provenance, preview/approval, retry/rejection states, and deterministic safe-area enforcement are available.

### `informationalLine@1.0.0`
- Canonical furniture: CN-011.
- Non-action, optional, centered, one-line live text only.
- Schema: `text: string | null`.
- No plug, destination, click action, wrapping, analytics action, or interactive state.
- Furniture is decorative and `aria-hidden`; text remains live DOM content.
- Certified source live-text rectangle: `x=326–1846`, `y=284–440` on a 2172×724 source.
- Guarded center lane: `x=302–1870`, `y=260–464`.
- Recommended maximum live-text width: 1352 source px (approximately 242.76 px at 390 px Card width).
- Certified typography: 14–16 px with 18–20 px line-height at 390 px Card width.

---

## 5. Material law

### Certified production authority finish
**Primary:** warm Champagne Gold  
**Secondary:** blackened steel / dark gunmetal  
**Body:** Obsidian / deep carbon-black lacquer/enamel  
**Canonical semantic plug face:** Midnight Navy lacquer/enamel

This exact combination is the **certified current authority** because it is what the production assets were manufactured in.

### Candidate future primary finishes — NOT YET certified in this asset pack
- Brushed Silver
- Warm Copper
- Gunmetal-led finish

These may be offered only after visual certification of complete family treatment. Do not simply hue-rotate production PNGs and call the result certified.

### Secondary-metal pairing law
A Cabinet Noir finish is a curated **paired finish**, not two arbitrary metal dropdowns. The secondary material exists to separate planes, reveal construction, and prevent monotone metal overload.

Do not expose unrestricted independent primary/secondary metal mixing to Hosts.

---

## 6. Color governance

Cabinet Noir is governed, not RGB-free-for-all.

- Body and plug/background colors may differ.
- Both must remain within approved Cabinet Noir lacquer/enamel vocabulary.
- Studio exposes curated combinations, not unrestricted arbitrary pairings.
- Accessibility/contrast is necessary but not sufficient; perceptual harmony and commercial judgment also govern combinations.
- The existing Studio **Cabinet Noir color chart** is the authoritative color-token source. This asset archive does not contain verified hex/token values; Cody must reference/import the existing approved chart rather than inventing new values.

Named families already used/approved in design discussions include Obsidian/Carbon, Gunmetal/Slate, Midnight Navy and curated complementary lacquer colors. Exact production tokens must come from the existing color chart.

---

## 7. Lighting law

- One coherent warm off-axis environmental source.
- Light explains depth; it is not decoration.
- Highlights vary by angle/material/depth and must not repeat mechanically across stacked rows.
- Seam light is reflected/leaked environmental warmth, **not** an installed LED strip.
- No neon/casino glow unless a future separately certified family explicitly requires it.
- Components float subtly via natural alpha shadow/underside darkness; do not create pasted-on double-sided-tape behavior.

---

## 8. Action hierarchy

### Standalone Identity Topper — CN-001
- CN-001 is a standalone selectable Cabinet Noir Identity Topper / Brand Crest.
- It may be used independently when the full modular bound-stack crown system is not used.
- It is not part of the CN-037 structural crown assembly and must not substitute for CN-037 in CN-038 or CN-044 recipes.
- CN-037 and its approved variants exclusively own `identityHeaderSocket@1.0.0` for modular assemblies.

### Hero Actions — CN-002 / CN-003
- More prominent than Standard Action but phone-efficient.
- Large semantic socket on one side only.
- Main live content field plus optional live subline.
- Hero decorative subline furniture may remain when subline is disabled.

### Standard Actions — CN-004 / CN-005
- Everyday workhorse row.
- One semantic socket and one short live label.
- No required arrow, cue, helper copy, or Hero subline furniture.
- Designed for repeated vertical use.

---

## 9. Single-stack deployment contract

### Visual presets
CN-006 (4 row) and CN-007 (6 row) are certified appearance references/presets.

### Preferred runtime composition
Do **not** require a unique full-stack PNG for every row count.

Logical assembly:

`CN-037 crown → CN-038 bridge → action row → repeat CN-039 intervals as needed → final action row → CN-040 structural bottom cap → optional CN-041 decorative pedestal`

Rules:
- Rows may be added/removed dynamically.
- No phantom/empty slots.
- Alternating semantic socket law: `LEFT / RIGHT / LEFT / RIGHT ...` when using the bound alternating style.
- CN-039 is repeat-only middle furniture; no decorative terminal caps.
- CN-039 native runtime stride is 724 px, exactly one Standard Action cadence. Preferred runtime overlap is 0; 1–2 px overlap is test tolerance only, not a compensating layout rule.
- CN-040 owns structural lower termination.
- CN-041 is optional decorative finish and does not alter row-count logic.

---

## 10. Twin-Rail deployment contract

### Visual presets
CN-008 (2×2) and CN-009 (2×3) are certified appearance references/presets.

### Plug law
- Left-column cells: plug on LEFT exterior edge.
- Right-column cells: plug on RIGHT exterior edge.
- Center seam remains free of plugs.

### Preferred runtime composition
`CN-037 crown → CN-044 crown bridge → paired row → repeat (CN-042 outer interval + CN-043 center-spine interval) as needed → final paired row → CN-045 structural bottom cap`

Rules:
- CN-042 outer rails and CN-043 center spine are repeat-only middle furniture.
- CN-042 native runtime stride is 362 px, exactly one paired-level cadence. Preferred runtime overlap is 0; 1–2 px overlap is test tolerance only, not a compensating layout rule.
- CN-044 owns decorative/structural top termination.
- CN-045 owns final outer-rail + center-spine termination.
- Center spine remains narrow and visually subordinate.
- CN-010 solves internal odd-action composition; it does not replace CN-045.
- 2×3 is the current certified dense preset. Larger layouts require phone-scale validation before certification.

### Approved odd-action recipe
1. Render all complete paired levels.
2. Terminate the repeatable center spine after the last complete pair.
3. Render the legitimate final odd action full-width using an approved action master.
4. Place CN-010 beneath it as non-action transition/finishing furniture.
5. Close with CN-045.

CN-010 receives no destination, label, analytics, accessibility action, or interactive state. Three- and five-action compositions may proceed toward certification. Seven actions remain structural-proof-only and are not launch-certified.

---

## 11. Platform-familiarity law

Semantic familiarity outranks decorative cleverness.

### Generic semantics
Preserve universally learned meaning while applying Cabinet Noir material treatment.

### Platform/system conventions
When a platform/OS has a strongly learned silhouette, preserve it. Examples in this package:
- Generic share (three-node)
- Apple/System Share (tray/square + up arrow)
- Add to Home Screen (rounded square + plus)

### Social/platform marks
Preserve recognizable platform silhouette. Cabinet Noir may transform depth/material/finish, but must not creatively reinterpret the mark until it becomes ambiguous.

Where a third-party brand requires official color/asset treatment for compliance, use an **Exact Asset / brand-preserve** mode rather than assuming gold translation is always acceptable. Legal/brand review remains a separate release gate.

---

## 12. tApIt manufacturing contract

tApIt receives:
- target family (`cabinet-noir`)
- target socket (`semanticPlugSocket` or `identityHeaderSocket`)
- source asset/content
- production mode (`exact-asset` or `styled-preserve`)
- certified finish ID
- approved background/base color ID
- safe-area contract

It returns only the compatible inserted content/plug derivative plus provenance metadata.

### tApIt must NOT
- regenerate chassis furniture
- change certified silhouettes/attachment geometry
- mirror certified left/right furniture as a shortcut
- add text to reusable furniture
- invent business facts or branding
- introduce unapproved metals/colors
- add glow/LED effects
- alter rail repeat geometry

### Required provenance metadata
- family/version
- source asset hash/reference
- socket contract/version
- production mode
- finish ID
- base/background token
- generator/model/prompt recipe version where generated
- approval state
- created/approved timestamps

---

## 13. Editor behavior

The editor must compose a live Card, not flatten the Card to one image.

Required behaviors:
- live text remains editable/accessibility-readable
- action destination/state/analytics remain independent
- semantic plugs are independently swappable
- row add/delete/reorder updates structural composition deterministically
- topper variant choice does not alter `identityHeaderSocket` contract
- tier entitlements control drawer visibility; premium families do not require a separate editor architecture
- preview must reflect actual phone composition
- preserve authored state/autosave

Do not create a Cabinet-Noir-only builder. Use registries/contracts that future families can implement.

---

## 14. Entitlement/tier law

Assets are registered once in the canonical component registry. Tier/plan entitlements determine whether a Host can discover/select/publish them.

Do not duplicate assets or code paths per tier.

Canonical entitlement key: `signature.family.cabinet_noir`.

- Admin/internal and seeded demo/test: visible, selectable, publishable.
- Non-entitled: visible but locked; not selectable and not publishable.
- Existing published Cabinet Noir Cards remain live after entitlement loss.
- Existing restricted objects remain visible but read-only.
- New insertion and restricted replacement are blocked after entitlement loss.
- A new publication containing restricted Cabinet Noir requires restored entitlement or replacement with an entitled family.
- Public rendering is never conditioned on current entitlement.
- Server-side publication enforcement is mandatory.
- Do not bind Cabinet Noir directly to final marketing-plan names.

Suggested metadata fields:
- `familyId`
- `componentId`
- `role`
- `socketContract`
- `layoutCompatibility`
- `finishCompatibility`
- `entitlementKey`
- `isCertified`
- `isDeprecated`
- `version`

---

## 15. Do-not-shoehorn rule

Cabinet Noir must plug into the Studio-wide component, template, entitlement, analytics, accessibility, media, and publishing systems. It must not create a competing editor, media library, analytics pipeline, identity model, or special-case publishing model.

The Card remains the canonical living experience, consistent with the broader TapConnect product architecture.
