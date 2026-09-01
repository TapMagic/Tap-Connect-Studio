# TapConnect Studio Reconstitution Interaction Specification

**Status:** Binding pre-implementation refinement
**Date:** 2026-08-19
**Scope:** Card editor interaction architecture, discovery behavior, visual catalog readiness, and the first implementation slice
**Evidence:** Repository forensic audits, Cabinet Noir UAT, Product Steward doctrine, Product Owner-provided Canva editor screenshot brief, and direct visual inspection of all eleven supplied screenshots

This document refines the TapConnect Studio First-Principles Reconstitution Specification. It does not authorize interface implementation. It defines the product behavior and acceptance constraints that implementation planning must satisfy.

The referenced screenshots are functional interaction evidence only. TapConnect must not copy Canva branding, proprietary artwork, visual identity, or code. The transferable evidence is the maturity of the interaction logic: stable navigation, contextual discovery, visual breadth, coherent deep browse, canvas dominance, and progressive disclosure. Where a screenshot shows behavior that conflicts with an explicit Product Owner direction—such as a permanent generic AI rail destination—the Product Owner direction governs.

## Direct visual reconciliation

All eleven screenshots were inspected directly. They confirm the brief and add the following evidence:

| Images | Visible evidence | TapConnect decision |
| --- | --- | --- |
| 1 | Search-led, preview-dense Template browsing beside a still-dominant canvas | Whole-Card and Section Templates require visual-first discovery, not text lists. |
| 2 | Elements combines intent input, search/generation choice, Recommended, See all, and category browsing | Discovery may combine search, generation, recommendation, and taxonomy in one job context; provider names remain hidden. |
| 3–4 | Text combines immediate insertion, Brand context, default hierarchy, dynamic content, inspirational treatments, Recently Used, and font combinations | Text must serve quick insertion and inspiration in one coherent drawer. |
| 5 | Brand uses a wider domain surface with its own navigation and content pane; a failed paste produces visible feedback | Broad domains may use an expanded drawer with local subnavigation; unsupported actions require immediate, comprehensible error feedback. |
| 6 | AI occupies the same left-side work surface while the canvas remains available | Large tApIt work may temporarily own the drawer, but TapConnect should be result/proposal-first and must not copy a verbose generic chat transcript or create permanent AI navigation. |
| 7 | Uploads combines ingestion actions, search, media-type tabs, folders, and a visual grid | Asset ingestion and browsing belong in one coherent domain surface while retaining canonical media types and folder/Collection semantics. |
| 8 | A compact tool palette opens beside the rail without consuming full drawer width | Low-depth tools may use a compact palette; not every rail choice warrants a full drawer. |
| 9 | Projects combines scope selection, content-type tabs, mixed design browsing, See all, and folder creation | Project/document discovery is distinct from asset browsing and needs explicit scope, type, and folder/Collection navigation. |
| 10 | Backgrounds leads with search, Brand colors, Recently Used, category rows, representative previews, horizontal overflow, and See all | Background discovery must use real visual categories, compact breadth, and trustworthy preview-to-output parity. |
| 11 | Generative media keeps prompt, media type, style, aspect, prior results, and generation action together | Contextual generation needs task-specific controls and results inside the active discovery domain, not a provider- or model-centric detour. |

The screenshots also show independent scrolling of the rail and drawer, an obvious collapse control, and persistent document/canvas controls outside the discovery drawer. These are functional relationships to preserve; their exact styling and geometry are not prescriptions.

## 1. Governing product model

The target is **simple yet powerful** and **organized abundance**. Simplicity is achieved through a small, repeated interaction vocabulary—not by deleting serious creative capability.

The primary grammar is:

**Choose → Browse → Place → Select → Refine**

The same grammar should govern Backgrounds, Icons, Assets, Buttons, Section Templates, Text styles, Materials, Brand resources, generated content, and reusable designs wherever the underlying job fits.

The interface should teach possibility through discovery. It should communicate **“Here is what you can make with this”**, not merely enumerate properties on an object.

## 2. Two navigation systems, not one

TapConnect has two distinct navigation contexts:

