# Studio implementation prompt — master UX revision

**Standing interaction requirements:** [Canonical interaction principles](STUDIO_CANONICAL_INTERACTION_PRINCIPLES.md) govern familiar keyboard/focus behavior, fearless editing, shared tApIt foundations and freedom to redesign interface presentation. Target behaviors are requirements, not verified implementation claims. Current Slice 1 authorization and later approval gates remain unchanged.

**Current authorization: Select and Resize with Confidence is approved for local implementation only.** Slice 1 remains NOT ACCEPTED pending Rich's hands-on review. No Text Editing Truth, responsive authoring, unrelated UX redesign, production change or deployment is authorized. Later increments below remain plans requiring their applicable approval gates. Documentation synchronization and review do not expand implementation scope.

The approved candidate must cover root/nested Layered resize, padding/borders/rotation and mixed parent/child layout; agreement between direct and exact dimensions; visible constraints with an appropriate adjustment path; restrained marks with usable mouse/touch targets; discoverable selection/Position; accurate Placement/Visual/Touch diagnostics; Group/alignment/snapping/history/persistence/Preview regressions; and actual visual/interaction evidence. Return a usable isolated local fixture for PO review.

Read the [architecture proposal](STUDIO_UX_ARCHITECTURE_PROPOSAL_2026-10-22.md), [Surface audit](STUDIO_SURFACE_AUTHORING_AUDIT_2026-10-22.md), [twelve workflow decisions](STUDIO_UX_WORKFLOW_DECISIONS_2026-10-22.md) and [native visual acceptance specification](STUDIO_NATIVE_VISUAL_ACCEPTANCE_2026-10-22.md). The latter is a permanent journey, not an implemented fixture or an attached reference image.

## Execution gate and preparation

Act as TapConnect Product Steward. Identify the exact PO approval and named increment before editing. If the gate is absent, return the prepared plan without changing application code. Approval for one increment does not authorize later rows. Never infer Slice 1 acceptance from passing tests or elapsed time.

After approval, read repository instructions, the Product Steward Constitution, binding interaction specification and relevant installed Next.js documentation. Inspect branch, dirty changes, existing worktree and local server. Preserve unrelated work. Record a source fingerprint and reproduce current behavior before fixing it. Use an independent local fixture with explicit local database configuration; never inherit an unverified database URL from `.env`. Preserve the existing acceptance fixture and Love & Theft production state. No production authentication bypass, publication, Access, credential or QR mutation. Production hash status remains BLOCKED.

The active implementation authorization is **Select and Resize with Confidence within Slice 1 only**. Do not start a shell redesign, Surface catalog, Text subsystem or business capability in that pass.

## Development-branch review workflow

Maintain: **Local development → automated verification → documentation and evidence → development-branch push → independent architecture/product review → Product Owner acceptance → authorized staging/release.** These are separate gates. A push is not a deploy or acceptance; release/staging needs explicit authorization. Preserve a usable hands-on fixture when interaction matters.

Each completed slice must identify branch and exact commit, summarize changes and changed modules/files, report relevant tests and visual evidence, list known limitations and architectural compatibility findings, disclose any approved-scope changes, and recommend the next construction step. Independent review precedes PO acceptance; automated tests do not replace either. Push only scoped changes, preserving unrelated working-tree work. Report non-fast-forward/conflicts rather than resetting, rebasing or force-pushing to clear them. Never commit secrets, environment files or sensitive production data.

For this documentation handoff, the existing development target is `origin/codex/studio-reconstitution-slice-1` in `TapMagic/Tap-Connect-Studio`; `main` is not the target. The documentation-only commit does not capture the dirty application candidate. Local-only proof files referenced by these proposals remain separate until a scoped, reviewed evidence handoff; do not imply they are remotely available from document links alone.

## Required pairing in every slice

Deliver direct manipulation and discoverability together for the affected task. A repaired gesture needs a visible entry point, an understandable target and constraints, a discoverable exact-control alternative, and usable completion/return. A discoverability change must reach a working native operation. Broad onboarding can follow later; task-level usability cannot.

Keep Surface-first selection explicit. A Container's **Placement in [parent]** follows its parent's layout; its **Contents layout** governs its own children. Inner Flow controls remain valid when that Container sits inside a Layered parent. Hide only ineffective outer Flow controls, preserving dormant authored values. Root Surface owns appearance and child layout, not child-style position controls.

