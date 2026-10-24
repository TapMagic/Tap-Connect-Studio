# Design Discovery, Professional Presets & Native Visual Quality

October 24, 2026 · **Proposed bounded Slice 4 — planning only; implementation awaits Product Owner approval.**

[Slice 3 desktop functional acceptance](SLICE3_DESKTOP_FUNCTIONAL_ACCEPTANCE_2026-10-24.md) is recorded. The accepted baseline is source `8d50ad75eeb2ac9efb8197df2bf0f5bc4d6750cb`, documentation `4fe073f9b51a1211ec4c557392ec5c01c02ee504`. All earlier acceptance and release distinctions remain intact.

## Recommendation

Deliver one complete journey: **Start with a native composition → replace content → select exactly what you mean → apply a compatible look → refine → Undo → Preview.**

The smallest coherent slice is **Select, Style, Make It Yours**: repair the reproduced nested-selection obstruction; make content replacement and Surface refinement lead from selection; provide three quality-gated looks over one native Flow starter. Do not begin a global editor redesign, large Material catalog, reusable-template service, or responsive-authoring project.

The slice has three reviewable increments, all inside that one proposed scope:

1. **Selection and refinement truth:** fix the reproduced Flow child interaction; show meaningful selection labels and immediate Text/Image/Button actions using existing toolbars, Outline and task surfaces.
2. **Three excellent looks:** Clean Minimal, Editorial, Dark Cinematic, backed by existing Material and typography properties. Apply Surface appearance to the selected target only; creation presets may compose those properties across their newly created native nodes.
3. **One useful starting composition:** a Flow introduction-and-feature layout available from the existing Add drawer and an empty-canvas shortcut to that same entry. Three looks, one structural recipe, no new permanent rail or template engine. Preserve Blank as an equally valid choice.

This is a scope recommendation, not authorization to construct it. If a locked contract must change, stop with the demonstrated conflict and request approval.

## Investigation and evidence

Fresh read-only UI inspection used the accepted local Slice 3 document at revision 63 on Chrome. Selection, drawer/Inspector navigation and Preview were exercised; no properties, content, geometry or publication state were changed. Source inspection covered the accepted source and the existing checkout. The checkout contains unrelated Map/Video discovery and Library WIP; those visible additions are not dependencies or included work. A 36-file fingerprint records that WIP separately.

[Current native UI evidence](proofs/slice4-discovery-planning-2026-10-24/): 01 Add discovery, 02 Container choices, 03 root Surface, 04 Image refinement, 05 reproduced nested selection, 06 accepted native visual example. These are actual application screenshots, not mockups of proposed features. The existing Slice 3 desktop/390px evidence remains relevant; no new physical-device testing was performed.

