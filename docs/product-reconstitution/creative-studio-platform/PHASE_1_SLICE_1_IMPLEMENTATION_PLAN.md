# TapConnect Studio Reconstitution — Phase 1 / Slice 1 Implementation Plan

**Status:** Product Owner review required. This document authorizes no implementation by itself.

**Slice:** New Studio shell plus the first complete Standard Button authoring loop.

**Design authority:** This plan implements the approved Product Steward Constitution, Studio Reconstitution Interaction Specification, and reconciled Canva interaction references. Canva is used as an interaction-maturity reference, not as a visual skin or feature-parity target.

## Slice outcome

An enrolled pilot user can enter the Card editor through a feature-gated new Studio shell, discover a quality-gated Standard Button, preview it with the current Brand context, place it by click or drag, select it, edit its label, assign a provider-neutral Action, refine its appearance and position, undo/redo, save, preview, publish, reload, and continue editing. The same canonical Card document, object kernel, renderer, action registry, persistence APIs, entitlement checks, and publication lifecycle remain authoritative.

This is a vertical slice, not a shell mockup. A control is not considered delivered unless the user-visible outcome works through reload and publication where applicable.

## 1. Exact proposed editor rail

The durable Phase 1 information architecture is, top to bottom:

1. **Templates**
2. **Add**
3. **Text**
4. **Design**
5. **Brand**
6. **Assets**
7. **Layers**

The rail is persistent on desktop and tablet. It becomes a compact bottom tool bar on phone. It does not contain Projects, Buttons, Backgrounds, History, Advanced, Lifecycle, Offer, TapSave, or a permanent tApIt button.

Rail entries are registered separately from rollout readiness. The seven-item information architecture is stable, but a pilot sees an entry only when its shell-native destination meets the readiness gate. Slice 1 must make **Add** and **Layers** operational; the remaining entries may appear only if they have an honest, usable shell-native surface. The implementation must not display inert destinations, “coming soon” filler, or links back into legacy shell chrome.

## 2. Rationale for each rail item

| Rail item | Owns | Does not own | Phase 1 requirement |
| --- | --- | --- | --- |
| Templates | Whole-Card starting points and reusable Card structures | Per-object presets or selected-object refinement | Registered, readiness-gated; no fake catalog |
| Add | Discovery and placement of Sections, components, and media | Editing an already-selected object | Fully operational for Buttons → Standard |
| Text | Adding text and text-oriented discovery | Formatting a selected Button label | Registered, readiness-gated |
| Design | Card/root visual direction, background, and layout discovery | Selected-object Appearance | Registered, readiness-gated |
| Brand | Brand identity, approved resources, and guidance | Generic asset management or local document styling state | Registered, readiness-gated; supplies preview context |
| Assets | Uploaded and reusable media/resources | Whole-Card projects or business administration | Registered, readiness-gated |
| Layers | Structure, selection, ordering, visibility, and lock state | Detailed properties | Operational using the canonical composition tree |

**Why Buttons is not a rail item:** Buttons are a component family discovered under Add. Giving every object family permanent rail real estate does not scale.

**Why Background is not a rail item:** Background is a Design concern, not a peer of Add and Layers.

**Why History is not a rail item:** Undo and redo are global editor commands in top chrome. A future history browser may be a secondary surface, but it is not a primary authoring destination.

**Why Advanced is not a rail item:** Precision controls belong at the end of the relevant Inspector section, not in a cross-cutting junk drawer.

**Why Projects is not a rail item:** Project/document navigation belongs to the main Studio application shell, distinct from the editor’s creative-operation rail.

## 3. Drawer controller architecture

There is exactly one left discovery drawer controller per editor instance.

### State model

`StudioDrawerState` contains:

- `activeRailId`
- `path` as ordered discovery nodes, for example `Add / Buttons / Standard`
- `mode`: `closed | standard | expanded | compact`
- `tabId`, `scopeId`, `query`, and typed filters
- per-path `scrollOffset`
- `placementMode`: `insert | replace`
- `replaceTargetId` when replacement is active
- loading, empty, permission, and recoverable error state

