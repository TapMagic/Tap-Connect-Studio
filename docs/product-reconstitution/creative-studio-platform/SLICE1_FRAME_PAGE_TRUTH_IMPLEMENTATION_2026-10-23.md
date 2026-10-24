# Slice 1 — Frame and Page Truth: local corrective candidate

**Implemented locally; Slice 1 OPEN pending Product Owner hands-on acceptance. Slice 2 Text Editing Truth remains gated.**

This report implements the Product Owner-approved [bounded scope](SLICE1_PRECISION_LAYOUT_PAGE_SCOPE_PROPOSAL_2026-10-23.md). It does not authorize staging, merge, release, or production changes.

## Open the acceptance fixture

[Frame and Page Truth — local Chrome fixture](http://127.0.0.1:3050/dashboard/card/edit?experience=cmvlqtmjb01fodf9kz8q2eml7)

New, unpublished local Experience; saved revision **24**, **14 native nodes**, minimum **1094px**, Layered coordinate plane **1070px**. The existing editor and local development database are used. The originals were not used as mutation targets. [Revision evidence](proofs/frame-page-truth-2026-10-23/fixture-revisions.json).

Hands-on checklist:

1. **Outline → Nested Layered Container → Position**. Choose px. Its current frame is approximately 327.36 × 272px, rotated −1°. Change width/height or drag an edge. Its Text, rotated Image and Button keep their local size. Undo/Redo should restore the complete operation. Child constraints and intentional clipping are separately labeled.
2. **Outline → Love & Theft Bound Single Stack → Position / Size**. Test proportional width and exact Rotation. **Edit Contents → Website → Text size** tests the permitted 11–16px range. Artwork remains native and recipe-governed.
3. **Outline → Transparent Container** near the bottom. Two copied native Curated stacks are side by side at 45% widths with a 12px column gap. Select a stack; use Position / Size or its right-edge handle. Its move grip supports Flow reorder. Container layout changes are reversible.
4. **Page bottom**. Edit Minimum page height, drag the edge, then Fit to content. Required content, effective root height, and Layered plane are separate readouts. **Surface → Composition** exposes the distinct plane-height field.
5. **Select multiple → choose sibling objects**. The toolbar identifies the matching reference. Test Match Width; incompatible dimensions explain their constraints rather than applying a partial result.
6. At **390px**, use bottom **Outline / Position / Edit / Preview**. The new numeric-control labels, reset targets and sliders provide 44px mobile targets. Save/reload and Preview should retain the authored result.

## Root causes and corrections

| Finding | Demonstrated cause | Canonical correction |
| --- | --- | --- |
| Container resize scaled children | Child frames are fractions of a content box; parent changes previously changed only the parent. Inspector discarded complete resize results by previewing only the selected node. | Existing resize authority rebases eligible immediate children once using measured content boxes. Pointer, Inspector, Match, explicit plane changes and existing clipboard expansion consume that result. Deeper descendants keep their own coordinate spaces. |
| Mixed Flow-parent / Layered-Container sizing | Internal plane height and Flow-width controls patched properties without rebasing eligible Layered children. | Same authoring rebasing for explicit width and plane-height edits. The authored width percentage remains responsive; viewport changes do not invoke authoring rebasing. Explicit child percentage constraints remain authoritative. |
| Hidden resize constraints | Parent limits and child extent could make requested dimensions ineffective without a useful adjustment path. Small rebased frames could also be enlarged back to insertion minimums by an ordinary move. | Preserve existing small frames during movement, stop constrained shrinking at child Placement envelopes, report effective sizes, and expose existing child-overflow and clipping policies. No new height limits. |
| Match dimensions unreliable | Storage order selected the reference; direct dimension replacement bypassed resize/Group constraints and complete child updates. | Visible selection order supplies the reference. Canonical frame/Group resize performs matching atomically. Supported aspect-constrained matches remain proportional; incompatible matches reject. No cross-parent matching. |
| Page-height controls disagreed | Legacy page height, public minimum and Layered plane were conflated; drag preview used legacy rescaling. Fit inspected normalized nodes rather than transformed publishable layout. | Existing extent authority drives minimum/required/effective readouts. Explicit plane resizing rebases roots only. Fit observes rendered nodes and declared clipping, excludes selection chrome, includes bottom padding, and keeps existing limits. Edge extension starts from the visible extent so increasing a smaller minimum produces a visible result. |
| Curated label size was inert | Requested px adjusted a responsive endpoint that clamped to the same effective value. | An explicit certified px override reaches the canonical live glyph renderer. Unspecified responsive typography retains its policy. Certification ranges, actions, artwork and underlying text are unchanged. Narrow labels may still truncate under the existing governed policy. |
| Whole-module sizing hard to discover | Outer positioning was icon-only; Flow lacked a direct width control. Fitted content also used a transformed/zoomed bounding rectangle for its internal size. | Visible Position / Size, a small active Flow edge handle, and untransformed content-box measurement. Proportional recipe rendering and custom-frame semantics stay distinct. |
| Layout alignment and gap controls disagreed | One alignment property served both outer placement and internal children. Column gap was saved but the renderer used generic gap. | Separate placementAlignment and childAlignment with legacy fallback, no appearance migration; render canonical row/column density values. Horizontal remains a single row, with width/gap guidance. No new wrapping engine. |
| Precision-control keyboard history | Range input lacked a keyboard completion path. | Existing live-adjustment transaction commits on supported keyboard completion/blur and cancels with Escape. Mobile target enlargement is separate from handle paint size. |

## Measured native-control evidence

[Interaction measurements and steps](proofs/frame-page-truth-2026-10-23/native-interactions.json) include failed/invalid observations rather than counting them as passes.

- **Container numeric resize:** height 172.109 → 272px. Nested Text remained 85.0547 × 43.9922px; Image 56.6641 × 83.7266px at local (108.008, 12.3516); Button 85.0547 × 43.9922px. Undo/Redo restored the frame and children.
- **Container pointer resize:** native south-edge drag −50 screen px produced 222px height, same width and child dimensions; the small X adjustment follows the rotated opposite-edge convention. Undo restored 272px.
- **Mixed parent layout:** root Flow, internal Layered Container width 100 → 75% and plane 220 → 300px. Group-descendant physical sizes stayed equal; local rendered positions differed by at most 0.008px, below the 0.5px criterion. Comparing raw child CSS offsets alone was insufficient because Group wrappers move their own origins.
- **Curated text:** native exact input 11, 13, 15, 16 rendered 11, 13, 15, 16px glyphs. Slider ArrowLeft changed 16 → 15.5; one Undo restored 16. Standard Text 18 → 20 and Button label 14 → 18 also changed actual glyph sizes, then were undone.
- **Curated module:** width 240px produced height 248px. Native 0°, 45°, 90°, 180°, 270° edits retained X/Y/W/H; Reset returned to 0°.
- **Native Horizontal composition:** Add → Containers → Transparent; Horizontal, column gap 12; copy/paste the existing Curated stack twice; set each width to 45%. Both render 150.297 × 155.305px. Native edge drag −16px produced 134.297 × 138.773px, preserving proportions. Undo restored it; ArrowUp reordered the second stack, Undo restored order.
- **Match:** reference Image-backed Container; Match Width changed Nested Layered Container from 327.359 to 296.453px while all three children's measured sizes/positions remained unchanged. Height/Both were unavailable due to child constraints. Undo restored the frame.
- **Group:** native 120px width edit used Group resize and Undo. Ungroup, standard Text/Button checks, and Undo restored original membership. Existing Group regression tests remain green.
- **Mode switching:** Horizontal → Layered → Horizontal → Layered → Horizontal restored identical measured states for each respective mode and preserved native IDs.
- **Page:** initial Fit changed minimum/plane 900/760 → 748/724 without scaling objects. Minimum 1000 changed the minimum independently. Later plane request 500 was constrained to 1070 by content; feedback explained the constraint. Page-edge +240 started from visible 1124 and produced minimum 1364. Final Fit gives required/effective/minimum 1094, plane 1070. Native edge drag +48px produced 1144 after the existing 8px snap; Undo restored 1094.
- **Persistence and Preview:** final Save → full reload → Preview produced exact equality for all **50 rendered frame records**, including nested Curated parts. This is same-viewport frame parity, not an exhaustive visual certification of every asset/layout combination.
- **390px:** native bottom Position navigation, width 45 → 40%, Undo → 45; numeric label and slider measured 44px high. Mouse Flow handle target measured 24px with 6px painted square; coarse-pointer CSS declares 44px. Physical touch and OS keyboard/IME were not exercised.

### Before/after visuals

The [pre-correction audit](SLICE1_PRECISION_LAYOUT_PAGE_SCOPE_PROPOSAL_2026-10-23.md) contains the earlier inert text/page-control evidence. No separately supplied visual reference image was received, so no exact reference-image comparison is claimed.

| Evidence | Image |
| --- | --- |
| Before native Container gesture, 172px | [01-before-container.png](proofs/frame-page-truth-2026-10-23/01-before-container.png) |
| After numeric resize, 272px, children retained | [02-after-container.png](proofs/frame-page-truth-2026-10-23/02-after-container.png) |
| Curated label control | [03-curated-label.png](proofs/frame-page-truth-2026-10-23/03-curated-label.png) |
| Page Fit during verification | [04-fit-page.png](proofs/frame-page-truth-2026-10-23/04-fit-page.png) |
| Native Horizontal two-stack composition | [05-horizontal-flow.png](proofs/frame-page-truth-2026-10-23/05-horizontal-flow.png) |
| 390px Position controls | [06-mobile-position.png](proofs/frame-page-truth-2026-10-23/06-mobile-position.png) |
| Canonical Preview | [07-preview.png](proofs/frame-page-truth-2026-10-23/07-preview.png) |

These screenshots record stages of the interaction sequence, not all the final revision. Exact final revision and frame comparison are separately recorded.

## Automated verification

**135 passed, 0 failed**, across 10 focused suites/files; **17 new Frame/Page cases**. [Full output](proofs/frame-page-truth-2026-10-23/focused-tests.txt). Covers frame rebasing, explicit percentages, measured padding/borders, rotated geometry, nested relationships, constraints, movement after rebasing, root/Container plane ownership, selection-reference matching, Group matching, clipboard identities, Flow placement, repeated paste, grouping, history and governed authoring.

`npx tsc --noEmit`: exit 0, no diagnostics. [Record](proofs/frame-page-truth-2026-10-23/typecheck.txt).

The exact patch was applied to isolated pre-pass source copies; all **16** resulting file hashes matched the final source manifest. [Reconstruction verification](proofs/frame-page-truth-2026-10-23/patch-verification.txt).

Failures found and handled: boundary floating-point rounding could shift a match and was corrected; an older test assumed every governed match must reject and was updated to test a genuinely incompatible aspect ratio; native Column gap was 16 despite requested 12 and its shared renderer binding was repaired. Browser selectors timed out after a drawer title/mobile navigation change; fresh state identified the correct controls. A zero-result Group-child measurement was invalidated and repeated with actual node identities and content-plane-relative bounds. None was counted as passing before correction.

## Exact changed source files

- `components/fusion/card/reconstitution/card-studio-reconstitution-workspace.tsx`
- `components/fusion/card/reconstitution/studio-card-surface-inspector.tsx`
- `components/fusion/card/reconstitution/studio-composition-inspector.tsx`
- `components/fusion/card/reconstitution/studio-precision-control.tsx`
- `components/fusion/creative-studio/creative-composition-canvas.tsx`
- `components/fusion/creative-studio/use-layered-parent-size.ts`
- `components/tap/tap-connect-card.tsx`
- `lib/fusion/card/composition-parent-authority.ts`
- `lib/fusion/creative-studio/__tests__/layered-precision-selection-truth.test.ts`
- `lib/fusion/creative-studio/container-resize.ts`
- `lib/fusion/creative-studio/platform/card-extent.ts`
- `lib/fusion/creative-studio/platform/layered-region.ts`
- `lib/fusion/creative-studio/platform/selection-geometry.ts`
- `lib/fusion/creative-studio/reconstitution/curated-authoring-adapter.ts`
- `lib/fusion/creative-studio/signature-assets/SignatureMasterBridge.tsx`
- `lib/fusion/creative-studio/__tests__/frame-page-truth.test.ts`

## Inspectable source handoff and repository state

Repository **TapMagic/Tap-Connect-Studio**, root `/Users/rcs/Development/tap-connect-studio`, development branch **codex/studio-reconstitution-slice-1**, starting HEAD **2d9258aea4c7291792c23603b8aeb4a7fdbad4f2**, tracking `origin/codex/studio-reconstitution-slice-1`, origin `https://github.com/TapMagic/Tap-Connect-Studio.git`. Fetch confirmed 0 ahead/0 behind before this handoff.

The checkout already contained substantial tracked and untracked Slice 1 work and unrelated work. **Application files remain uncommitted. The GitHub handoff commit contains documentation, evidence, exact source snapshots and an incremental patch; it is not a standalone buildable application commit.** This limitation is explicit so independent reviewers do not mistake a documentation SHA for the tested app.

- [Exact current-pass patch](proofs/frame-page-truth-2026-10-23/local-corrective-delta.patch), against the pre-pass local files.
- [Complete before/after affected source archive](proofs/frame-page-truth-2026-10-23/affected-source-before-after.tar.gz), including the new tests.
- [Per-file SHA-256 manifest](proofs/frame-page-truth-2026-10-23/source-manifest.json).
- [Preservation audit](proofs/frame-page-truth-2026-10-23/preservation.json): 2,361 pre-existing files unchanged; 15 named source corrections and six intended existing-document updates plus this new report; one new test file; no missing files. Unrelated application changes and earlier acceptance artifacts remain intact.

A clean integration of the existing local Slice 1 baseline and this verified delta is still required before a remotely reproducible build or staging/release. No branch switch, reset, history rewrite, force-push, merge, migration or deployment was performed.

## Limitations and architectural findings

- **Physical device acceptance remains open:** 390px browser controls were exercised; physical touch, OS keyboard, IME composition, every browser, and the full combinatorial matrix of every component/mode were not certified. Automated checks are evidence, not PO acceptance.
- **Visual bounds remain conservative:** transformed DOM frames plus the existing effect-envelope estimate; not exact painted-pixel measurement. Arbitrary filters/masks and legacy section-heavy pages are not exhaustively covered by this fixture.
- **Existing size limits remain:** plane 240–1600px, explicit minimum up to 4000px; no general Scale Contents, new wrapping, cross-parent Match or new height mode.
- **Certified narrow labels:** existing truncation remains intentional. The explicit local-pixel override does not silently rewrite text or recertify artwork. Default responsive typography continues when no exact override is authored.
- **Local clone defect discovered:** creating the new Experience from the populated native clipboard fixture copied an empty legacy projection. The new unpublished test copy alone was seeded from the saved native page of the older PO fixture. The clone bug was not repaired under this scope and is not claimed as a successful native creation lifecycle. Subsequent Container creation/layout/copy/paste used native controls.
- **Fixture preservation evidence:** older originals remained revisions 110 and 46. The clipboard review fixture was observed read-only at revision75, whereas its historical report captured15; there is no current-pass preimage proving byte equality for that later user-edited draft. Only the new fixture received writes from this work.
- **Architecture:** no competing editor, sizing, Material, pointer, clipboard, keyboard, renderer or history engine. DOM measurement is transient context for existing authorities. Shared operations remain usable by future guided/tApIt commands, with the same validation/history requirements. No AI or business-domain infrastructure was added.

Love & Theft production, publication, Access, credentials and permanent QR were not touched. The previously recorded functional baseline remains protected. **Production hash verification remains BLOCKED**; local fixture/source hashes are not production hash verification.

## Review workflow and next step

Local development → automated verification → documentation/evidence → development-branch handoff → independent architecture/product review → Product Owner hands-on acceptance → separately authorized staging/release.

Recommended next step: review the source delta and use the local fixture above. Keep Slice 1 OPEN and Slice 2 gated until explicit hands-on acceptance. Any further correction stays within Frame and Page Truth unless separately approved.

## GitHub documentation references

Repository: [TapMagic/Tap-Connect-Studio](https://github.com/TapMagic/Tap-Connect-Studio), branch `codex/studio-reconstitution-slice-1`. Final push verification and commit SHA are returned with the handoff. These five documents remain the planning entry points:

- [STUDIO_UX_ARCHITECTURE_PROPOSAL_2026-10-22.md](https://github.com/TapMagic/Tap-Connect-Studio/blob/codex/studio-reconstitution-slice-1/docs/product-reconstitution/creative-studio-platform/STUDIO_UX_ARCHITECTURE_PROPOSAL_2026-10-22.md)
- [STUDIO_SURFACE_AUTHORING_AUDIT_2026-10-22.md](https://github.com/TapMagic/Tap-Connect-Studio/blob/codex/studio-reconstitution-slice-1/docs/product-reconstitution/creative-studio-platform/STUDIO_SURFACE_AUTHORING_AUDIT_2026-10-22.md)
- [STUDIO_UX_WORKFLOW_DECISIONS_2026-10-22.md](https://github.com/TapMagic/Tap-Connect-Studio/blob/codex/studio-reconstitution-slice-1/docs/product-reconstitution/creative-studio-platform/STUDIO_UX_WORKFLOW_DECISIONS_2026-10-22.md)
- [STUDIO_NATIVE_VISUAL_ACCEPTANCE_2026-10-22.md](https://github.com/TapMagic/Tap-Connect-Studio/blob/codex/studio-reconstitution-slice-1/docs/product-reconstitution/creative-studio-platform/STUDIO_NATIVE_VISUAL_ACCEPTANCE_2026-10-22.md)
- [STUDIO_UX_IMPLEMENTATION_PROMPT_2026-10-22.md](https://github.com/TapMagic/Tap-Connect-Studio/blob/codex/studio-reconstitution-slice-1/docs/product-reconstitution/creative-studio-platform/STUDIO_UX_IMPLEMENTATION_PROMPT_2026-10-22.md)