1. **Main Studio/application navigation** owns platform work such as Experiences, Tap Points, Audience, Insights, Assets, Settings, and other non-editor destinations.
2. **Editor tool rail** owns creative authoring jobs inside the Card editor.

They must share product language and visual coherence, but they must not collapse into one universal rail. A Host should always understand whether they are navigating the TapConnect product or choosing an authoring job within the current Card.

## 3. Editor rail decision

The previously proposed six-item editor rail is a hypothesis, not a locked target. Rail count must emerge from durable, predictable authoring jobs.

The rail must:

- avoid returning to the current 18-destination fragmentation;
- avoid vague overloaded destinations created solely to hit an arbitrary small count;
- keep obvious high-frequency jobs directly findable;
- use labels a first-time Host can predict;
- remain stable while the drawer changes content;
- avoid permanent destinations for individual governed families or providers;
- avoid a permanent tApIt destination when contextual assistance is sufficient.
- preserve the active destination and high-frequency jobs when the rail itself must scroll;
- keep document/page navigation and canvas operations outside the authoring-job taxonomy.

Seven or eight clear destinations are preferable to six ambiguous ones. The acceptance question is: **Would a first-time Host correctly guess where to go?**

Rail taxonomy is not implementation-ready until tested against the required jobs: whole-Card design, adding components and sections, Text, assets/media, Brand, Backgrounds or visual surfaces, Layers/structure, and any other job that cannot be placed predictably without overloading a label.

## 4. Drawer as a primary creative surface

The drawer is not a settings panel. It is the principal discovery and deep-authoring surface beside a canvas that remains visually dominant.

Depending on the selected job, the same physical drawer may provide:

- contextual search;
- Recently Used;
- Recommended;
- Brand-aware choices;
- category preview rows;
- compact horizontal category sliders;
- meaningful visual galleries;
- View all / See all;
- filters and sub-navigation;
- click-to-place and drag-to-place;
- contextual tApIt assistance;
- target-aware refinement controls;
- compact controls when a full browse surface is unnecessary.

The shell remains stable while the drawer changes personality. A broad job may transition within the drawer from home → category → gallery → object editing without spawning modal stacks, a second permanent panel, or an unrelated navigation universe.

The drawer supports three intentional surface geometries:

1. **Standard drawer** for most discovery and refinement jobs.
2. **Expanded domain drawer** for broad jobs such as Brand or other domains that genuinely need persistent local subnavigation plus a content pane.
3. **Compact palette** for shallow, immediately actionable tool sets that do not justify a full drawer.

Geometry is selected by job depth, not by implementation convenience. Expansion must preserve useful canvas visibility; compact palettes must not become unlabelled icon mysteries. Back, Close, and collapse behavior must be obvious and consistent across geometries.

## 5. Drawer navigation and state contract

Deep browse must preserve user context. Drawer state should canonically model at least:

- authoring job;
- home/category/gallery/edit mode;
- breadcrumb path;
- search query;
- filters;
- selected category;
- scroll position where practical;
- previous library state;
- current canonical selection and selection generation;
- contextual tApIt task state when present.
- active domain subnavigation item, content-type tab, and source/scope selector where present;
- active drawer geometry.

Back returns one meaningful level. Close collapses the drawer without corrupting browse state. Brief canvas interaction must not gratuitously reset the drawer to its top. Selection changes may retarget compatible refinement controls; incompatible changes return to the nearest coherent browse state.

The rail and drawer scroll independently. Opening a deeper result, switching briefly to the canvas, or receiving a recoverable error must not destroy the user's query, category, filters, tab, scope, or practical return position.

## 6. Shared discovery grammar

Discovery surfaces should reuse a common component and state vocabulary:

- search at the point of discovery;
- Recommended and Recently Used near the top when relevant;
- Brand-aware resources;
- compact category rows with representative previews;
- View all for depth;
- predictable filters;
- trustworthy preview-to-output parity;
- click-to-place and drag-to-place;
- a consistent inserted/selected/refine transition;
- preserved return state.

This is a shared interaction authority, not permission to force semantically different records into one persistence model. `MediaAsset`, `CreativeResource`, document nodes, governed family definitions, and other canonical types retain their domain contracts behind the common discovery experience.

