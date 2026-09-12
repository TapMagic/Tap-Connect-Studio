# TapConnect Studio North Star Reconstruction Report

Status: Product reconstruction for Product Owner review
Scope: accepted Slice 1 + Slice 2 checkpoint; no implementation
Evidence date: 2026-09-09

## Executive answer

TapConnect Studio is supposed to be the Host's visual authoring environment for producing a polished, mobile-first Tap Card from ordinary, directly editable Modules and a smaller set of governed Curated Systems. The Host chooses real content or design resources, browses a shared visual catalog when breadth is useful, places into canonical Card flow, selects the result, and refines it while the Card remains the visual truth. Brand contributes defaults and reusable resources; Assets contributes one governed media plane; Outline explains membership and order; Preview and Live Device prove the visitor result; tApIt proposes useful, Brand-aware results into those same systems instead of becoming a second editor.

The repository has not lost this entire product. It has a strong platform foundation and many preserved engines. What Slice 2 currently exposes, however, is a narrow demonstration of that product: one ordinary Text choice, one Image choice, a small Button catalog, one Divider, four Container treatments, and Cabinet Noir. Five of seven rail destinations are visibly unavailable. Standard Button and Cabinet Noir demonstrate credible refinement depth, but Text, Card Surface, Images, Brand, Assets, Templates, materials, reuse, and tApIt do not yet make the Studio's breadth legible. The next work must restore visible creative power inside the accepted Slice 2 grammar, not replace that grammar and not re-create the old cockpit.

## 1. Repository verification

| Check | Observed result | Verdict |
| --- | --- | --- |
| Repository root | `/Users/rcs/Development/tap-connect-studio` | Match |
| Current branch | `codex/studio-reconstitution-slice-1` | Match |
| Current HEAD | `7b81495e9d421b6c30c08a17a2aa82530465f3b4` | Match |
| Slice 2 object | Present; subject `feat(studio): complete Slice 2 add discover place` | Intended checkpoint confirmed |
| Slice 1 ancestry | `d831c24069fe439a2b0c715ed4c1b79d5d77184b` is an ancestor; it is the direct parent | Match |
| Worktree before reconnaissance | Clean (`## codex/studio-reconstitution-slice-1`) | Match |

No discrepancy was found. No checkpoint, branch, or history operation was performed.

## 2. Product restatement

Studio is not a component-picker, a generic freeform canvas, or a wrapper around property forms. It is an adaptive creative cockpit in which the Card is the hero and the visitor result is always the governing truth.

A Host can make a complete Tap Card: hierarchy and editorial content; identity and imagery; actionable Buttons; structured groups; deliberate surfaces and materials; Brand-consistent typography and color; governed signature experiences; and product connections such as contact, booking, review, location, support, saving, and campaign-linked destinations. Ordinary Modules remain directly editable. Curated Systems arrive as finished presentations with semantic internal editing and family-governed geometry.

The product stays simple because the Host encounters capability by task, not all at once. Add answers “what can I place?”; a catalog answers “which real option?”; direct manipulation answers “where does it belong?”; Refine answers “how should this selection behave and look?”; Outline answers “what contains what, and in what order?”; Preview and Live Device answer “what will a visitor actually experience?” Brand supplies decisions rather than a separate design universe. tApIt supplies proposals and results rather than parallel state.

The mature Studio is materially better than the old versions because it keeps their useful engines and expressive breadth while replacing the permanent rail/drawer/property maze, duplicated providers, freeform ambiguity, fake catalogs, and fragmented selection ownership with shared authorities and an adaptive task lifecycle.

## 3. Capability master inventory

Classification key: **A** fully implemented and exposed; **B** implemented but poorly exposed; **C** implemented but hidden; **D** partially implemented; **E** architecture-ready without real breadth/content; **F** intentionally deferred; **G** missing; **H** deprecated and should not return.

The classification describes the reconstituted Studio at Slice 2, not the repository in isolation.

