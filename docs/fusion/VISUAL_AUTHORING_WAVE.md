# Visual Authoring & Guided Intelligence Wave

**Branch:** `tapconnect-v1-v2-fusion`  
**Starting HEAD:** `e187dc892a68ed569a09beb8cb4f8e1359aa6775`  
**Ending HEAD:** `e187dc892a68ed569a09beb8cb4f8e1359aa6775` (local uncommitted wave; no commit requested)  
**Scope:** Host authoring UX — TapFlow visual journey, TapCanvas whiteboard, Workbench templates, Brand Kit copy/restore, expanded text (Card + Campaign), deterministic Journey Review + simulation. **J1 remains VERIFIED.** No J2. No push/merge/deploy/Railway/production.  
**Not in this wave:** Card fuse-box integration (TapFlow/TapCanvas/TapLoop through Card actions).

**Standing obligation:** CONTINUOUS PRODUCT IMPROVEMENT AND REDESIGN DUTY · GLOBAL QUALITY STANDARDS · GLOBAL COMPETITIVE QUALITY · COMPETITIVE FEATURE ADAPTATION.

---

## Honesty corrections (post-PO audit)

| Topic | Accurate claim |
|-------|----------------|
| Journey Review | **Deterministic / rules-based** — uses current Journey definition + validation/simulation rules. **Does not call a live AI model.** Live grounded Automation Team review = **Phase 2**. |
| Brand Kit | **Copy / restore into the current Card or Journey** — session authoring. Future Kit changes do **not** auto-update objects yet. Durable linked inheritance = **Phase 2**. No second Brand SoT. |
| Drag history | One history entry per **completed** drag on TapFlow + TapCanvas; undo/redo; no pointermove flood. |
| Campaign text | Substantial Campaign/Workbench fields use `ExpandedTextField` (headline, body, descriptions, offer copy, success messages, disclaimer, column bodies, features). |
| Card fuse-box | **Not claimed / not started.** |

---

## 1. Starting / ending HEAD

| | SHA |
|--|-----|
| Start | `e187dc892a68ed569a09beb8cb4f8e1359aa6775` |
| End (repo tip) | same — wave is local working tree |

---

## 2. Files changed (primary)

### New
- `components/design/expanded-text-field.tsx`
- `components/fusion/graph/visual-board.tsx`
- `components/fusion/authoring/brand-inheritance-bar.tsx`
- `components/fusion/journey/developer-definition-panel.tsx`
- `components/fusion/journey/journey-ai-review-panel.tsx`
- `components/fusion/journey/journey-simulation-panel.tsx`
- `lib/fusion/graph/layout.ts` · `history.ts` · `__tests__/layout-history.test.ts`
- `lib/fusion/authoring/brand-inheritance.ts` · `__tests__/brand-inheritance.test.ts`
- `lib/fusion/journey/review.ts` · `__tests__/review.test.ts`
- `lib/fusion/studio/template-outcomes.ts` · `__tests__/template-outcomes.test.ts`
- `e2e/visual-authoring-wave.spec.ts`
- `docs/fusion/VISUAL_AUTHORING_WAVE.md` (this ledger)

### Modified
- `components/fusion/journey/journey-editor-shell.tsx` — visual journey primary UX
- `components/fusion/canvas/tap-canvas-shell.tsx` — VisualBoard + position persist
- `app/api/canvas/route.ts` — `update_node_position`
- `components/workbench/template-gallery.tsx` — distinct outcome cards + modal
- `components/card/tap-card-builder.tsx` — ExpandedTextField + BrandInheritanceBar
- `app/dashboard/experiences/journeys/page.tsx` — Brand Kit snapshot into editor
- `app/dashboard/card/page.tsx` — Brand colors into builder
- `lib/fusion/journey/index.ts` — export review

---

## 3. Red-team findings (pre-edit)

Confirmed against Product Owner defects:

1. Substantial text trapped in Inputs / undersized areas (Card builder headlines/descriptions).
2. TapFlow Beginner = stage list + **primary Definition JSON** textarea.
3. Expert “graph” = absolute chips without edges/arrows/zoom/minimap.
4. TapCanvas “graph” = flex-wrap button chips; edges as count text only.
5. Workbench templates: similar dark mini-phones; thin tone strings.
6. Brand Kit not inherited into TapFlow; Card used colors ad hoc without link/copy/restore model.
7. No governed AI review / visual diff / partial accept on journeys.
8. Simulation existed as JSON event dump, not customer playback.
9. Authoring panes crowded; no focus mode on TapFlow.

---

## 4. Additional improvements (proactive)

