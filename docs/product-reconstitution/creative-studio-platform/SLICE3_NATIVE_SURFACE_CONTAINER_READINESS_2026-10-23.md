# Slice 3 readiness — Native Surface/Container Visual Authoring

**Status: proposal for Product Owner and independent architecture review. No Slice 3 application implementation is authorized or included.**

[Slice 2 desktop acceptance](SLICE2_DESKTOP_ACCEPTANCE_2026-10-23.md) records the accepted source `a7e3dc1e1f722038d737a8239b0ff31662fc6d79`, building on Slice 1 `3bda89b502e629e867cd5daa6b13050a0f4bcb3c`. Repository root is `/Users/rcs/Development/tap-connect-studio`, origin `https://github.com/TapMagic/Tap-Connect-Studio.git`, existing development branch `codex/studio-reconstitution-slice-1`; do not merge into main. The working tree has unrelated Library/classification, discovery/navigation, map screenshots, planning files and generated outputs. Preserve them; committed source is the review baseline, not an assumption that the entire local tree is clean.

## Recommendation: a complete, narrow customer outcome

Approve **Create and Style Two Native Containers**, with the separately identifiable start-document prerequisite below. A customer starts Blank, styles the root, adds a Flow panel and a Layered image panel, adjusts their native children, moves/aligns/resizes them, and saves/reopens/Previews a polished result. Success is editable output and a repeatable native journey, not a larger property catalog.

Use the existing shell, selection, drawer/task state, Inspector, Materials and rendering. Improve the task entrances and organize the affected properties now. Do not defer discoverability until onboarding; also do not make a new shell, broad template library or general design system a dependency of this slice.

### Proposed construction boundary

| Increment in the same bounded plan | Delivered outcome | Dependency / exit |
| --- | --- | --- |
| **3.0 Start-document prerequisite — separately reviewable** | Explicit Blank creates a legitimate native root/page; cloning preserves populated default and other pages; opening either permits the first native insertion. | Issue #1 regression plus native Blank and clone journeys. This correction is not silently bundled into styling. Requires approval as part of this scope. |
| **3.1 Surface adapters + discoverable tasks** | Root and eligible Containers can choose supported fill/Material, refine it without collateral changes, and reach Surface, Placement and Contents directly. | Transition/override/isolation tests and real native controls together. |
| **3.2 Native composition acceptance** | Customer constructs the two panels from Blank; edits children; manipulates; saves/reloads and Previews. | Separate visual and usability evidence, all four layout combinations, regression matrix, PO review. No seeding of the acceptance run. |
| **V0 Verification dependency — separately identifiable** | A fresh checkout can obtain authenticated original Cabinet Noir handoff assets and run the existing full byte-equality check. | Immutable original fixture/dependency, checksum verification, clean-checkout run. No renderer or artwork edits. |

These are checkpoints, not invitations to ship partial controls. The minimum credible Slice 3 includes 3.0–3.2; V0 is required before claiming the wider regression suite reproducible. Approval can explicitly separate them. No step is currently implemented.

## Current-state findings with evidence

The application was inspected locally through selection/navigation only at 1200×565 and 390×844. The running tree includes preserved unrelated WIP, so source conclusions were checked against the accepted, unchanged authority files. In-memory probes perform no database/network writes. [Evidence directory](proofs/slice3-readiness-2026-10-23/).

