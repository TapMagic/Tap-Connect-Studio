# Slice 1 — Select and Resize with Confidence

**Local corrective candidate; Slice 1 remains OPEN / NOT ACCEPTED.** Product Owner hands-on acceptance and independent review remain pending. No Slice 2, production mutation, deployment, migration or publishing occurred. Love & Theft's protected baseline remains unchanged by this work; production hash verification remains **BLOCKED**. The separate visual reference has not been received or compared.

## Review entry

Local Chrome fixture: `http://127.0.0.1:3050/dashboard/card/edit?experience=cmvkcynh504ty9x9k3mzi91js`

Name: **Select and Resize · PO Acceptance**. Saved local revision 24, unpublished, no publication snapshot. The existing main-card acceptance fixture was preserved: revision 5579 before and after, with identical draft content. This new fixture was seeded through existing local document APIs, then exercised with native controls. Seeding does not count as native creation acceptance for the future two-Container journey.

Use **Outline** to select the Group, Container or child independently. The desktop contextual **Position** button and phone dock **Position** button open exact geometry directly. The fixture is at 50% zoom; use Fit/100% and scroll as needed.

1. Select the Group → Move / Resize. Check exact X/Y/rotation, the single Group envelope and Group-only handles. Ungroup to test multi-selection, alignment and distribution, then Undo.
2. Select Nested Layered Container → Position. Resize its outer frame; inspect padding and border separately from **Inside this Container** layout.
3. Select Nested Image. Drag its corner and rotation controls; compare unrotated dimensions with Position → px. Its ancestor is rotated and padded.
4. Enter an oversized width. Read the applied-size message and Parent bounds adjustment path. Image Fit → Contain keeps proportions; Cover permits independent frame sizing.
5. Make two exact edits, Undo twice, Redo twice; begin another edit and Escape. Verify no hidden duplicate history steps.
6. Save/reload and Preview. Frame diagnostics distinguish authored Placement, estimated Visual overflow and action-target Touch bounds.

## Root causes and corrections

| Finding | Cause | Bounded correction |
| --- | --- | --- |
| Inconsistent exact dimensions | Parent-size fallback assumed every Container used normalized Layered width, and defaulted padding to 0 rather than the renderer's 16px. Pointer input also rounded parent dimensions to integer client sizes. | Correct the shared fallback's Flow width/padding rules. Canvas and Inspector read fractional, untransformed content dimensions from the canonical renderer. Observation remains transient and never rewrites authored geometry. |
| Apparently ineffective resizing | Layered selections also exposed Flow width/spacing controls that the renderer ignored. Aspect-locked images disabled both exact dimensions despite supporting proportional pointer resize. | Show applicable placement controls; separate Container placement from internal layout. Exact sizing uses the shared resize policy and scales both dimensions when governed. |
| Bounds/constraints unclear | Minimums, aspect policies and parent clamping were disconnected from effective feedback; clamping could move the opposite edge. | Shared minimum-frame limits, explicit applied-size messages and existing Parent bounds control. Resize stops at the Placement boundary while preserving the anchored edge, including rotated gestures. |
| Oversized handle presentation | Move grips still painted 36px controls even though existing corner marks had already been reduced. | 12px move marks, existing 6px corner/8px rotation marks; separate 24px pointer targets and 44px coarse-pointer targets, compensated for zoom. Only the applicable active selection has handles. Phone numeric fields measure 44px high. |
| Anchor looked functional without effect | Stored anchor metadata has no implemented Layered positioning effect but capability declarations advertised it. | Remove the inactive Layered anchor capability. Retain explicit parent-top-left / opposite-edge resize / frame-center rotation explanation. Preserve stored metadata; introduce no anchor engine. |
| Selection scope confusing | Inspector heading said only Module/Container; Group toolbar counted selected IDs rather than canonical Group members after context restoration. | Name the selected Element/Container, retain parent breadcrumb, and count canonical Group members. Locked Group geometry controls explain the unlock path. |
| Extra Undo steps | Exact geometry inputs called the recording patch API during typing and committed a transaction again on blur. | Use existing preview/commit/cancel APIs. Add a small composition-block preview adapter for Group geometry, backed by the same Canvas transaction path. No new history authority. |
| Mode restoration changed geometry | Returning to Layered could reseed older authored content lacking an initialization flag, then clamp existing placement to different limits. | Recognize already-Layered placement as initialized and preserve stored geometry when returning from Flow. |