| Addition | Classification |
|----------|----------------|
| Shared `VisualBoard` (zoom/pan/minimap/snap/guides/keyboard nudge) for Journey + Canvas | **Required in this wave** |
| AuthoringHistory undo/redo (⌘Z / ⌘⇧Z) on TapFlow | **Required in this wave** |
| Invalid-edge prevention (`canConnectNodes`) | **Required in this wave** |
| Focus mode + collapsible inspector on TapFlow | **Required in this wave** |
| Ideas vs Executable palette labels on TapCanvas | **Required in this wave** |
| Mobile board-list collapse on TapCanvas | **Required in this wave** |
| Debounced position persistence API | **Required in this wave** |
| Template outcome metadata module (single gallery SoT for narrative) | **Required in this wave** |
| Multi-path simulation branch selector | **Required in this wave** |
| Subflow nesting UI | **Phase 2 candidate** |
| Live collaborative cursors on canvas | **Future-ready** |
| Full rich-text (Pages-class) inline formatting in Expand editor | **Phase 2 candidate** |
| Real LLM-backed journey critique (today: deterministic rules-based Journey Review) | **Phase 2 candidate** (contracts ready; no silent rewrite) |
| Arbitrary freehand drawing tools | **Rejected** — drawings must never execute; stickies/notes/frames suffice |

---

## 5. Features rejected (and why)

| Idea | Why |
|------|-----|
| Add `@xyflow/react` dependency | Custom VisualBoard meets requirements without React 19 / Next 16 risk and keeps domain graph ownership. |
| Auto-apply AI patches | Charter: never silent rewrite/publish. |
| Second Brand Kit SoT in authoring drafts | Inheritance only — Brand Kit / Business remain authority. |
| Replace seven destinations / J2 pillars | Out of scope; PO-locked. |
| Clone FigJam/ManyChat chrome | Benchmarks only. |

---

## 6. Text editing — before / after

| Before | After |
|--------|-------|
| Headlines/descriptions/offer copy in cramped `Input` / bare textarea | `ExpandedTextField`: auto-grow, Expand drawer, preview, length guidance, selection restore, ⌘/Ctrl+Enter |
| Journey message/email body absent or tiny | Expanded editor in inspector with recommended lengths |
| Short labels still single-line | Identity name/title remain `Input` (intentional) |

---

## 7. TapFlow — before / after

| Before | After |
|--------|-------|
| Beginner stage list + JSON primary | Shared visual graph; Beginner = guided stages **on same engine** + simplified inspector |
| Expert absolute chips, no edges | Draggable nodes, SVG edges + arrowheads, labels, snap, auto-layout, zoom/pan/minimap, palette, multi-select, delete/duplicate, undo/redo |
| JSON always visible | **Advanced → Developer definition** collapsed; validate/import compare/restore prior |
| Dry-run JSON dump | Simulation playback + customer summary + View details |
| No review | Deterministic Journey Review: findings on canvas, suggested corrections, diff, accept/reject/partial, re-validate (not live AI) |
| Drag without history | One undo/redo entry per completed drag (live pointermove does not flood history) |

---

## 8. TapCanvas — before / after

| Before | After |
|--------|-------|
| Chip/flex node list; edge count text | VisualBoard with free-positioned nodes, connectors/arrows, minimap |
| No drag persistence | `update_node_position` → `updateNode` + flush; one history entry per completed drag with Undo/Redo move |
| Sketch vs live weak | Dashed sketch tone; Ideas vs Executable labels; sketch never executes |

---

## 9. Journey Review workflow (deterministic)

1. Analyze current definition with **rules** (`reviewJourney` / validation + simulation) — **no live AI model**.
2. Mark findings (node highlight set).
3. Plain-language explanations + suggested fixes.
4. Suggested corrections as proposed ops (add exit, connect dead ends, consent flags, handoff, else branch).
5. Preview correction diff (counts + op summaries).
6. Accept selected / reject / partial.
7. Re-validate after apply.
8. Simulation paths + customer experience summary.
9. **Never** silent rewrite or publish.
10. Live grounded Automation Team review = **Phase 2**.

---

## 10. JSON relocation

Developer definition panel: collapsed by default, amber “Advanced” labeling, syntax validation, copy/export, import with compare-before-apply, restore prior valid. Host path remains visual.

---

## 11. Workbench templates — before / after

| Before | After |
|--------|-------|
| Near-identical dark mini layouts | Distinct media treatments + gradients per template (`template-outcomes`) |
| Tone one-liner | Scenario, first screen, primary action, data, follow-up, outcome, pillars, setup, steps |
| Thin preview modal | What this creates / customer experiences / What you need + large phone preview + Use this template |

