# Self-authored construction directive — Slice 3

> **Subsequent Product Owner decision — October 24, 2026:** [Slice 3 desktop functional acceptance](SLICE3_DESKTOP_FUNCTIONAL_ACCEPTANCE_2026-10-24.md) is recorded. The remaining visual, device, accessibility and release gates remain open. This document preserves its original checkpoint wording; the [next construction proposal](SLICE4_DESIGN_DISCOVERY_SCOPE_PROPOSAL_2026-10-24.md) is planning only until explicitly approved.

**PROPOSAL ONLY. Do not execute this directive until Rich explicitly approves the bounded Slice 3 scope.** This document is complete enough to hand to an implementer; its presence in GitHub is not authorization.

## Objective and inherited authority

Deliver **Create and Style Two Native Containers**: a first-time customer creates an unpublished Blank Experience, styles its root Surface, builds one Flow Container with Text and a functional Button and one Layered Container with a native Image/Text overlay, refines both through direct manipulation, and saves/reopens/Previews an editable, polished composition.

Operate in the canonical TapConnect Studio. Read `AGENTS.md`, `PRODUCT_STEWARD_CONSTITUTION.md`, `STUDIO_RECONSTITUTION_INTERACTION_SPEC.md`, `STUDIO_CANONICAL_INTERACTION_PRINCIPLES.md`, and the installed Next.js guides relevant to any changed code. Use the [approved version of the readiness proposal](SLICE3_NATIVE_SURFACE_CONTAINER_READINESS_2026-10-23.md) as the scope contract. Honor the latest PO approval over obsolete historical status statements.

Accepted desktop baselines are Slice 1 `3bda89b502e629e867cd5daa6b13050a0f4bcb3c` and Slice 2 `a7e3dc1e1f722038d737a8239b0ff31662fc6d79`. Preserve geometry/frame/page, Text input, selection, keyboard/pointer, history, rendering, validation, persistence, Material and publishing authorities. Do not reopen accepted interaction work without a demonstrated regression. Physical touch, OS keyboard/IME, accessibility, Safari/WebKit and full release checks remain separate open gates.

No main merge, force push, reset, discarded WIP, staging/Railway/production deployment, migrations, publication or Love & Theft changes. Production hash verification stays BLOCKED. No new identity, Access, QR, membership, Commerce, Campaign, AI or domain infrastructure. No Enrique or delegated implementation unless Rich explicitly requests it.

## 0. Establish a trustworthy starting point

Verify repository root, branch, HEAD, upstream and dirty status. Expected repository is `TapMagic/Tap-Connect-Studio`, existing branch `codex/studio-reconstitution-slice-1`; verify, do not assume. Fingerprint unrelated WIP before changes, especially Experience Library/API/classification, discovery/navigation, map screenshots, local tsconfig/output and pnpm files. Overlapping files are not permission to commit unrelated hunks. Isolate the intended source in a clean export for final testing. If changes are inseparable, present the exact conflict; do not reset them.

Take read-only snapshots of accepted local fixtures; do not edit or seed them:

- Slice 1 `cmvlqtmjb01fodf9kz8q2eml7`, planning snapshot revision 49.
- Slice 2 `cmvlsjkq7093adf9k2mzgqf7i`, planning snapshot revision 66, not the earlier engineering revision 26.

Create a new local unpublished document for every destructive test journey. Use an explicitly verified local database environment; do not inherit an unknown production connection from environment files. Do not discard existing browser recovery copies or overwrite a newer server revision. Record document/page identity and saved state before every acceptance journey.

## 1. Implement the separately approved start-document prerequisite (3.0)

First reproduce Issue #1 with meaningful failing tests before changing its authority. `cloneExperienceDocument` currently feeds canonical input into `canonicalizeExperienceConfig`, which expects an active projection; the final call can overwrite the default page with a missing legacy root. The planning probe loses a one-node default page from both legacy and canonical inputs. `POST /api/experiences` uses this clone path for first-time creation as well as explicit Clone.