Root and Container Material paths already call `resolveMaterialSurfaceFromProps` and `MaterialSurfaceLayers` in `creative-composition-canvas.tsx`. Preserve these shared authorities and existing recipe/target adapters. Different serialized targets do not justify separate styling engines. Correct adapter precedence where approved; do not claim that shared function use alone proves visual parity.

For each candidate, record baseline and changed task traces with the same fixture, start/end state, viewport and input method. Separate **measured**, **estimated**, **not run**, **blocked**, and **failed** results. Record action count, scrolls, panel changes, wrong-target edits, completion and geometry/persistence correctness. Label timing as human or automated; neither substitutes for the other. Report automation failures with the attempted step and lost coverage. A source check or screenshot cannot convert an unexecuted interaction into a pass. No improvement percentage without comparable measured runs.

## Increment 1: make manipulation trustworthy

### Smallest candidate: Select and resize with confidence

Implement this approved bounded candidate within the still-open Slice 1:

1. Repair the existing nested/rectangular-parent resize conversion through the shared geometry authority. Prove that canvas resize and exact W/H agree for currently supported resize policies; retain authored placement versus visual overflow.
2. Pair the repair with the actual selected object name and ancestor context, one active handle set, smaller visible marks with separate usable hit targets, and a clearly labeled **Position** entry opening the existing Inspector at effective placement controls. Explain any applicable minimum or content-driven dimension at that control. Use existing selection, capability and task presentation; no new navigation or geometry store.
3. In that placement task, show the parent-governed size, suppress ineffective outer Flow sizing and scope or hide an inert Anchor. Label Contents layout separately without adding new internal layout behavior. Preserve applicable inner Flow controls and existing root/parent selection paths.
4. Verify a native journey: select a Container → find Position → resize directly → set an exact width → select/edit an existing child through its current control → return to the Container → Undo/Redo → save/reload → Preview. Include a nested Layered case, a Flow-parent case, and existing Group/rotation regressions where the shared repair could affect them. Text re-entry is a regression check, not S2 implementation.

The visible outcome is restrained handles around a truthful authored placement frame, with findable effective controls. Proposed exit targets: Position reachable in one contextual activation after selection; zero active ineffective outer size controls; resize within 1 output CSS pixel of the intended frame at tested sizes (before zoom, subject to a stated canonical constraint); no unexplained parent/mode change; one history entry per committed gesture; matching geometry after reload and in Preview. These are targets, not measured results. Capture comparable before/after task traces and full workspace images at desktop and 390px. Report actual pointer/coarse-target checks and unavailable physical-touch coverage separately.

Likely change surface: the existing geometry/unit/selection authorities, composition canvas, composition Inspector and focused behavioral checks. Use the existing shell only if routing Position requires its current task adapter. No Material changes, catalogs, generalized nesting, Container grouping, new persistence, Text foundations or public renderer migration in this candidate. If fixing the shared cause needs broader work, stop at a safe checkpoint and present the concrete dependency for approval.

Candidate success does not close Slice 1. Remaining rotation/anchor demonstrations, toolbar collision/reachability findings and all original acceptance requirements stay open until addressed and Rich records hands-on acceptance. A failure in a shared regression blocks the affected candidate; do not label it complete merely because the narrow resize example works.

### Engineering guidance across Slice 1

Apply the following guidance only to the explicitly authorized candidate. If approval covers Select and resize with confidence, broader toolbar placement work and other remaining findings stay open; this checklist does not expand that approval.

Start with the failing nested geometry unit round-trip. Read `platform/layered-region.ts`, `geometry-units.ts`, `selection-geometry.ts`, `frame-semantics.ts`, parent and Group authorities together with their actual canvas/Inspector callers. Trace authored frame → parent coordinates → rotated screen frame → inverse gesture conversion → committed geometry. Diagnose the rectangular-parent failure before altering handle appearance; a pretty frame around wrong geometry is not completion.

Then reconcile selection chrome with that authority in `creative-composition-canvas.tsx` and `studio-composition-inspector.tsx`. Distinguish placement frame, derived visual extent and hit target. Keep padding and invisible layout space legitimate. Resize feedback must identify minimums, content-driven height and unsupported operations. Do not persist measurement as geometry. The reported apparently fixed frame requires both a reason and a demonstrably working supported resize path.

Trace the nine-position Anchor to its actual consumers. If it affects only a legacy reference point, do not expose it as a Layered resize/rotation pivot. Preserve stored values and valid legacy behavior; remove or accurately scope inactive editing controls. Show numerical before/after examples from the governing function and real interaction evidence for any retained control. Do not build an anchor engine to rescue an obsolete control.