| Product domain | Class | Current truth and North Star disposition |
| --- | --- | --- |
| Card Surface | **D** | Canonical root, renderer, selection concept, background state, Preview/public parity, and publication exist; the new shell has no complete Card Surface authoring path. Restore through shared Surface/Design, not a fake root node. |
| Text | **D** | Place, select, inline edit, Inspector text/role/typeface/size/weight/line height/tracking/alignment/color exist. Discovery has one item; inline Space/Enter ownership is defective; labels, quotes, presets, dynamic content, accessibility, font breadth, and shared style system are absent. |
| Image | **D** | Place from the real Media browser; replace, fit, brightness, flow placement exist. Alt text, focal point/scale for ordinary images, masks/frames, crop intent, overlays, derivatives, and a full Image refine path are incomplete or hidden. |
| Standard Button | **A/D** | Core path—discover, place, label, action, icon, typography, surface, edge, layout, accessible name—is usable and is Slice 2's most complete ordinary Module. It remains partial against the intended action universe, states, spacing depth, Brand treatments, saved styles, and reusable variants. |
| Curated / Signature Systems | **A/D** | Cabinet Noir is a finished whole Module with governed semantic editing, presentations, action roster, identity slot, and publication entitlement validation. The family platform is real; only one family is certified and several appearance roles are intentionally read-only. |
| Container | **A/D** | Place, target, wrap/unwrap, reparent, reorder, spacing, alignment, transparent/solid/image/smoked-glass surfaces, edge and image focal controls are real. Catalog and material richness are thin. |
| Divider | **A/D** | Place and refine color, thickness, opacity, line style, treatment, width, inset, alignment, and spacing. Accessibility semantics and broader preset discovery are absent. |
| Background / Surface | **C/D** | Canonical composition background supports none, solid, gradients, image, pattern, texture, material ID and rich media treatments. Container exposes a smaller real surface contract. Card background and shared catalog are not exposed in the new shell. |
| Typography | **C/D** | Font/format engines, Google Fonts integration, Brand font roles, text glyph/box machinery, and old authoring paths exist. Slice 2 exposes three Text typefaces plus Button typography; no shared browser, pairings, styles, recents, or full Brand application. |
| Color | **C/D** | Brand roles, visual-property provenance, palettes, gradients, photo-color groundwork, color controls, and canonical visual state exist. Slice 2 exposes native color wells and a few Button swatches, not the intended shared Color browser. |
| Iconography | **A/D** | Standard Button uses the new canonical `IconAsset` browser across native assets and Iconify, with search and server recents. Other consumers still use older/duplicated pickers or no Host path; treatment and derivative policy is incomplete. |
| Assets / Media | **B/C** | Real upload/library/stock/provider data, approval, rights, attribution, variants, collections, favorites, recents, usage and canonical `MediaAsset` exist. The shared browser works contextually for Image and identity, but the Assets rail is disabled and cross-domain reuse is not obvious. |
| Brand | **B/C** | BrandKit, semantic color/font roles, logo, icon, links, inheritance/provenance, overrides, promotion, and a rich Brand workspace exist. New Studio receives Brand context for Button previews and some swatches but has no operational Brand rail or unified Brand-resource browser. |
| Templates | **C/E** | Older Card/section/starter/template engines and `SavedTemplate` persistence exist; the intended taxonomy is specified. The new Templates rail is disabled and exposes no honest inventory. |
| Layout / Flow | **A** | Card Surface parent authority, Containers, canonical parent/order placement, insertion context, flow width/alignment/inset/spacing, wrap/unwrap, and renderer integration are exposed. Preserve. |
| Position | **A/D** | Flow position is correctly distinct from hierarchy; earlier/later, parent, width, inset, alignment and spacing are exposed. Freeform x/y/rotation/z remain readable for legacy bounded compositions but are intentionally not the ordinary-flow model. |
| Outline / Organization | **A** | Semantic Card Surface hierarchy, Container membership, order, selection, drag/reorder/reparent are visible in a calm secondary drawer. It correctly avoids “Layers” for hierarchy. |
| Preview | **A** | Shared Card renderer, viewport choices, mode transition, saved-draft preview and parity foundations exist. Review mode could recede chrome more completely. |
| Live Device | **A** | Reusable QR/live-device panel exists in the shell and uses the live Card model/revision. Preserve as a verification task, not an editing surface. |
| Save / History / Undo / Redo | **A** | Draft save, dirty/saving/conflict/recovery states, optimistic revision, labeled undo/redo, live adjustment transactions and reload durability exist and are shell-accessible. Inner legacy chrome still duplicates status and commands visually. |
| Publish | **A** | Explicit saved-draft-to-immutable-publication transition, current publication pointer, compatibility projection, version history/rollback service, validation, and shell Publish are real. Publish is correctly blocked for dirty or ineligible state. |
| Accessibility | **D** | Standard Button accessible name and publication warning exist; semantic asset/Curated labels exist in models. Image alt authoring, contrast guidance, touch target feedback, Text checks, Divider semantics, focus-state preview and dynamic-content review are incomplete. |
| Governance / Entitlement | **A/D** | Curated entitlement checks, access descriptors, publish validation, feature registry, control availability, declared capability contracts and honest disabled reasons exist. The permanent declared-authoring audit covers only declared adapters, not all canonical state. |
| tApIt | **C/E** | AI proposal scoping/protected fields, proposal parsing, real Autopilot/provider infrastructure, entitlement/budget gates and history provenance exist. There is no coherent result-first Studio surface; old local Magic Write behavior must not return. |
| Search / Discovery | **A/D** | Shared Add drawer, catalog adapter, button family browsing, icon search and media browsing exist. Global category search, filters, pagination UI, restored context, richer previews and rail-wide reuse are incomplete. |
| Saved / Favorites / Recents | **B/D** | Canonical media and creative-resource favorites/recents, collections, usages and resource revisions exist; Button recents are server-scoped and operation-aware. Saved Button family is honestly empty; saved treatments/templates/modules and unified favorites UI are incomplete. |
| Materials / Textures | **C/D** | Canonical material, gradient, pattern, border and rendering engines with real recipes exist. Cabinet Noir and some legacy targets render them. New Studio surfaces expose only solid/image/smoked glass plus three Divider treatments; broad material categories are deliberately hidden. |
| Dynamic data | **C/G** | Models preserve data binding, visibility, campaign/location/experience links and dynamic section types. The reconstituted ordinary authoring shell has no Host path or accessible fallback workflow. |
| Actions / Destinations | **B/D** | Canonical authority supports 23 action kinds plus platform-bound support. New Standard Button exposes Website, Call, Email, SMS, Directions, Review and Booking; Curated action roster shares canonical intent/destination concepts. Social, Save/contact, wallet/home-screen, shop, campaign and custom cases are hidden. |
| Campaign / Connection | **C/F** | Card models and backend preserve linked Campaign, Campaign Group, Experience, Location, Audience Form, Asset and TapSave sources plus product-specific utilities. General campaign construction is outside this reconstitution; choosing/reference of valid destinations in Studio still needs an intentional shared path. |

## 4. Declared-authoring gaps

The permanent rule is: canonical semantic state is not “implemented” for a Host until its state, compiler, renderer, persistence, validation, history, reachable control, canonical command, and Edit/Preview/public/Live Device parity are declared—or until it is explicitly read-only, governed, or deferred with a visible reason.

The repository contains a sound `studioAuthoringCompleteness` audit, but the audit only evaluates capabilities that adapters declare. The principal remaining risk is therefore **undeclared canonical state**, not merely failing declarations.

| Canonical state or semantic capability | Host-visible path today | Gap against the rule |
| --- | --- | --- |
| Card root background: gradient, pattern, texture, material, opacity, tint, saturation, brightness, contrast, image focal/scale/repeat/blend/decorative/alt | None in new shell | Renderer/persistence exist, but no reachable shared-shell control, commands, availability statement, or complete parity declaration. |
| Ordinary Image `alt`, focal point, scale/crop, opacity, edge/frame/mask, overlay | Asset picker plus fit/brightness | The Inspector sets a guessed alt from asset label during placement but gives no Host alt-text field; most visual intent is either absent or hidden. |
| Text glyph and Text Box appearance: gradients, outline, shadow/glow, box fill/border/padding/material | Basic typography/color only | Old engines and canonical appearance machinery exist; no declared ordinary Text path or explicit deferral in new Studio. |
| Text roles and sources: label, quote, dynamic binding, Brand synchronization | Heading/subheading/body/brand select | Brand is presented as a role rather than a fully explained inherited source; dynamic and semantic roles have no path or honest unavailable state. |
| Standard Button full action registry | Seven action choices | Other canonical kinds are silently absent. They need a governed destination browser or explicit scope statement, not automatic resurrection into one long select. |
| Standard Button interactive states | No state preview/editor | Hover/pressed/focus/disabled are part of the material North Star and render behavior, but are not declared reachable or deferred. |
| Curated appearance roles | Governed status in shared shell | Correct when family contract marks the role governed/read-only; each future role must continue to declare renderer and entitlement ownership. |
| Curated identity fit | Circular crop session for Cabinet Noir | Strongest example of the rule: state, slot semantics, fit contract, renderer mapping, persistence and visual acceptance are declared. Use as the standard. |
| Container responsive image background | Media, fit, focal X/Y, brightness, tint/veil, opacity | Strong partial implementation. Scale/zoom, contrast/saturation/blur/blend and repeat exist in broader state but are not reachable or declared deferred. |
| Card and Module visibility/lock/name | Outline shows names and hierarchy | Canonical nodes carry `locked`, `visible`, and `name`; the new shell does not consistently author or explain them. |
| Legacy bounded composition x/y/rotation/z/anchors/masks | Hidden in new flow shell | Correct to withhold for ordinary flow, but legacy/future freeform domains need an explicit preserved-read-only or bounded-domain declaration. |
| Dynamic bindings, visibility rules, consent, schedules, campaign IDs | No new-shell path | These are protected AI fields and canonical state, but are not surfaced or explicitly governed in the ordinary shell. |
| Reusable `CreativeResource` revision/status/approval | Saved Button page only, empty | Backend truth is rich; Studio lacks save/apply/update/version/approval paths and dependency behavior. |
| Media rights, approval, attribution, derivatives and usage | Shared media selection obscures most governance | Canonical persistence exists; resource cards and publish validation must communicate material restrictions where they affect the Host. |
| Accessibility beyond Button name | Mostly absent | No complete declaration set for Image, Text, Divider, dynamic content, focus/touch and Curated action review. |