Repair the canonical/projection boundary in `experience-pages.ts`, using the existing clone/remap helpers. Preserve page compositions, ordering, Group membership, nested nodes, assets, styles, semantic actions and internal-page references. Generate appropriate independent document/page/node/action/analytics identities. Keep publication/credentials isolated. A missing legacy root on a canonical multi-page document must not mean “delete default-page content.” Conversely, an intentional user deletion of all active-page content must remain valid. Do not globally change normalization to resurrect empty pages.

Add an explicit **Blank** starting choice through the existing Library/create route and native page helpers. Use a small typed request distinction while preserving existing `sourceId` compatibility. A first-time user with no main Card must be able to create Blank. Default this workflow to Blank; keep explicit Clone available. Do not redesign client/artist taxonomy or add a template gallery.

Trace the previously observed empty-page Add no-op separately. The pure `insertObject → canonicalizeExperienceConfig` probe succeeds, so do not assume the clone fix also repairs the UI. Follow native Add intent, selected destination, `addComposerElement`, actual projection, insertion result, canonical commit and visible selection. Repair only a demonstrated missing-root/destination precondition through existing authorities. Show a visible error if insertion is rejected. Do not add a second insertion engine or call a raw database seed “working creation.”

Exit 3.0 only after native New→Blank→Add Text/Container and populated Clone→edit→save/reload→Preview work. Test empty/legacy/multi-page input, default and nondefault page preservation, source immutability, unpublished state, no new credential and remapped internal references. Keep Issue #1 open until its own native correction is verified. If first insertion requires materially broader changes, stop that expansion and return the evidence for approval.

## 2. Repair Surface authoring adapters and expose the repaired task together (3.1)

Read `surface-capability.ts`, `material-engine.ts`, `material-surface.ts`, `visual-plane.ts`, `MaterialSurfaceLayers`, the root/Container Inspectors and shared Canvas renderer as one pipeline. Root and Container already share the Material authority. Preserve it.

Add regression tests for the demonstrated failures:

- Gunmetal→Solid `#123456`→Image→Transparent must actually change effective fill at each step; the old `materialPreset`/gradient cannot keep rendering.
- Border-only editing must preserve radius 72, opacity 0 and an existing rich shadow string; it must not clamp them to 48/.1 or replace the shadow with 0.
- Material application, effective treatment shown by Inspector, recipe tile, Canvas, reload and Preview must agree.
- Procedural and source-backed recipes must both work. Worn Saddle Leather intentionally uses an image path; do not force it through a fake gradient.

Make explicit fill-mode transitions clear incompatible active fill state through existing adapters and durable clear semantics. Preserve non-fill properties unless the selected command explicitly owns them. Undo restores the entire prior appearance. Material application is an explicit recipe replacement; ordinary subsequent property edits are local overrides, not whole-state re-normalization. Property readers may describe fallbacks; unrelated edits may not persist those fallback values across the document.

Keep recipe defaults, user overrides and target applicability intelligible. Retain original image resource identity/adjustments where existing semantics permit; restoring an old mode is through canonical Undo or an explicit UI action, not an undocumented background stash. Applying a surface recipe never changes children, text case/content, actions, geometry, parentage, layout, permissions or identities. Use `preserveTextColor` for Surface application where appropriate, then prove descendant isolation.

Expose the existing, small target-compatible choice set through a shared presentation: Solid/Gradient/Image/Transparent where supported plus a few actually verified existing Material recipes. Begin with clean solid/gradient, Gunmetal and existing source-backed leather; reject visually weak previews instead of inventing new materials. Do not expand the entire catalog. Recipe previews must use the effective applied target authority and existing layers, not decorative screenshots.

The core approved proposal keeps root's existing Contained/Inset/Full bleed edge behavior and supported fill/opacity/overlay/layout/extent fields. Do not expose Container edge/depth controls as effective root controls. Independent arbitrary root border/radius/shadow storage requires the specifically named PO contract extension. Do not add that extension merely to make controls symmetric. Container borders/radius/depth remain fully editable through their existing authority.