The controller is a pure reducer. Rail, breadcrumbs, search, cards, toolbar Replace, and responsive sheets dispatch events to it; none owns private drawer state.

### Geometry

- **Standard:** normal browse and category navigation.
- **Expanded:** dense libraries such as Assets or Brand; it may reduce or temporarily close the Inspector according to the responsive policy.
- **Compact:** shallow palettes and narrow structural views.
- **Closed:** no discovery surface; selection and Inspector remain independent.

The controller preserves path, query, filters, and scroll independently for each rail destination. Selecting the active rail item toggles its drawer. `Escape` closes the topmost transient surface first, then the drawer. Opening another rail destination changes the controller state; it never mounts a second drawer.

### Standard Button path

`Add → Buttons → Standard` is a real deep-browse route with breadcrumbs, search, optional category tabs, quality-gated preset cards, loading/empty/error states, and Recently Used. The browser history URL does not change; this is editor session UI state.

## 4. Inspector architecture

The right Inspector is selection-driven and is not a second discovery drawer.

For one selected Standard Button it presents these sections:

1. **Content** — label, icon, accessible name
2. **Action** — intent and destination fields
3. **Appearance** — fill, border, corner, shadow, opacity, states
4. **Layout** — position, size, alignment, spacing
5. **Accessibility** — name, contrast/status, keyboard semantics
6. **Advanced** — exact numeric and per-state controls

After a new Button is placed, Content opens by default and label input receives a clear focus affordance without stealing focus during drag. On later selections, the Inspector restores the last Button section for that session.

The Inspector reads a capability-derived view model. It does not inspect raw object enums directly and it does not mutate the Card document directly. Every edit emits a registered command through the command adapter.

For multi-selection, only common capabilities are shown. Mixed values display **Mixed** and are not overwritten until the user deliberately chooses a value. Content, Action, and Replace are hidden in Slice 1 for mixed selections. Safe common Appearance and Layout commands may remain.

## 5. Standard Button discovery

The initial visible catalog is intentionally small:

- **Primary CTA** — brand-aware solid Button
- **Secondary Outline** — high-contrast outline Button
- **Full-width CTA** — strong block action
- **Icon + Label Call** — provider-neutral call intent presentation
- **Compact Utility** — restrained compact action
- **Soft Elevation** — only if renderer proof passes the material quality gate

Icon-only, Coupon, RSVP, Wallet, Arc Ember, Cabinet Noir, and any procedural material that does not meet the visual proof bar are excluded from this slice. Icon-only is withheld until accessible-name authoring is impossible to miss. Coupon, RSVP, Wallet, and Payment require semantic decisions beyond a visual preset.

Each catalog entry is a versioned `StandardButtonPresetDefinition` with:

- stable catalog ID and version
- user-facing name and description
- category/search metadata
- canonical Button content and composition props
- optional Action suggestion, never an implicit external destination
- brand token bindings and fallback values
- quality/readiness status
- compatibility and accessibility metadata

Search matches names, descriptions, use cases, and semantic tags. The catalog never exposes internal family names or renderer enums.

## 6. Insertion behavior

Click and drag are two inputs to one insertion command.

### Click to place

Clicking a preset resolves the Brand snapshot, calls `insertButtonPreset`, finds a deterministic available placement in the current page/root or selected Section, creates one canonical composition node, records one labeled history transaction, marks the document dirty, selects the new Button, and opens Inspector → Content.

### Drag to place

Dragging uses a lightweight preview ghost. Valid drop zones are computed from the canonical canvas/composition model. Dropping passes a normalized `dropPoint` or target frame to the same `insertButtonPreset` command. Invalid drops do not mutate the document. Cancelled drags create no history entry.

Desktop and tablet support pointer drag plus click/tap placement. Phone uses tap-to-place in Slice 1; phone drag-to-place is explicitly deferred.

Insertion is disabled while its command is pending. A failed insertion leaves no partial node, reports a recoverable error in the drawer, and retains the chosen preset.

## 7. Selected-object toolbar

For a single selected Standard Button, the contextual toolbar order is:

1. **Edit content**
2. **Action**
3. **Replace**
4. **Appearance**
5. **Position**
6. **Duplicate**
7. **More**