The existing task toolbar stays upright in a workspace row rather than rotating with the selection. This pass labels Position and checks its access on phone; it does not introduce a new floating-toolbar placement engine. Container padding and invisible layout area remain legitimate Placement bounds. Material rendering continues through the existing shared Material authority.

## Evidence and limits

Final focused run: **54 passed, 0 failed** across resize confidence, Layered precision/selection, Group authority, snapping, composition operations, history labels and editor history. [Full TAP output](proofs/select-resize-confidence/focused-tests.tap). TypeScript `tsc --noEmit --incremental false` exited 0 with no diagnostics: [record](proofs/select-resize-confidence/typecheck.txt). `git diff --check` passed. No full repository/build/production certification is claimed.

The initial Layered precision suite had two failures: display precision and a stale literal-source assertion for a dynamically constructed Group rotation test ID. Precision was corrected; the obsolete literal assertion was removed, with Group rotation exercised through the real control. Failures were not counted as passing evidence.

Measured native interactions:

- Root pointer resize: 80.52×121.6 → 117.12×151.6px; rendered result 117.117×151.594px. Exact 130px width rendered as 130px.
- Rotated/padded Container: 280×220px, 16px padding and 20° rotation; native corner resize visibly changed it to about 236.242×193.352px.
- Child inside that rotated Container at 50% zoom: 40.844×32.266 → 89.859×46.789px; Inspector 89.87×46.79px.
- Flow-positioned Layered Container: content region 334×220px. A child rotated 15° resized through the pointer from 120×130 → 163.055×151.586px; Inspector 163.06×151.59px. Dormant ancestor rotation was not incorrectly applied.
- Layered Container with internal Flow: exact 250px outer width rendered 249.992px; all three children remained Flow-positioned.
- Alignment produced root sibling X values [.08, .08, .08]. Vertical distribution produced equal normalized gaps of .0302631579. Native grouping and Group rotation 25° → 45° worked; Undo restored 25°.
- Two consecutive exact edits: [153.64,165] → [120,165] → [120,130]. Undo twice restored each preceding state; Escape restored 153.64 and retained both Redo operations.
- A requested nested width of 1000px visibly reported and applied 122.55px at its parent boundary. Aspect-locked width requests preserved ratio and reported the effective constrained result.
- Edit/Preview widths, heights and transforms matched for seven nodes, and persisted reload matched those values. These checks preceded final fixture arranging; the final fixture's saved revision was independently read back.
- At a measured 390px viewport, Position was reachable directly from the phone dock, Inspector width was 390px and numeric field height was 44px. Exact width edit and Undo worked. This was desktop browser input, not a physical phone keyboard/touch/IME test.

[Structured interaction evidence](proofs/select-resize-confidence/interaction-evidence.json) records measurements and automation failures. Root and nested pointer targets were observed; the 44px coarse-pointer rule is source-verified but **physical touch is unverified**. Software keyboard, caret and IME acceptance remains part of gated Text Editing Truth; no such implementation or acceptance is claimed here.

Visual evidence:

- [Before: duplicated geometry controls and generic selection heading](proofs/select-resize-confidence/01-before-inspector.jpg)
- [After: native root resize and matching Inspector](proofs/select-resize-confidence/02-after-native-resize.jpg)
- [After: nested rotated-parent resize](proofs/select-resize-confidence/03-nested-rotated-parent.jpg)
- [Discovered Group-count defect before its correction](proofs/select-resize-confidence/04-group-selection.jpg) — the image's “1 Modules” count is a recorded defect, not accepted final output; subsequent DOM/native-window checks showed “3 Modules.”
- [Preview during parity check](proofs/select-resize-confidence/05-preview.jpg)
- [Mixed-layout resize and exact values](proofs/select-resize-confidence/07-mixed-layout-resize.jpg)

