# Slice 1 — Familiar interaction corrective candidate

**Slice 1 remains OPEN for Product Owner hands-on acceptance.** This is a bounded local correction for clipboard sizing, selected-body dragging, rectangular resize semantics and keyboard nudging. No Text Editing Truth, production mutation, publication, deployment, migration, Access, QR, membership or commerce implementation. Production hash verification remains **BLOCKED**. No supplied visual reference has been compared.

## Hands-on entry

[Open final local fixture](http://127.0.0.1:3050/dashboard/card/edit?experience=cmvkg7e2v059im59k0ss0nf6f): **Slice 1 · Familiar Interactions · Final Review**. This is a separate, unpublished local Experience. It uses the existing editor, document API, local PostgreSQL database and local media storage. The existing acceptance Experience's pre-test content was restored exactly: baseline revision 91, restoration revision 110. Its revision advanced; its authored content matches the pre-test snapshot. The main-card fixture was not edited. [Preservation record](proofs/final-slice1-interactions/fixture-preservation.json).

Use 100% zoom for all eight handles, or 50% for an overview. Small selections deliberately show fewer handles to avoid overlapping pointer targets. Position remains reachable directly; exact controls remain available.

1. In Outline, choose **Nested Image copy copy**. This is a standalone free-resize image. Click its visible artwork, drag its body, then use each mid-edge and corner handle. Compare W/H in **Position → px**. Hold Shift during a corner drag; release Shift to return to free resizing.
2. **Nested Image copy** uses Contain and therefore preserves its ratio. **clipboard.png** is the green 100×60 native clipboard image. Copy/Paste or Cmd/Ctrl+D and compare dimensions. Undo removes the copy; Redo restores its same new identity.
3. Select **Nested Layered Container** from Outline, then drag empty visible space on its surface. Select either existing three-member Group and drag a member or empty space inside its Group envelope. Nested children remain selectable through Outline and the existing Group content context.
4. With canvas focus, use Arrow (1 design px), Shift+Arrow (10), then several rapid presses. One Undo reverses a burst. Click a text/numeric field and confirm its arrows belong to that field.
5. Copy the root image, select the nested Container, and Paste. If fitting is needed, read the explicit percentage message. Undo restores the preceding composition.
6. Use Save, reload, and Preview. At 390px use the bottom **Position** control. Physical touch and native Shift-drag remain part of final human verification.

## Root causes and precise corrections

| Finding | Observed cause | Correction in the existing authority |
| --- | --- | --- |
| Clipboard images change size | External import hard-coded width .28 and height .22. The workspace clipboard copied only one subtree and carried normalized geometry without source parent dimensions. Pasting that geometry into a differently sized parent changed physical size. A keydown Paste interception could also take precedence over external image data. | Decode intrinsic image dimensions before upload; 1 image pixel maps to 1 design CSS pixel at 100%, with proportional down-fit only when required. Use canonical insertion for the destination parent. Parent-authority clipboard now carries source dimensions/rotation and multiple sibling roots, preserves descendants and visual props, remaps identities/Groups, and converts root placement into destination coordinates. Actual clipboard image data takes priority; Studio text markers route internal paste. Flow image copies consume observed frame dimensions and retain layout ownership. |
| Selected body cannot move | Canonical Module bodies only changed selection; Container bodies only handled click. Move listeners were attached to dedicated grips. Multi-selection was collapsed to the seed. | Eligible selected bodies enter the existing Layered pointer path. Same-parent Flow body reorder uses the existing Flow path; body dragging never reparents. A 3px mouse/6px touch movement threshold distinguishes click from movement. Existing text-entry ownership, editing state, crop/modal context and handle ownership take precedence. Group/multi-selection retain relative geometry, snap from their moving anchor, and share boundary constraints. |
| Resize feels inconsistent | The shared Layered solver already projected movement into local axes, but it enforced minimums on inactive axes and did not receive Shift. Group corner sizing also omitted Shift. | Preserve the inactive dimension exactly, use the existing rotated opposite-edge solver, pass Shift for two-axis corner aspect preservation, and retain governed aspect/width-only policies. Hide unsupported handles through the existing capability function. Aspect-preserving gestures bypass independent-axis snapping. Inspector reads the same rendered parent dimensions. This pass does not claim that every reported diagonal movement had one proven cause; native tests now exercise the required semantics explicitly. |
| Arrows do not nudge selected objects | The window handler returned early for parent-authority compositions. A separate move-grip handler used .01/.05 normalized increments. Focus was not deliberately established on selected bodies. | Route eligible canvas-focused arrows through the existing canvas dispatcher and shared keyboard ownership checks. Replace the grip percentage path with 1px/10px parent-coordinate conversion, including ancestor rotation and zoom-independent document units. Use existing preview/commit transaction phases through the renderer adapter; a 300ms idle boundary coalesces bursts, and pointer/other-key/blur boundaries commit before the next operation. Flow never receives arbitrary offsets. |

The shared selection translation helper excludes selected descendants of selected Containers, prevents locked Group movement, converts each eligible parent coordinate space, and applies a common constraint fraction. Constrained operations explain the boundary; eligible movement with locked/Flow selections reports what was preserved. Group content selection uses the existing scope authority rather than expanding a child edit back into its Group.

External uploads use the existing Media service, not a new asset store. A composition changed during asynchronous import is preserved instead of overwritten by the captured pre-upload document. The imported asset remains available through the existing asset browser.

## Automated evidence

**103 tests passed, 0 failed**, covering new interaction geometry/clipboard cases and existing parent authority, Group, snapping, operations, selection truth, history, and adaptive workspace suites. [Full TAP output](proofs/final-slice1-interactions/focused-tests.tap). `tsc --noEmit --incremental false` passed with no diagnostics; [typecheck record](proofs/final-slice1-interactions/typecheck.txt). `git diff --check` passed. These are focused checks, not whole-repository/release certification.

New cases prove all four mid-edge axes under rotation; anchored opposite edges; free, Shift and governed corners; small inactive dimensions; 1px/10px conversion; rotated parent vectors; common multi-selection bounds; no double movement of Container children; Flow/lock constraints; source appearance/identity preservation; cross-parent size/rotation conversion; complete Group identity remapping; native image fit; Flow observed sizing; and editable/IME ownership.

## Native Chrome evidence

[Structured observations](proofs/final-slice1-interactions/interaction-evidence.json) include the recorded values, identity, CSS dimensions, transform and limitations. Screen Y can change when workspace feedback/layout changes; authored coordinates and parent-space deltas are the geometry evidence.

- Internal root paste retained **108.391×141.203 CSS px** and −1° rotation with a new identity. Group paste preserved both members and relative size/spacing.
- External **100×60** PNG rendered at **100×60**. External **800×200** PNG fit to **366×91.5**; the visible rounded notice said **366×92px, 46% of native size**. The old Studio clipboard did not override image data.
- Root image body drag changed authored placement and preserved size/rotation. A diagonal east-handle drag changed **108.391 → 130.078px width**, retaining **141.203px height**. A diagonal north-handle drag changed **141.203 → 160.953px height**, retaining **130.078px width**. Inspector showed **130.08×160.96px**.
- Free corner drag changed both dimensions independently. A Contain-governed corner drag changed **108.391×141.203 → 123.875×161.375px**, preserving the authored ratio.
- Container body drag worked at 50% zoom. Arrow/Shift+Arrow then moved its visible frame **0.5px/5px**, corresponding to **1/10 design px**. Group body drag and both nudge sizes moved members together. A five-press burst was reversed by one Undo; Redo restored it.
- Cross-Container paste compensated orientation and reported **99% fitting** because the destination's content height was slightly smaller. A full-height pasted image could not move screen-left under the rotated parent's top constraint; it remained unchanged and showed a constraint message. That observation is recorded as **CONSTRAINED**, not a successful nudge.
- Existing nested selection moved using inverse parent rotation; pure tests additionally cover a 90° parent and mixed parent coordinates. Nested Group content follows the existing content-scope rules.
- Alternative-text and numeric-field arrows did not move canvas objects. At **390px**, Position was reachable, its numeric field measured **44px high**, and selected-image body drag changed authored placement. This used desktop pointer/keyboard input in a narrow viewport.
- Mouse resize targets measured approximately **24.4px** after −1° rotation, around **6.1px** visible marks; rotation mark approximately **8.1px**. Coarse-pointer **44px** styling is retained. Physical touch is unverified.
- **25 rendered node frames** matched between Edit and Preview and after reload. The final separate review route also passed the same Preview/reload comparison after fixture preparation.

Visual evidence:

- [Internal paste](proofs/final-slice1-interactions/01-internal-paste.jpg)
- [Mid-edge resize and Inspector](proofs/final-slice1-interactions/02-edge-resize-inspector.jpg)
- [Native external image](proofs/final-slice1-interactions/03-external-native-image.jpg)
- [Group body movement](proofs/final-slice1-interactions/04-group-body-move.jpg)
- [Explicit external fit notice](proofs/final-slice1-interactions/05-external-fit-feedback.jpg)
- [Cross-Container fit notice](proofs/final-slice1-interactions/06-cross-container-fit.jpg)
- [390px Position controls](proofs/final-slice1-interactions/07-mobile-position.jpg)
- [Preview](proofs/final-slice1-interactions/08-preview.jpg)
- [390px body drag](proofs/final-slice1-interactions/09-mobile-body-drag.jpg)
- [Final review fixture and exact dimensions](proofs/final-slice1-interactions/10-final-review-fixture.jpg)

## Verification limits and failures

**Native Shift-drag is UNVERIFIED.** The automation's Shift key hold and drag did not overlap; the observed result was free resizing. That attempt is retained and does not count as a pass. Shift semantics pass shared solver tests; governed aspect behavior passes native pointer testing. Rich should explicitly exercise Shift in the final review.

Physical touch, software keyboard and real IME composition were not exercised. Shared IME ownership is covered by focused tests. This is not acceptance of gated Text Editing Truth. Flow reorder, crop interaction and locked-state behavior were protected by shared paths/source checks and focused tests; this pass does not claim an exhaustive native matrix for them. Cross-parent multi-selection clipboard is deliberately rejected with a sibling-scope message; copying multiple siblings and moving into another Container is supported. Group resizing retains the existing axis-aligned union envelope and member capability rules; no new oriented Group engine was introduced.

A development-server restart briefly produced connection-refused in Chrome; the existing process recovered, and its parent was verified to use `127.0.0.1:5433/tapconnect_fusion_dev`. No authentication or browser restriction was bypassed. An initial new-fixture title wait failed because the copied document title differed from its Library name; the fixture's title was corrected through the existing local document API and the final visible title verified. A Save click raced autosave and found the button disabled; the UI already showed Saved, and reload/API readback verified persistence. A recovery notice appeared on the test session after Undo/reload; the fresh final fixture opens without that notice. These attempts are not passing test evidence.

## Exact source changes and architecture

Eight source files changed in this pass:

1. `components/fusion/creative-studio/creative-composition-canvas.tsx` — body routing, existing pointer lifecycle/thresholds, shared nudge dispatch/transaction phases, native image import, duplicate routing, keyboard ownership and Shift forwarding.
2. `lib/fusion/creative-studio/platform/layered-region.ts` — inactive resize axes, optional corner aspect preservation, shared ancestor/vector conversion, selection translation and native image fit.
3. `lib/fusion/card/composition-parent-authority.ts` — multi-root clipboard metadata, destination conversion, native property/identity/Group preservation and fit notices.
4. `components/fusion/card/reconstitution/card-studio-reconstitution-workspace.tsx` — shared clipboard context, image-aware paste routing, Group reconciliation and visible fit feedback.
5. `components/fusion/creative-studio/use-layered-parent-size.ts` — reusable read-only renderer size/frame observations for clipboard consumers.
6. `components/tap/tap-connect-card.tsx` — forwards existing preview/commit/cancel phases to the canonical editor history adapter.
7. `components/fusion/card/reconstitution/studio-composition-inspector.tsx` — 44px narrow-screen Group geometry fields.
8. `lib/fusion/creative-studio/__tests__/familiar-interactions.test.ts` — focused behavioral invariants.

[Exact source delta](proofs/final-slice1-interactions/local-corrective-delta.patch) and [source fingerprints](proofs/final-slice1-interactions/source-manifest.json). No competing editor, keyboard dispatcher, pointer engine, geometry model, Material authority or history store was added. Renderer observation remains transient; saved geometry remains normalized. Future guided/tApIt consumers can use the same document operations and geometry context. No speculative AI/business infrastructure was built.

**Source integration remains a limitation:** application files already contained unrelated and earlier uncommitted work. Only documentation/evidence is committed and pushed in this handoff. The published delta is against the pre-pass local snapshots, not a standalone patch against remote HEAD; the documentation commit is not a remotely buildable application SHA. Unrelated file hashes are unchanged. A clean source integration and independent review remain required before authorized staging/release.

Next step: Product Owner hands-on review of this local candidate, especially Shift corner resize and physical touch. Keep Slice 1 open and Slice 2 gated. Follow local development → verification → evidence → development-branch review → Product Owner acceptance → separately authorized staging/release.