Preserve exact supported imported values outside a slider's convenience range. Offer truthful numeric values and explain an actual constraint. Surface opacity controls affect the surface, Image opacity/veil their image layer; do not fade native child content unexpectedly. Check 0 opacity and transparent mode separately.

## 3. Make target and task determine the controls

Use the existing selection/capability and drawer/task authorities. Root opens Surface or Layout. Container offers **Surface / Placement / Contents** directly. Surface opens fill/Material first, with Edge and Depth progressively disclosed. Placement describes the parent's mode and eligible precise geometry. Contents describes the children's Flow/Layered mode, padding/gap, child alignment and clipping. A task selection changes UI state only.

Wire `studio-selection-toolbar.tsx`, the existing workspace/Inspector and adaptive sheet. Reuse current precision controls, color controls, media picker and task return behavior. No second permanent panel, rail taxonomy rewrite, editor shell or selection store. Keep the canvas dominant, readable neutral chrome and purposeful lime state. Do not add unnecessary confirmation to reversible visual edits.

For Text retain accepted direct editing and its keyboard ownership. Image exposes existing Replace/Crop/Appearance. Button exposes label/destination/appearance through canonical semantic action controls. Group and multi-selection show applicable shared operations; do not imply Containers can be grouped beyond existing eligibility. Root is a Surface, not a draggable child. Canvas and Outline identify the same target.

Primary task controls must be reachable in one activation from the selected target, without an initial unrelated scroll at desktop or 390px. Closing/deep-browser return restores a valid selected target and context. A stale/deleted target falls back through the existing scope policy. Numeric/Text inputs and IME own keys; toolbar interaction must never start canvas manipulation.

## 4. Preserve placement, internal layout and clipping

Retain accepted `placementAlignment` / `childAlignment` plus legacy fallback. Do not reimplement the already repaired alignment separation. Preserve all four combinations: Flow→Flow, Flow→Layered, Layered→Flow, Layered→Layered. Outer frame editing never implicitly scales eligible children; Flow reflow and explicit stretch remain governed by existing contracts. Preserve intentional percentages and responsive intent.

Use canonical move/resize/rotate/snap/align/distribute/nudge/duplicate/clipboard/delete commands. A body drag does not reparent. Flow offers reorder/alignment/sizing and a clear constraint explanation; no hidden arbitrary offsets. Layered uses parent-relative geometry. 1px/10px nudges, zoom/rotation/nesting conversion and one completed gesture per history transaction retain accepted behavior.

Correct demonstrated clipping parity by separating authored content clipping from accessible selection chrome within the existing renderer. Root/Container border-radius and content overflow need actual visual checks, not just style-object assertions. Preserve legitimate padding and invisible Placement bounds. No new pointer/geometry engine, wrapping, Scale Contents, cross-parent matching, Container Group membership or general drag-to-nest.

## 5. Construct the native acceptance composition (3.2)

Use **New → Blank**, not a seeded config. Set a dark neutral root. Explicitly choose Layered for the primary root fixture. Add independently styled Container A with Flow children: heading/body Text and a safe functional Button. Add B with an existing contrasting Material, native Image and Text overlay in Layered contents. Use only owned/local authorized imagery via the native picker. All nodes remain selectable and editable.

Start with the provisional design in the readiness proposal: 390px output, roughly 326px equal-width panels inside existing safe area, 20–24px spacing, 20px corners/padding, restrained rim/shadow, readable ~24px heading/~16px body. These are authored controls, not new hard-coded layout defaults. Refine by visual judgment. The separately requested exact reference image is still absent; do not claim exact comparison. If received, record its file/hash and evaluate it, not just acknowledge receipt.

Record a continuous native action trace or annotated sequence covering creation; root styling; A/B independent styling; adding children; text/button editing; image replacement/crop; enter/exit nested context; body dragging; alignment; handle and exact resizing; rotation/snapping; nudge; duplicate/copy/paste/delete; Undo/Redo; save/reopen/re-edit; and Preview. Validate the Button in a local safe Preview destination without publication. Export snapshots only after native construction for later regression use.