---

## 12. Brand Kit inheritance

- Host model: **Use current Brand Kit values** / **Copy Brand Kit values** / **Customize this experience** / **Restore Brand Kit values**.
- Values are **copied into** the current Card or Journey. Future Brand Kit changes do **not** automatically update this object yet.
- Durable linked inheritance is **Phase 2**. Do not present session copy as a durable sync link.
- Wired into TapFlow (tone → message defaults) and Card builder (colors, logo, empty identity prefill).
- No second SoT.

---

## 13. Final-preview behavior

- Templates: large phone preview with realistic sample data.
- Card: existing WYSIWYG preview retained; Brand colors populate.
- Journey: customer experience summary + step playback highlight on board.
- Phase 2: deeper multi-device interaction sequence on every surface.

---

## 14. Layout / focus

- TapFlow Focus mode (fullscreen work surface).
- Collapsible inspector.
- TapCanvas board list collapse on small screens.
- Preferences remembered via existing nav patterns; essential controls remain reachable.

---

## 15. Desktop / tablet / mobile evidence

Headed `P-visual-responsive-a11y`: board visible at 1280 / 768 / 390 with width > 200px.

---

## 16. Accessibility evidence

- Axe serious/critical **0** on journeys after contrast fix on board chrome hint.
- Keyboard: board focus, Tab into chrome, arrow nudge nodes, non-drag connection list.
- Node buttons expose `aria-pressed` / labels; Expand editor dialog labeling.

---

## 17. Test results

| Gate | Result |
|------|--------|
| `tsc --noEmit` | PASS |
| lint | **0 errors** (pre-existing img warnings) |
| `npm test` | **446/446** PASS |
| `npm run build` | PASS |
| Prisma validate | PASS |
| Headed `e2e/visual-authoring-wave.spec.ts` | **4/4 PASS** |
| Headed J1 reconfirm (`P-j1-studio-ready`, `P-j1-create-honesty`) | **2/2 PASS** |
| Axe on journeys / canvas / workbench / card | **serious/critical 0** |

New/updated unit coverage: journey review, brand inheritance (copy/restore honesty), graph layout/history (**completed-drag one-entry**), template outcomes, **campaign expanded-field wiring**.

---

## 18. Remaining defects

- Expand editor is plain text (not full Pages-class rich formatting).
- TapCanvas AI organization suggestions remain Analyze & Repair existing proposals (not a new generative organizer).
- Full VO/NVDA not run this wave.
- Session undo across refresh still open (prior residual).
- Card fuse-box (authoring pillars through Card actions) not started — separate wave.

---

## 19. Phase 2 candidates

- Rich-text formatting inside Expand editor.
- Real model-backed Automation Team journey critique with provenance.
- Subflows / nested journey frames.
- Deeper final-form interaction sequence previews (tablet/desktop) on all authoring surfaces.
- Canvas auto-organize AI with accept/reject (extends existing proposal contract).

---

## 20. J1 VERIFIED confirmation

J1 remains **VERIFIED**. Reconfirmed headed: ID-001 studio-ready honesty, ID-005 create honesty. No J1 spine regressions introduced by this wave.

---

## 21. Isolation confirmation

No push, merge, deploy, production database change, Railway action, branch change, other worktree alteration, or unrelated J2 pillar expansion occurred.

---

## 22. Product Owner walkthrough (exact)

1. Open **Experiences → Journeys**. Confirm visual board (nodes + arrows + minimap), not JSON-first.
2. Add a Message/Email; open **Expand editor**; confirm full text + preview; close and confirm selection retained.
3. Toggle **Focus**; collapse inspector; exit Focus.
4. Run **Journey Review** (rules-based; not live AI); preview corrections; uncheck one op; **Accept selected** (partial). Confirm journey updates and findings refresh.
5. **Play path** in Simulation; open **View details** for technical events.
6. Open **Advanced · Developer definition**; confirm collapsed by default; open; copy; attempt invalid JSON (error); restore prior.
7. Open **Workbench**; confirm templates show distinct scenarios/media; open **Use**; read What this creates / customer / What you need.
8. Open **Card** builder; confirm Brand Kit bar; override a color; **Restore Brand Kit values**. Confirm copy is not presented as durable sync.
9. Open **TapCanvas**; create/open a board; confirm spatial nodes + connectors (not chip soup); drag a sticky; reload and confirm position.
10. Spot-check mobile width on Journeys; confirm board still usable.

---

**Wave status:** Locally complete for Product Owner review. Not OWNER-READY / not OWNER ACCEPTED until PO sign-off.
