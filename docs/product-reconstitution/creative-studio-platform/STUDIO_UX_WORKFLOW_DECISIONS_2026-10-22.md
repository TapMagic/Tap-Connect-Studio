# Studio workflow decisions — revised master directive

> **Current authority — October 23, 2026:** Slice 1 and Slice 2 desktop interaction quality are Product Owner accepted. The accepted integrated source is `a7e3dc1e1f722038d737a8239b0ff31662fc6d79`; physical-device, accessibility, browser and release gates remain open. [Acceptance record](SLICE2_DESKTOP_ACCEPTANCE_2026-10-23.md) · [Slice 3 readiness proposal](SLICE3_NATIVE_SURFACE_CONTAINER_READINESS_2026-10-23.md) · [Complete Slice 3 implementation prompt](SLICE3_NATIVE_SURFACE_CONTAINER_IMPLEMENTATION_PROMPT_2026-10-23.md). Slice 3 is **planning only** until explicit scope approval. Production hashes remain BLOCKED; no deployment is authorized. Older status statements below are historical.

**October 23 implementation update:** The approved Frame and Page Truth local candidate is documented with measured evidence and exact source handoff in [the implementation report](SLICE1_FRAME_PAGE_TRUTH_IMPLEMENTATION_2026-10-23.md). Slice 1 remains OPEN; Text Editing Truth remains gated. Earlier audit/specification statements below describe their original stage, not a claim that implementation acceptance is complete.

**Standing interaction requirements:** [Canonical interaction principles](STUDIO_CANONICAL_INTERACTION_PRINCIPLES.md) govern familiar keyboard/focus behavior, fearless editing, shared tApIt foundations and freedom to redesign interface presentation. Target behaviors are requirements, not verified implementation claims. Current Slice 1 authorization and later approval gates remain unchanged.

Planning only. Each of the twelve existing workflows answers all fourteen revised PO questions. Current-state assertions distinguish observed UI, source inspection and unverified behavior. Reference patterns are documented, not hands-on competitor tests; sources and evidence are in the [Surface audit](STUDIO_SURFACE_AUTHORING_AUDIT_2026-10-22.md) and [architecture proposal](STUDIO_UX_ARCHITECTURE_PROPOSAL_2026-10-22.md). A/B/C classifications follow the proposal and never grant implementation authorization.

## First creation and template choice

| Question | Recommendation or evidence |
| --- | --- |
| 1. Customer goal | Produce a polished, functional Experience without knowing the architecture. |
| 2. Intuitive interaction | Choose a visual starting point or Blank; name it and edit useful content. Root Surface is immediately available. |
| 3. Reference pattern | Canva template preview before customization supports outcome-led selection; scratch creation remains available. |
| 4. Current Studio evidence | Observed New Experience form asks Client/Artist, Type and source/template, defaulting to Current main Card; not a visual starting catalog. |
| 5. Unnecessary work | Administrative classification and implicit source cloning precede design. Users must infer what the resulting document will contain. |
| 6. Directly on canvas | After creation, select root to style it, add Containers, then edit real text/image/action content. |
| 7. Inspector responsibility | Root Appearance and Contents layout; document metadata stays in Details, not object styling. |
| 8. Hide until relevant | Unsupported template types, provider configuration and advanced classification. Keep explicit Clone available. |
| 9. Automatic behavior | Derive workspace context, initialize a legitimate root and Brand defaults, focus the first useful task. Never copy a permanent credential or audience identity. |
| 10. Preset-based behavior | A small excellent template/Container-starter catalog plus Blank. Templates create native editable content; they are not image backdrops. |
| 11. Advanced access | Search, explicit duplication, resource provenance and permitted exact root layout settings. |
| 12. Existing authority to reuse | Experience/draft creation, template/resource discovery and canonical root composition. |
| 13. Architectural implications | C: onboarding presentation follows reliable native construction. No new document model; a template and Blank open the same editor. |
| 14. Future functionality to preserve | Entitled Experience types and reusable resources; EverEncore/TapStay remain consumers. Linked template propagation stays deferred. |

## Canvas navigation and selection