## 7. Template hierarchy

“Template” is not one vague record or one undifferentiated drawer.

- **Card Templates** are whole-Card starting points.
- **Section Templates** are reusable layout concepts such as Hero/Identity, Contact, Offer, Social, Gallery, Coupon/Loyalty, CTA, Footer, and Blank/Custom.
- **Component Presets** include Button styles, Badges, containers, text treatments, and useful component arrangements.
- **Governed Family Components** include Arc Ember, Cabinet Noir, and future certified Signature families.

These levels may share the discovery grammar while retaining distinct canonical types, insertion rules, compatibility contracts, and entitlement behavior.

## 8. Section discovery

Section insertion must not be an undifferentiated component dump. The intended path is:

**Add → Sections → visual category → representative layout gallery → place → select → refine**

Candidate categories include Hero & Identity, Contact, Action Groups, Offers, Coupon/Loyalty, Social, Gallery, CTA, Footer, and Blank/Custom. Labels remain subject to job-based validation.

Compact horizontal category rails are appropriate when they expose breadth without permanent clutter. Selecting a category opens a meaningful visual gallery in the same drawer.

Where feasible, Section previews use the Host's actual business name, logo, Brand colors, typography, and approved imagery. Generic fallback content must be polished.

## 9. Button and governed-family discovery

Button discovery is a first-class creative job, not an Appearance Easter egg and not a requirement to insert a generic Button before choosing intent.

The intended path is:

**Add → Buttons → Recently Used / family / intent → preview → place → select → refine**

Candidate family groupings include Standard, Brand Styles, Arc Ember, Cabinet Noir, Saved, and future families. Candidate intent groupings include Call, Website, Email, Directions, Review, Book, and Pay where relevant.

Choosing Cabinet Noir or another governed family transitions the same drawer into legitimate, family-compatible choices. It does not add a permanent rail item or modal stack. Certified restrictions must be expressed through available choices and clear explanations, not a graveyard of irrelevant disabled controls.

Strict recipe-governed assembly is reserved initially for **Curated Systems**: multipart families whose canonical parts, recipe, attachment geometry, permitted inputs, and certified variants are supplied by Product Owner/Design. Cabinet Noir is the first consumer. Hosts edit its declared inputs while the Curated recipe owns structural rails, bridges, spines, caps, repeat furniture, snap/reflow, and compiled output.

This boundary does not convert all structured content into fixed geometry. Standard Buttons, generic Coupons, Hero sections, Maps, Offer blocks, banners, ordinary sections, images, text, and basic containers retain direct surface editing according to their capability contracts. A future multipart Curated component joins the assembly authority only after its curated asset specification exists; Studio must not invent that recipe in advance.

## 10. Text discovery

Text serves both insertion and inspiration.

- **Quick Add:** Heading, Subheading, Body, Label.
- **Brand:** Brand heading, subheading, body, and approved treatments.
- **Recently Used.**
- **Styles/Inspiration:** useful headline, promotion, testimonial, quote, price/offer, hours, CTA, and informational treatments.
- **Font combinations.**
- **Dynamic content:** governed Business Name, Hours, Current Offer, contact/business fields, and future compatible data.
- **tApIt:** improve wording, generate alternatives, match Brand voice, shorten to fit, and suggest hierarchy.

Text styles must be real compositions or treatments with visible hierarchy and intended use—not minor size variations presented as depth.

## 11. Background and visual-surface discovery

Backgrounds must be actual useful backgrounds. Candidate categories include Recently Used, Brand, Colors, Gradients, Nature, Landscapes, City, Linen/Fabric, Wood, Paper, Stone/Concrete, Metal, Glass, Geometric, Florals, Stars/Decorative, Patterns, Photography, Uploaded, and Generated.

The taxonomy is not locked; the quality promise is. Linen must look like linen, Wood like wood, Florals must contain credible floral choices, and Stars must be an intentional decorative system. The current weak texture/pattern catalog is not an authority for future quality.

Visual choices should lead with previews rather than abstract configuration. Compatible Materials such as Champagne Gold, Blackened Steel, Warm Copper, and Brushed Silver should be visually comparable and use the canonical Material renderer.