For the implemented Slice 2 mutations, history and save/reload generally travel through the canonical live model; Preview and Live Device use the shared Card renderer. That foundation is good. The audit gap is breadth and explicit classification, not evidence of a second Slice 2 persistence store.

## 5. Currently exposed capabilities

The Host can currently:

- add one ordinary Text, Image, Standard Button, Divider, Container, or entitled Cabinet Noir presentation;
- browse real Standard/Brand/Cabinet Noir Button previews and server recents;
- select assets through the canonical Media browser when placing/replacing Images and Curated identity;
- refine ordinary Text basics; Image asset/fit/brightness; Divider appearance; Container surface/edge/flow; and a comparatively rich Standard Button;
- place by click or drag into Card Surface, sibling insertion point, or compatible Container;
- reorder, reparent, wrap, unwrap, select, duplicate, move, and delete through canonical flow authority;
- inspect hierarchy through Outline;
- edit Cabinet Noir presentation, action roster, semantic action fields, identity, counts/layout and governed status through the shared Curated shell;
- save drafts, undo/redo labeled changes, recover conflicts, preview, open Live Device, publish, and satisfy entitlement validation.

This is a coherent vertical slice. It is not yet a coherent full product.

## 6. Hidden-but-existing capabilities

Substantial real capability remains behind the new cockpit:

- Card root gradients, patterns, textures, material recipes and rich background-image treatment;
- the complete material catalog and target adapters, including raised/recessed, metallic, gold/copper/gunmetal, glass variants, enamel, paper/kraft, holographic and texture treatments;
- shared gradient, border, color-palette, photo-color, visual-property provenance and Brand inheritance engines;
- Google Fonts, typography formatting and older Text glyph/Text Box appearance systems;
- Card/section/starter presets, saved templates and reusable creative-resource revisions;
- media collections, approval, rights, attribution, derivatives, favorites, recents and usage tracking;
- 23 canonical Card action kinds plus platform-bound support, campaign/location/experience links and TapSave utilities;
- bounded freeform composition primitives, masks, legacy position/rotation/z-order, grouping and direct manipulation;
- broad legacy object/section capabilities including gallery, video, map, offer/coupon/ticket, forms, QR, reusable content and campaign-linked blocks;
- AI proposal protection/scoping, Magic Write request/response parsing, Autopilot provider/entitlement/budget infrastructure;
- immutable publication versions and rollback services beyond the primary shell action;
- Brand workspace decisions, inheritance, synchronization, reset, promotion and cross-surface visual adapters.

These are evidence and reusable dependencies. They are not automatically approved UI requirements.

## 7. Partially implemented capabilities

The highest-value partial systems are:

1. **Text:** good basic Inspector and direct-edit intent, but a broken inline keyboard boundary and almost no discovery richness.
2. **Image:** real assets and basic fit, but no complete responsive/fixed-slot distinction or accessibility/refinement path.
3. **Standard Button:** credible depth, but incomplete action coverage, states, Brand/saved treatments and style reuse.
4. **Container Surface:** a real responsive image model and real glass treatment, but only four catalog choices.
5. **Card Surface:** present as hierarchy/rendering authority but missing as an authored visual destination.
6. **Icon universe:** good new Button implementation, but not yet shared by Brand, Curated, campaign, email and future Modules.
7. **Brand:** real cross-product authority, thin Studio contribution.
8. **Assets:** real shared browser/backend, but only contextual access and incomplete governance visibility.
9. **Accessibility:** one strong Button path surrounded by missing object-level authoring.
10. **Saved/recents/favorites:** server foundations and Button recents, without the full reusable-resource product.
11. **tApIt:** safe proposal primitives and real generation infrastructure, without the intended contextual Studio experience.
12. **Adaptive workspace:** correct state model, but visual transitions and inner/outer chrome do not yet feel like one cockpit.

## 8. Missing capabilities

Missing means no complete approved Host outcome in the reconstituted Studio, even when lower-level primitives exist:

- a usable Templates rail with Card Templates, Section Templates and component presets;
- a Text discovery system with Heading/Subheading/Body/Label/Quote, Brand styles, pairs, recents and real inspiration;
- a shared Design/Surface browser for Card and compatible targets;
- a visible, categorized material/texture library with real preview parity;
- a full Card Surface Inspector;
- a shared Color browser and Gradient editor;
- a complete ordinary Image crop/focal/zoom/accessibility workflow;
- operational Brand and Assets rail experiences;
- saving/favoriting/applying Module styles and treatments with dependency behavior;
- a destination browser covering the approved canonical action universe;
- contextual tApIt result surfaces with preview/accept/reject and protected-field review;
- full object-level accessibility review and publish guidance;
- dynamic-content authoring with fallback and accessibility rules;
- a second independently certified Curated family proving the abstraction;
- broad, real Add depth sufficient for a Host to believe “I can make something excellent here.”

## 9. Intentionally deferred capabilities

- Arc Ember activation and any claim that the Curated abstraction is proven by a second family.
- True z-order “Layers” until a supported overlapping domain requires it.
- Arbitrary x/y positioning for ordinary Card flow.
- Loose Cabinet Noir construction parts.
- Exotic material/effect controls whose renderer/persistence parity has not been proven.
- Fake template, Saved, favorite, material, asset or tApIt inventory.
- General campaign authoring inside Studio; Studio should select/reference approved campaign destinations where relevant.
- AI mutation of protected fields without explicit Host review.
- Surface categories marked hidden in the Slice 2 adapter until real recipes, previews and authoring targets are ready.

## 10. Deprecated capabilities

The following should not return as product patterns:

- the permanent old multi-rail/drawer/property cockpit;
- “Layers” as a synonym for flow hierarchy;
- ordinary unrestricted pixel positioning;
- separate icon pickers and provider-shaped icon state per consumer;
- materials masquerading as Badge or Button species;
- flattened gradient/material images presented as editable surfaces;
- fake local-regex “Magic Write” or optimistic AI placeholder output;
- generic “Effects” controls that store state without a target-specific visible result;
- duplicate localStorage recents as final authority;
- fake catalog tiles, dead categories, nonfunctional Saved inventory and filler templates;
- loose internal Curated furniture or universal controls that violate a family's contract;
- silent no-op controls and unsupported state without an honest reason.

## 11. Host task gap map