| Priority | Demonstrated finding | Consequence and recommended correction |
| --- | --- | --- |
| **P0** | `cloneExperienceDocument` calls `canonicalizeExperienceConfig` on canonical input and again on its cloned canonical result. The latter expects a projection and writes its missing legacy root into the default page. Probes: source 1 node → canonical 1 → legacy clone 0 / canonical clone 0. | First document can open empty. Separate cloning/projection correction, plus explicit Blank entry using existing page creation. Do not repair this with fixture JSON or a second cloning path. |
| **P0** | `applyStudioSurfaceTreatment` retains `materialPreset` and `gradientFill`. Canvas prioritizes that Material branch. Gunmetal → Solid `#123456` → Image → Transparent still resolves Gunmetal in every probe. | Explicit mode changes must clear incompatible active fill/recipe state through the existing adapter. Undo restores the old full appearance. |
| **P0** | `applyStudioSurfaceParameters` reads/clamps a full state and rewrites all fields. Border-only change on radius 72, opacity 0 and a rich CSS shadow produced radius 48, opacity .1 and shadow 0. | Patch only owned properties; synchronize the relevant existing compatibility fields without normalizing unrelated authored values. Preserve zero, rich shadows and recipe details. |
| **P1** | A Gunmetal Container is described as Transparent by `readStudioSurfaceState`; root and Container inspectors expose only Worn Saddle Leather as a Material card. | Resolve the effective active treatment from existing authorities and give the same small target-compatible recipe chooser to root/Container. No new Material renderer. |
| **P1** | Clicking Appearance on a Container opens Contents/Layout, density, child constraints and size before Surface. At the inspected 565px viewport Surface starts at document y=1260; the group contains 72 rendered input/button controls, not 72 simultaneously visible controls. | Make **Surface** open at the actual appearance task. Offer separate **Placement** and **Contents** entrances in the same Inspector/sheet; retain all professional controls behind relevant sections. |
| **P1** | Container edit wrapper is overflow-visible even when authored clipping is active; Preview clips. Its visual background clips separately from children. | Clip the content plane consistently while keeping manipulation chrome outside it. Do not use edit-only visible overflow to imply published output. An explicit diagnostic can reveal authored overflow without changing the document. |
| **P1** | Root recipes rehydrate recipe defaults; background conversion does not store general root border/radius/shadow overrides. Root's background rendering uses edge-mode radii and consumes fill/Material layers rather than all Container edge properties. | Use target-aware previews and applicability. Root supports its existing edge modes, fill, opacity, overlays and applicable Material effects; Container supports editable edges/depth. Do not promise identical controls or secretly grow the root schema. See root scope decision below. |
| **Resolved in accepted S1** | `placementAlignment` and `childAlignment` now separately fall back to legacy `alignment`; outer Flow width/spacing controls are suppressed for a Layered parent. | Keep these fields and regression tests. The older audit's proposed alignment foundation is obsolete; do not implement it again. |
| **Existing release/environment limitation** | The old browser tab had stale recovery data; fresh reload identifies the conflict. New fixture starts must use a new document ID and verified source/revision. | Preserve recovery choices and user work. Do not silently discard a recovery copy or expand Slice 3 into recovery redesign. Escalate only if a fresh document journey demonstrates a blocking defect. |

The read-only probes are reproducible via `node --import tsx docs/product-reconstitution/creative-studio-platform/proofs/slice3-readiness-2026-10-23/authority-probes.ts`. They demonstrate state defects, not native visual acceptance. Existing Page/Material suites passed **19/19** despite the probe failures: this exposes missing cross-adapter/default-page coverage rather than evidence that the defects do not exist. One initial test invocation included a nonexistent surface test path; it was corrected to the three actual suites and is not counted as additional coverage. An initial GitHub issue lookup had an argument-binding failure; corrected lookup confirmed Issue #1 remains OPEN.

## Target interaction architecture

**Select the thing → choose the task → change it → see the result → undo safely.** The canvas is the visual focus. Use neutral dark chrome, lime for selection/action state, restrained surfaces, readable labels and compact spacing; avoid decorative editor colors competing with authored content.

| Selection | Immediate contextual actions | Same Inspector / sheet task |
| --- | --- | --- |
| Root Surface | Surface, Layout | Background/Material first; then edge mode, opacity/image veil; Layout holds Flow/Layered and clearly named minimum/content/plane extent. Root is not a draggable child. |
| Container | Surface, Placement, Contents | Surface holds fill/Material, edge and depth. Placement explains the parent mode and exact supported sizing. Contents holds child Flow/Layered, padding/gap, child alignment and clipping. |
| Text | Edit text, existing formatting/Position | Retain accepted direct caret entry and source-preserving transactions; no typography expansion. |
| Image | Replace, Crop, Appearance | Existing media picker/crop task; preserve source ID, fit/focal point and frame. |
| Button | Edit label, Destination, Appearance | Existing semantic action and Material authorities; labels/actions stay independent of skin. |
| Group / multi-selection | Applicable align/distribute/group operations, Position | Existing eligibility. Do not imply Containers can enter Group membership if the current Group engine excludes them. |

Reuse `resolveEditorContext`, selection refs/target capabilities, `drawer-controller`, shell task restoration and existing adaptive workspace. A task key is UI state, not document state. Switching target retargets compatible tasks; incompatible target exits safely. Closing a media/material task returns to the selected target and prior scroll context. Keyboard focus owns its input; no canvas commands run while typing or composing.