## 12. Preview-to-output contract

**I click this → I get this** is a binding trust contract.

Where practical, gallery preview and applied output use the same canonical renderer or canonical asset. Preview fixtures may use Brand-aware or polished sample content, but they may not misrepresent geometry, Material, typography, responsive behavior, family language, or production rendering quality.

No category is production-ready until it passes the Visual Catalog Quality Gate in `PRODUCT_STEWARD_CONSTITUTION.md`.

## 13. Recently Used

Recently Used is a functional accelerator, not decoration. It should appear near the top in repeated-choice contexts such as Buttons and families, Section Templates, Backgrounds, Icons, Text treatments, Materials, Assets, and derivatives.

An item becomes recent when it is actually placed or applied—not merely viewed. Activity must use the canonical server-backed direction and may not create new scattered browser-local recents stores.

## 13A. Assets, uploads, and Projects

The screenshots reinforce three related but distinct jobs:

- **Discover assets:** search and browse usable media/resources for the current Card.
- **Ingest assets:** upload, capture, import, or create approved media and then make it available through canonical asset authorities.
- **Browse Projects/documents:** find Cards and other governed documents or reusable designs by scope, type, and folder/Collection.

They may share search, tabs, grids, folders, and preview components, but they must not collapse into one ambiguous record type or one vague “Assets” bucket.

Asset ingestion should keep the immediate action, media-type tabs, folders/Collections, progress, validation, rights/provenance capture, and resulting visual grid in one coherent surface. Project browsing should expose an explicit scope selector and meaningful type filters, preserve folder/Collection context, and clearly distinguish opening a document from placing an asset.

## 14. Provider-neutral discovery

Primary UX expresses intent: Find a logo, photo, icon, linen background, or generated treatment. It does not expose Logo.dev, Pexels, Iconify, or model names as the product's information architecture.

The Discovery Broker owns provider selection and fallback. Provider identity remains available for provenance, rights, administration, diagnostics, and expert inspection where relevant.

## 15. Contextual tApIt

Retain the approved contextual three-ball architecture. tApIt appears only where it can meaningfully assist the current job and uses the current drawer context.

Examples:

- Backgrounds: find or generate a warm cream linen background.
- Buttons: find or prepare an appropriate Icon.
- Brand: find and prepare a logo.
- Text: improve wording or match Brand voice.
- Sections: recommend layouts based on the Host's business needs.

Results return naturally to the current discovery surface. Larger tasks may temporarily own the drawer or open a larger governed workspace. There is no AI-only parallel asset, history, approval, or interaction universe. Accepted outputs enter canonical authorities with provenance, rights, approval, accessibility, entitlement, compatibility, and Brand enforcement.

tApIt should be proposal/result-first. Show concise intent, progress, useful results, approval choices, and recoverable errors. Do not fill the drawer with repetitive narration of internal attempts. A failed or unsupported operation must state what failed, preserve the user's context, and offer the next legitimate action.

## 16. Responsive and accessibility requirements

Desktop keeps the stable rail, substantial drawer, and dominant canvas. Tablet and phone may transform the drawer into the established responsive sheet geometry, but must retain the same job vocabulary, browse context, and preview trust.

Catalog acceptance includes useful phone rendering. Touch targets, scroll containment, focus order, keyboard operation where applicable, screen-reader naming, contrast, reduced-motion behavior, and non-color state cues are part of feature completeness.

## 17. Revised implementation planning

### Phase 0 — authority and readiness

Before interface implementation:

1. Reconcile the proposed rail jobs against the current command and capability registries.
2. Map every current rail item to a future job, contextual command, administrative destination, compatibility route, or retirement decision.
3. Define the shared drawer navigation state and restoration contract.
4. Define the common discovery result interface without collapsing canonical persistence types.
5. Inventory which preview catalogs are production-worthy, which require replacement, and which must remain hidden.
6. Establish first-time findability tests for rail labels and required jobs.
7. Establish canonical activity events for Recently Used on actual place/apply actions.
8. Classify each job as standard drawer, expanded domain drawer, compact palette, contextual toolbar, or application-level navigation.
9. Reconcile Asset discovery, ingestion, Brand resources, Projects/documents, and folders/Collections without erasing their canonical distinctions.
10. Define visible loading, empty, unsupported, permission, provider, and recoverable-error states for every discovery surface in the first migration wave.