Behavior:

- **Edit content** opens Inspector → Content. Double-clicking the Button or pressing Enter while it is selected enters direct label editing through the same label command owner.
- **Action** opens Inspector → Action.
- **Replace** opens `Add / Buttons / Standard` in replace mode. Applying a visual preset preserves object ID, Action, destination, analytics/tracking fields, accessible name, and user-authored label unless the user explicitly chooses to replace content.
- **Appearance** opens the compact Quick Appearance palette; **More appearance controls** opens Inspector → Appearance.
- **Position** opens common arrange/align/size controls and links to Inspector → Layout.
- **Duplicate** immediately invokes the canonical duplicate command.
- **More** contains Delete, Lock/Unlock, Hide/Show, arrange order, Copy style, Paste style when valid, and Advanced.

The toolbar is generated from the object capability registry plus presentation metadata. Commands unavailable for the current selection are omitted or disabled with an explanation; they are not reimplemented locally.

Keyboard behavior includes roving toolbar focus, Enter/Space activation, Escape close/cancel, Cmd/Ctrl+D duplicate, Delete/Backspace delete when focus is not in an editable control, arrow-key nudge by 1 px, and Shift+arrow nudge by 10 px.

## 8. Appearance

### Quick Appearance palette

The palette contains only renderer-proven visual choices:

- Brand Solid
- Brand Outline
- Neutral Solid
- Neutral Outline
- Soft Elevation, only after quality approval
- No special material / Flat

Every tile is a live canonical preview, not a CSS approximation. Selecting a tile applies one history transaction and preserves content and Action semantics.

### Inspector Appearance

The normal section exposes visual controls first: fill token/color, border style, corner presets, shadow presets, opacity, and state preview. It uses human labels and swatches, not raw renderer values.

### Advanced Appearance

Advanced exposes exact fill values, border width, radius, shadow offset/blur/spread, exact opacity, and supported per-state precision. It is collapsed by default. Materials that cannot produce preview/applied parity are hidden rather than represented by aspirational thumbnails.

## 9. Action

Action is provider-neutral user intent backed by `CARD_ACTION_DEFINITIONS` and canonical destination resolution.

| UI intent | Canonical kind | Primary field |
| --- | --- | --- |
| Website | `website` | URL |
| Call | `call` | Phone number |
| Email | `email` | Email address |
| Text | `sms` | Phone number and optional message |
| Directions | `map` | Address/place destination |
| Review | `review` | Review URL |
| Booking | `book` or registry-selected booking kind | Booking URL |

The Action UI is derived from the registry through a presentation adapter. Future registered actions can enter discovery without adding another switch statement to the toolbar or Inspector.

Call remains family-neutral. It stores normalized phone intent/destination data and resolves to canonical `tel:` semantics; no Card family, including Cabinet Noir, may substitute a family-specific URL or encode visual-family behavior into Action data.

Visual icon choice is separate from Action intent. Choosing Call may suggest a phone icon, but changing the icon does not change the Action and changing the Action does not silently overwrite a deliberate icon.

Payment is hidden in Slice 1 because no dedicated canonical Payment action is registered. It must not be faked as Shop or a generic URL. Booking is presented only after the Product Owner confirms the canonical mapping described under unresolved decisions.

Validation is field-specific, inline, and non-destructive. Invalid draft data may be retained while editing, but Save/Publish messaging must identify any blocking Action error according to existing document validation policy.

## 10. Label editing

Button label content has one authority: the nested Button composition content updated through `updateButtonLabel`. Any legacy mirror remains a compatibility output, not an editable second source.

- Direct editing, toolbar editing, and Inspector editing call the same command.
- A typing session is batched into one labeled history transaction on blur, Enter, or explicit apply; Escape restores the pre-edit value.
- An empty label may exist transiently while editing. If both visible label and accessible name are empty, the Button shows an authoring warning and publication is blocked.
- Long labels do not trigger silent font shrinking. The preview permits the supported wrap policy, visually flags overflow, and suggests shortening the label or widening the Button.
- Accessible name defaults to the visible label and becomes independently editable when needed.
- An icon-only Button requires an explicit accessible name; this is why icon-only presets are withheld from the initial catalog.

