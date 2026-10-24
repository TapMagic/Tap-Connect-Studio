# Slice 3 corrective handoff — Text, placement and page extension

**Current status: Product Owner desktop functional acceptance recorded on October 24, 2026, for integrated source `f8de7b70c03c5aadebfc85b31a4509b827762e6f`.** See the [acceptance record](SLICE3_DESKTOP_FUNCTIONAL_ACCEPTANCE_2026-10-24.md). The engineering evidence below is preserved; historical pending-review language is superseded only for desktop functional acceptance. Physical-device, visual-fidelity, accessibility and release gates remain open. No deployment, release, or broader Slice 4 implementation is authorized by this handoff.

Repository: `TapMagic/Tap-Connect-Studio`. Development branch: `codex/studio-reconstitution-slice-1`. Source parent: `62d7804d112f29c1302e4397643dfb7cb6e4085c`. The original handoff and source were committed together as `f8de7b70c03c5aadebfc85b31a4509b827762e6f`; later documentation-only acceptance updates do not change that source baseline. No main merge, history rewrite, migrations, production access, or deployment occurred.

## Reproduction and demonstrated causes

1. **Text wrapper disagreed with Text policy.** The Layered module wrapper assigned normalized Placement height even when its Text renderer correctly used Auto/Minimum sizing. The initially loaded caption had a 44px selection frame around 76.8px of wrapped content. The fixed outer wrapper, rather than the text content or font, caused the selection mismatch. The supplied [Text screenshot](proofs/slice3-text-placement-correction-2026-10-24/po-before-text.png) demonstrates the same failure class.
2. **The Curated stack was in the root Surface, not the wrong nested Container.** In the saved PO draft, `module-M2-V8lau` had root parent, y=0.72, height≈0.236065, in a 738px Layered plane. The public minimum was 1024px. A downward body drag stopped at y=0.7639349593495934 (`1-height`). The larger public minimum did not create more Layered placement room. The [PO overlap screenshot](proofs/slice3-text-placement-correction-2026-10-24/po-before-stack.png) and [reproduced boundary](proofs/slice3-text-placement-correction-2026-10-24/03-before-boundary.png) are retained.
3. **Insertion silently fell back to crowding.** The existing opening search used a 6% grid, then selected the least-overlapping candidate if none fit. It missed valid narrow gaps. It also sized a Curated assembly from a hard-coded 390px parent before the existing tight-frame renderer corrected it for the actual destination width. Occupancy search and rendered placement could therefore disagree.
4. **Page-edge extension changed the minimum only.** The existing Extend/drag control called the explicit-minimum authority. The visible page became longer while the Layered constraint remained unchanged.
5. **Related pointer and Group consistency issues.** Flow pointer-down created a pointer-transparent drag ghost before crossing its movement threshold, interfering with nested click/double-click editing. Plane rebasing preserved members but did not synchronize persisted Group frames. Both corrections reuse existing pointer and Group authorities.

## Bounded implementation

### Existing-authority corrections

- Straight Text wrappers now consume `studioTextBoxStyle`: Auto follows content, Minimum follows max(content, authored minimum), Fixed remains its authored fixed frame. Curved Text retains its existing contract.
- Existing ResizeObserver measurement supplies Inspector selection diagnostics. Stored Placement remains separately labeled; visual overflow and touch geometry remain distinct. No effect writes measured Text size to the document.
- Vertical Text resize starts at its effective visible edge. Horizontal-only resizing retains stored normalized height instead of persisting a transient measurement.
- Existing insertion search retains its established grid priority and additionally checks sibling edges. It can use measured renderer sizes and rotated envelopes without saving them. Curated aspect sizing uses destination width. Newly inserted selection is revealed and focused.
- Crowded insertion reports the condition; root selections expose **Make room below**. Nested selections point to their parent Container instead of silently growing the page or reparenting.
- Page-edge extension uses the existing Layered plane resize/rebase authority; explicit minimum input still changes only public minimum. Flow keeps its existing minimum behavior. Fit retains the existing content-extent authority.
- Existing plane rebasing now synchronizes Group records. Flow drag ghosts start after the existing 3px mouse / 6px touch movement threshold.