Phase 0 completion is documentation and contract readiness only. It must not be reported as a completed Studio feature.

### Phase 1 — interaction prototype and validation

Use a feature-flagged, non-production prototype to validate:

- separation of main Studio navigation and editor rail;
- candidate rail labels and count based on job findability, not minimalism;
- one drawer changing among discovery, deep browse, and refinement;
- home/category/gallery/back/close behavior;
- search and browse-state preservation;
- click-to-place and drag-to-place;
- standard, expanded, and compact surface geometries;
- domain subnavigation, tabs, scope selectors, and independent scroll behavior;
- visible loading, empty, and recoverable-error behavior;
- canvas dominance at desktop, tablet, and phone widths.

Prototype content may be fixture-backed only behind the explicit prototype boundary. It is not production catalog completion.

### Phase 2 — exact first production implementation slice

The first production slice remains intentionally narrow but must prove the complete interaction grammar through **Standard Button discovery**:

1. Enter the Card editor without changing main Studio navigation.
2. Choose the validated authoring destination that owns Buttons.
3. Browse a drawer home containing a small production-worthy Standard Button set and Recently Used when data exists.
4. Enter a Button category or View all and return without losing search, category, or browse position.
5. Place a Button by click and by drag using the canonical insertion path.
6. Immediately select the inserted Button and transition the same drawer into target-aware refinement.
7. Refine label, Icon, Appearance, geometry, and Action through existing canonical authorities.
8. Use a real action destination and verify Preview behavior.
9. Undo/Redo, autosave, reload, reselect, edit again, and preserve canonical rendering.
10. Record Recently Used only after successful place/apply.
11. Prove preview/applied/public-renderer parity on desktop and phone.

This slice must reuse the existing composition, selection, history, Action, renderer, draft, and publication authorities. It must not yet migrate Cabinet Noir, Arc Ember, all Assets, all Backgrounds, or tApIt; remove the old shell; expose unfinished catalogs; or create parallel stores.

The slice is not accepted merely because the shell and Button controls work. Its small visible catalog must be production-worthy, previews must match applied output, the full Choose → Browse → Place → Select → Refine loop must feel coherent, and a paying-customer demo must be credible.

### Later slices

After the first slice proves the shared grammar, migrate domains one at a time through the same authority:

1. governed Button families and entitlement-aware family discovery;
2. Text insertion/inspiration and dynamic content;
3. Sections and Brand-aware layout previews;
4. Backgrounds and canonical Material/asset galleries;
5. unified Assets, Icons, Brand resources, and provider-neutral search;
6. contextual tApIt brokerage and accepted-output flows;
7. remaining reusable resources, advanced refinements, and compatibility retirement.

Each slice requires domain-specific product-quality acceptance. Shared infrastructure does not make every catalog complete.

## 18. Acceptance evidence

Implementation acceptance must combine:

- architectural and contract tests;
- visible interaction proof of the full user job;
- preview/applied/public parity;
- desktop and physical or representative phone review;
- accessibility review;
- catalog-quality assessment;
- first-time findability and back-navigation validation;
- drawer-geometry, independent-scroll, domain-tab, scope, and state-restoration validation;
- loading, empty, unsupported, permission, and recoverable-error validation;
- explicit reporting of architecture-complete versus catalog-complete status.

Automated structural success cannot override a visibly weak result.

## 19. Explicit non-decisions

The screenshot review does not lock:

- an exact editor rail count;
- final rail labels;
- final category taxonomies;
- visual styling copied from Canva;
- a single persistence type for all discoverable resources;
- tApIt as a permanent navigation destination;
- production exposure of catalogs that have not passed quality gates.

These remain governed product decisions to validate during Phase 0 and Phase 1.

## 20. Final standard

TapConnect Studio must feel simple enough that a first-time Host can act instinctively, powerful enough that meaningful capability keeps emerging through exploration, and polished enough to invite continued use.

**Lots of capability. Very few interaction patterns. Organized abundance.**