| Question | Recommendation or evidence |
| --- | --- |
| 1. Customer goal | Understand what is selected and reach root, Container, Group or child reliably. |
| 2. Intuitive interaction | Click selects the applicable frame; Edit contents enters a parent scope; breadcrumb returns to ancestors. Empty Surface selects root. |
| 3. Reference pattern | Figma nested frames and Canva editable groups support explicit scope. Their exact hit-selection rules are not copied. |
| 4. Current Studio evidence | Observed generic Module headings and crowded selections; one non-isolated click selected Map instead of Nested Text. Source has parent breadcrumb and selection authority. |
| 5. Unnecessary work | Users infer scope from outlines and reopen Outline to recover the intended target. |
| 6. Directly on canvas | Active frame, subdued ancestor outline, target name, Select layer for occlusion, pan and Fit selection. |
| 7. Inspector responsibility | Properties for the same stable selection; locked objects remain inspectable with mutation unavailable. |
| 8. Hide until relevant | Child handles outside child scope; rotation where unsupported; diagnostics unless requested. |
| 9. Automatic behavior | Keep chrome screen-sized; restore practical scroll/zoom on task return. Never fit by changing authored geometry. |
| 10. Preset-based behavior | No preset for selection semantics. A named viewport navigation default is sufficient. |
| 11. Advanced access | Keyboard scope traversal, multiselect, exact selection via Layers, zoom percentage and Fit selection. |
| 12. Existing authority to reuse | Selection refs/target resolution, parent/Group authorities and existing viewport/task return. |
| 13. Architectural implications | A: scope truth; B: shared target+intent relevance projection. Do not add another selection store. |
| 14. Future functionality to preserve | Governed components, conditional states and reusable instances retain stable identities and clear parent context. |

## Direct Text editing

| Question | Recommendation or evidence |
| --- | --- |
| 1. Customer goal | Change exact words and see their real appearance, including inside either Container layout. |
| 2. Intuitive interaction | Select then Edit text or deliberate double-click; type with visible caret; finish or cancel predictably. |
| 3. Reference pattern | Figma separates text content, type properties and text resizing; apply that distinction to Studio content truth. |
| 4. Current Studio evidence | Observed Text Inspector leads with geometry and Content below fold; current phone sheet repeats that order. S2 remains gated. |
| 5. Unnecessary work | Scrolling past geometry to change words; uncertainty about text extent versus frame height. |
| 6. Directly on canvas | Caret editing with correct keyboard ownership, native selection, paste and composition; visible overflow feedback. |
| 7. Inspector responsibility | Exact content alternative, typography, Auto/Minimum/Fixed text height and applicable placement in distinct groups. |
| 8. Hide until relevant | Geometry diagnostics while typing; unavailable typography controls; canvas shortcuts during composition. |
| 9. Automatic behavior | Load fonts, reconcile derived visual bounds and maintain caret visibility. Never rewrite authored frame or uppercase stored content automatically. |
| 10. Preset-based behavior | Brand type roles and a few readable type scales; explicit content replacement only when chosen. |
| 11. Advanced access | Exact size/weight/spacing and box policy through shared typed property commands; valid family variants. |
| 12. Existing authority to reuse | Text authoring, input ownership, live adjustment/history, common renderer and save validation. |
| 13. Architectural implications | B: approved Text transaction and rendered-bounds foundations only after gates. No separate Canvas, Inspector or AI text semantics. |
| 14. Future functionality to preserve | AI rewrite/fit, advanced typography and responsive presentation can extend typed properties and the same commit/cancel lifecycle. |

## Direct Image editing