Reduce visible marks to approximately 6–8 screen pixels while keeping separate pointer/coarse-pointer targets (proposed 24/44px minimum product targets). Resolve overlapping targets for tiny selections with fewer applicable handles and exact controls. Show one active applicable set; clear hover, focus and locked states remain. Measure at multiple zooms, 390px and actual touch input.

Move the contextual toolbar out of rotated object transforms; clamp/dock within usable viewport, avoiding content/handles where possible. Its input cannot start move/resize. Prove group vs Container scope, nested parent selection and Canvas/Outline parity. Reuse existing task and selection authorities.

Do not expand Group membership to Containers, implement new nesting behavior or broadly redesign properties during S1 without separate approval. Repair source assertions that merely mirror markup only when replacing them with meaningful behavioral evidence. Exit after root causes, precise changed files, focused checks, visual/interaction evidence, save/reload and Preview parity are ready for Rich's hands-on review.

## Increment 2: Text Editing Truth, after gates

Implement only the approved Text transaction semantics and rendered Text bounds reconciliation. Canvas, Inspector, future typography and accepted AI patches must use one typed text command lifecycle. Preserve exact Unicode/whitespace/line breaks; case remains presentation unless an explicit content operation changes it. Define begin/update/commit/cancel/no-op and protect against stale blur or asynchronous completion recommitting cancelled work.

Pair that behavior with a named Edit text entry and content-first opening of the existing Text task; measure reaching and completing the edit. This is discoverability of the approved task, not permission for a typography or shell redesign.

Validate Auto/Minimum/Fixed height in Flow and Layered parents, including rotated/nested Containers, font loading and long content. Measured rendering may adjust feedback, never silently authored geometry. Require physical 390px mobile keyboard/caret/focus/paste/IME evidence plus desktop, canonical history, validation, save/reload and Preview. No font catalog expansion, responsive delivery rewrite or AI provider work.

## Increment 3: native Surface composition, separately approved

Build the smallest complete two-Container journey from the acceptance specification. Begin with a clone-based treatment transition matrix before rearranging panels: root and Container Material→Solid→Image→Transparent, undo/reload, then radius/border/opacity edits that preserve unrelated fill/effects.

Read the existing Material engine, `material-surface`, `MaterialSurfaceLayers`, `visual-plane`, `surface-capability`, root Surface inspector, Container inspector and `NodeVisual` paths. Material rendering already exists for both root and Container; repair adapter precedence and current consumer behavior. Do not introduce a universal new styling schema. If synchronization requires migration, present the exact compatibility problem and minimum version/fallback proposal before expanding scope.

Derive relevant controls from selection, task intent, transient edit mode and declared capability. Keep one selection/document/history store. Root opens Surface/Contents layout; Container separates Placement in parent, Surface and Contents layout; Text opens Content; Image opens Replace/Crop. Preserve inactive layout values while hiding ineffective edits. Address `alignment` serving both outer and inner relationships only with a documented compatible extension if independent control is in approved scope.

Reuse canonical reparent/reorder and snap APIs. Normal Layered movement never reparents. Present explicit destination before hierarchy changes. Generalized drag-to-nest, Container grouping and unsupported world-transform conversion are outside this increment unless named in its approval. An accessible Move to… command can serve current supported reparenting without a new drag engine.

Construct a dark root, native Flow Container A with Text/Button and native Layered Container B with Image/overlay. Use only existing validated treatments and assets first. Expose root selection, clear scope, shared Style task and task return. Prove all four parent/child mode combinations and independent styling. Clipped content matches Preview; chrome stays accessible without making hidden content appear published. Reject rasterized whole-design substitution.

The two-Container fixture has two independent gates: **visual fidelity** and **authoring usability**. Demonstrate creation, independent styling, dragging, alignment, child editing, resizing, save/reload and Preview through native controls; a seeded config or static render does not demonstrate creation or discoverability. Record action/panel/scroll counts and wrong turns as well as rendered output. Native controls may be driven by automation, but that trace does not establish first-user discoverability. Include PO hands-on review. Keep each gate's evidence and status separate.

The visual reference will be supplied separately. Mark exact visual comparison BLOCKED until the image has been received, inspected and evaluated against the native candidate. Receipt alone is not comparison. Preserve its file/version with the comparison evidence. Do not invent an approval image. This increment is complete only when the design can be edited again after reopen, not merely rendered once.

## Later increments requiring approval

Increment 4 exposes ready Text/Media/Appearance paths, certified preset families and valid font depth through existing discovery adapters. Repair misleading save failure feedback before promoting the full creation journey. Distinguish Apply surface style from Add designed Container; do not restyle descendants or mutate layout on Material application. Catalog breadth and saved linked styles require explicit scope.