| Host task today | Rating | Evidence / limitation |
| --- | --- | --- |
| Create polished Text | **PARTIAL** | One generic insert; basic typography can be polished manually, but no styles/pairs/presets and inline editing is defective. |
| Edit Text directly | **BLOCKED** | Characters enter, but Space is canceled; Enter shares the same risk. |
| Style Text | **USABLE BUT THIN** | Role, 3 typefaces, size, weight, line height, tracking, alignment, color. |
| Create Standard Button | **COMPLETE** | Real previews, click/drag placement, selection and refinement. |
| Style Standard Button | **USABLE BUT THIN** | Strong basic surface/type/edge/layout controls; missing states, full materials, saved treatments and deeper Brand styling. |
| Choose Button action/destination | **USABLE BUT THIN** | Seven common intents; most canonical kinds hidden. |
| Use icons | **USABLE BUT THIN** | Real search/recent/recommended Button icon path; not shared across other consumers. |
| Create Container | **COMPLETE** | Place, target, wrap and unwrap. |
| Style Container | **USABLE BUT THIN** | Edge, radius, depth, spacing and alignment are real. |
| Change Container surface | **USABLE BUT THIN** | Transparent, solid, image, smoked glass only. |
| Change Card background | **NOT YET PRESENT** | Canonical state exists; no new-shell path. |
| Add Image | **COMPLETE** | Real Media browser and canonical asset reference. |
| Crop/position Image | **PARTIAL** | Ordinary Image has fit/brightness, no focal/zoom/crop session; Container background has fit/focal controls. |
| Use Brand assets | **PARTIAL** | Available inside Media browser/identity flows, but no operational Brand rail. |
| Use Brand typography | **PARTIAL** | Brand data exists; basic Text role and Button context are thin/ambiguous. |
| Add Divider | **COMPLETE** | Real placement. |
| Style Divider | **COMPLETE** | Color, thickness, opacity, style, treatment, width/inset/alignment/spacing. |
| Add Curated System | **COMPLETE** | Cabinet Noir finished presentations only, entitlement-aware. |
| Select Curated presentation | **COMPLETE** | Single/twin presentations. |
| Edit Curated actions | **COMPLETE** | Governed roster and semantic action fields. |
| Edit Curated identity | **COMPLETE** | Canonical asset slot with circular crop/fit acceptance. |
| Change approved Curated appearance | **PARTIAL** | Governed roles/status exist; few or no approved appearance choices are exposed. |
| Use color | **USABLE BUT THIN** | Target-local color inputs/swatches; no shared Color system. |
| Use textures/materials | **NOT YET PRESENT** | Engines exist but broad catalog is hidden from Slice 2. |
| Save/reuse treatments | **NOT YET PRESENT** | Saved Button surface is honestly empty; backend resource system exists. |
| Discover Assets | **PARTIAL** | Contextual Media browser works; Assets rail is disabled. |
| Organize content | **COMPLETE** | Outline clearly presents hierarchy. |
| Move/reorder | **COMPLETE** | Direct flow placement plus Inspector/Outline paths. |
| Reparent | **COMPLETE** | Canonical Container/Card parent authority. |
| Preview | **COMPLETE** | Shared renderer and viewport controls. |
| Use Live Device | **COMPLETE** | QR/live preview task surface. |
| Publish | **COMPLETE** | Explicit immutable publication transition after Save. |
| Undo/redo | **COMPLETE** | Labeled history and live-adjustment transactions. |
| Use tApIt | **NOT YET PRESENT** | Infrastructure only. |
| Use recent/saved/favorite content | **PARTIAL** | Button recents and media/resource backend; unified surfaces incomplete. |
| Work efficiently on phone | **PARTIAL** | Add/Edit/Outline/Preview/Move task bar and bottom-sheet surfaces exist; breadth and ergonomic acceptance remain incomplete. |

## 12. Visual and experience assessment

The current deterministic Slice 2 runtime is deliberate but not yet a premium creative product.

What works:

- The dark shell, restrained lime accent, typography and quiet Outline are visually coherent.
- Cabinet Noir is materially premium and demonstrates why finished Curated presentations matter.
- Button previews and Container surface previews prove the right move toward visual choice.
- Compose, Outline and Refine geometries are genuinely adaptive; this is not structurally a permanent three-column cage.
- Selection, Card hierarchy and flow language are clearer than in the old cockpit.

What does not yet work as a whole product:

- Breadth is not legible. Five of seven rail destinations are disabled, so the shell announces absence more loudly than future possibility.
- Add is too sparse, tile-heavy and physically large for six shallow choices. It reads closer to an inventory index than discovery.
- The broad Add drawer nearly removes the Card from view on desktop. Discovery earns space, but the current content does not justify how much context it consumes.
- Recent and Recommended Button rows repeat a very small set; some preview copy is cramped. The architecture is real but the catalog reads thin.
- Text and Image tiles do not show the visual range implied by the product. Empty space replaces useful visual choice.
- Refine is cohesive for Standard Button and Cabinet Noir, but much of it still feels like a property editor. Visual treatments are the exception rather than the dominant interaction.
- The Card is the hero in Compose and Refine, but not consistently in Discover.
- The outer Studio header and the hosted builder's internal operational/status furniture create a cockpit-inside-a-cockpit impression. Duplicate Publish/fit/status language weakens the “one product” feeling.
- The workstage is calm but can feel sterile because the surrounding empty plane does not carry creative guidance, recent work, or meaningful previews.

Verdict: **technically credible, visually calmer, and directionally correct; emotionally and functionally incomplete.** A Host can see that a good editor is being built. They cannot yet immediately see that they can make something excellent.

## 13. Intended workspace model

The stable furniture is the application header, the narrow seven-job editor rail, the Card workstage, and the Host's current selection/task context. Everything else is transient and task-sized.

| Mode | Host experience | Spatial behavior |
| --- | --- | --- |
| Compose | Card is dominant; add affordances and selection are light. | No persistent drawer. Card stays centered in the available stage. |
| Discover | Host chooses a domain, browses real visual options, then places. | One broad browser expands and Card yields enough space to remain contextual where practical. It restores category, search, scroll and placement context on return. |
| Organize | Host understands membership, hierarchy, parentage and flow order. | Calm Outline drawer appears; it is secondary and dismissible. |
| Refine / Tune | Host adjusts the selected target with immediate rendered feedback. | Relevant Inspector appears while Card remains clearly visible. Incidental selection must not relocate the whole workspace. |
| Deep Edit | Host edits semantic internals while retaining the outer Module/family identity. | Inspector may expand or focus, but breadcrumb, Card selection and return path stay visible. Curated construction geometry remains hidden. |
| Review | Host judges the visitor result. | Authoring chrome recedes; Preview uses the same renderer. Exit restores the prior selection/task. |
| Phone / tablet | Host performs one clear task at a time. | Bottom sheets or full-height task surfaces replace squeezed columns; a stable task bar restores Add/Edit/Outline/Preview/Move. |
| Brand | Host applies or overrides shared decisions in context. | Brand browser/decision surface opens from the rail or target controls; it returns to the same selection with provenance clear. |
| Assets | Host searches, filters, uploads, selects and reuses governed media. | Broad browser takes space; selected asset returns to the originating semantic slot/destination. |
| tApIt | Host requests or receives contextual proposals, previews them, and accepts deliberately. | Result panel belongs to the current task/selection; acceptance writes through the same command/history authority and returns to Refine. |

The workspace must restore: active rail, nested catalog path, filters/search, scroll, selected target, insertion context, Inspector section and Card viewport. A successful Place should normally close or narrow discovery, select the new result, show its natural Refine action, and retain a quick way back to the same catalog.

## 14. Intended richness map