### Minimal interaction extension

`planLayeredPagePlacement` is a pure proposal in the existing Layered authority. It composes existing plane rebasing and movement; it is not another layout or history engine. Transient renderer dimensions may inform its envelope calculations, but never become authored dimensions.

A root downward boundary drag offers **Preview placement / Extend & place / Cancel**. The preview is transient. Apply sends one canonical document command for placement plus plane extension; Undo restores both. Escape/Cancel leave the original document intact. The keyboard boundary message offers the same proposal. A stale proposal is invalidated when its source document or selection changes. Controls stay upright in a viewport portal and have at least 44px height.

The root Layered limit remains **1600px**. Nested Container limits and constraints are unchanged. Locked/nested/Flow selections are not allowed to use root extension as an override. Explicit percentage/stretch policies remain with the existing child-rebase authority. There is no unlimited page mode, new responsive mode, Scale Contents feature, Curated recipe change, or business/AI infrastructure.

### Exact code files

| File | Responsibility |
| --- | --- |
| `components/card/tap-card-builder.tsx` | Existing Add paths consume measured occupancy; reveal selection and report crowding |
| `components/fusion/creative-studio/creative-composition-canvas.tsx` | Text wrapper/resize truth, pointer threshold, transient placement proposal and native controls |
| `components/fusion/creative-studio/studio-frame-diagnostics.tsx` | Distinct stored Placement height diagnostic |
| `components/fusion/creative-studio/use-layered-parent-size.ts` | Observe effective selected frame using existing measurement module |
| `components/fusion/card/reconstitution/studio-composition-inspector.tsx` | Explain rendered Text selection versus stored Placement |
| `components/tap/tap-connect-card.tsx` | Page-edge preview/commit and clear extent labels |
| `lib/fusion/creative-studio/platform/layered-region.ts` | Opening search, envelope/proposal, destination aspect size, Group synchronization |
| `lib/fusion/creative-studio/platform/card-extent.ts` | Explicit page-extension operation through existing plane authority |
| `lib/fusion/creative-studio/__tests__/text-placement-page-correction.test.ts` | Ten focused regressions |

The acceptance record and this handoff are the only existing/new narrative documents changed. Evidence lives in [the proof directory](proofs/slice3-text-placement-correction-2026-10-24/). [Source SHA-256 manifest](proofs/slice3-text-placement-correction-2026-10-24/verified-source-sha256.json) identifies exactly the files copied into isolated verification.

## Measured verification

### Automated

- Focused regressions: **10 passed, 0 failed**. [Log](proofs/slice3-text-placement-correction-2026-10-24/focused-tests.log).
- Working-tree Studio/Card suite: **687 passed, 0 failed**. This includes unrelated WIP tests and is not a claim about clean-checkout reproducibility.
- Isolated `git archive HEAD` plus only the nine intended source/test files: **684 passed, 1 failed, 685 total**. [Full log](proofs/slice3-text-placement-correction-2026-10-24/isolated-regression.log). Failure is the previously documented Cabinet Noir original-asset comparison: an untracked `tmp/Cabinet Noir v1/.../CN-001_identity-topper-brand-crest.png` is absent. No missing asset was fabricated or added to hide it.
- `npx tsc --noEmit --pretty false`: passed.
- Isolated production build: passed, including Next TypeScript validation and route generation. [Log](proofs/slice3-text-placement-correction-2026-10-24/production-build.log). Existing dependencies were reused; no environment files or unrelated application WIP were copied. Prisma generation completed before final verification. Google Fonts required ordinary build network access. No server was deployed.
- Targeted lint remains **not green**: one pre-existing `setMeasured(null)` effect error at `use-layered-parent-size.ts:74` and 12 existing warnings. The same offending statement is present in source parent HEAD. [Log](proofs/slice3-text-placement-correction-2026-10-24/targeted-lint.log).