**Capture limitation:** the replacement phone screenshot was malformed and is retained as `06-mobile-capture-INVALID.jpg`, excluded from passing visual evidence. Final screenshot attempts timed out three times, including after viewport reset. The saved fixture and its three-member Group were confirmed through native Chrome accessibility, but no successful final-overview screenshot is claimed. Earlier successful captures remain available. A missed initial pointer drag and a mixed-layout selector timeout were resolved and retested; neither failed attempt counts as a pass.

## Architectural compatibility and remaining review

No competing editor, Material, geometry, history, persistence, publishing, permission or AI engine was added. The new renderer-content-box observation and Group preview adapter are small foundations demonstrated by current Canvas/Inspector consumers. Future tApIt must consume these same capabilities and commands, as required by [standing interaction principles](STUDIO_CANONICAL_INTERACTION_PRINCIPLES.md).

Visual overflow diagnostics remain explicitly **estimated**, not a measurement of every painted glyph, material shadow or filter. Exact paint-bound reconciliation is not silently substituted for authored Placement. Browser layout observation covers actual Flow/grid/flex sizing in the mounted Inspector; the serialized parent-size fallback does not simulate all CSS flex/grid resolution. Headless operations needing resolved physical sizes should consume validated renderer context rather than treating that fallback as measured geometry. This is a remaining architectural review concern, not permission to build a second layout engine.

The broader familiar-keyboard target is documented, not fully implemented in this slice. Existing Layered keyboard nudges still use 1%/5% increments rather than the proposed 1px/10px contract. A separately authorized keyboard consistency slice must reconcile those paths and focus scopes. No speculative tApIt, membership, collectible, entitlement or Commerce infrastructure was built.

## Changed source and handoff boundary

Exact source list and SHA-256 fingerprints: [source manifest](proofs/select-resize-confidence/source-manifest.json). The 12 changed files are:

- `components/card/tap-card-builder.tsx`
- `components/fusion/card/card-editor-live.ts`
- `components/fusion/card/reconstitution/card-studio-reconstitution-workspace.tsx`
- `components/fusion/card/reconstitution/studio-composition-inspector.tsx`
- `components/fusion/creative-studio/creative-composition-canvas.tsx`
- `components/fusion/creative-studio/use-layered-parent-size.ts` (new)
- `lib/fusion/creative-studio/platform/layered-region.ts`
- `lib/fusion/creative-studio/platform/geometry-units.ts`
- `lib/fusion/creative-studio/platform/frame-semantics.ts`
- `lib/fusion/creative-studio/platform/position-capability.ts`
- `lib/fusion/creative-studio/__tests__/layered-precision-selection-truth.test.ts`
- `lib/fusion/creative-studio/__tests__/select-resize-confidence.test.ts` (new)

Repository: `TapMagic/Tap-Connect-Studio`; branch: `codex/studio-reconstitution-slice-1`. The initial six-document sync was pushed and independently blob-verified at `f3ab08d689fb720d84c90133db69ecd16dbf104f`. This follow-up documentation commit includes the standing principles and this evidence package.

**Application source remains local and uncommitted** to preserve pre-existing work in shared dirty files. The published [corrective source delta](proofs/select-resize-confidence/local-corrective-delta.patch) is the exact change against pre-pass local snapshots, plus new files; it allows code inspection but is not a standalone patch against the remote HEAD. The remote documentation SHA is not a claim of a clean, remotely buildable application candidate. Existing uncommitted Slice 1 dependencies remain necessary. This source-integration boundary must be resolved before a release candidate is staged; no unrelated source was bundled into a commit.

Recommended next step: independent review of the source delta and limitations, followed by another Product Owner hands-on pass in the local fixture. Re-capture failed visual evidence with a functioning browser capture path. Do not close Slice 1 or start Text Editing Truth based on this report.