Real richness is organized, previewable, target-aware and backed by working state. The intended initial shape is:

| Domain | Real richness to expose progressively |
| --- | --- |
| Text | Heading, Subheading, Body, Label, Quote; Brand styles; recent styles; real font pairings; role-aware presets; content inspiration; dynamic fields with fallback; spacing, alignment, weight, line height, tracking, color and accessibility. |
| Standard Button | Content; approved action/destination; canonical icon/image; typography; surface/material/color; edge/border/radius/shadow; spacing, size and alignment; Brand treatments; saved treatments; default/hover/pressed/focus/disabled preview; accessible name and touch target. |
| Curated | Finished family presentations; certified layouts; action roster; semantic plugs; identity slots; copy; governed appearance roles; family-specific counts/presentations; no construction furniture. |
| Surfaces | None/transparent, solid, editable gradients, image, pattern and texture; linen/fabric, paper/kraft, wood, stone/brick, metal/brushed metal, glass/frosted/smoked glass, enamel, leather, holographic/noise and manufactured premium treatments. |
| Assets | Upload, Library, Brand, Recent, Favorites, collections, provider search, derivatives, provenance/rights, usage, and contextual tApIt results, reusable across every compatible product domain. |
| Icons | One `IconAsset` universe with search, provider provenance, native/stock/Brand/generated sources, recent/favorite state, semantic fit and target-specific treatment. |
| Templates | Card Templates, Section Templates, component presets, governed Curated families, Brand-aware recommendations, recents, favorites and saved Host resources. |

The first release of each domain should contain a small, excellent, differentiated set—not one generic tile and not fifty filler tiles.

## 15. Lost and regressed feature inventory

The older editor exposed far more reachable surface area—118 control/workflow families and roughly 31 object types in the preserved audits—but its cockpit is not the restoration target.

| Preserved or former capability | Current disposition | Decision |
| --- | --- | --- |
| Root Background with solid/gradient/image/pattern/texture | Hidden from new shell | **KEEP AND RESTORE** through shared Surface/Design. |
| Templates, Section Templates, starter presets | Hidden/disabled | **KEEP AND RESTORE** through real template catalogs. |
| Brand logos/colors/fonts | Separate Brand workspace; thin Studio bridge | **REPLACE WITH NEW SHARED SYSTEM** using Brand-aware catalogs/provenance. |
| Assets library/upload/stock/product imagery | Contextual browser only | **KEEP AND RESTORE** as shared Assets rail/browser. |
| Google Fonts and font browsing | Hidden | **REPLACE WITH NEW SHARED SYSTEM** for Text roles, pairings, recents and Brand. |
| Iconify/native icon browsing | Button path restored; other old pickers remain | **REPLACE WITH NEW SHARED SYSTEM** everywhere. |
| Color/gradient/material controls | Engines preserved; new shell thin | **REPLACE WITH NEW SHARED SYSTEM**, preserving engines and parity law. |
| Badge/Coupon/Ticket/Map/Gallery/Form/QR/Video and other content types | Not in Slice 2 Add | **DEFER**, then admit only with declared ordinary or governed authoring contracts. |
| Save as reusable / place reusable composition | Backend resource system exists; UI hidden | **KEEP AND RESTORE** after dependency semantics are explicit. |
| Saved/favorite/recent libraries | Mixed old/new authorities | **REPLACE WITH NEW SHARED SYSTEM** and server canonical state. |
| Contextual Writing Assist | Old local behavior removed; real infrastructure hidden | **REPLACE WITH CONTEXTUAL TAPIT** proposal workflow. |
| Freeform selection, marquee, handles, rotation, z-order and grouping | Hidden from ordinary flow | **DEFER** to explicitly bounded composition domains; do not generalize. |
| “Layers” hierarchy | Replaced by Outline | **REMOVE PERMANENTLY** as hierarchy terminology. |
| 14-tool permanent rail and stacked drawers | Replaced by seven jobs/adaptive workspace | **REMOVE PERMANENTLY**. |
| Duplicate provider-specific icon/media state | Being adapted | **REMOVE PERMANENTLY** after migration. |
| Fake saved/templates/materials/AI filler | Rejected | **REMOVE PERMANENTLY**. |

## 16. Shared-platform dependencies

Future slices should consume, harden, or extend these authorities rather than create local alternatives:

- canonical Card document, draft revision, immutable publication and shared renderer;
- Card Surface flow parent/order and placement resolver;
- selection target and position capability contracts;
- declared authoring contract/completeness audit and control availability;
- transient task lifecycle and adaptive workspace choreography;
- shared Catalog adapter/resource schema and canonical activity/recents service;
- `MediaAsset`, collections, approval, rights, attribution, derivatives, usage, favorites and recents;
- `CreativeResource`, immutable revisions, usage dependencies, approval, favorites and recents;
- canonical `IconAsset`, Iconify adapter and visual-resource-fit metadata;
- surface capability, material engine, gradient, pattern, border and preview-parity renderers;
- BrandKit adapter, semantic roles, inheritance, provenance, synchronization and promotion;
- canonical Card action registry, intent reconciliation, destination validation and platform-bound gates;
- labeled history/live-adjustment transactions and shared keyboard ownership;
- Curated family registry, entitlement access, semantic authoring contract, compiler and visual acceptance;
- AI proposal scope/protected fields, provider-neutral generation, budget/entitlement/governance and acceptance history.

## 17. Add / Discover assessment

The accepted grammar remains correct:

**Choose → Browse → Place → Select → Refine**

Add should remain the doorway for placeable content: Text, Image, Buttons, Divider, Container and Curated. Templates can also place or replace a larger composition through the same lifecycle. Backgrounds, textures and materials are usually **applied to a selected destination**, so they belong primarily under Design/Refine and may be discoverable from Add only when the Host intent is clearly “add a background treatment.” Icons and Brand are resources applied to semantic slots, not generally standalone Card Modules. Saved resources and tApIt results should appear contextually in the domain catalog rather than as indiscriminate object types.

The Slice 2 registration-driven architecture, shared catalog adapter, canonical placement, drag targeting, context restoration model, honest empty states and finished Curated presentations should be preserved.

The current Add surface is appropriately simple as a foundation but too sparse, too tile-heavy and too large for its present depth. It lacks:

- differentiated Text previews and semantic roles;
- meaningful Image/Asset previews and recent/Brand entry points;
- recommendations based on Card/Brand context;
- recent choices outside Buttons;
- deeper Container and Divider presets;
- real search/filter/category depth across domains;
- enough visual inventory to justify the broad drawer geometry.

The fix is not smaller generic tiles alone. It is organized abundance: a shallow Choose page, then rich domain-specific Browse pages with real previews, compact recurring sections, and a clearly preserved Card/insertion context.

## 18. Button North Star

### Standard Button

The Standard Button is a directly editable ordinary Module. Its approved authoring contract should include content; accessible name; canonical action intent and validated destination; icon or compatible imagery; label/icon placement; typography; visual surface/material/color; edge/border/radius/shadow; spacing; width/height/alignment; Brand defaults and explicit overrides; saved appearance treatment; and previewable default/hover/pressed/focus/disabled states.