| Priority / evidence | Current limitation | Available capability versus missing work |
| --- | --- | --- |
| P0, fresh reproduction + source | Double-clicking the visible heading in Flow Container A selected the Container and did not open a textbox. DOM hit-testing identified the actual text span, not a covered pixel. Outline plus Edit text works. | Text entry exists. Source-supported cause to verify: `startFlowPointerMove` sets `flowPointerVisual` immediately on pointer-down; the selected Flow child then receives `pointerEvents:none` before the 3px mouse / 6px touch movement threshold. That can retarget the click to its parent. Confirm event sequence before changing the shared pointer path. |
| P1, fresh UI + source | Image **Edit** opens Position, normalized units, diagnostics and tint before Replace/Fit. | Replacement, fit, aspect lock and brightness exist. The task route/order is wrong for content editing; do not add another Inspector. |
| P1, fresh UI | Root and Container Material chooser presents Gunmetal and Worn Saddle Leather. Container insertion offers four surface categories rather than useful finished compositions. | Shared catalog includes flat/matte, glass/acrylic, metallic and depth recipes; catalog existence is not proof each is visually ready. Expose only certified combinations. |
| P1, fresh UI + source | Templates, Text, Design, Brand and Assets rail entries are disabled while Add contains working content discovery. | Existing readiness registry can hide unready destinations. Keep Add and Outline; use contextual tasks for styling. Do not enable a destination without its complete workflow. |
| P1, fresh UI | Repeated “Text” names and preset-derived Container names do not tell users what they are selecting. | Existing identity, hierarchy and selection state suffice. Derive fallback labels from role/content/alt text; preserve authored names and node IDs. |
| P1, source + prior native evidence | Creation defaults are separate choices: Container surface, text role, image, Button, padding and geometry. There is no certified complete starter in the current native Add path. | Native node creation, parent insertion, geometry initialization and history exist. One composition factory is justified; a reusable-template persistence service is not. |
| P1, source | Older `insertRootContainerPreset` puts children as peers on a root plane with `props.containerId`, unlike current canonical `parentId` / `compositionKind`. | Reuse design intentions only. Never wire that legacy insertion route into new discovery. Build the one starter through `composition-parent-authority` and validate the result. |
| P2, source | Typeface discovery has six recommended family IDs, recents and an 18-result search cap; font-loading failures are not visibly explained. Some preset registries contain expressive effect intent not certified in this editor path. | Font catalog/loader and Text roles exist. Use a small verified pairing set; surface loading/failure state for proposed presets. Defer general font-browser expansion and unsupported text effects. |
| P2, source + current UI | Root/Container image surfaces expose focal controls; native Image renderer has crop/focal properties, but the Image Inspector exposes Fit rather than a complete direct crop workflow. | Fitting is supported, full crop UX is not demonstrated. Bring existing Replace/Fit forward; expose canonical focal values only if round-trip/parity is proven. No new crop interaction engine in this slice. |
| P2, prior observed warning | Complex shadows can render but a single numeric control does not fully describe them; background shorthand/size transitions have logged a warning. | Avoid presets whose effects cannot be understood/refined natively. Fix only a reproduced shared adapter defect that blocks a selected look; otherwise defer and report. |
| P2, source + UI | Multiple child spacing sources can compound (Container gap plus Text margins); changing Text role can reset box styling while preserving content. | Define authored defaults in the starter and an explicit changed-field list for appearance operations. Do not apply an entire role object when the user asks to change only typeface or visual treatment. |
| Existing limit | Preview context buttons do not create breakpoint-specific layouts; Layered geometry uses its authored parent plane. | Build the starter with Flow, flexible widths and Auto Text. Test current behavior at actual output widths; do not promise breakpoint overrides or new responsive authoring. |

The selection failure is a reproduced obstacle, not a reason to reopen every accepted geometry feature. The early drag-state mechanism is a source-supported hypothesis, not a completed runtime event trace.

## Reusable authorities

| Authority | Reuse and boundary |
| --- | --- |
| `platform/discovery.ts` + reconstitution drawer/catalog adapter | Versioned resource refs, compatibility, readiness, approval, previews, search/paging. New look/starter entries are resource data and a thin application adapter; no parallel registry with conflicting readiness. |
| `material-engine.ts`, `material-surface.ts`, Material surface layers, Visual Plane, `platform/surface-capability.ts` | All preview/apply/refine paths consume these same recipes and effective values. Root frame mode and Container internal layout are not appearance properties. |
| `composition-parent-authority.ts` + existing placement authority | Create true native Containers and Modules; initialize placement for the actual parent; validate hierarchy. Do not use legacy flat Container membership or repurpose true Groups. |
| Builder `setConfigHistory`, live adjustment and validation | Build proposed starter in memory using pure shared operations, validate, then one command/history commit. Avoid a sequence of stateful UI insertion callbacks that could partially commit or use stale state. |
| Canonical selection references/targets, pointer/keyboard ownership, task return stack | One selected identity and current task across Canvas, Outline, Inspector, future assistance. Preserve locked/Curated boundaries; stale or changed selection cancels an outstanding operation. |
| `platform/text-authoring.ts`, font catalog/loading/activity | Existing role defaults and actual supported font variants; source text unchanged by appearance. No separate typography semantics. |
| Standard Button catalog/appearance + action authority | Existing editable presentation with preserved label/action when restyling. Starting CTA requires an explicit real destination; no invented phone number or silent business action. |
| Shared Media browser + provenance | Replace the existing image in place. Preserve crop/geometry unless the user explicitly changes fit/frame. Existing asset rights and tenant ownership apply. |
| Canonical rendering, persistence, publication | Same native output in editor and Preview; save/reopen; no changes to publishing, Access, identities or QR. |