Use companion fixtures for all four parent/child mode combinations and one additional nested Container. Exercise Group manipulation on eligible existing members, not unsupported Container membership. Test root/Container/nested Material chains, source-backed and procedural treatments, geometry/child isolation and preserve Curated artwork.

Track actions, panel switches, scrolls, wrong-target selections, corrections, successful edits and active completion time. Separate automation waits. A blocked baseline remains blocked; do not compute fake percentage gains. Short current navigation measurements are not a full benchmark. Compare like tasks and label estimates versus measurements. Native automation does not prove novice discoverability; prepare a formative three-person novice study and PO hands-on review.

Visual acceptance is separate: clean corners/clipping, intentional spacing, consistent alignment, no stretched images, legible hierarchy/contrast, restrained credible Materials, target preview/application match, and Canvas/Preview parity at matched output width. Capture full workspace and output plus detail crops. Do not use a screenshot of the whole design as authored content. Exact-reference gate remains BLOCKED without the actual reference.

## 6. Verification dependency V0 — only if separately approved

Do not weaken the Cabinet Noir byte-equality test. The 48 original referenced assets exist locally, total 79,604,029 bytes, and match public/registry hashes; they are absent from clean exports. The local eight-test suite passing with those originals does not erase the clean 517-pass/1-fail result.

If V0 is approved with a repository-owned artifact destination, package only the authentic original referenced files and checksum metadata as an immutable versioned fixture. Pin the artifact digest, use existing authorized artifact access, verify before extraction, and provision the existing handoff-relative path for the unchanged test. Never synthesize source files from `public/`, skip on missing dependency, regenerate artwork or change expected hashes. If no approved artifact destination exists, leave this verification gate explicitly open and propose the repository-size tradeoff of tracking the exact ~76 MiB original fixture. Do not provision credentials or a new asset service.

## 7. Verify final intended source and prepare review

Run focused behavioral tests for clone/Blank/default-page preservation, Material mode/override isolation and task capabilities. Run accepted Frame/Page/Text, parent, clipboard, Group and Material parity regressions, typecheck and production build from an isolated intended-source checkout. Run wider Studio suite with its declared artifact dependency; report every failure. No test is passing merely because its control exists. Investigate newly demonstrated regressions within scope; do not expand unrelated work.

At desktop, 390×844 and intermediate widths, verify reachable task controls, stable scope, keyboard-only operation, focus indication, no control overflow and actual touch-target rectangles/collisions. Physical iOS Safari/Android Chrome, OS keyboard, caret visibility, native paste/IME, assistive technology and required browser compatibility remain individually named open gates until truly tested. No responsive authoring implementation is authorized.

Preserve draft/publication separation and exact fixture identities. Record source commit and dirty fingerprint, fixture IDs/revisions, browser/device/input/zoom/output width, screenshots, native trace, test/build logs, failures and limitations. Verify accepted fixtures and unrelated WIP against their initial fingerprints. Do not resolve or hide stale recovery state by overwriting user work.

Use small normal commits for independently reviewable prerequisites, adapters, contextual UI and evidence. Stage intended files/hunks only and push the existing appropriate development branch. If remote diverges, report it; never force push or rewrite history. Independently fetch GitHub versions and compare intended local contents. Return exact SHA and immutable GitHub source/report links, precise files changed, visual/native evidence, architectural compatibility findings, any scope changes, remaining gates and a working local native fixture. Keep code rollback to a normal reviewed revert of the responsible increment; never reset accepted documents.

## Stop conditions and completion standard

Stop for PO scope review before changing a locked architecture, adding root edge/depth schema, broadening first-creation work beyond its demonstrated projection/insertion boundary, or replacing any canonical engine. Keep future tApIt compatible through the same selected context, native permitted operations, validation, preview and command/history path; build no AI infrastructure. Business logic remains in its existing domains.

The delivery state is **ready for independent architecture/product review and Product Owner hands-on acceptance**, not automatically accepted or releasable. A polished output that cannot be created natively fails. An operable workflow with weak visual quality also fails. No staging or production deployment without separate approval.