## 11. Recently Used

Recently Used is server-backed and business/user scoped. It is updated only after a successful placement or replacement, never merely by previewing a preset.

The implementation reuses `CreativeResource`, `CreativeResourceRecent`, `CreativeResourceKind.BUTTON_STYLE`, and the existing “used” behavior. Built-in catalog presets are resolved to stable, approved business-scoped Button-style resources using catalog ID plus version, then marked used through the canonical resource service. This avoids a second recents database and requires no destructive migration.

The drawer shows at most the agreed compact count, ordered by canonical recent timestamp, deduplicated by stable resource identity. Removed or no-longer-authorized resources are filtered. Local storage is not a source of truth.

## 12. Brand-aware previews

The route supplies an immutable `BrandPreviewContext` containing available colors, typography, logo, business name, and provenance/version. Missing fields fall back to a polished neutral TapConnect preview context; discovery never breaks because a Brand Kit is incomplete.

`resolveStandardButtonPreset(preset, brandContext)` is pure and deterministic. The exact resolved canonical props are used by both the catalog preview and insertion payload. Browsing does not mutate the Card or Brand Kit. Brand changes after placement do not silently rewrite an authored Button unless a future explicit linked-token system provides that contract.

The preview component renders through the same composition/renderer authority used by the canvas. Simplified thumbnail-only CSS is not accepted as parity evidence.

## 13. tApIt reserved surface

tApIt is reserved as a contextual intelligence surface, not a permanent rail destination in Slice 1.

The shell provides a registered slot that may be invoked from context such as the selected object, empty canvas, or a relevant drawer. Until a real, authorized tApIt capability has an end-to-end outcome, the slot stays hidden. No decorative AI button, dead prompt box, or Canva-AI imitation is shipped.

## 14. Responsive shells

### Wide desktop (approximately 1440 px and above)

- Persistent rail
- Standard drawer and Inspector may coexist
- Expanded drawer may close or compress the Inspector to preserve the canvas minimum
- Contextual toolbar stays anchored to the selected object within viewport bounds

### Compact desktop/tablet (approximately 768–1439 px)

- Persistent or collapsible icon rail
- Only one major side panel is open at a time: drawer or Inspector
- Selecting an object may replace the drawer with Inspector while preserving drawer state
- Touch supports tap placement and drag placement where pointer precision is reliable

### Phone (below approximately 768 px)

- Purpose-built bottom tool bar: **Add**, **Edit**, **Layers**, **Preview**, **More**
- One full-width bottom sheet at a time
- Tap-to-place, selection, label editing, Action editing, quality-gated Appearance, duplicate/delete, simple move/reorder, undo/redo, save, preview, and publish remain reachable
- Precision controls are deliberately nested under Advanced
- Desktop drag-to-place, multi-selection authoring, and dense floating toolbars are not miniaturized onto phone

Breakpoints are validated by behavior and minimum canvas width, not assumed from device names alone.

## 15. Shell state and persistence

State is separated by authority:

| State class | Examples | Persistence |
| --- | --- | --- |
| Card document | Nodes, label, Action, appearance, position | Existing draft/document APIs and revision model |
| Selection/session UI | Selection, active rail, drawer path, query, filters, tabs, scopes, scroll, open popovers | Memory plus namespaced session storage |
| User editor preference | Inspector width/collapse, density, last Inspector section, preferred preview device | Existing preference mechanism or namespaced durable preference store |
| Business/Brand | Brand Kit, resources, entitlements | Existing business-scoped repositories/APIs |
| Recovery | Unsaved canonical Card changes | Existing recovery journal |

New-shell UI state uses a distinct versioned key and cannot overwrite legacy-shell UI state. Neither shell stores Card mutations in its shell state.

Changing rollout enrollment takes effect on a new route load, not mid-command. Before navigation, existing dirty-state safeguards apply. After a saved change, either shell loads the same canonical document. If a restart occurs with unsaved edits, the existing recovery journal remains the recovery authority.

## 16. Command ownership matrix

