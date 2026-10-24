# Permanent native visual authoring acceptance reference

> **Current authority — October 23, 2026:** Slice 1 and Slice 2 desktop interaction quality are Product Owner accepted. The accepted integrated source is `a7e3dc1e1f722038d737a8239b0ff31662fc6d79`; physical-device, accessibility, browser and release gates remain open. [Acceptance record](SLICE2_DESKTOP_ACCEPTANCE_2026-10-23.md) · [Slice 3 readiness proposal](SLICE3_NATIVE_SURFACE_CONTAINER_READINESS_2026-10-23.md) · [Complete Slice 3 implementation prompt](SLICE3_NATIVE_SURFACE_CONTAINER_IMPLEMENTATION_PROMPT_2026-10-23.md). Slice 3 is **planning only** until explicit scope approval. Production hashes remain BLOCKED; no deployment is authorized. Older status statements below are historical.

**October 23 implementation update:** The approved Frame and Page Truth local candidate is documented with measured evidence and exact source handoff in [the implementation report](SLICE1_FRAME_PAGE_TRUTH_IMPLEMENTATION_2026-10-23.md). Slice 1 remains OPEN; Text Editing Truth remains gated. Earlier audit/specification statements below describe their original stage, not a claim that implementation acceptance is complete.

**Standing interaction requirements:** [Canonical interaction principles](STUDIO_CANONICAL_INTERACTION_PRINCIPLES.md) govern familiar keyboard/focus behavior, fearless editing, shared tApIt foundations and freedom to redesign interface presentation. Target behaviors are requirements, not verified implementation claims. Current Slice 1 authorization and later approval gates remain unchanged.

Status: **specification only; fixture construction requires implementation approval**. The PO described a reference but did not attach its image. Exact visual comparison is **BLOCKED**, not PASSED. This document preserves the described composition as a permanent acceptance journey without inventing the missing pixels. Do not alter the existing Slice 1 fixture to create it.

## Two independent acceptance gates

**Visual fidelity:** assess typography, spacing, borders, materials, image treatment and composition in the native output, then compare Canvas and Preview. Exact comparison to the PO reference remains BLOCKED until that separately supplied image has been received and evaluated; record the reference version and actual comparison. A polished approximation cannot pass the exact-reference gate.

**Authoring usability:** demonstrate creating the composition from Blank using native controls, styling each Surface independently, dragging and aligning Containers, selecting/editing children, resizing, saving/reopening and continuing to edit, and Preview parity. A preloaded fixture supports regressions but does not prove creation. No JSON injection, database seeding or rasterized whole-design substitution counts as the authoring demonstration. Record a continuous native-control trace and PO hands-on results separately from automation.

For every task, report its starting state, actions, scrolls, panel changes, wrong turns, completion, resulting state and evidence link. Compare equivalent baseline/candidate runs. Mark results measured, estimated, not run, blocked or failed; report automation failures and affected coverage explicitly. Do not calculate gains from estimates or promote blocked steps to passes. Visual and usability gates retain separate statuses even if one succeeds.

## Reference composition

Use a separate local Experience with a dark, elegant root Surface and two independently styled rounded Containers. Container A contains Flow Text and a functional Button. Container B contains a native Image and an independently editable text overlay in Layered layout. Surfaces have distinct treatments, subtle borders, clean typography and deliberate spacing. All words, geometry, imagery, actions and surfaces remain editable after reopen. No raster screenshot of the complete design may substitute for native construction.

The primary reference's root uses Layered placement so step 9 can demonstrate direct movement and alignment of A and B. This is an explicit fixture choice, not a new default; new generic sections remain Flow by default. A companion root-Flow version demonstrates reorder/reflow without pretending it offers free x/y. At 390px use a readable vertical composition unless the actual supplied reference establishes another requirement. Desktop editing displays this same output at its actual delivery width; it does not imply new desktop public rendering.

Suggested starting tokens for a build after approval: deep neutral root, 16–24px Container corners, subtle rim, 16–24px internal padding, at least 16px separation, restrained warm/cool surface contrast and a consistent type scale. These are design hypotheses, not extracted reference measurements. Final values require visual review against the supplied reference and real content. Use only already authorized local/owned imagery and fonts.

## Thirteen-step capability gap and acceptance matrix

“Supported” below means a current path exists; it is not a new end-to-end acceptance pass. Every row remains to be demonstrated on the independent candidate.