Slice 2 already proves most of the basic path: finished previews, click/drag placement, content, seven common actions, canonical icon discovery, icon position/color, text alignment/size/typeface/weight/color, real quick treatments, fill, shape/radius/border/shadow, width/min-height/padding/alignment, flow position and accessible name. Missing are the full approved action browser, robust state treatments, image-bearing Button variants, shared Color/Material depth, Brand source/override clarity, saved treatment lifecycle, and touch/focus validation.

### Curated / Signature family

A Curated Button-like system is not a Standard Button with more controls. The Host chooses a finished family presentation and edits only its declared semantic contract: presentation, action roster, plug/icon roles, identity asset, copy, approved appearance roles and permitted counts. The family owns structural geometry, attachment rules, manufactured material language, and responsive behavior. Cabinet Noir correctly demonstrates this split. Any shared control is admitted by the family adapter; no universal Inspector guesses at internal construction.

## 19. Icon North Star

The canonical unit is `IconAsset`, not an Iconify name, Lucide component, URL, or BrandKit field. It should preserve identity, provider/source, canonical reference, preview, attribution/provenance where relevant, semantic label, compatibility and derivative/treatment metadata.

What exists:

- native icon assets and Iconify-backed stock search;
- a unified Button discovery UI with Recent, Recommended and Stock;
- canonical server recents;
- visual-resource fit/legibility metadata useful beyond icons;
- older BrandKit and nested-consumer icon pickers that prove additional demand.

What must become shared:

- one browser/adapter contract for Standard Button, Curated plugs, Brand, campaign, email, tApIt and future Modules;
- provider-neutral persisted references and migration adapters for old icon names;
- target-specific fill/stroke/backing/size rules without duplicating the catalog;
- recents, favorites, Brand, recommended and generated/result sources;
- semantic accessible labeling and honest incompatible-resource guidance.

The Slice 2 Button implementation is the preferred seed. The old per-consumer pickers are compatibility inputs, not co-equal future systems.

## 20. Surface / Material North Star

The repository has a real material system: canonical recipes, target adapters, gradients, patterns, borders, renderer parity tests and a published law that enabled controls must visibly affect Edit and Preview and survive save/reload. This is not hypothetical infrastructure. It is mostly hidden from the reconstituted shell.

The target catalog should organize real recipes by visual intent and material family—clean/flat, raised/recessed, glass, metal, paper/fabric, natural/architectural, pattern/texture, premium manufactured—not dump implementation properties. Each tile must render from the canonical recipe. Applying one writes editable canonical properties, not a flattened thumbnail.

Card Surface and Container Surface should share catalog resources, recipe models, Color/Gradient/Media browsers and renderer authority, but remain distinct destinations:

- **Card Surface** owns the page environment, responsive root background, safe area and global legibility relationship.
- **Container Surface** owns a bounded grouping surface, its padding/gap/edge, and its relationship to contained Modules.

Compatibility and defaults may differ by destination. A Card background recipe must not silently change Container spacing; a Container recipe must not claim root-page geometry. Unsupported target/recipe combinations are hidden or explained.

Current real Slice 2 options are transparent, solid, image and smoked glass for Containers; solid and glass controls visibly tune fill/opacity/blur/edge/depth; image controls tune fit/focal/brightness/tint/overlay/opacity. Wood, metal, fabric, paper and stone categories are explicitly hidden by the adapter, which is honest. They should remain hidden until a small excellent quality pack has canonical previews, destination mappings, persistence and visual acceptance.

## 21. Image / Background model

Two contracts must remain separate.

### Fixed-shape resource slot

The destination geometry is stable and semantic—for example, Cabinet Noir's circular identity. Store the canonical asset plus a Host-confirmed crop/fit transform for that slot. The crop session may reason in source coordinates because the output shape is certified. The family renderer and visual acceptance proof own the result.

### Responsive background destination

The destination changes with Card width, content height and device. Store visual intent:

`Asset + focal point + zoom/scale + fit intent + destination geometry`

Do not store a temporary desktop crop rectangle as truth. Render the intent against each actual destination. Optional brightness, contrast, saturation, blur, tint/overlay, blend and decorative semantics remain destination treatments.

What exists:

- canonical Card background state with media asset ID/fallback URL, fit, focal X/Y, scale, repeat, blur, brightness, contrast, overlay, blend, decorative and alt;
- Container surface state with asset, fit, focal point, brightness, tint/veil, overlay/image opacity, edge and responsive renderer integration;
- Cabinet Noir semantic slot with crop/fit contract and visual acceptance;
- media metadata, dimensions, derivatives, provenance and usage.

What is missing:

- new-shell Card background authoring;
- ordinary Image focal/zoom/crop and alt-text authoring;
- zoom/scale and the broader treatment set in Container UI;
- consistent breakpoint/device previews and warnings for focal loss;
- an explicit fixed-slot versus responsive-destination browser handoff;
- comprehensive Edit/Preview/public/Live Device acceptance for each destination class.

## 22. Brand North Star

Brand is a cross-cutting decision authority, not a rail-sized island. BrandKit already owns semantic colors, typography style, Button style, logo/icon, tone, language, links and Card state. Shared authoring code already distinguishes inherited Brand values from local overrides, synchronizes eligible fields, resets to Brand, applies to similar targets and can promote a local visual decision back to Brand.

In mature Studio, Brand contributes:

- logo and mark resources to identity and image slots;
- semantic color roles to every compatible Color browser;
- type roles and approved pairings to Text and Button typography;
- Button treatments and icon defaults;
- approved imagery and surface recipes;
- recommended Templates and Curated identity choices;
- campaign-safe defaults and source/provenance explanations.

The Studio must always show whether a value is From Brand, a local override, or a governed linked value, and what a change will affect. The Brand rail should manage/browse decisions and resources; target Inspectors should apply, detach, reset or promote them in context. Slice 2 currently uses Brand context in Button previews/swatches and asset sources, but the operational Brand rail is disabled and provenance is not consistently Host-visible.

## 23. tApIt North Star

tApIt is the contextual intelligence layer for the same Studio commands and resources. It is not another canvas, document model, catalog, Brand store or campaign editor.

The repository already has the right safety primitives: selection-scoped AI proposals; protected action, destination, campaign, accessibility, schedule, visibility, binding and consent fields; structured text rewrite parsing; provider-neutral generation orchestration; feature/plan gates; budgets; and provenance-aware history labels. It does not yet have the coherent Studio experience.

Intended appearances:

- **Add/Templates:** propose a small assembled starting point or relevant real resources for the Card goal.
- **Text:** rewrite, shorten, clarify, change tone or propose a coordinated set; preview diff and accept per target.
- **Image/Assets:** search or generate candidates into canonical MediaAsset/provenance flows; never paste an opaque URL as final state.
- **Icons:** suggest canonical icons based on semantics, then let the Host choose.
- **Buttons:** propose label, icon and common intent, but require explicit review for protected destinations/actions.
- **Brand:** extract or recommend candidate decisions for approval, never silently redefine Brand.
- **Campaign-linked workflows:** propose references or copy with entitlement/governance checks; campaign construction remains in its product domain.