| Question | Recommendation or evidence |
| --- | --- |
| 1. Customer goal | Replace a picture, choose its visible crop and retain the design and useful action. |
| 2. Intuitive interaction | Select → Replace or Crop; inspect result; apply/cancel and return to the same target. |
| 3. Reference pattern | Canva distinguishes crop from resize. This prevents source treatment from being mistaken for outer placement. |
| 4. Current Studio evidence | Observed Image Inspector exposes tint before source replacement; shared browser is reachable there while Assets rail is disabled. |
| 5. Unnecessary work | Geometry/tint scrolling and provider-led navigation obscure the ordinary source task. |
| 6. Directly on canvas | Frame resize, focal/crop preview and image-specific editing mode. Root background and Container background identify their own target. |
| 7. Inspector responsibility | Fit/focal/treatment/alt text/action and exact frame values; never merge these into a single Scale property. |
| 8. Hide until relevant | Image tuning until an image exists; provider setup outside ordinary selection; unsupported masks. |
| 9. Automatic behavior | Preserve frame, source provenance, identity and existing action on Replace; maintain meaningful alt text unless explicit change requires review. |
| 10. Preset-based behavior | Curated crop/presentation defaults and image-backed Container starters; show actual mask and output. |
| 11. Advanced access | Exact focal/zoom, fit, decorative status, provenance and compatible adjustments. |
| 12. Existing authority to reuse | Shared media picker/browser, visual-plane adapters, immutable assets/derivatives and task-return contract. |
| 13. Architectural implications | A/B: image/material transition truth and common completion. No new source store or Container-only crop engine. |
| 14. Future functionality to preserve | Generated imagery, reusable resources and governed slots can reuse this path with their own declared compatibility. |

## Resize rotate align distribute group and layer

| Question | Recommendation or evidence |
| --- | --- |
| 1. Customer goal | Precisely arrange a polished composition and recover from experiments. |
| 2. Intuitive interaction | Manipulate the selected authored frame; Arrange names its reference; exact fields refine the same operation. |
| 3. Reference pattern | Figma geometry and Canva contextual grouping pair direct manipulation with precision. |
| 4. Current Studio evidence | PO rejected bounds, handles and Anchor behavior. Existing S1 corrections remain unfinished with two focused failures; no fresh pass claimed. |
| 5. Unnecessary work | Apparent fixed bounds and ineffective controls force users to guess constraints. Containers cannot be assumed eligible for module Groups. |
| 6. Directly on canvas | Move/resize/rotate where supported; guides and constraint feedback; one active handle set. Shadows remain outside placement bounds. |
| 7. Inspector responsibility | Exact geometry, units, rotation and explicit Selection/Parent alignment reference. Show constraint reason instead of silently clamping. |
| 8. Hide until relevant | Inert Anchor control, invalid distribution/group actions and inactive object handles. Preserve disabled reason when a likely action is unavailable. |
| 9. Automatic behavior | Use canonical transforms and bounds. Snap derives from same parent; one gesture produces one history entry. |
| 10. Preset-based behavior | Optional spacing/distribution values use existing density definitions; never preset arbitrary object positions silently. |
| 11. Advanced access | Fine keyboard nudges, px/% display, numeric rotation, local sibling z-order and legitimate authored overflow. |
| 12. Existing authority to reuse | Group authority, layered-region, geometry units, frame semantics, parent and selection geometry. |
| 13. Architectural implications | A: finish bounded S1. Legacy anchor semantics and current Layered placement must be distinguished; no new anchor engine. Group membership expansion needs separate approval. |
| 14. Future functionality to preserve | Responsive presentation and new ordinary types can declare capabilities without replacing geometry. Business identity remains independent of grouping. |

## Flow, Layered and nested Containers

| Question | Recommendation or evidence |
| --- | --- |
| 1. Customer goal | Keep growing content organized or intentionally overlap it while moving the whole section as one object. |
| 2. Intuitive interaction | Container selection shows Surface, Placement in parent and Contents layout separately. Move/reorder/nest give distinct previews. |
| 3. Reference pattern | Figma frames and auto layout support parent context and content/fixed sizing. Reject copying automatic reparenting or silently inferred layout. |
| 4. Current Studio evidence | Source supports parent-relative Layered Containers and inner Flow/Layered. Inspector always shows outer Flow fields; Flow drop lines handle a subset of nesting. |
| 5. Unnecessary work | Users conflate inner layout with outer movement; some displayed widths/margins have no Layered effect. |
| 6. Directly on canvas | Layered outer drag/resize; Flow insertion/reorder; deliberate nest target with destination breadcrumb. Contents mode never changes on overlap. |
| 7. Inspector responsibility | Applicable outer geometry; inner direction/gap/padding; size constraints and clipping, named by relationship. |
| 8. Hide until relevant | Inactive outer Flow fields, meaningless inner gap in Layered layout and unsupported nest targets. |
| 9. Automatic behavior | Keep parent on ordinary move; validate depth/cycles/locks at commit. Convert coordinates only through supported canonical authority. |
| 10. Preset-based behavior | Flow Container default for new sections; explicitly named Layered starter for overlay content. Style preset never changes layout. |
| 11. Advanced access | Exact geometry, overflow policy, local stacking, explicit Move to… and mode-conversion preview. |
| 12. Existing authority to reuse | Composition parent authority, resolveFlowDropTarget, reorder/reparent commands, layered-region and Group eligibility. |
| 13. Architectural implications | A/B: control applicability and independent alignment semantics; C: broader drag nesting after tested conversion. Four parent/child combinations are acceptance cases. |
| 14. Future functionality to preserve | Nested reusable sections, responsive overrides and conditional content preserve one hierarchy. No generic constraint graph or second layout engine. |

