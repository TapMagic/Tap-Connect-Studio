# Slice 4 — Effortless Professional Design: readiness assessment

> **Subsequent Product Owner approval — October 24, 2026:** Bounded Slice4A local implementation was explicitly approved. [Implementation/evidence handoff](SLICE4A_START_AND_REFINE_HANDOFF_2026-10-24.md) records the candidate and remaining gates. The proposal wording below is retained as historical scope; Slice4B and release remain unauthorized.


October 24, 2026. **Assessment and planning only. No Slice 4 implementation authorized or performed.**

Accepted integrated source: [`f8de7b70c03c5aadebfc85b31a4509b827762e6f`](https://github.com/TapMagic/Tap-Connect-Studio/commit/f8de7b70c03c5aadebfc85b31a4509b827762e6f), branch `codex/studio-reconstitution-slice-1`, repository `TapMagic/Tap-Connect-Studio`. [Slice 3 acceptance](SLICE3_DESKTOP_FUNCTIONAL_ACCEPTANCE_2026-10-24.md) includes the latest corrections. [Recommended scope](SLICE4_DESIGN_DISCOVERY_SCOPE_PROPOSAL_2026-10-24.md) and [complete implementation prompt](SLICE4_DESIGN_DISCOVERY_IMPLEMENTATION_PROMPT_2026-10-24.md) require explicit Product Owner approval.

## Finding and recommendation

Studio has enough native capability to create a polished section. Its interface still makes the customer assemble the design and locate the right property. The highest-value next step is **Start and Refine**: one intentional native introduction Container, two differentiated looks, and content-first Text/Image/Button tasks. Use existing Surface, Placement and Contents distinctions. Keep precision a visible sibling task.

This replaces the earlier proposal of three looks and a two-section Experience starter. The Flow pointer issue that previously led that proposal is already corrected and accepted in the source above; it is now a regression requirement. A full Experience starter remains a separate later milestone. One finished section is a more defensible initial quality gate than a larger unproven catalog.

## Evidence and limits

Fresh inspection used the running local Chrome workspace at port 3050, native Add/Outline/contextual tasks, Surface controls, font discovery, shared media browser and New Experience dialog. Inspection changed only selection, panels and viewport settings; no content/property/save/restore/discard/create/publish action was performed. Source inspection distinguished accepted HEAD from unrelated Library/Map/Video WIP. Those WIP features are not accepted-source dependencies.

[Actual UI captures and excerpts](proofs/slice4-readiness-2026-10-24/) are evidence of current presentation, not proposed designs or visual certification:

| Evidence | Observation |
| --- | --- |
| `01-text-task.png` | Edit Text opens Position and normalized dimensions ahead of content; the selected caption is visible. |
| `02-font-discovery.png` | Typeface browsing exists below several other sections; six recommended families and search are available. |
| `03-image-task.png` | Edit Image similarly leads with geometry; Replace/Fit require reaching farther into the Inspector. |
| `04-asset-discovery.png` | Initial media-browser loading capture shows an empty message. Assets populated on the subsequent observation; this is not proof the library is empty. |
| `05-surface-task.png`, `07-surface-desktop.png` | Root Surface is directly reachable, with appearance separate from Layout. |
| `06-container-choices.png` | Four blank surface-oriented Container choices; no finished native section choice in this path. |
| `observed-ui.txt` | Supporting native-control observations and responsive automation limitation. |

The local recovery warning says an older local copy competes with the saved Card. The version was not chosen. Later UI exposed a saved-Card/publication context inconsistent with the Library draft context; do not certify the current session's identity, revision or save/return journey from this inspection. This is a concrete reason to prioritize recovery/version clarity separately. It is not evidence that production changed.

Automation limitations: one Edit Text action failed after selection/state changed; inspection continued through Outline. A caption selection resolved to its Container during state refresh; no new pointer-engine defect is asserted without an event trace. Requested 390×844 emulation did not affect the inspected tab: measured DOM remained **1200×565**. The override was reset; screenshot 07 is deliberately labeled desktop. No fresh mobile pass, physical touch, keyboard, IME or Safari pass is claimed. No new novice study or task-duration measurement was run.

## Capability assessment

Classification describes customer reachability, not merely storage or renderer support. “Easy” is the evaluator's observed path, not validated novice success. UI = fresh observation; source = code inspection; prior = accepted Slice evidence.

| Capability | Classification | Evidence and implication |
| --- | --- | --- |
| Root Surface appearance | Implemented/easy | UI: header Surface opens the task in one action. Shared base color, Brand/Document colors and Surface/Layout distinction are useful. Preserve this route. |
| Container Surface/Placement/Contents | Functional, discovery uneven | UI/source: explicit tasks exist, but blank Container treatments do not explain a useful composed result. Preserve external placement versus internal layout. |
| Typography/direct Text | Functional, hard to discover | Prior accepted direct editing and Auto/Minimum/Fixed truth; UI Edit task leads with geometry before content, role, font and line spacing. Six role choices and font search exist. Move common editing first, keep exact Position separate. |
| Font loading | Partial | Source loader awaits stylesheet load; that alone does not certify actual glyph readiness. No visible error-state qualification in this audit. Keep delayed-font gate open; avoid adding font dependencies. |
| Solid/gradient colors | Implemented, task-dependent | UI/source Surface treatments and scoped fill parameters exist. Root/Container and Text controls use different presentation. Do not infer child recoloring from Surface styling. |
| Materials | Functional, small reachable set | UI chooser exposes Gunmetal and Worn Saddle Leather. Broader engine recipes are not a certified customer catalog. Grow by quality, not registry count. |
| Border/radius/shadow/depth | Functional, inconsistent reachability | Source shared Surface parameters and component controls exist; Image/Text tasks bury common content behind placement and appearance. Complex stored shadows are not proven fully editable through every numeric control. |
| Image replacement/fitting | Functional, hard to discover | UI Edit → scroll → Replace opens shared browser; cancel returns to Image task. “Module image” and Background naming are indirect. Source supports fit/aspect/brightness/alt. |
| Direct crop/focal workflow | Partial | Source properties/rendering exist; this audit did not demonstrate a complete ordinary Image direct-crop task. Keep existing fit; no new crop engine in Slice 4. |
| Composition/layout | Implemented; terminology imposes learning | Prior accepted Flow/Layered, precision, parent geometry, groups, paste and page truth. UI exposes engineering units/constraints before intent. No manipulation rewrite needed. |
| Nested selection | Functional; scope clarity can improve | Accepted pointer correction retained. UI Outline repeats Text labels; breadcrumbs truncate. Derive meaningful fallback labels, preserve authored names and identities. |
| Reuse/duplicate/copy | Implemented, accepted | Prior Slice 1 behavior; personal reusable-section persistence is not demonstrated. Use native copy/duplicate now, defer a synchronized library. |
| Template discovery | Missing in current native authoring path | UI Templates rail disabled; Add Containers shows four blank treatments. New dialog defaults Blank and offers existing documents, not a certified visual starting catalog. Legacy presets are not native readiness evidence. |
| Asset discovery | Functional, fragmented discoverability | Shared browser includes Studio/Brand/Recent/Favorites/providers/upload and provenance; rail Assets disabled. Improve entry to existing browser, not its backend. Initial empty/loading feedback deserves separate follow-up. |
| Responsive Preview | Implemented within existing rendering; not new responsive authoring | Prior desktop/390 evidence; current Preview controls visible. No breakpoint overrides implied. Fresh 390 attempt failed as described. |
| Undo/Redo and save | Implemented; current recovery journey inconsistent | Prior canonical transactions/save/reload passed; current recovery warning blocks confidence in returning to the intended version. Separate dependency before claiming end-to-end Slice 4 completion. |
| Guided/tApIt/native generated designs | Deliberately deferred | Same resource, validation and command interfaces must support future consumers; no current AI feature or extra editor. |

## Priority order

1. **P0 dependency:** deterministic document identity and recovery choice for the new acceptance journey. Investigate on a disposable blank draft without touching accepted recovery. If reproducible accepted-source behavior blocks New → Save → Return, submit a bounded recovery correction for explicit approval; do not bury it inside design work.
2. **P1 outcome:** customers need one complete, attractive starting section, plus an obvious way to edit its content. One without the other leaves the journey unfinished.
3. **P1 scope feedback:** meaningful selected-node labels and target-aware task return. Avoid wrong-target changes while browsing.
4. **P2 discovery debt:** five disabled rail destinations, broad catalogs, ambiguous image labels, font load feedback and asset loading feedback. Address only the labels/entry paths directly touched by the approved slice; no broad navigation rebuild.
5. **P2 later:** complete Experience starters, more visual families, reusable saved sections, advanced cropping and font discovery.

## Professional benchmarks

Canva documents selection → Edit → Styles for color/font combinations. This supports contextual visual choices close to the selected target. Studio should preserve an explicit scope instead of importing a global restyling action. [Canva color/font combinations](https://www.canva.com/en_au/help/color-and-font-combinations/).

Canva's template workflow lets the user browse/search, inspect a starting design and customize it. Studio should show a native section's actual output before insertion and make its content editable immediately. [Canva templates](https://www.canva.com/help/use-templates/).

Figma documents Canvas/Layers selection and deeper navigation through double-click/Enter and parent/child traversal. The transferable principle is visible scope with predictable entry/exit; preserve Studio's accepted modifiers. [Figma selection](https://help.figma.com/hc/en-us/articles/360040449873-Select-layers-and-objects).

Figma places reusable styles beside the properties they affect, with searchable choices. Studio's appearance chooser should likewise state its affected fields, target and return path. [Figma styles](https://help.figma.com/hc/en-us/articles/360040316193-Apply-styles-to-layers-and-objects).

These are documented-workflow comparisons, not timed live benchmark trials or interface-copying instructions.

## Candidate visual directions

| Direction | Recommendation | Native basis and qualification |
| --- | --- | --- |
| Clean Minimal | Include in proposed 4A | Warm neutral Surface, dark text, generous whitespace, restrained edge, clear CTA. Existing solid fill/edge/Text/Button authorities; no texture dependency. |
| Dark Cinematic | Include in proposed 4A | Deep neutral Surface, deliberate light text hierarchy, limited accent and subtle depth. Visually distinct through composition/emphasis as well as color; no artist asset or mandatory photograph. Avoid claiming tactile metal. |
| Editorial | Next candidate, deferred from 4A | Existing serif catalog can support it, but font readiness and long-copy fidelity need qualification. Not merely recoloring the same recipe. |
| Refined Glass | Defer | Existing glass capability available; contrast depends on backdrop and opacity. Requires composited-background readability and actual material quality evidence. |
| Metallic | Defer | Gunmetal exists; a material swatch is not a finished premium composition. Qualify highlight, edge, scale, clipping and real-device fidelity. |
| Soft Dimensional | Defer | Existing shadows/radius can support depth; risks weak contrast and indistinct controls. Needs an intentional distinct design, not nominal parameter variants. |

No new look is visually certified by this planning document. Both proposed looks must pass native-rendered comparison and Product Owner review; a weak second look cannot be counted as completed catalog breadth.

## Outstanding gates and commercial compatibility

All acceptance-record release gates remain open, including Cabinet Noir assets, lint debt, physical-device input, actual IME, Safari, AT/focus, delayed fonts, original reference and recovery. Original reference comparison is **unverified**; production hashes are **BLOCKED**. Prior correction evidence reports isolated intended-source tests 684 passed / 1 known Cabinet Noir missing-original failure, typecheck and production build passed, lint 1 error / 12 warnings. These are historical results at the accepted candidate, not fresh docs-only test runs or a clean release verdict.

Experience cloning/empty projection remains a high-priority separate reusable-demo issue. Current checkout contains unrelated corrective WIP; do not adopt it as a certified dependency. Use a fresh native Blank draft for future acceptance rather than cloning a potentially empty projection. Full artist/operator reuse is gated on that issue's independent verification.

Native sections remain suitable foundations for artist branding and repeatable multi-artist demonstrations. Later music, merchandise, tickets, fan clubs, membership, collectible identities, sponsored placements and retained relationships must use their canonical domain authorities. No EverEncore editor, entitlements, commerce, memberships, Campaigns or AI infrastructure is added for this visual slice.