| User outcome | UI entry points | Sole command owner | Canonical mutation/authority |
| --- | --- | --- | --- |
| Insert Button | Catalog click, catalog drag/drop | Studio command adapter → live editor bridge | Builder insertion transaction → `insertObject` |
| Replace Button visual preset | Toolbar Replace, catalog replace mode | Studio command adapter → live editor bridge | One protected-field-aware replacement transaction |
| Select Button | Canvas, Layers, post-insert | Canonical selection model | `SelectionRef` / live editor selection |
| Edit label | Direct edit, toolbar, Inspector | Button content command | `updateButtonLabel` through builder transaction |
| Change Action | Toolbar, Inspector | Action command | Registry-derived normalized props through builder transaction |
| Apply Appearance | Quick palette, Inspector | Appearance command | Canonical Button/composition props through builder transaction |
| Move/resize/arrange | Canvas, Position, Inspector Layout | Composition transform command | Existing composition update path |
| Duplicate | Toolbar, keyboard, Layers | Live editor duplicate command | Canonical duplicate operation |
| Delete | More, keyboard, Layers | Live editor delete command | Canonical delete operation |
| Undo/redo | Top chrome, keyboard | Existing labeled history authority | Builder undo/redo stack |
| Save | Top chrome/phone More | Existing builder shell API | Existing draft/document API and revision checks |
| Preview | Top chrome/phone toolbar | Shell view state | Canonical render path with current document |
| Publish | Top chrome/phone More | Existing builder shell API | Existing publication API, validation, entitlements |
| Mark recent | Successful insert/replace callback | Creative resource service | Existing server-backed recent record |

UI components may request commands and render pending/error state. They may not patch Card JSON directly. Each async command has an operation ID, duplicate-submission guard, and a single success/failure result consumed by all invoking surfaces.

## 17. Legacy coexistence and feature-flag boundary

Add `card.studio.reconstitution_v1` as an internal-only, default-off feature depending on `card.builder.v1`.

The route `app/dashboard/card/edit/page.tsx` resolves enrollment server-side and chooses either:

- `CardStudioReconstitutionWorkspace`, or
- the unchanged `CardAuthoringWorkspace` compatibility shell.

Both receive the same canonical builder inputs. The new workspace hosts `TapCardBuilder` in shell-hosted mode; it does not fork the builder.

Enrollment uses audited existing Platform Admin feature overrides. Resolution must be subject-aware, with deterministic precedence:

1. user override
2. cohort override
3. business override
4. global override
5. feature default

An explicit enable or disable at the most specific matching scope wins. Current first-match override behavior is insufficient and must be corrected and unit-tested before pilot enrollment. Internal-only eligibility is enforced in addition to the override.

Rollback is exact: disable the user/cohort/business override and reload the route. No document conversion is required. Legacy shell files remain available but receive no new product behavior. New-shell code must not import or mount legacy rail, drawer, contextual toolbar, or Advanced overlay components.

## 18. Module and file plan

### Add

- `components/fusion/card/reconstitution/card-studio-reconstitution-workspace.tsx`
- `components/fusion/card/reconstitution/studio-editor-rail.tsx`
- `components/fusion/card/reconstitution/studio-discovery-drawer.tsx`
- `components/fusion/card/reconstitution/studio-selection-toolbar.tsx`
- `components/fusion/card/reconstitution/studio-selection-inspector.tsx`
- `components/fusion/card/reconstitution/studio-phone-fast-edit-shell.tsx`
- `components/fusion/card/reconstitution/standard-button-discovery.tsx`
- `components/fusion/card/reconstitution/standard-button-preview.tsx`
- `components/fusion/card/reconstitution/tapit-context-slot.tsx`
- `lib/fusion/creative-studio/reconstitution/studio-rail-registry.ts`
- `lib/fusion/creative-studio/reconstitution/studio-shell-state.ts`
- `lib/fusion/creative-studio/reconstitution/drawer-controller.ts`
- `lib/fusion/creative-studio/reconstitution/studio-command-adapter.ts`
- `lib/fusion/creative-studio/reconstitution/standard-button-catalog.ts`
- `lib/fusion/creative-studio/reconstitution/button-preset-resolver.ts`
- `lib/fusion/card/action-intent-presentation.ts`
- a catalog-to-creative-resource recent adapter/service and, only if existing routes cannot express the operation safely, a narrowly scoped API route