## Properties, typography, color and Materials

| Question | Recommendation or evidence |
| --- | --- |
| 1. Customer goal | Create sophisticated native output and adjust it later without dismantling the composition. |
| 2. Intuitive interaction | Select root or Container → Style → useful preset or simple property; expand Edge/Depth only when needed. |
| 3. Reference pattern | Figma separates fills/effects; Canva backgrounds have straightforward color/image paths. Useful model distinctions, not copied panel chrome. |
| 4. Current Studio evidence | Observed root modes and one leather Material. Source has rich recipes and Container Surface controls but multiple state representations and narrow discovery. |
| 5. Unnecessary work | Repeated styling paths, technical labels, ineffective layout fields and uncertainty about whether a preset replaces or adds effects. |
| 6. Directly on canvas | Live authoritative result on selected Surface; parent/child style isolation and direct frame feedback. |
| 7. Inspector responsibility | Fill, image treatment, Material, Edge and Depth; Text typography on Text. Clear property destination and inheritance/local/mixed provenance. |
| 8. Hide until relevant | Inapplicable effects, unsupported catalog choices and diagnostics; keep advanced values reachable. |
| 9. Automatic behavior | Use existing Material renderer for preview and result; preserve unrelated values when radius/border changes. Do not restyle children on surface apply. |
| 10. Preset-based behavior | Six candidate families evaluated in audit; ship the smallest excellent subset. Container starter and surface recipe are distinct actions. |
| 11. Advanced access | Editable supported gradient stops, real font variants, precise borders/shadows and provenance; out-of-range loaded values displayed truthfully. |
| 12. Existing authority to reuse | Material engine/descriptors/layers, visual-plane and target adapters, Surface state, font catalog and color controls. |
| 13. Architectural implications | A/B: transition/precedence repair across root and nested Containers. C: catalog/refinement UI; no replacement styling engine. |
| 14. Future functionality to preserve | Advanced typography, generated surfaces and reusable styles remain possible through typed properties/resources; linked propagation and arbitrary shaders deferred. |

## Assets and reusable discovery

| Question | Recommendation or evidence |
| --- | --- |
| 1. Customer goal | Find, reuse or replace useful creative content while retaining editing context. |
| 2. Intuitive interaction | Open Add/Media/Style for a named target; search or browse; preview; Add, Replace or Apply explicitly. |
| 3. Reference pattern | Canva template browsing and contextual image paths illustrate destination-aware discovery. |
| 4. Current Studio evidence | Observed disabled Assets rail despite working media browser. Pexels/Logo.dev provider tabs appear prominently; assets load asynchronously. |
| 5. Unnecessary work | Customer must find replacement entry and understand providers to reach content. Apply card may look like a browse entry. |
| 6. Directly on canvas | Show insertion destination and final placement preview; click has a safe visible placement, drag has an explicit target. |
| 7. Inspector responsibility | Refine placed instance, alt/action and appearance; browser remains the common discovery task. |
| 8. Hide until relevant | Provider setup, unusable unentitled choices and empty future categories; preserve attribution in Details. |
| 9. Automatic behavior | Restore target/path after apply/cancel; reject stale target and maintain resource provenance. |
| 10. Preset-based behavior | Small curated recent/Brand/recommended choices with See all; no arbitrary catalog breadth for appearance. |
| 11. Advanced access | Search/filter, resource metadata, approval/provenance and explicit independent placement. |
| 12. Existing authority to reuse | Discovery envelope/adapters, MediaAsset/CreativeResource, activity service and task-return stack. |
| 13. Architectural implications | B for adapter completion across current consumers; C for new resource lifecycle. Do not merge distinct canonical resource identities. |
| 14. Future functionality to preserve | Generated backgrounds, reusable Containers and approved offers can be placed through declared adapters; no hidden linked updates. |