Regression coverage includes narrow gaps, rotated measured Text occupancy, destination-width Curated aspect, explicit minimum versus plane, limits/locked/nested/Flow rejection, Group/multi-selection geometry, and history round trips. Existing clipboard, duplicate, parent placement, Container resize, matching, snapping, typography, Material, and Group suites also ran. Their automated results do not imply every permutation received a new native hands-on demonstration.

### Native Chrome interactions

All mutations used native Studio controls in an isolated unpublished local fixture. DOM readings were read-only measurements, not direct application-state mutation. [Raw observations](proofs/slice3-text-placement-correction-2026-10-24/native-interactions.json) and [computed comparisons](proofs/slice3-text-placement-correction-2026-10-24/verification-summary.json) are retained.

| Interaction | Observed result |
| --- | --- |
| Two-line Auto caption, 32px font and 12px padding | Text box and selection both 100.797px; stored normalized Placement height unchanged |
| Minimum mode | Content-driven 100.797px; authored 160px minimum gives 160px selection |
| Fixed mode | 44px authored frame; visible and clipped overflow settings verified separately |
| Width / line height / rotation | 55% width and 1.5 line height produced 216px frame; 15° rotation retained that local frame |
| Multiline and long word | Three-line input with newline characters and long unbroken word retained exact content; 99.1875px effective frame; Undo restored original |
| Flow versus Layered | Native switch to Vertical Flow produced matching 100.797px frame; Undo restored every prior frame |
| Zoom | 75% zoom retained 100.797px local Text size; returned to Fit |
| Keyboard ownership | Caret arrows and Escape left object placement unchanged |
| Root crowding resolution | Previewed 738→937px plane; Cancel restored original frames; Apply, one Undo, and Redo matched exact before/after observations |
| Boundary body drag | Previewed 937→1087px plane; Escape restored original; Apply, Undo and Redo matched |
| Add Curated through native drawer | Correct root parent, selected/revealed, crowding explained; preview/apply moved new stack below existing content, plane 1087→1286px; Undo/Redo matched |
| Fit after deletion | Removing stack then Fit reduced plane 1087→738px and effective extent to 762px; two Undos restored Fit and deletion exactly |
| Save/reload | All eight native node sizes, positions, parents and Text content matched. Plane remained 1087px; CSS string whitespace changed, not geometry |
| Preview | All eight native node sizes and parents matched editor; caption Text measurement matched exactly; native Spotify/YouTube actions retained |
| 390×844 editing viewport | Direct caption editing and extension preview/cancel usable; three proposal controls measured 44px high and inside viewport; viewport reset afterward |

Curated internal composition, child identities, action definitions, Materials and artwork are not regenerated by extension. Source tests check the nested composition remains unchanged; screenshots verify the visible native assembly. The original PO document was not used as a disposable test fixture.

### Visual evidence

- [Before Text](proofs/slice3-text-placement-correction-2026-10-24/po-before-text.png) → [corrected selected Text](proofs/slice3-text-placement-correction-2026-10-24/15-final-text-selection.png).
- [Before overlap](proofs/slice3-text-placement-correction-2026-10-24/po-before-stack.png) → [after extension](proofs/slice3-text-placement-correction-2026-10-24/06-after-extension.png).
- [Boundary offer](proofs/slice3-text-placement-correction-2026-10-24/07-boundary-drag-offer.png), [rotated Text](proofs/slice3-text-placement-correction-2026-10-24/08-rotated-auto-text.png).
- [390px direct edit](proofs/slice3-text-placement-correction-2026-10-24/09-phone-text-editing.png), [390px extension controls](proofs/slice3-text-placement-correction-2026-10-24/10-phone-extension-controls.png).
- [Native crowded insertion](proofs/slice3-text-placement-correction-2026-10-24/11-native-insertion.png) → [native placement result](proofs/slice3-text-placement-correction-2026-10-24/12-native-insertion-placed.png).
- [Flow Text](proofs/slice3-text-placement-correction-2026-10-24/13-flow-text-frame.png), [Preview](proofs/slice3-text-placement-correction-2026-10-24/16-preview-text-and-stack.png).