### Extend narrowly

- `lib/fusion/features/registry.ts` — register the default-off feature
- `lib/fusion/features/resolve.ts` and context/repository tests — subject-aware scoped resolution
- `app/dashboard/card/edit/page.tsx` — server-side shell selection and Brand preview context
- `components/fusion/card/card-editor-live.ts` — typed command bridge additions only
- `components/card/tap-card-builder.tsx` — expose missing canonical insert/drop/replace/content command capabilities; no new shell UI
- `lib/fusion/creative-studio/editor-command-registry.ts` — capability-aligned presentation references, if needed
- `lib/fusion/creative-studio/capabilities.ts` — only to close a proven Button capability gap
- creative-resource service/routes — stable catalog resource resolution and recent marking

### Keep authoritative and do not fork

- `lib/fusion/card/object-kernel.ts`
- `lib/fusion/creative-studio/composition.ts`
- `lib/fusion/creative-studio/button-composition.ts`
- `lib/fusion/card/action-registry.ts`
- `lib/brand/tap-card.ts`
- material resolver/engine modules
- composition adapters and DOM/flow renderers
- public TapConnect Card renderer
- labeled undo/redo hook and builder history
- draft, document, publication, entitlement, and signature validation APIs/modules
- Cabinet Noir registry/contracts, assembly resolver, composition adapter, and renderer integration

### Compatibility-only during rollout

- `components/fusion/card/card-authoring-workspace.tsx`
- `components/fusion/card/card-creative-tool-rail.tsx`
- `components/fusion/card/card-shell-tool-drawer.tsx`
- `components/fusion/card/card-live-tool-drawer.tsx`
- `components/fusion/card/card-contextual-object-toolbar.tsx`
- `components/fusion/card/card-advanced-settings-overlay.tsx`
- existing deep-left editor context and legacy workspace tool registry

These files remain rollback infrastructure. Slice 1 must not add new feature behavior to them.

## 19. Human acceptance script

1. Enroll one internal pilot user with the audited feature override; verify a non-enrolled user still receives the legacy shell.
2. Open an existing Card and verify its current rendered content is unchanged.
3. Open Add, navigate Buttons → Standard, search, use breadcrumbs, and verify no legacy drawer appears.
4. Compare at least three Brand-aware preset previews against their placed canvas results.
5. Click Primary CTA to place it. Verify deterministic placement, selection, Content Inspector, dirty state, and one undo entry.
6. Undo and redo the insertion.
7. Drag Secondary Outline into a different valid canvas location. Cancel one drag and attempt one invalid drop; verify neither mutates history.
8. Edit the label directly, undo it, then edit it through the Inspector. Test empty and long-label guidance.
9. Assign Website, Call, Email, Text, Directions, and Review in turn. Verify validation and published destinations; specifically verify Call resolves to `tel:` independently of Card family.
10. Apply Quick Appearance, then exact Inspector Appearance controls. Verify previews and applied rendering match.
11. Move, resize/align, duplicate, delete, undo, and redo.
12. Replace the Button preset and verify label, Action, destination, accessible name, object identity, and tracking fields remain intact.
13. Save, reload, and confirm the exact Button state and Recently Used order.
14. Preview on desktop and phone; compare with the authoring canvas.
15. Publish through existing entitlement enforcement and verify the public Card.
16. Repeat on a Cabinet Noir Card and verify `signatureAssembly` remains preserved and Call remains family-neutral `tel:`.
17. Exercise tablet and phone shells, including tap-to-place and phone fast editing.
18. Disable enrollment, reload, and confirm the same saved document opens safely in the legacy shell.

Acceptance requires Product Owner interaction with the running product. Automated tests and screenshots are supporting evidence, not substitutes.

## 20. Automated test plan

### Unit/contract