## Contextual controls and task completion

| Question | Recommendation or evidence |
| --- | --- |
| 1. Customer goal | Find the next action and return naturally after complex editing. |
| 2. Intuitive interaction | Selection + intent + edit mode + capabilities reveals a few relevant verbs; a named task owns apply/cancel/back. |
| 3. Reference pattern | Canva contextual Group/Position and Adobe result review make action scope and completion visible. |
| 4. Current Studio evidence | Observed generic Edit/Module, a large drawer clipping canvas and competing mobile chrome. Existing adaptive workspace and return mechanisms already exist. |
| 5. Unnecessary work | Users reopen panels, recover selection and decipher scope after temporary tasks. |
| 6. Directly on canvas | Upright target-aware toolbar avoids handles; dock predictably if no free position. Toolbar input never starts manipulation. |
| 7. Inspector responsibility | One requested task, object name, breadcrumb and relevant property sections. Precision remains available without a second editor. |
| 8. Hide until relevant | Unselected handles, irrelevant actions and previous crop/discovery furniture after exiting a task. |
| 9. Automatic behavior | Restore selection/viewport/browse context; stale target falls back to nearest valid ancestor then root. Cancel and Apply have equal exit quality. |
| 10. Preset-based behavior | No workflow-semantic presets; retain practical per-task presentation preferences only. |
| 11. Advanced access | More/Arrange, keyboard alternatives, named exact property entry and later registry-backed search. |
| 12. Existing authority to reuse | Adaptive-workspace, drawer controller, shell state, selection generation and existing capability declarations. |
| 13. Architectural implications | B: complete current consumer adapters. Do not create a global alternate task state machine. |
| 14. Future functionality to preserve | AI results, resource creation and new Experience types inherit the same entry/preview/commit/cancel/failure/return contract. |

## Responsive preview and mobile authoring

| Question | Recommendation or evidence |
| --- | --- |
| 1. Customer goal | Know what visitors see and edit comfortably at 390px with touch and a software keyboard. |
| 2. Intuitive interaction | Label actual output width; preview deliberately; phone sheet opens the requested task and preserves caret visibility. |
| 3. Reference pattern | Webflow exposes inherited breakpoint values; Canva adapts mobile navigation. Neither proves Studio touch or IME behavior. |
| 4. Current Studio evidence | Observed 390px editor/sheet and truncated/absent header identity. Source uses Studio 390/runtime capped512 while device controls suggest broader authoring. |
| 5. Unnecessary work | Confusing output width with window width; long geometry-first sheets and extra scrolling while keyboard space shrinks. |
| 6. Directly on canvas | Direct selection, useful zoom/pan, explicit Edit/Replace; retain reachable root/parent scope. Native input owns gestures during typing. |
| 7. Inspector responsibility | One task sheet with reachable Close/Done; precision and advanced settings remain available. |
| 8. Hide until relevant | Secondary lifecycle controls and competing dock while sheet active. Do not label unimplemented breakpoint overrides as active. |
| 9. Automatic behavior | Adapt chrome to visual viewport, keep current line visible and restore focus; never mutate document when switching preview widths. |
| 10. Preset-based behavior | Readable type/spacing defaults and explicit preview sizes; no separate mobile content copy. |
| 11. Advanced access | Exact controls, output width/zoom separation and later override-origin/reset UI. |
| 12. Existing authority to reuse | Viewport surface, adaptive shell, keyboard ownership and one shared renderer/document. |
| 13. Architectural implications | A: honest labels and reachability; B: keyboard-aware task presentation. C: responsive delivery requires separate migration approval. |
| 14. Future functionality to preserve | Inherited constrained presentation across targets, without splitting actions, identity or content into three documents. |

## Undo, save, publish and recovery