Every result must be Brand-aware, provider-neutral, entitlement-aware, accessibility-aware, governed, previewable, rejectable and recorded through canonical history. The old fake/local Magic Write behavior must not return.

## 24. Accessibility gaps

| Concern | Current state | Required North Star path |
| --- | --- | --- |
| Image alt text | Asset placement derives a label-like default; no ordinary Image field | Explicit alt/decorative choice, suggested text review, empty-state warning, parity through public renderer. |
| Text contrast | No Host guidance | Evaluate resolved Text against actual Card/Container/image treatment; warn and offer Brand-safe alternatives. |
| Button accessible name | Exposed and defaults to visible label; empty warning | Preserve; add destination-context validation and state preview. |
| Touch target | Button min-height floor starts at 44px, but no explicit feedback | Show pass/warning from resolved geometry on phone. |
| Font sizing/readability | Numeric size/line height exist | Add role-aware guidance, minimum/readability warnings and responsive preview. |
| Focus behavior | UI controls have focus styles; visitor Button state not authored/reviewed | Preview and validate focus-visible treatment and keyboard activation. |
| Divider semantics | Visual controls only | Decorative versus semantic separator choice; correct renderer role/aria behavior. |
| Curated action labeling | Semantic action labels exist | Validate every enabled action, identity and plug label through family contract. |
| Dynamic content | No Host path | Require accessible fallback, empty/error state and reading-order review. |
| Keyboard ownership | Shared helper exists but flow Module bypasses it | One shared editable-control boundary for input, textarea, select, contenteditable, textbox roles and declared owners. |

Accessibility should be embedded in Content/Action/Appearance decisions and summarized in an Accessibility section; it should not become a last-minute compliance drawer.

## 25. Action / destination audit

Canonical Card actions include Save contact, Call, Email, SMS, Website, Directions, Review, Calendar, Shop, Book, Add to Home Screen, Bookmark, Instagram, Facebook, TikTok, Snapchat, X, YouTube, LinkedIn, WhatsApp, Yelp, Custom and platform-bound Support. Additional Card models reference wallet, claim/offer, campaign and product-specific behaviors.

The new Standard Button exposes Website, Call, Email, SMS/Text, Directions/Map, Review and Booking. This is a sensible first common set, but the absence of the remaining types is not explained. Curated actions use the shared semantic concepts of action intent, destination and roster, while family adapters govern count and roles. That is the right convergence: one canonical action authority, different presentation and governance contracts.

North Star:

- a searchable/categorized action browser, not one enormous select;
- destination-specific fields and validation (URL, phone, email, map/location, social handle, review location, booking provider, saved/contact behavior, product-bound target);
- Brand/business defaults and connected-object selection where applicable;
- clear preview/test behavior that does not accidentally perform live side effects;
- consistent history, public rendering, analytics/tracking identity and accessibility labeling;
- platform-bound actions such as Support, wallet, campaign and TapSave shown only when configured and entitled;
- custom URL remains the honest escape hatch, not the way every typed destination is modeled.

## 26. Curated family audit

Cabinet Noir proves the intended reusable pattern:

- Add shows finished single/twin family presentations;
- placement creates one whole outer Module;
- the outer Card participates in ordinary canonical flow;
- an internal family compiler owns governed structure;
- the shared semantic shell exposes presentation, counts, action roster, labels/destinations/intents, plugs and identity;
- identity uses a declared visual slot and crop/fit contract;
- appearance roles can be marked governed rather than leaking construction values;
- entitlement is checked in discovery and again at publication;
- certified geometry and human visual acceptance gate the family.

A future second family must prove that the platform is not Cabinet-Noir-specific. It must implement a genuinely different family contract and visual grammar through the same registration, placement, semantic controls, history, persistence, entitlement, renderer parity and acceptance machinery. It must not depend on loose internal nodes, copied Inspector branches, or universal appearance guesses. Arc Ember is not authorized for activation in this pass and should not be used as fake proof before it meets that standard.

## 27. Save / Recents / Favorites audit

### Current canonical state

- Card draft Save uses revisioned compare-and-swap state with dirty, saving, failed, conflict and recovery outcomes.
- Publish is separate and creates/points to immutable publication state while retaining a compatibility projection.
- Undo/redo is labeled; continuous controls use preview/commit/cancel transactions.
- `MediaAssetRecent` and `MediaAssetFavorite` are business/user scoped; media collections and usage exist.
- `CreativeResourceRecent` records resource, consumer, context, last operation, time and use count; favorites, revisions, approval and usages exist.
- Slice 2 Button recents are server-canonical and operation-aware.
- `SavedTemplate` exists, and legacy icon/font recents remain migration inputs rather than preferred authority.

### Current UI

- Save/undo/redo/publish are accessible in the shell.
- Button Recents is real.
- Saved Buttons is an honest empty state.
- Media browsing can expose Library, Brand, Recent, Favorites, Upload and provider-found assets contextually.
- No unified save/favorite action exists for Button treatments, Text styles, surface recipes, Modules or compositions.

### North Star

Every domain catalog may compose the same relevant sections—Recommended, Brand, Recently Used, Favorites, Saved—without pretending every resource supports every lifecycle. “Recent” records a successful place/apply/select-for-use operation, not mere viewing. “Saved” creates a canonical resource or treatment with revision and dependency semantics. “Favorite” is a personal retrieval signal, not a copy. Brand defaults are governed decisions, not favorites. Reusable compositions must declare whether placements reference a revision or detach a copy, how updates are surfaced, and how publishing preserves dependencies.

## 28. Inline Text Space-key root cause

### Reproduction

In the deterministic Slice 2 runtime, selecting the Welcome Text Module and entering inline edit produced a focused `SPAN[contenteditable="true"]`. Typing ` Alpha Beta` appended `AlphaBeta`; an explicit Space key added zero characters. Typing ` Gamma Delta` into the Button Inspector's native label input preserved both spaces.

### Exact event path

1. Focused `InlineEditableText` receives the keyboard event.
2. Its local handler only claims its explicit edit keys (for example Escape), so Space bubbles.
3. The ancestor flow Module wrapper in `CreativeCompositionCanvas` is `div role="button" tabIndex={0}` with an activation/reselection `onKeyDown` for Enter and Space.
4. That wrapper calls `event.preventDefault()` and selects the Module.
5. The event can continue toward higher composition/window handlers, but the browser's default contenteditable insertion has already been canceled.
6. The global TapCardBuilder Space-to-pan handler does consult `studioShortcutMayRun(event)` and correctly recognizes editable controls. It is therefore not the interceptor and cannot restore the canceled default.

### Why Inspector works

The Inspector input is not nested inside the flow Module activation wrapper. Native input ownership remains intact, and shared shortcut guards recognize it, so Space is inserted normally.

### Risk surface

The same local boundary threatens:

- ordinary inline Text;
- inline Standard Button label editing;
- any current or future input, textarea, select, contenteditable, role=textbox or declared keyboard-owner descendant rendered inside a flow Module;
- future inline semantic editors for Badge, Coupon, Ticket, forms or other ordinary Modules;
- Enter behavior in multiline or semantic editors, because the same wrapper claims Enter.