## Simplified workflows

| Intent | Proposed native path and result |
| --- | --- |
| Start something polished | Blank → **Start with a layout** (existing Add drawer) → Introduction & Feature → choose one of three looks → Add. All nodes appear selected/visible in one undoable operation. The empty-canvas shortcut opens this same route. |
| Edit words | Select text / double-click visible words → caret. A selected Text exposes **Edit text** and **Typeface** directly. Text remains exact; Escape cancels, Done commits one edit. |
| Replace image | Select image → **Replace**. Existing browser returns to the same selected image; **Fit** and aspect lock remain adjacent. Position is a separate task, not the opening content screen. |
| Change a Container look | Select its background/padding → **Surface** → choose a compatible preview → immediate one-command apply → refine color, border, corners and depth. Target name and affected properties remain clear. |
| Change root appearance | Root Surface selection → same Surface choices with root compatibility filtering. Appearance never changes full-bleed/inset, page height, child styling or parent layout. |
| Edit Button | Select Button → **Label / Action / Appearance** within existing editing surface. Preview the real chosen action. An unset action gets a clear completion cue; styling never invents or replaces it. |
| Reach a nested object | Ordinary native child click selects that child; Container padding selects Container. Double-click Text edits it. True Group semantics remain intact: use existing Enter/edit-contents to reach members. Breadcrumb Parent and Outline are visible alternatives, not mandatory workarounds. |
| Position precisely | Selected applicable target → Position → X/Y/W/H, rotation, alignment/order as supported by its parent. Flow uses reorder/alignment; Layered uses geometry. Preserve accepted manipulation semantics. |
| Experiment safely | A look click commits one named appearance operation; Undo restores it exactly. Browsing, hovering, opening panels and changing selection do not save draft changes. No implicit hover application. |

On desktop, one contextual surface shows content first and precision on request. At 390px, use the existing task sheet and bottom tools, keep the selected name and primary action visible, and preserve Back to editing. Hide unready permanent destinations through the existing readiness policy. No new permanent navigation taxonomy or keyboard modifier is required. Do not steal Command/Ctrl-click from existing multi-selection to imitate another editor.

Selection-only changes must not create creative history entries or alter authored hierarchy. If an existing content-mode contract persists state, reuse it and isolate the specific inconsistency; do not silently replace it with a new selection engine.

## Preset strategy and evaluated families

A **look** is a versioned, compatibility-filtered recipe of existing native properties. A **starting composition** is a native document construction recipe. Keep these separate: appearance application changes only the selected target’s declared styling fields; starter construction initializes new children and layout. No hidden linked style cascade is introduced.

| Candidate | Existing ingredients | Recommendation / visual risk |
| --- | --- | --- |
| Clean Minimal | Solid/flat Surface, restrained border, Inter, generous Flow spacing, Clean Flat Button | Include. Quiet hierarchy is useful without photography or advanced effects. |
| Editorial | Opaque paper-like color, Playfair/Source Serif and Inter pair from existing font catalog, fine rules, native Text | Include after font-load/variant and long-copy checks. No simulated print texture or outlined type effect required. |
| Dark Cinematic | Opaque dark Surface, restrained highlight/gradient, existing image/focal/veil properties, high-contrast text and CTA | Include. Builds on the accepted native example, but do not reuse artist imagery as a generic starter asset. |
| Glass / Acrylic | Existing glass/acrylic Material recipes and Surface opacity/blur | Defer from first certified starter set. Backdrop dependence, text contrast and platform rendering need qualification on multiple backgrounds. Do not label an opaque gradient as transparent glass. |
| Metallic | Gunmetal and existing metal recipes / Standard Button appearances | Retain existing available choices; defer a new full starter family. Require believable highlights and readable edges, not merely a gray gradient. |
| Soft Dimensional | Soft-raised recipe, radius and shadow, existing tactile Buttons | Defer fourth starter look to keep first certification small. Do not duplicate Minimal with only a shadow adjustment. |

Proposed art direction (values to validate in native rendering; not certified output):