- Feature scope precedence, explicit disables, internal-only eligibility, and default-off behavior
- Drawer reducer transitions, per-path memory, topmost Escape behavior, and responsive geometry rules
- Rail readiness gating and absence of inert destinations
- Preset registry uniqueness/versioning and quality-gate filtering
- Deterministic Brand preset resolution and neutral fallback
- Preview props equal insertion props
- Click and drag invoke the same insertion command with different placement input
- Replacement protected-field preservation
- Label canonical nested-content update and legacy mirror compatibility
- Action presentation mapping, validation, normalization, and Call `tel:` semantics
- Recently Used records only successful insert/replace and deduplicates stable identities
- Capability-derived toolbar ordering, disabled reasons, and multi-select intersection
- New-shell UI persistence separation from Card document and legacy shell state

### Integration/component

- Rail → drawer → deep path → preset → command bridge
- Selection → toolbar/Inspector synchronization without duplicate mutation
- Direct label edit and Inspector edit share one undo transaction owner
- Async pending/error behavior and duplicate-submission guard
- Drawer/Inspector arbitration at all breakpoint classes
- Keyboard and focus management, including editable Delete protection
- Incomplete Brand Kit fallback

### End-to-end

Create `e2e/card-studio-reconstitution-slice1.spec.ts` behind an explicit acceptance environment flag. Cover enrollment boundary, click insert, drag insert, invalid drop, label, Action, Appearance, transform, undo/redo, save/reload, Recently Used, preview, publication, rollback to legacy, phone fast edit, Cabinet Noir `signatureAssembly`, and family-neutral `tel:`.

Existing Card, publication, entitlement, creative renderer, object kernel, and Cabinet Noir suites remain required regression gates.

## 21. Visual proof plan

Produce a versioned proof matrix for Product Owner review at minimum:

- 1440×desktop: closed drawer, Add landing, Standard Button catalog, search result, drag state, selected Button toolbar, each Inspector section, Quick Appearance, mixed selection, loading/empty/error states
- compact desktop/tablet: drawer open, Inspector open, panel arbitration, touch placement
- phone: Add sheet, selected Button fast edit, Action sheet, Appearance sheet, preview, publish access
- Brand contexts: complete Brand Kit, partial Brand Kit, neutral fallback
- Button states: default, hover/focus where meaningful, pressed, disabled, invalid, long label, empty-label warning
- parity triplets: catalog preview, canvas result, published result for every visible preset
- Cabinet Noir regression: authoring, preview, and published Call Button with preserved `signatureAssembly`

Screenshots must include dimensions and commit SHA. Pixel comparison may catch regressions, but human review judges hierarchy, spacing, clarity, interaction maturity, and material credibility.

## 22. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Feature overrides currently do not resolve subject scope robustly | Correct and test precedence before routing any pilot user |
| New shell accidentally becomes a second editor | Keep all mutations behind the live editor/builder command bridge; prohibit direct JSON patches in shell components |
| Preview drifts from applied/published rendering | Resolve once and use the canonical renderer for preview, canvas, and publication evidence |
| Replace destroys functional data | Define and contract-test protected fields; make content replacement explicit |
| Static presets create a second resource/recents system | Adapt stable catalog identities into existing CreativeResource authority |
| Legacy and new shell state contaminate one another | Versioned, namespaced UI keys; Card data only in canonical persistence |
| Weak materials undermine product quality | Hide unapproved styles; ship fewer, demonstrably credible choices |
| Raw Action enums leak into UI | Registry-derived presentation adapter with human labels and schemas |
| Phone becomes a compressed desktop | Purpose-built bottom rail and single-sheet fast-edit flow |
| Expanded panels starve the canvas | Enforce minimum canvas width and one-major-panel arbitration by breakpoint |
| Unsaved work is exposed during rollout changes | Enrollment changes apply on reload; retain dirty guards and recovery journal |
| Scope expands into full Studio migration | Enforce the vertical Button loop and readiness-gate all other destinations |

## 23. Unresolved Product Owner decisions

Implementation should not begin until these are confirmed or explicitly delegated:

1. **Rail readiness behavior:** approve the recommendation that all seven destinations define the durable architecture, while pilot-visible rail entries remain hidden until shell-native and usable. Slice 1 guarantees Add and Layers.
2. **Booking mapping:** approve `book` as the primary Booking kind, with `calendar` retained as a distinct calendar-event intent, or direct a different registry consolidation.
3. **Payment:** approve deferral until a dedicated canonical Payment action and entitlement contract exist. Recommendation: defer.
4. **Replacement policy:** approve visual replacement preserving label, Action, destination, accessible name, identity, and tracking by default. Recommendation: approve.
5. **Initial preset set:** visually approve the five named presets and decide whether Soft Elevation passes the quality gate after proof.
6. **Inspector insertion behavior:** approve automatic opening of Content after placement. Recommendation: approve.
7. **Phone drag:** approve tap-to-place only on phone for Slice 1, with drag-to-place supported on desktop/tablet. Recommendation: approve.

## 24. Exact implementation sequence

No later step begins if an earlier authority or test gate fails.

1. **Freeze evidence.** Record baseline SHA, current test results, legacy-shell screenshots, and Cabinet Noir/publication regression evidence.
2. **Correct rollout authority.** Add the default-off internal feature definition; implement deterministic user/cohort/business/global resolution; add unit tests; verify audited Platform Admin enrollment and rollback.
3. **Define shell contracts.** Add rail registry/readiness states, drawer reducer, shell UI-state schema, breakpoint arbitration, and pure tests. No document mutation yet.
4. **Add the route boundary.** Select new versus legacy workspace server-side while passing identical canonical builder inputs. Prove non-enrolled behavior is byte-for-byte functionally unchanged.
5. **Create shell chrome.** Implement desktop/tablet/phone shells, rail, one drawer host, Inspector host, canvas host, top commands, focus order, and empty/loading/error scaffolding. Do not import legacy shell chrome.
6. **Create the command bridge.** Extend the live editor model only for missing typed operations: insertion placement, protected replacement, label, Action, Appearance, and transform. Route duplicate/delete/undo/redo/save/publish to existing owners. Add contract tests preventing duplicate command execution.
7. **Establish the Button catalog.** Add versioned quality-gated Standard presets, Brand resolver, neutral fallback, search metadata, and canonical preview fixtures. Obtain visual approval before exposing any questionable material.
8. **Deliver discovery and placement.** Implement Add → Buttons → Standard, breadcrumbs, search, click-to-place, desktop/tablet drag-to-place, invalid/cancel behavior, selection, and one-transaction history evidence.
9. **Deliver Recently Used.** Resolve built-in catalog IDs to existing Button-style resources and mark successful use server-side. Prove reload, ordering, authorization filtering, and deduplication.
10. **Deliver selection refinement.** Implement capability-derived toolbar, Content Inspector, direct label editing, Replace, Position, Duplicate, More, focus/keyboard behavior, and mixed-selection policy.
11. **Deliver Action.** Add registry-derived intents and field schemas, normalized destinations, validation, independent icon choice, and explicit `tel:` regression proof. Keep Payment hidden and apply the approved Booking decision.
12. **Deliver Appearance.** Add canonical Quick Appearance previews, Inspector controls, Advanced precision, renderer parity tests, and material quality gating.
13. **Complete responsive outcomes.** Validate panel arbitration, minimum canvas space, touch behavior, phone bottom rail/sheets, fast edit, preview, save, and publish access.
14. **Run lifecycle validation.** Execute unit, integration, existing regression, and new end-to-end suites; test conflict/recovery, save/reload, entitlements, publication, Cabinet Noir `signatureAssembly`, and public rendering.
15. **Produce visual proof.** Capture the complete matrix at the implementation commit SHA and reconcile every preview/canvas/published triplet.
16. **Conduct Product Owner UAT.** Run the human acceptance script with the enrolled cohort. Record findings as explicit Slice 1 issues; fix shared authorities, not screenshots.
17. **Checkpoint.** Commit the completed slice with test and visual-proof references. Keep the feature default off until Product Owner acceptance.
18. **Pilot enablement.** Enable only the approved scoped cohort through audited overrides. Monitor errors, command failures, save/publication failures, and rollback readiness before any broader rollout.

## Implementation authorization gate

Implementation may begin only after the Product Owner approves this plan and resolves or delegates the decisions in section 23. Until then, this file is the sole new deliverable; application code, branches, rollout settings, and data remain unchanged.
