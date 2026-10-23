# Slice 1 — Copy/paste destination and placement correction

**Candidate ready for Product Owner review; Slice 1 remains OPEN.** No Slice 2, production, publication, Access, QR, membership or commerce changes. Production hash verification remains **BLOCKED**.

## Local review

[Open Clipboard Placement Review](http://127.0.0.1:3050/dashboard/card/edit?experience=cmvkhax9y093dm59kypc94dwn). Unpublished local Experience, saved revision 15 at evidence capture. The Product Owner's preceding fixture `cmvkg7e2v059im59k0ss0nf6f` remains byte-for-byte unchanged at revision 46. [Preservation record](proofs/paste-placement-2026-10-23/preservation.json).

1. Open Outline. Select **Love & Theft Bound Single Stack** at the root and click Copy.
2. Select **Image-backed Container**, then Paste. It uses Flow inside an authored Layered frame. If more room is needed, review the explicit **Expand and paste** choice. Cancel/Escape preserves the document. Page expansion is bounded by the existing 1600px Layered limit.
3. Select **Smoked Glass Container** or **Nested Layered Container**, then Paste. These use Layered internal layout and have padding/rotation. A necessary fit is disclosed. The small original nested Container necessarily scales the set down.
4. Repeat Paste, Undo, and Redo. Select a child before Paste to insert after it in its parent. Select Card Surface to leave that destination. Copy a Group from its Outline row to copy all members; Edit Contents scope continues to copy only the chosen child.
5. Compare Preview and reload. At 390px, the expansion dialog has 44px actions. Physical touch is still a human check.

The native-created Smoked Glass Container and test copies are retained as usable acceptance material. The source fixture's busy composition and existing placeholder video are preserved; this pass does not redesign them.

## Demonstrated root cause

The saved Product Owner fixture contains the two reported copies. Both have `container-6LdXfbkn` as parent: **destination resolution was correct in this scenario**. The copied set is one native Curated Module with editable hosted composition, not a flattened image or three unrelated buttons.

- Source: root Layered parent, hosted **Love & Theft Bound Single Stack**, displayed about **146.609 × 151.5px**. Its internal action order, materials, artwork and destinations remain native.
- Destination: **Image-backed Container**, outer placement in root Layered composition at `y=.8`, `height=.15` of a 760px plane: **114px** tall. Its **internal layout is Flow**, with padding, an existing Video child and visible overflow.
- First and second copies append in Flow order. Source absolute Y remains dormant data and is **not** used by Flow rendering. Repetition inserts after the preceding selection; there was no accumulating Layered Y offset in this failure.
- Flow paste reused the source's `flowWidthPercent:84` instead of converting its actual displayed width. Each old pasted set became about **222.141px wide**. The Flow renderer also computed its minimum height from native composition height × percentage, omitting destination width. Each frame was **338.516px high** instead of its proportional frame height.
- The destination's content grew to about **886.844px** while its outer Placement remained 114px. Paste reported success without checking that overflow or bringing the new selection into view. The next copy appeared still farther down. This explains the reported outcome without inventing a parent-resolution or arbitrary-offset cause.

Native reproduction on an isolated clone confirmed the same behavior; the original saved fixture was never edited. The separately mentioned Product Owner screenshot has **not been supplied**, so exact screenshot matching remains **BLOCKED**. The saved composition scenario is the regression case, not a claimed image comparison.

## Corrections in shared authorities

- Clipboard source metadata now identifies its parent and block. New Layered destinations use their own local origin; same-parent paste uses a bounded 12px offset from the immutable source. Repeated Layered paste does not accumulate displacement. Rotated extents participate in fitting, while physical sizes and relative arrangement are converted together.
- Flow paste preserves displayed width through the existing Flow width controls for Modules and Containers, preserves applicable height, and delegates order to the parent. It does not activate absolute X/Y offsets. Curated Flow frames now use the canonical composition aspect ratio instead of the incorrect percentage-only minimum height.
- Copy expands a Group selection anchor through existing Group membership rules, respecting Edit Contents scope. Sibling order follows authored order. New node, hosted composition, action and Group identities are remapped; content/action order is retained.
- Paste uses the existing canonical preview/commit/cancel transaction. The actual renderer supplies a transient measurement. If Flow overflows, the preview is rolled back immediately before displaying the decision; it is not left pending for autosave. **Expand and paste** performs explicit Container/ancestor geometry growth and the paste as one history operation. Cancel and Escape commit nothing. Existing physical object geometry is preserved while normalized coordinates are rebased as needed.
- Invalid/mixed destination selection opens Outline with a clear instruction to choose a Container, child or Surface. Selecting a Container pastes inside; selecting a child pastes after it within its parent; Card Surface selects the root. Repeat Paste keeps the preceding destination even if the pasted root itself is a Container. Feedback names the destination, and the resulting selection is brought into view for refinement.
- A native fitted Curated copy exposed a separate shared tight-frame ceiling: height was capped at 90% of its parent after clipboard fitting. The shared resolver now permits 100%, removing that hidden second shrink while retaining parent constraints.

No second clipboard, pointer, keyboard, renderer, Material or history engine was added. Renderer measurements are transient and do not become another document model. Explicit expansion remains a canonical document operation that future guided/tApIt consumers can reuse. No speculative AI or business infrastructure.

## Verification

**111 focused tests passed, 0 failed**, including 8 new paste regressions, existing selection/geometry/Group/clipboard/history and workspace checks. [TAP output](proofs/paste-placement-2026-10-23/focused-tests.tap). TypeScript passed without diagnostics; [record](proofs/paste-placement-2026-10-23/typecheck.txt). `git diff --check` passed. This is focused verification, not full-repository/release certification.

| Native-control case | Evidence/result |
| --- | --- |
| Root button set → nested Layered | Passed; rotated/padded destination, explicit 31% fit in the small Container. Final tight frame approximately 45.5 × 47.016px. |
| Root button set → Flow | Passed; displayed width/height approximately 146.609 × 151.492px retained. Explicit first expansion 114 → 329px. |
| Group between Layered Containers | Passed; copied all 3 members into native-created, padded, 20° Smoked Glass Container. |
| Multiple independent siblings | Passed; 2 root images copied together, physical size and relative composition retained in the destination. |
| Repeated Paste | Passed; Layered coordinates repeat inside destination. Flow uses ordered insertion and explicit growth, including 329 → 513px on the second paste. |
| Nested child selected | Passed; paste after the existing Video in its Flow parent, with required expansion to 696px. |
| Enter/leave destination | Passed through native Container/child/Surface selection; nested Group copied then pasted at root after selecting Card Surface. There is no separate persistent Container destination mode in this shell. |
| Rotation/padding | Passed for original −1° nested Container and native-created 20° Layered Container. |
| Undo/Redo | Passed; repeated Flow paste changed node count 15 → 14 → 15; Redo restored the same copied identities and expanded geometry. |
| Save/reload/Preview | Passed after final code change: all **26** node frames matched width, height and transform in Edit, Preview and reload. |
| Cancel / Escape / 390px | Passed; preview rolled back, no pasted selection committed, native dialog dismissed; action target measured 44px high. |

[Structured native observations](proofs/paste-placement-2026-10-23/native-interactions.json). Saved API readback verified original-object physical geometry unchanged except the explicitly expanded destination, copied action contents/order preserved and copied action identities independent.

Visuals: [before: pasted selection outside view](proofs/paste-placement-2026-10-23/01-before-overflow.jpg), [explicit fit choice](proofs/paste-placement-2026-10-23/02-explicit-flow-fit.jpg), [after: correctly sized, selected and visible](proofs/paste-placement-2026-10-23/03-flow-paste-visible.jpg), [Layered destination](proofs/paste-placement-2026-10-23/04-layered-paste.jpg), [Group transfer](proofs/paste-placement-2026-10-23/05-group-between-containers.jpg), [Preview](proofs/paste-placement-2026-10-23/06-preview.jpg), [390px choice](proofs/paste-placement-2026-10-23/07-mobile-paste-choice.jpg), [review composition](proofs/paste-placement-2026-10-23/08-final-review.jpg). Screenshots represent their named test steps, not identical zoom/scroll states or a supplied golden reference.

## Exact changed files

1. `lib/fusion/card/composition-parent-authority.ts` — clipboard context, Group-aware copy, authored order, destination conversion/fitting, Flow size preservation, explicit bounded expansion.
2. `lib/fusion/creative-studio/platform/layered-region.ts` — remove hidden 90% tight-frame ceiling.
3. `components/fusion/creative-studio/use-layered-parent-size.ts` — observe Flow parent content boxes and overflow; reveal committed selection.
4. `components/fusion/creative-studio/creative-composition-canvas.tsx` — proportional Curated Flow frame height and support copied widths below the former 20% floor.
5. `components/fusion/card/reconstitution/card-studio-reconstitution-workspace.tsx` — canonical paste transaction, destination ambiguity handling, repeat destination, explicit expansion/cancel dialog, feedback.
6. `lib/fusion/creative-studio/__tests__/paste-placement.test.ts` — 8 focused regression cases.

[Exact incremental patch](proofs/paste-placement-2026-10-23/local-corrective-delta.patch) and [source fingerprints](proofs/paste-placement-2026-10-23/source-manifest.json). The patch is against pre-pass local snapshots. Existing application changes remain uncommitted; documentation/evidence synchronization does not create a remotely buildable application revision. Clean source integration remains necessary before staging/release.

## Limitations and failed attempts

- The Product Owner screenshot is missing. Exact screenshot comparison remains BLOCKED; the saved failing scenario was reproduced.
- Native touch/soft keyboard/IME were not retested. Desktop input at 390px is not physical-touch evidence. Earlier Slice 1 native Shift-resize verification remains unverified.
- Flow reflows sibling layout according to its native rules; it does not promise absolute Layered spacing for independent siblings. Layered destinations preserve relative composition; native Curated sets retain their internal recipe.
- Layered page growth stops at the existing 1600px limit and explains how to choose another destination or reduce content. It does not silently relax the architectural bound. The limit rejection is covered by focused tests; the native interaction exercised successful expansion and cancellation.
- One initial regression clone used the generic document route and did not establish Experience shell context. Testing moved to a separately created Experience. Early post-reload selection/Outline attempts occurred before hydration; those failed actions are not passing evidence.
- The first Group native test copied one anchor member and exposed the Group-scope defect described above. It was corrected and repeated successfully. An initial over-limit expansion exposed the 1600px normalization cap; final code rejects it rather than allowing a misleading successful fit.

Next step: Product Owner hands-on review of the local candidate and provision of the reference screenshot. Slice 1 stays OPEN; Slice 2 remains gated. No merge, staging, deployment or production authorization is implied.