| Question | Recommendation or evidence |
| --- | --- |
| 1. Customer goal | Experiment safely, retain work and deliberately control public output. |
| 2. Intuitive interaction | One action is one Undo; clear Saved/Failed state; Preview then explicit publication review. |
| 3. Reference pattern | Figma version history permits deliberate review/restore; Canva exposes Undo/Redo. Studio additionally owns immutable publication and QR boundaries. |
| 4. Current Studio evidence | Local Undo and reload restored solid background in earlier audit. Source failure says retrying while saveFailed halts autosave; induced failure untested. |
| 5. Unnecessary work | Hidden document identity/status and ambiguous retry wording undermine trust. |
| 6. Directly on canvas | Undo/Redo stays reachable; temporary editing cancel restores its preview without undoing unrelated committed work. |
| 7. Inspector responsibility | Object properties do not own publication/access. Revision/recovery detail belongs in document lifecycle surfaces. |
| 8. Hide until relevant | Technical hashes from normal authoring; publication detail until Preview/Publish/History requested. |
| 9. Automatic behavior | Existing autosave, validation and recovery recording; retry only when actually attempted. Never publish as a consequence of saving style. |
| 10. Preset-based behavior | None for publication semantics. A template never copies publication or permanent credential state. |
| 11. Advanced access | Revision detail, restore preview, conflict resolution and actual Retry action. |
| 12. Existing authority to reuse | Labeled history, draft revision validation, save loop, recovery journal and publication authority. |
| 13. Architectural implications | A: truthful failure status; B only where shared task/transaction gaps are demonstrated. No new sync subsystem. |
| 14. Future functionality to preserve | Governance and future membership/commerce/access remain separately authoritative; visual edits cannot change eligibility or transaction truth. |

## AI-assisted creation and refinement

| Question | Recommendation or evidence |
| --- | --- |
| 1. Customer goal | Improve selected content or appearance without losing control or learning every property. |
| 2. Intuitive interaction | Choose contextual intent, compare proposal against current target, accept/cancel and continue editing. |
| 3. Reference pattern | Canva Magic Write scopes text operations; Adobe generation offers result review. Reject autonomous changes to publishing or audience state. |
| 4. Current Studio evidence | Source includes deterministic Match Brand/contrast/search helpers under tApIt and proposal infrastructure; no live generation tested. |
| 5. Unnecessary work | AI branding can imply unavailable generation; generic global prompting obscures the target and permitted change. |
| 6. Directly on canvas | Preview result on selected Text/Surface/Container while retaining original for comparison. |
| 7. Inspector responsibility | Contextual intent/alternatives and affected properties. Generated imagery enters media discovery with provenance. |
| 8. Hide until relevant | Unavailable providers and actions unsupported by target; never expose business permissions as ordinary styling assistance. |
| 9. Automatic behavior | Validate scope, protected fields and stale targets; accepted result goes through manual command/history. Cancel does not alter authored state. |
| 10. Preset-based behavior | Real deterministic Match Brand is labeled as such; later prompt starters describe a specific supported operation. |
| 11. Advanced access | Adjust prompt within scope, inspect changed properties and choose alternatives; no separate AI document. |
| 12. Existing authority to reuse | AI proposal, selection authority, protected-field validation, Text transactions, Material and asset adapters. |
| 13. Architectural implications | C: real assistance after manual paths are reliable. B foundations must have current manual consumers; shallow protected-field checks alone do not certify nested patches. |
| 14. Future functionality to preserve | Rewrite/fit, generated native surface recipes and future contextual Experience assistance; membership, commerce and publication changes remain excluded. |

## Final Slice 1 interaction corrective candidate

The authorized clipboard/body-drag/resize/nudge pass and evidence are recorded in [the final interaction review](SLICE1_FINAL_INTERACTION_REVIEW_2026-10-23.md). Layered 1px/10px nudging is now implemented locally through canonical transactions. Native Shift-drag and physical touch remain unverified; Slice 1 remains OPEN, Slice 2 gated, and production hash verification BLOCKED. The remote handoff contains documentation and an exact local source delta, not an application release commit.


## October 23 — clipboard placement corrective evidence

See [Clipboard placement correction](SLICE1_CLIPBOARD_PLACEMENT_CORRECTION_2026-10-23.md) for the demonstrated Flow overflow/size causes, canonical destination and explicit expansion behavior, native regression matrix, 111 passing focused tests, source delta and local review fixture. Slice 1 remains OPEN; Slice 2 remains gated. The separately referenced Product Owner screenshot is not yet supplied; exact image matching is BLOCKED. Production and the prior fixture remain unchanged.