Keep the stable rail; do not add another permanent Design/Surface rail or broad navigation redesign. Root Surface remains a named top-level selection and Outline entry. The current generic Appearance entry becomes the Surface task for Containers. This is a purposeful UI change with no new editor authority. Use compact palettes for shallow color/recipe choices and the existing deeper browser for media. At narrow widths the same tasks use one sheet with a pinned target, task selector and reachable Close/Done.

### Reference patterns and independent decisions

Canva documents selection-driven Position/layer access; Figma documents nested frames with independent parent/child auto-layout properties. Apply those principles through TapConnect's own selection and Flow/Layered contracts. Do not copy competitors' screens or assume their behavior proves Studio behavior. No competitor speed benchmark was performed.

- [Canva: finding and arranging layers](https://www.canva.com/help/finding-and-arranging-layers/) supports a visible escape path for occluded targets.
- [Canva: group, layer and align](https://www.canva.com/help/layer-group-align/) supports contextual precision operations rather than unrelated property hunting.
- [Figma: frames](https://help.figma.com/hc/en-us/articles/360041539473-Frames-in-Figma-Design) supports explicit nested scope.
- [Figma: auto layout](https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout-in-Figma) separates nested frame relationships and independent padding/gaps. Studio retains its own constrained Flow semantics and does not acquire wrapping or automatic reparenting through analogy.

Recommend showing a small proven recipe set before broad catalog expansion, and recommending a useful treatment through defaults rather than requiring users to understand Material internals. Material selection must never choose layout or restyle children. A later designed-Container starter may do more, explicitly, but is deferred here.

## Authorities to reuse and bounded adapter changes

Both root and Container already use `material-engine.ts`, `material-surface.ts` and `MaterialSurfaceLayers`. Root adapts via `compositionBackgroundFromMaterialRecipe` / `materialPropsFromCompositionBackground`; Containers use `applySurfaceMaterial` and the existing Visual Plane/Surface adapter. This is an adapter consistency problem, not absence of a shared engine.

1. **Effective fill selection:** make existing target adapters derive the active Material/solid/gradient/image/transparent source consistently. Mode switches clear incompatible active fill metadata with explicit clear semantics that survive JSON persistence. Recipe application replaces its declared appearance fields; it never changes hierarchy, geometry, children, text, actions or Access.
2. **Property isolation:** border/radius/opacity edits patch only their owned keys. Do not round-trip every field through `readStudioSurfaceState`. Preserve rich shadow strings, zero opacity, valid imported values outside slider convenience ranges, source-backed Materials and unrelated image adjustments. Expose a current out-of-slider value truthfully; no silent normalization.
3. **Recipe defaults versus overrides:** recipe application is an explicit replacement, with a clear reset path. Subsequent supported edits are local authored overrides. Root rehydration must honor the root's already-supported override fields, rather than overriding a user's opacity/value with defaults. Do not introduce linked-style propagation or a new cache of rendered styles.
4. **Preview honesty:** chooser tiles render the target's effective applied surface with the existing layers. A root preview omits unsupported Container edge/depth behavior. Verify source-backed leather separately from procedural Gunmetal because the former intentionally follows the image path.
5. **Clipping:** preserve one shared rendered content plane and a separate chrome layer. Rounded corners clip authored content only when the relevant authored policy says so. Legitimate invisible padding and Placement bounds remain supported.
6. **Opacity language:** Surface opacity affects the surface layer, not children; Image opacity and veil apply only to the image treatment. Never rename overall object opacity as Surface opacity without inspecting its consumers.

**Root scope decision for approval:** keep existing Contained/Inset/Full bleed edge behavior in this smallest slice, including derived radius and full-bleed applicability. Do not add arbitrary root border/radius/shadow storage merely to mirror the Container panel. The primary fixture uses a full-bleed neutral root, so those new fields are not a dependency. Root fill/gradient/image/Material, existing opacity/overlays, layout and content extent are included. If PO requires independent root edge/depth overrides now, that is a named additive document/validation/renderer contract extension requiring approval, not an invisible UI patch. Preserve all existing root capabilities and make unavailable properties clear.

### Placement versus Contents: four required combinations

| Parent mode | Container contents | Frame operation | Child operation |
| --- | --- | --- | --- |
| Flow | Flow | Parent reorder/alignment/eligible width; no fake X/Y offsets | Child reorder/gaps/alignment; wrapping stays as existing semantics |
| Flow | Layered | Flow placement; accepted frame resizing preserves local physical child geometry | Child X/Y/overlap in the Container plane |
| Layered | Flow | Free parent-relative movement/rotation/exact frame size | Flow reflows through existing rules; no Scale Contents |
| Layered | Layered | Free frame manipulation; preserve eligible child positions/dimensions | Nested Layered coordinates, snapping and constraints |

Surface edits cannot switch either mode. Frame resizing is authoring-time geometry, not a responsive override. Retain percentage/stretch intent, content minimum, Layered plane and required extent as separate concepts. No cross-parent matching, generalized drag-to-nest, Container grouping extension or new height limits.

## Start-document and cloning prerequisite

[Issue #1](https://github.com/TapMagic/Tap-Connect-Studio/issues/1) is OPEN and high priority. Its original body names the route argument incorrectly; the earlier issue comment corrects it to `sourceId` (stored provenance is `sourceDocumentId`).

`POST /api/experiences` uses `prepareIndependentExperienceDraft` for both selected-source and default main-Card creation; that calls `cloneExperienceDocument`. Thus **the same destructive default-page clone path is a demonstrated first-time creation dependency**. Missing source currently returns 409; there is no genuine Blank request path in the accepted route.

The precise narrow correction is to clone authoritative page compositions directly and commit a projected page only when an actual projection is present. Preserve valid populated, empty and legacy input; do not weaken `canonicalizeExperienceConfig` so intentional deletion of all content stops working. On canonical input, no absent root may overwrite a populated page. Remap page, node, Group, nested-action and internal-page references through the existing clone authority. Preserve source bytes and existing publication/credential isolation.

Add a plainly named **Blank** choice using the existing `createBlankExperiencePage` / native document authorities, with a typed start-mode request and backwards-compatible handling of existing `sourceId` requests. Default first-time creation to Blank; explicit Clone remains distinct. No onboarding/template gallery or client/artist taxonomy redesign.

**Separate unresolved boundary:** the previous native empty-Experience Add attempt did nothing. The in-memory probe now shows `insertObject → canonicalizeExperienceConfig` successfully creates one node after the empty clone. Therefore the Add no-op is **not proven to share the clone function's exact cause**. Trace its native selection/destination → `addComposerElement` → normalization → commit boundary within 3.0. Repair only a demonstrated missing-root/destination projection precondition. If it requires another engine or unrelated workflow changes, return the concrete scope conflict. Native Blank creation and first insertion are blocking prerequisites; no database seed or manual JSON may substitute.

## Cabinet Noir reproducibility prerequisite

The clean Slice 2 suite remains **517 passed / 1 failed**, not green. The failing test compares each original handoff file against the committed public file and registry SHA-256. `/tmp/` is ignored; some rulebooks/manifests were historically committed, but the original binary files are absent from clean exports.

Read-only inspection found **48 referenced original files, 79,604,029 bytes (~75.9 MiB), zero missing locally, zero checksum mismatches**. With those existing local originals, the unchanged Cabinet Noir registry suite passes **8/8**. That does not retroactively make the clean-checkout suite pass.

**Recommended minimum dependency:** package only those 48 independently sourced original files at their provenance-relative paths, plus the existing manifest/checksum metadata, into one immutable versioned test artifact. Pin its digest and authenticated repository-owned download location; setup extracts into the documented handoff path and verifies every checksum before running the unchanged test. Missing or mismatched artifact is a hard failure. Use the repository's existing artifact hosting/CI credentials; do not introduce a new asset service or credentials system. If that hosting is unavailable, propose tracking the exact original fixture (with its ~76 MiB repository cost) explicitly rather than inventing a URL or suppressing the test.

This plan does not upload or publish an artifact now. Approval of V0 must include its repository-owned artifact destination. Never populate the “original” fixture by copying `public/` output, regenerate imagery, remove byte equality, replace it with existence tests, or skip the check in CI. Preserve all 44 production assets, four references, geometry, semantic slots and launch goldens unchanged.

## Native visual acceptance: exact construction plan

The exact PO illustration was not available in the supplied attachment or the documented target inspected for this pass. **Exact-reference comparison remains BLOCKED.** The following is a provisional, measurable native composition, not a claim to reproduce missing pixels.

Use a new unpublished local Experience through **New → Blank**. The primary output is 390px wide, with a deep neutral root; desktop workspace shows that same output at an explicit zoom. Root Layered is an intentional fixture choice, not a new product default. A separate Flow-root companion proves layout semantics.

Provisional design tokens: root `#0B0F14`; two equal-width ~326px panels inside the current 390px surface's content region; 20–24px separation; 20px panel corners; 20px padding. A uses a clean solid `#17212C`, a subtle 1px rim and restrained shadow. B uses existing Gunmetal only if native visual review finds it sufficiently restrained; retain Worn Saddle Leather as a source-backed transition regression, not a forced aesthetic. Heading ~24px, body ~16px, readable contrast and consistent left alignment. Values are authored through controls and can be refined after inspection, not hidden constants in components.

| Step | Native task and expected result | Required record |
| --- | --- | --- |
| 1 | New → Blank, name Experience; root exists and is selected | Document/page/root IDs, source mode, native first insertion works |
| 2 | Surface: dark solid, inspect gradient and Material alternatives, return to intended root | Preview tile versus result; independent Undo/Redo; no child restyling |
| 3 | Set root Layered explicitly; Add Container A into root | Visible destination and selection; one native Container |
| 4 | Surface A: solid/rim/corners/depth; Contents A: Flow, padding/gap | Relevant task opens without unrelated panel hunting; no root change |
| 5 | Add Heading/body Text and a Button into A; edit label and destination | Accepted Text transactions, existing action validation; safe local internal-page navigation in Preview |
| 6 | Add independent Container B; choose its Surface/Material and clip policy | B's recipe/edge edits do not change A, root, text or actions |
| 7 | Contents B: Layered; add an owned native Image using the existing picker, then Text overlay | Image ID/crop/focal state; real selectable native children, no complete-design screenshot |
| 8 | Enter/exit each Container, select child then ancestor from canvas and Outline | Target name, mode and insertion context agree; no accidental reparenting |
| 9 | Drag A/B from body, align equal edges/centers, resize with handles and exact fields | Placement dimensions agree; A reflows; B's eligible local physical geometry remains stable |
| 10 | Exercise rotation/snap then undo; nudge 1px/10px; duplicate/copy/paste/delete an eligible child or set | Existing commands, identities, relative geometry and correct keyboard ownership |
| 11 | Material→Solid→Image→Transparent and reverse via Undo/Redo on root, B and nested test Container | Effective fill and preserved unrelated fields before/after; source-backed and procedural recipes |
| 12 | Save, close/reopen, select and edit nested Text; Preview/test Button locally | Saved revision and IDs, current source of Preview, no public publication |
| 13 | Review full composition, clipped corners, shadows, text hierarchy and mobile editor | Separate visual rubric, usability ledger and PO hands-on decision |

A runtime snapshot may be exported **after** successful native construction to support regressions. It is not construction evidence. Attach the continuous action trace or annotated screenshots with each starting state, command/result and failure. No authenticated production fixture, seeding, JSON injection, CSS reconstruction or database write is permitted in the acceptance journey.

### Measured usability and proposed thresholds

Count committed value changes, selections, clicks/taps and completed drags as actions; a typed phrase counts as one entry action. Count panel transitions, scroll gestures, wrong-target selections and corrections separately. Record elapsed active task time and automation/system wait time separately. A native automation run does not establish first-time human discoverability.

Current **measured** facts: root task opened in one activation; Outline → named Container → Appearance took three activations; Surface remained below the first viewport of that task (y=1260 at 1200×565). These are short navigation observations, not the full construction baseline. **No percentage speedup or end-to-end completion time is established.** A baseline task blocked by cloning is marked blocked at that step; it cannot serve as a numeric denominator for a candidate success percentage.

Proposed acceptance targets, subject to this scope approval: selected Container → Surface/Placement/Contents in one activation; each task's primary controls visible without an initial scroll at desktop and 390px; exact geometry within one task activation; no irrelevant panel transition for color, Material, padding or target selection; zero silent wrong-destination insertion; every ordinary committed change undoable. Log totals for the full journey rather than inventing a universal click budget. After engineering readiness, observe at least three representative novice users: at least two complete the described composition without code or moderator instruction in 15 active minutes. This is a formative target, not a measured result or replacement for PO acceptance; template-led onboarding studies remain later scope.

### Visual fidelity rubric (separate gate)

Require clean rounded clipping without halos or leaks; consistent panel alignment within 1 CSS px at reference zoom; explicit spacing and hierarchy; readable body/button text at 390px; no stretched image or Curated artwork; subtle distinguishable Materials whose previews match their target output; no chrome in Preview; no overlapping critical text/actions. Check contrast against actual composited surfaces, focus visibility and meaningful image alt text. Store Canvas and Preview screenshots at matched dimensions and include 100% crops for corners/rims. Human design inspection is mandatory. Reference receipt later requires recording the exact asset/hash and a real comparison; it does not turn this provisional design into an exact match automatically.

## Tests and evidence required after authorization

| Area | Automated evidence | Native / visual evidence |
| --- | --- | --- |
| Creation/clone | Canonical input without legacy root, legacy input, multiple pages, default/nondefault/empty pages, source immutability, remapped Groups/actions and unpublished state; Blank with no prior main Card | Library Blank → first Text/Container; populated clone → edit/reopen/Preview. Assert no empty-success/no-op |
| Material state | Pairwise transitions plus full Material→Solid→Image→Transparent chain; recipe/reset; one-key border/radius/opacity patches preserve other authored fields including 0, >slider-range and rich shadows; serialization; target applicability | Root/Container/nested chooser → actual result; procedural and source-backed Material; preview/reload and Undo/Redo |
| Layout/geometry | All four parent/child combinations; independent placement/child alignment; nested rotation, padding/borders, clipping; percentage/stretch intent; frame vs content vs plane; copy/duplicate/group remaps | Body drag, handle/exact dimensions, alignment/distribution, 1px/10px nudge, mode switch and Undo; no scaling of eligible children |
| Selection/tasks | Target/task resolver and stale/deleted/locked target fallback; input ownership; task back/close and media return | Canvas/Outline parity, selected parent versus child, occluded target access, no pointer leakage from toolbar |
| History/persistence | Begin/preview/commit/cancel/no-op, one completed gesture per entry; complete identity/style/source round-trip | Undo/Redo through material chain and repeated paste, save/reopen/re-edit and matching Preview |
| Surface rendering | Existing Material parity, page backgrounds, shared image rendering, clipping and compatibility cases | Full workspace and output screenshots; old documents unaffected, Curated goldens unchanged |

Run focused new behavioral tests, accepted Frame/Page and Text regressions, parent/clipboard/group/Material/Page suites, typecheck and production build from a clean intended-source export. Run broader Studio suite with V0 dependency; retain any failures explicitly. A source-string assertion is not an interaction test. Full release checks remain separate from desktop candidate evidence.

### Mobile and responsive proof requirements

Record both editor viewport and authored delivery width. At 390×844 and an intermediate width, verify one reachable task sheet, visible target, keyboard-operable controls, no horizontal control overflow, practical scrolling, 44px coarse-pointer targets, handle collision handling and clear focus. Preserve the existing phone-first responsive rendering contracts; this slice adds no breakpoint authoring or responsive geometry model.

Physical iOS Safari and Android Chrome checks must cover touch body-drag/resize, nested scope, numeric controls, paste, text caret above OS keyboard, IME, focus return, sheet dismissal and scroll-versus-drag intent. Safari/WebKit desktop and keyboard/assistive-technology checks remain separately recorded until performed. Emulated dimensions cannot pass these gates. Slice 1/2 desktop acceptance stays accepted while these release gates remain open.

## Proposed files and boundaries

| Files / authority | Intended bounded change |
| --- | --- |
| `lib/fusion/card/experience-pages.ts`, `lib/fusion/card/experience-library.ts`; `app/api/experiences/route.ts`; `components/fusion/card/experience-library.tsx` | 3.0 canonical clone preservation, explicit Blank request/entry; use existing document creation and page helpers. Overlapping Library/API WIP must be isolated by hunks and preserved. |
| `components/card/tap-card-builder.tsx`, `lib/fusion/card/object-kernel.ts`, `lib/fusion/card/composer-model.ts` | Trace first insertion; change only demonstrated root/projection/destination preconditions. Existing command/history adapter remains authoritative. |
| `lib/fusion/creative-studio/platform/surface-capability.ts`, `lib/fusion/creative-studio/material-engine.ts`, `lib/fusion/creative-studio/material-surface.ts`, `lib/fusion/creative-studio/visual-plane.ts` | Fix existing active-mode and property-patch adapters, supported overrides and target preview resolution. No parallel styling state or engine. Only touch the shared resolver if a failing shared test requires it. |
| `components/fusion/card/reconstitution/studio-card-surface-inspector.tsx`, `components/fusion/card/reconstitution/studio-composition-inspector.tsx` | Target-aware Surface controls, small existing recipe set, isolated edge/depth edits; reuse precision, color and media controls. |
| `components/fusion/card/reconstitution/card-studio-reconstitution-workspace.tsx`, `components/fusion/card/reconstitution/studio-selection-toolbar.tsx`; `lib/fusion/creative-studio/reconstitution/drawer-controller.ts`, `lib/fusion/creative-studio/platform/adaptive-workspace.ts` | Wire selected target + requested task through the existing shell/sheet; preserve task restoration. The selected-target toolbar remains the single contextual action surface. |
| `components/fusion/creative-studio/creative-composition-canvas.tsx`, `components/fusion/creative-studio/material-surface-layers.tsx`, `lib/fusion/creative-studio/platform/card-surface-rendering.ts` | Content/chrome clipping separation and target rendering parity only where demonstrated. Keep accepted pointer/keyboard/geometry logic intact. |
| Existing `__tests__` suites; new bounded Surface adapter tests; `e2e` native journey | Exercise state transitions and actual controls. Post-construction fixture snapshot only. |
| Cabinet Noir dependency manifest/bootstrap/CI configuration (V0) | Pin and provision original test artifact; no artwork, registry hash, golden or test weakening. Destination requires approval. |

These are proposed edit locations, not permission to change every file. No database migrations, new domain models, publication routes or credential infrastructure are needed. No changes to the accepted Text engine are planned.

## Architectural red team and rollback

- **Two styling truths:** adding another universal Surface object would increase the present precedence problem. Repair target adapters and declare one active fill; keep serialized compatibility fields synchronized and tested.
- **Canonicalization ambiguity:** making normalization “helpful” may resurrect intentionally deleted content. Distinguish canonical document from active projection at the call boundary and test empty edits explicitly.
- **Clipping versus selection:** clipping the outer wrapper may make handles unreachable. Put visual content under authored clip and keep one existing chrome layer outside it; verify rotated/nested cases.
- **Root/Container false parity:** a viewport root and a movable panel have different edge applicability. Target-aware previews must tell the truth; root schema expansion is a separate approval decision.
- **Property-loss migrations:** no blanket read-normalize-write when a single property changes; preserve imported values and legacy fallbacks. No automatic whole-document rewrite on load.
- **Responsive damage:** authored frame edits must not turn percent/stretch behavior into permanent pixels or silently scale children. Run accepted S1 regressions rather than replace geometry.
- **tApIt duplication:** future assistance receives selected composition context and permitted existing operations, proposes native patches, previews and commits through the same validation/history. No new AI service, capability registry, document schema or approval engine is justified now.
- **Domain leakage:** visual nodes reference existing action/resource/domain identities. EverEncore relationships, memberships, collectibles/entitlements, Commerce, Campaigns, retained connections, personalization and TapStay remain owned by their platform domains. Styling cannot mint or copy credentials, change Access, or establish customer relationships.
- **Unrelated WIP:** fixture source is exact approved commit plus intended changes. Do not incorporate Library classification/discovery WIP merely because the files overlap; ask about a concrete inseparable conflict rather than reset it.

Use separate normal commits for 3.0, V0, adapters and task UI/evidence. Preserve accepted fixture snapshots; create new native fixtures. On regression, revert only the responsible committed increment through a normal reviewed revert, preserving later unrelated work; never reset, force-push or overwrite saved documents. No new persistence schema is proposed in the core plan, so rollback needs no migration. Do not restore an old editor over newly authored documents until compatibility is checked. Accepted baselines remain immutable references, not forced reset targets.

## Explicit deferrals and requested decisions

Deferred: broad shell/rail redesign, new template gallery, six-family Material catalog expansion, new shaders/lighting engines, arbitrary root edge/depth override schema, advanced typography, general Scale Contents, wrapping, cross-parent matching, Container grouping expansion, generalized drag-to-nest, responsive authoring, live linked styles, new AI/tApIt execution and business-domain infrastructure. No staging/production/publication work.

The approval request is for **3.0–3.2 as specified**, with V0 reviewed separately including artifact destination. The proposed root applicability boundary is intentional and reviewable. If those boundaries are accepted, the [complete self-authored implementation prompt](SLICE3_NATIVE_SURFACE_CONTAINER_IMPLEMENTATION_PROMPT_2026-10-23.md) is the construction directive. Until explicit approval, perform documentation/review only.