Increment 5 makes visual starting points, Brand defaults, CTA, Preview, saving and deliberate publication readiness one coherent customer journey. Preserve native construction as an acceptance case. Measure current and improved action counts from identical states; do not substitute estimated click counts or automation for first-user testing.

Responsive delivery and provider-backed contextual AI are later separate releases. Use one underlying document, inherited presentation and existing proposal authority. None authorizes relationship, membership, collectible, entitlement, commerce, Campaign or identity infrastructure.

## Verification and handoff for each approved increment

Write the candidate-specific acceptance matrix before editing; include root/nested/rotated/Flow/Layered, locked/governed and grouped cases as applicable. Run meaningful focused contract/integration tests plus required repository checks appropriate to touched code. Keep pre-existing failures separate. Validate rendered results and commands, not only source strings or control presence.

Capture and personally inspect desktop and 390px whole-workspace before/after screenshots. Record real resize/rotate/anchor behavior where applicable, keyboard alternatives, pointer target rectangles and physical touch results. Show one gesture/commit per history entry, successful Undo/Redo, cancelled/no-op stability, save/reload and Preview parity. Include crop, clipping, delayed font and stale target where affected. Do not report unavailable device checks as passed.

Every temporary task needs entry, preview, apply, cancel, failure and usable return. The next natural edit after finishing must work. Record native config/resource identities and only the expected field changes. Public baseline remains unchanged and hashes BLOCKED unless a separately authorized straightforward read-only verification supplies evidence.

Return outcome, root causes, exact files changed, test commands/results, before/after visual evidence, interaction demonstrations, persistence/Preview results, remaining limitations and newly discovered risks. Provide the exact local review URL and a short hands-on checklist. Label the candidate ready for PO review only when applicable evidence supports it; only Rich records acceptance. Stop at the approved increment boundary.

## Current corrective evidence

Review [Select and Resize with Confidence](SLICE1_SELECT_RESIZE_CORRECTIVE_REVIEW_2026-10-23.md) before continuing. Its source is local and uncommitted; the documentation push includes an inspectable corrective delta and fingerprints, not a standalone application release SHA. Resolve that source-integration boundary and missing final capture evidence before treating the candidate as a release handoff. Preserve the PO acceptance gate.

## Final Slice 1 interaction corrective candidate

The authorized clipboard/body-drag/resize/nudge pass and evidence are recorded in [the final interaction review](SLICE1_FINAL_INTERACTION_REVIEW_2026-10-23.md). Layered 1px/10px nudging is now implemented locally through canonical transactions. Native Shift-drag and physical touch remain unverified; Slice 1 remains OPEN, Slice 2 gated, and production hash verification BLOCKED. The remote handoff contains documentation and an exact local source delta, not an application release commit.


## October 23 — clipboard placement corrective evidence

See [Clipboard placement correction](SLICE1_CLIPBOARD_PLACEMENT_CORRECTION_2026-10-23.md) for the demonstrated Flow overflow/size causes, canonical destination and explicit expansion behavior, native regression matrix, 111 passing focused tests, source delta and local review fixture. Slice 1 remains OPEN; Slice 2 remains gated. The separately referenced Product Owner screenshot is not yet supplied; exact image matching is BLOCKED. Production and the prior fixture remain unchanged.


## Frame and Page Truth candidate — October 23

The Product Owner authorized the bounded [Frame and Page Truth scope](SLICE1_PRECISION_LAYOUT_PAGE_SCOPE_PROPOSAL_2026-10-23.md). The [local implementation report](SLICE1_FRAME_PAGE_TRUTH_IMPLEMENTATION_2026-10-23.md) supplies measured native evidence, focused regression results, source snapshots and an exact incremental patch. Shared frame rebasing preserves local children during authoring; viewport responsiveness, declared relative sizing, Flow reflow and Group scaling retain their existing ownership. Minimum page extent, measured required extent and Layered plane remain distinct. Surface and Container Materials still consume the existing shared authority.

This candidate does not close Slice 1 or authorize Text Editing Truth. The application checkout contains pre-existing uncommitted work; the evidence/source handoff commit is not a standalone buildable application revision. Independent source review and Product Owner hands-on acceptance remain required before clean integration and any separately authorized staging/release. Manual and future guided/tApIt operations must continue sharing document, geometry, selection, validation, commands/history, Materials and publishing authorities. No speculative AI or business-domain construction is authorized.