| Step | Current path / friction | Required outcome after approved work |
| --- | --- | --- |
| 1 Create root Surface | Experience creation exists; administrative Type/source defaults precede design. | Explicit Blank or starting template creates one document and opens root context. |
| 2 Set root background/Material | Solid/gradient/image UI and one Material card; transition/discovery limitations. | Select root directly, apply a dark treatment, reopen and refine it. Preview equals applied result. |
| 3 Add Container A | Add/Container and parent authorities exist. Destination and mode must remain clear. | Add to selected root at a valid visible position; name A; root mode stays unchanged. |
| 4 Style and resize A | Surface/size controls exist but outer/inner fields compete and S1 is unaccepted. | A's visible authored frame resizes; Flow contents reflow; border/radius/style stay independent. |
| 5 Add Text and Button to A | Native insertion exists; content edit discoverability and S2 truth remain gaps. | Add into A deliberately; edit exact words, set action, establish gap/padding. No hidden wrappers. |
| 6 Add Container B | Native Container creation exists. | Independent sibling with stable identity; copying appearance must not copy A's action or future business identity. |
| 7 Apply distinct B Material | Catalog/renderer exist; only narrow exposed choice; state precedence risk. | Apply certified native treatment and adjust a property without losing gradient/effects unexpectedly. |
| 8 Add image and overlay to B | Nested Layered placement and image treatments exist; selection/fit/parity need proof. | Enter B contents, place Image and Text in its local space; crop/focal edits preserve frame and text. |
| 9 Drag/align Containers | Layered Container handles exist; Group support for Containers is limited. | Move A/B under root without reparenting; align using named Parent/Selection scope. Test multi-select separately from Group eligibility. |
| 10 Refine spacing/rim/radius/type | Scalar controls and recipes exist; inconsistent applicability and font discovery. | No ignored active controls. Fine adjustment is visible and one undoable transaction; expert values remain reachable. |
| 11 Preview | Draft Preview exists; edit clipping can differ; output width labels are misleading. | Same content, treatment, frame, crop and intended clipping, with editing chrome removed. Preview identifies draft source. |
| 12 Save/reopen/continue | Autosave/reload observed in earlier audit; full reference round-trip not performed. | Reopen all native nodes; select nested Text and change it; retained layout/style/action/resource IDs match. |
| 13 Comparable polish | Cannot assess exact match without original image or completed native candidate. | PO compares native output against supplied reference at 390px and desktop view. Human visual acceptance mandatory. |

## Regression variants

Test all four parent/child combinations: Flow→Flow, Flow→Layered, Layered→Flow, Layered→Layered. Nest one extra Container in each eligible case and exercise selection/parent breadcrumb, move/resize, applicable rotation, reparent via explicit destination, and reading order. Preserve the existing maximum depth and cycle checks. Test root/body/child style isolation and effects extending beyond placement bounds.

Use a separate module Group inside a compatible Layered parent: move/rotate/resize per existing policy, enter/edit child, escape scope, ungroup, Undo/Redo. Do not claim Container grouping works until existing Group membership authority supports it and that scope is approved.

Run Material→Solid→Image→Transparent transitions and reverse through Undo/Redo; edit radius/border/opacity after each without changing unrelated appearance. Compare recipe tile, root, Container and nested Container with the same applicable material parameters. Test long Text, delayed fonts, unsupported font variants, meaningful/decorative Image, locked node and a governed component. Resize should distinguish constraint rejection from clipping and from content fitting.

At desktop and 390px capture full workspace and output. Prove handles remain visually small and targets usable at multiple zooms: proposed 6–8px marks, at least 24px pointer and 44px coarse-pointer target product targets with collision handling. Record actual hit rectangles, overlap and keyboard alternative; target dimensions alone do not establish accessibility. Physical phone testing covers caret/keyboard viewport, paste, selection, IME, focus return and reachable controls.

## Evidence record required for acceptance

Record candidate commit plus dirty diff fingerprint, local fixture ID and before/after draft revisions, environment (explicit local database), browser/device, output width, editor viewport, zoom and input type. Preserve native configuration snapshots and resource IDs; compare relevant fields before/after reload. Capture the thirteen steps as a short video or annotated screenshot sequence, plus action/scroll/panel-switch counts. Do not manufacture historical before/after proof by reconstructing the old app with CSS.

For each operation show canonical command label/history count, exact intended geometry or content change, successful Undo and Redo, save/reload and Preview result. Cancellation/no-op leaves no new history entry. Reparent preserves identities and content; unsupported transformations report their limitation. Publish, Access, credentials and permanent QR remain untouched.

Acceptance states are separate: engineering checks passed; visual review complete; mobile device checks complete; PO hands-on accepted. Only Rich can record the last state. Missing original image blocks exact-match acceptance but does not block work on the described native workflow once implementation is approved.

## Final Slice 1 interaction corrective candidate

The authorized clipboard/body-drag/resize/nudge pass and evidence are recorded in [the final interaction review](SLICE1_FINAL_INTERACTION_REVIEW_2026-10-23.md). Layered 1px/10px nudging is now implemented locally through canonical transactions. Native Shift-drag and physical touch remain unverified; Slice 1 remains OPEN, Slice 2 gated, and production hash verification BLOCKED. The remote handoff contains documentation and an exact local source delta, not an application release commit.


## October 23 — clipboard placement corrective evidence

See [Clipboard placement correction](SLICE1_CLIPBOARD_PLACEMENT_CORRECTION_2026-10-23.md) for the demonstrated Flow overflow/size causes, canonical destination and explicit expansion behavior, native regression matrix, 111 passing focused tests, source delta and local review fixture. Slice 1 remains OPEN; Slice 2 remains gated. The separately referenced Product Owner screenshot is not yet supplied; exact image matching is BLOCKED. Production and the prior fixture remain unchanged.