| Look | Palette and hierarchy | Native composition treatment |
| --- | --- | --- |
| Clean Minimal | Root `#F3F5F7`, Container `#FFFFFF`, Text `#17212B`, CTA `#17212B` with white label; Inter heading700/body400 | 16px corners,1px quiet border, no decorative depth; image optional; strong alignment and negative space |
| Editorial | Root `#F2EEE6`, Container `#FFFDF8`, Text `#24211D`, accent `#69523B`; Playfair Display heading600 with Inter body400 | 4px corners, thin divider, generous24px padding; typography supplies character rather than texture |
| Dark Cinematic | Root `#0B1014`, Container `#192329`, Text `#F4F6F8`, CTA `#E7D7B8` with `#15191C` label; Inter heading700/body400 | 20px corners, restrained existing depth, optional photograph with separate readable caption surface; no translucent text fade |

These palettes belong to authored content, not a mandatory editor chrome redesign. Light Experiences remain valid inside dark TapConnect chrome. Brand adoption is explicit and subject to actual contrast review.

Initial catalog ceiling: **one structural starter, three looks**. Existing approved choices remain reachable; the proposal does not remove advanced capabilities. Candidate families are not promised launch content until they pass native visual review.

Starter structure: Flow root → introduction Container (heading, body, CTA) → feature Container (optional native image, caption). Text uses Auto height; widths follow current Flow semantics. The image comes from an approved bundled sample with verified rights or the user’s chosen Asset. If no suitable sample is available, the no-photo layout must be intentionally designed and complete; do not fill it with an unrelated artist’s image or an empty broken frame. The feature can accept an image later through Replace/Add.

Starting defaults: 24px Container padding; 16px sibling gap; Text margins explicitly coordinated so spacing is not doubled; 32px/1.15 heading, 16px/1.5 body, 13px/1.4 optional caption; native Button target at least44px high. These are proposed starter values, not universal constraints on user documents. Validate the recipe at narrow widths before certification.

For existing targets, show Surface-only variants derived from the same look definitions. Typography changes require selecting Text and an explicit type style operation; no silent recoloring of descendants. Creation can initialize a coordinated palette across its own new nodes. Do not offer “Apply to entire Experience” in this slice. This avoids overwriting user-approved work while retaining a future extension path for an explicitly reviewed multi-target command.

Brand colors/fonts are opt-in or used only when their actual output passes the same contrast/load checks. If the Brand palette conflicts, show a named neutral fallback and retain source provenance; never claim that an arbitrary Brand palette is accessible.

## Visual-quality standards

These are proposed acceptance targets, not completed measurements:

- At actual output widths320/390/512px, no unintended horizontal overflow, clipped text, overlapping controls, or detached CTA. Test editor chrome at390px separately from output width.
- One obvious primary heading and CTA; at most two font families in a starter. Use supported weights, visible font-load/fallback status and no synthetic unsupported effect claims.
- Baseline body text16px; headings28–36px after fitting; optional nonessential captions13–14px. Long titles, two-times body copy and missing optional image still yield a coherent Flow layout without manual geometry repair.
- Deliberate spacing scale4/8/12/16/24/32px; aligned text/CTA edges within1 CSS px at100% zoom, except intentional optical offsets recorded in the recipe. No unexplained gap from combined margin/gap defaults.
- Text contrast at least4.5:1, or3:1 for qualifying large text. Measure against the rendered background; photographs, translucency and gradients are not passed by a flat-color heuristic. [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- TapConnect product target:44×44px minimum primary touch controls, with smaller visible manipulation marks inside separate targets. This is stricter than WCAG2.2 AA’s24px minimum with exceptions; do not conflate them. [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- Borders, corners and shadows agree in preview thumbnails, applied Canvas, reload and Preview. No photo flattening of editable text/materials. Preview cards are rendered using the same canonical props and renderer as application.
- Default Surface opacity remains1 where fading children would reduce readability. Distinguish fill translucency from whole-object opacity.
- Shadows remain visible without changing authored frame size; clipping remains explicit. Every exposed treatment must have a truthful adjustment path; reject an attractive but uneditable preset.
- The original visual reference is absent. These standards and native examples are independent quality criteria; exact reference fidelity remains BLOCKED.

## Native acceptance tests and measurements

Run on a disposable native clone/new document, not the accepted fixtures. Every scenario includes screenshots and observable selection/Inspector state, not only API results.

1. Reproduce the nested Text issue, trace pointer-down → movement threshold → click/double-click ownership, then prove ordinary click, double-click and Enter behave for root/Flow/nested Layered Text. Test Container padding drag, image body drag, true Groups, locked and Curated nodes, controls, caret input and IME ownership. No click-only move/history entry.
2. Select nested Image and reach Replace in at most one explicit contextual action without scrolling past geometry. Return from the media browser to the same target. Existing X/Y/W/H, parent, action, image identity semantics and unrelated styles persist.
3. Reach root/Container look chooser within one contextual action; apply a look with the next action. Borders/corners/depth are visible in Surface without entering Placement or Contents. Exact fields and handles still agree.
4. From native Blank, add the starter in each of the three looks. One commit inserts valid parent/child identities and sibling order. Undo removes the entire insertion; Redo restores the same inserted IDs. No stateful multi-command partial construction.
5. Edit heading/body; replace optional image; set a real local CTA destination. Test no-image and long-copy cases. All content is native and separately selectable; no rasterized substitute.
6. Apply Surface-only style to an existing rotated/padded Container containing custom Text, Image and a configured Button. Assert content, action, asset identity, hierarchy, geometry, page bounds, Flow/Layered mode and unrelated props are unchanged. Include root Inset/full-bleed preservation and all four parent/child layout combinations.
7. Change a Text type style; source characters, case, line breaks, box surface and intended dimensions remain unchanged unless specifically declared. Test loading/failure/fallback and correct available font variants.
8. Browse without applying, change selection while a chooser is open, then attempt apply. Retarget explicitly or cancel with visible destination truth; never apply a stale operation to the previous object.
9. Compare native preview swatch versus actual applied result, Canvas versus Preview at100% and75%, then Save/reload. Record renderer/asset/font differences as failures, not approximations silently accepted.
10. Repeat Undo/Redo across starter, appearance, content replacement, movement and save/reload boundaries according to canonical history’s existing persistence contract. Do not promise history survives reload unless it currently does.
11. At390px, keyboard focus and primary actions remain visible; scrollable panels do not manipulate the canvas. Test touch alternatives to hover. Physical phone/IME and Safari/WebKit remain separate gates until actually executed.
12. Focused shared-authority regressions, broader Studio/Card suites and production build; retain unchanged Cabinet Noir integrity check and report its missing-original dependency separately. Keep a native hands-on fixture and immutable source/evidence commit.

Measured now: current Material chooser has2 entries; current rail has5 disabled destinations; native nested double-click failed to enter text while hit-testing reached its text span. Prior phone target measurements are in the Slice3 handoff. **No task-time improvement or novice success rate has been measured.**

Evaluation plan after construction: repeat the same tasks before/after and record deliberate clicks, unrelated panel transitions, wrong-target edits, time, and help requests. Recruit3–5 first-time users for a formative check; goal is completion without coaching, zero destructive wrong-target changes, and first useful Preview within5minutes. These are proposed targets, not statistical certification or current performance claims. Report every failure and use it to revise the bounded candidate.

## Expected source changes and constraints

| Expected module | Bounded responsibility |
| --- | --- |
| `components/fusion/creative-studio/creative-composition-canvas.tsx` | Correct shared drag threshold/hit ownership after tracing; consistent child edit affordance; no geometry rewrite |
| `lib/fusion/creative-studio/selection-ref.ts`, `selection-mode.ts`, `platform/studio-selection-target.ts` | Reuse identity/scope; change only if reproduction demonstrates a shared authority defect |
| `components/fusion/card/reconstitution/card-studio-reconstitution-workspace.tsx` | Existing task routing and target capture; direct Replace/Text/Surface entry points |
| `studio-composition-inspector.tsx`, `studio-card-surface-inspector.tsx`, `studio-surface-materials.tsx` | Content-first Image task, compatible look chooser and common Surface adjustments |
| `studio-discovery-drawer.tsx`, `reconstitution/studio-rail-registry.ts` | Starter entry in existing drawer; hide unready nav; descriptive Outline fallback labels |
| `lib/fusion/creative-studio/platform/discovery.ts`, existing catalog/activity adapters | Use current resource/compatibility/readiness contract; no new remote catalog, schema or personal-template persistence |
| A small `reconstitution/native-starting-compositions.ts` consumer beside existing catalogs (proposed) | Typed versioned data and pure composition builder using existing node/parent/Material/Text helpers; not a new template engine |
| `components/card/tap-card-builder.tsx` | One canonical command integration for validated starter result, with existing history/dirty/save behavior |
| Existing `material-engine.ts`, Surface and Text adapters | Only demonstrated apply/refine parity fixes required for chosen three looks; no new effects or taxonomy |
| Existing focused tests plus native evidence documents | Pointer/selection regression, style-field isolation, composition validity, history and native visual acceptance |

Final file list may narrow after the initial trace. Any new persistence/schema contract, renderer, layout engine, full font/media browser redesign, or new business capability is outside this proposal and requires separate approval.

## Architecture, dependencies and future compatibility

The demonstrated small foundation is an **atomic composition application adapter**: construct using existing pure native operations, validate and commit once. The existing generic resource contract supplies identity/version/readiness/compatibility. A second foundation is unnecessary unless implementation proves otherwise; do not prebuild an AI operation registry, style-token cascade or template synchronization service.

Principal risks: legacy pseudo-Containers masquerading as native parents; preset application overwriting manual styles or actions; stale target refs while browsing; font fallback changing layout; image rights/missing assets; translucent material contrast; early drag activation breaking click/caret behavior; preview-only styles; preset defaults embedding fixed heights that break Flow growth. The tests above address those risks at their shared authorities.

Manual and future tApIt/guided creation must use the same resource compatibility checks, document/parent/geometry/Material/Text projection, validation, commands/history and publishing boundaries. A future assistant can propose the same versioned resource and scope, preview a validated candidate, preserve user-approved fields and execute the same command. No AI execution, prompt infrastructure, memberships, fan relations, collectibles, commerce or Campaigns is implemented now.

Dependencies: Product Owner scope approval; existing local dev environment; approved sample Asset or deliberately designed no-photo default; catalog fonts available or visibly handled; successful shared-pointer trace; rights-safe preview resources. No migration or new service required by the proposed design. If one becomes necessary, stop and present the conflict.

Keep open: nested selection until corrected/accepted; exact reference comparison; physical touch/keyboard/IME; Safari/WebKit; assistive technology and accessibility testing; Cabinet Noir original-asset reproducibility; signed Live Device/public-runtime end-to-end and full staging/release verification; production hashes BLOCKED. Acceptance of this proposal would authorize local construction only, never production changes, main merge, migrations or Railway deployment.

## Research rationale and visual example

Canva’s current documented flow places palette/font combinations behind selection of the page and its Edit task. That supports contextual visual choices without a second permanent rail. Studio should borrow the scoped workflow, not silently apply global styles. [Canva guidance](https://www.canva.com/en_au/help/color-and-font-combinations/).

Figma documents Canvas and layer-panel selection, nested navigation through double-click/Enter, and explicit parent/child traversal. Studio should make scope visible and preserve its existing multi-selection modifiers; the goal is predictable ownership, not copying shortcuts that conflict with current contracts. [Figma guidance](https://help.figma.com/hc/en-us/articles/360040449873-Select-layers-and-objects).

![Existing editable native composition; not a proposed-preset rendering or exact-reference comparison](proofs/slice4-discovery-planning-2026-10-24/06-accepted-native-visual-example.png)

This accepted functional example proves native ingredients are usable; it does not certify the proposed three looks. No new prototype composition or application code was created during this planning pass. The next visual proof must be built through native controls and the approved application adapter, with editable components and truthful screenshots.

## Review decision requested

Approve or revise **Select, Style, Make It Yours** as bounded above: nested-selection correction, contextual content/Surface access, one Flow starter with three quality-gated looks. Recommended exclusions: global theme application, full template service, new crop engine, responsive overrides, six-family catalog, broad navigation redesign and speculative platform work.

The implementation prompt is [here](SLICE4_DESIGN_DISCOVERY_IMPLEMENTATION_PROMPT_2026-10-24.md). Until explicit approval, application code remains unchanged.