Screenshots were visually inspected. These are recorded observations, not estimates of task-time improvements or full visual-fidelity certification.

## Fixture and hands-on review

[Open local corrective fixture](http://127.0.0.1:3050/dashboard/card/edit?experience=slice3-correction-49b2d5ab-dba2-4ebb-80e1-6e5eb98add44).

It is an unpublished local draft named `Slice 3 · Text and Page Correction`; inherited draft metadata still displays `Slice 3 · Native Surface Studio` in the editor header. No QR, destination, credentials or publication record was created. It is deliberately separate from the reusable Experience cloning workflow defect.

1. Select “Stories worth staying for.” Change width/font size and Auto/Minimum/Fixed in Edit Text; inspect the outline.
2. Select the stack below the leather Container. Drag toward the bottom; Preview placement, Cancel or Extend & place. Try Undo/Redo.
3. Add → Curated → Love & Theft → Bound Single Stack. If crowded, use Make room below; inspect preserved native actions and artwork.
4. Delete the added test stack, use Fit to content, then Undo. Save and reload; compare Preview.

Local verification: original PO fixture `cmvlvb1b502e7to9k6hzzalc4` remains revision **80**, SHA-256 `a772c367bd3df3de81d5d1bcf638dbab394ccbdb97670e2f5bfcb4750bf33f31`, unchanged from the corrective baseline. Corrective fixture is revision **18**, unpublished, SHA-256 `8053d9e182426591e7db6251c9c4604881ba889c9cd74c871c015f0aa79817f4`. [Read-only local verification](proofs/slice3-text-placement-correction-2026-10-24/local-fixture-verification.json).

## Limitations and remaining gates

- Physical touch, mobile software keyboard/IME, Safari/WebKit, deliberately delayed font loading, screen-reader certification and exact external-reference fidelity remain **unverified**, not passed. ResizeObserver handles layout changes, but that is not a delayed-network-font test.
- The multiline case used the native editable textbox with multiline input; it did not independently exercise the operating-system clipboard pipeline in this pass.
- Occupancy uses conservative rectangular envelopes. Intentional overlaps can also show Make room below. It does not infer visual importance or pack around irregular painted pixels. Nested crowding requires adjusting the existing Container; root extension does not override it.
- Browser reload displayed a newer-local-recovery banner even though saved node geometry and Text matched. Neither original nor corrective recovery copies were discarded. This existing recovery-feedback behavior needs a separate focused investigation; choose the server-loaded state for this review unless deliberately testing recovery.
- Initial harness failures were not counted as passes: wrong locator roles, an unsupported sandbox `parseFloat` reference, a preview invalidated by object identity (fixed and retested using document equality), and an insertion-apply attempt interrupted by development hot reload (repeated successfully after recompilation). A first isolated test run overlapped Prisma generation; its transient constructor error was absent on sequential rerun. A network-restricted font build failed before the successful network-enabled build. An automatic review rejected an early reload with possible unsaved drag state; it was not bypassed. Later reload followed verified Saved state.
- Clean-checkout Cabinet Noir original-asset reproducibility and existing lint debt remain open as described above. No production hash was reverified: the protected historical production hash status remains **BLOCKED**.

All **36 non-generated pre-existing WIP files** matched their starting SHA-256 fingerprints before staging. Generated `.next*` output is excluded from that comparison and from this commit. Only intended source, documentation and evidence are staged. The five previously requested October 22 UX documents remain part of this development branch and are included in remote verification.

The ongoing gate remains: local work → verification → documentation/evidence → development-branch push → independent architecture/product review → Product Owner acceptance → separately authorized staging/release. The next step is hands-on acceptance of this corrective candidate; broader design-discovery work remains planning only.