The eventual repair must make the Module activation handler defer through the shared editable-field ownership authority before claiming Space or Enter. A Text-specific `stopPropagation`, key exception, or character insertion workaround would leave the systemic bug in place.

Evidence anchors: `InlineEditableText` is defined in `components/fusion/creative-studio/creative-composition-canvas.tsx` near line 271 and becomes `contentEditable` near line 333; the intercepting flow Module handler is near line 2835; the correctly guarded global Space-to-pan handler is in `components/card/tap-card-builder.tsx` near line 702.

## 29. Recommended next five implementation slices

These are proposals only. Numbering begins after accepted Slice 2.

### Slice 3 — Text North Star and shared editable ownership

**User outcome:** a Host can add visibly distinct text roles, edit naturally on the Card, and produce polished, readable, Brand-aware typography without leaving the accepted workflow.

**Includes:** shared editable-field keyboard boundary; Heading/Subheading/Body/Label/Quote discovery; real previews; direct/Inspector content parity; Brand style source/override; shared font browser seed; size/weight/line height/tracking/alignment/color/spacing; accessible reading guidance; save/reload/Preview/Live Device proof.

**Why now:** it fixes the first hands-on blocker and turns the most universal Module from a generic tile into obvious creative power.

**Dependencies:** keyboard ownership, ordinary authoring declarations, typography/Brand adapters, history and catalog recents.

**Unlocks later:** coordinated tApIt writing, section/template typography, dynamic text and reusable styles.

**Visual acceptance:** five roles are distinguishable without reading labels; inline typing preserves all normal text input; Card remains visible; Brand/default/local provenance is clear; phone editing is comfortable.

**Explicitly excludes:** full Text materials, dynamic bindings, tApIt generation, arbitrary text-box freeform effects.

### Slice 4 — Card and Container Surface / Material foundation

**User outcome:** a Host can establish a credible Card environment and grouped surface using a small excellent set of solids, gradients, images, glass and real material treatments.

**Includes:** Card Surface selection/refine path; shared target-aware Surface browser; canonical Color/Gradient entry points; responsive Card/Container media intent with focal point and zoom/scale; a quality-gated initial material pack; target compatibility; renderer/persistence/Preview/Live Device parity.

**Why now:** background and material choice produces the largest immediate visual transformation and fills the most conspicuous missing rail/domain.

**Dependencies:** existing surface/material/gradient/media engines, Catalog Browser, Card-root commands, visual acceptance harness.

**Unlocks later:** Button/Text Box materials, Brand surface recipes, material-aware templates and richer Curated appearance roles.

**Visual acceptance:** every tile is rendered from its applied recipe; Card and Container results are visibly destination-correct; responsive crops hold on phone/desktop; no no-op or placeholder category is visible.

**Explicitly excludes:** the entire historical material catalog, arbitrary filters, loose Curated material controls, unsupported exotic effects.

### Slice 5 — Shared Assets, Brand resources and icon universe

**User outcome:** a Host can deliberately browse, upload, find, favorite and reuse approved media/icons/Brand resources from one visual plane and return them to any compatible slot.

**Includes:** operational Assets and Brand rail paths; shared Library/Brand/Recent/Favorites/Upload/provider sections; provenance/rights/approval cues; one icon adapter/browser for Standard Button, Brand and admitted Curated plugs; semantic slot return; recents/favorites; image alt/decorative authoring; derivatives where already real.

**Why now:** Text and Surface make the Card expressive; this slice supplies the reusable visual content and cross-domain coherence needed to sustain that expressiveness.

**Dependencies:** MediaAsset/CreativeResource services, collections/favorites/recents, IconAsset, fit compatibility, BrandKit adapters.

**Unlocks later:** templates with durable resources, tApIt-generated assets, campaign/email sharing and reusable Modules.

**Visual acceptance:** asset previews dominate over form controls; source and suitability are understandable; returning from the browser restores the exact target; identical icons/assets do not appear as provider-specific duplicates.

**Explicitly excludes:** a new DAM product, silent license assumptions, AI generation, automatic Brand mutations.

### Slice 6 — Button/action completion and reusable treatments

**User outcome:** a Host can create the common TapConnect action experiences, style them consistently, test their states and reuse successful treatments without confusing Standard and Curated Buttons.

**Includes:** categorized canonical action/destination browser; configured social/contact/review/booking/shop/save/custom options; platform-bound availability; Brand Button treatments; saved/favorite/recent treatment lifecycle; default/hover/pressed/focus/disabled preview; touch/focus/accessibility checks; declared dependency semantics.

**Why now:** the current Button is already the strongest ordinary Module; finishing its product lifecycle yields visible completeness without replatforming it.

**Dependencies:** action registry/validation, Brand, shared Icon/Color/Material, CreativeResource revisions/usage, publication checks.

**Unlocks later:** template action slots, campaign-linked CTAs, tApIt Button proposals and shared treatment use in other products.

**Visual acceptance:** Standard Buttons remain directly editable; Curated families retain governed geometry; actions are understandable and testable; pressed/focus states are materially legible; saved treatments reproduce exactly after reload.

**Explicitly excludes:** campaign construction, payment implementation, universal Curated appearance, Ember activation.

### Slice 7 — Templates, Sections and contextual tApIt entry contract

**User outcome:** a Host can begin from a small set of excellent Brand-aware Card/Section outcomes and ask tApIt for contextual proposals without surrendering authorship or introducing fake inventory.

**Includes:** real Card Templates, Section Templates and component presets; recommendation/Brand/recent/favorite sections; preview-before-apply; resource dependency rules; tApIt result contract with selection scope, preview, accept/reject, protected fields and history; an initial narrow Text/template proposal flow only where provider readiness is real.

**Why now:** Templates require the preceding Text, Surface, Asset, Brand and action systems to produce durable real outcomes. tApIt requires those same canonical destinations before its results can be useful rather than parallel content.

**Dependencies:** all prior proposed slices, CreativeResource/SavedTemplate reconciliation, AI proposal/provider/entitlement/budget governance.

**Unlocks later:** broader tApIt Image/Icon/Button proposals, dynamic content, additional ordinary Sections and future certified Curated families.

**Visual acceptance:** every template is visibly differentiated, editable and renderer-true; application has a clear scope and undo label; tApIt never auto-applies protected fields and never shows placeholder output.

**Explicitly excludes:** full autopilot campaign generation inside Studio, fake volume, Ember activation, dynamic data authoring.

## 30. No-code confirmation and review stop

This reconnaissance changed no application code, Studio UI, feature flag, accepted checkpoint, branch, or Git history. It did not begin Slice 3 and did not activate Arc Ember. The only repository-file change is this documentation report, created to preserve the reconstructed product map. The local deterministic browser diagnostic exercised normal draft autosave while the tested text was restored, so the saved Card content was returned to its original value but local draft revision metadata may have advanced; no publication was performed.

Implementation should stop here for Product Owner review. The acceptance question for every future slice is now explicit: does it make the Host more able to open Studio and immediately understand, “I can make something excellent here,” while preserving canonical truth, honest availability, and the accepted Choose → Browse → Place → Select → Refine grammar?
