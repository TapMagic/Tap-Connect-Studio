# Full-screen Edit Mode reference findings

Reference set: ten attached Canva screenshots supplied with the full-screen Edit Mode brief. They are used only as spatial and interaction references. TapConnect retains its own dark visual system, terminology, icons, data model, and product workflows.

## Screenshot observations

1. **Overall editor** — A single compact document bar, a narrow persistent tool rail, a large neutral pasteboard, and a centered publication boundary leave most of the viewport available for composition. A short selected-text toolbar floats above the canvas. Page thumbnails, zoom, and secondary utilities stay at the edges rather than competing with the work.
2. **Font browsing** — Font is summoned from the contextual toolbar into one substantial left drawer. Search, visual category chips, starred/document/recent groupings, loaded-state selection, and previews replace a technical font-family input.
3. **Brand and document colors** — Text color opens the same drawer position and groups current design colors, Brand palette resources, and custom color entry. Advanced controls replace the drawer rather than stacking beside it.
4. **Image-derived and solid colors** — The color drawer can extend to image-derived colors, neutral/default grids, and further choices while the canvas remains visible and selectable. Large swatches communicate outcomes faster than field labels.
5. **Effects** — Effects is a focused visual gallery. Tiles preview the treatment, and advanced choices appear only after the Owner asks for Effects; they do not occupy a permanent inspector.
6. **Animate** — Animate uses preview tiles plus a small number of meaningful follow-up controls such as phase, speed, and writing unit. It is deliberately summoned and dismissible.
7. **Position and Layers** — Position opens a focused drawer with arrange/layer commands, alignment, numeric geometry, rotation, and ratio locking. Common commands are close to the canvas; detailed geometry is still available without permanent chrome.
8. **Selected-object More menu** — A compact toolbar carries frequent actions and a concise More menu carries copy, style copy, paste, duplicate, delete, align, reusable-component, lock, link, timing, and accessibility actions. This keeps the main toolbar short.
9. **Gradient color browsing** — Solid and gradient visual choices share the focused color drawer. The treatment is communicated by swatches rather than raw CSS values.
10. **Repeated color state / continuity** — Returning to the color browser preserves the selected object and canvas context. Opening and closing advanced controls does not alter document geometry or consume permanent canvas width.

## Interaction and spatial synthesis

- **Canvas and pasteboard:** the publication boundary is visually distinct inside a much larger neutral working surface. The reference leaves room to stage and select objects outside the boundary and supports zoomed-out composition.
- **Persistent rail:** the rail is narrow, icon-led, and stable. It changes one retained library drawer; it does not create multiple simultaneous panels.
- **Contextual drawer:** one substantial drawer is wide enough for search, visual previews, categories, and advanced settings. Opening Font, Color, Effects, Animate, Position, Brand, or Assets replaces the prior drawer.
- **Selected-object toolbar:** common controls appear only for the selected object type. Advanced families are summoned from short buttons; destructive and uncommon actions move to More.
- **Direct manipulation:** selection remains on-canvas with compact handles. Resizing and positioning are primarily direct; numeric controls are a secondary precise path.
- **Text manipulation:** side handles imply width/reflow, corner handles imply proportional scaling, and visible content should drive bounds—especially for curved text.
- **Zoom and off-canvas work:** zoom controls are peripheral and the pasteboard is larger than the document. View state is not document geometry.
- **Progressive disclosure:** rich font, color, effect, animation, and position controls are available without displaying a permanent multi-accordion inspector.

## TapConnect comparison before refactor

The current TapConnect editor has the correct canonical Card/Section/Element engine and real libraries, but its operational header, retained left drawer, center canvas, and permanently large right inspector divide the viewport into three competing columns. Focus still exposes authoring and application chrome, while Preview draft is visually secondary. The canvas boundary currently acts too much like a manipulation boundary, the standard font experience exposes too few visual choices, raw font-family input is too prominent, and text effects/bounds do not consistently match the visible glyphs.

TapConnect will adopt the reference patterns of a dedicated full-screen creative route, compact document bar, narrow rail, one focused drawer, large pasteboard, contextual toolbar, optional advanced inspector, direct manipulation, and peripheral zoom controls. It will deliberately differ through TapConnect branding, dark surfaces, Card publication semantics, draft/public isolation, autosave/recovery state, operational Card separation, TapConnect Brand/Asset resources, and Campaign-ready document contracts. No Canva artwork, branding, proprietary icons, copy, or interface styling is reproduced.

## Implemented comparison and inspected evidence

The executed acceptance capture is in `tmp/card-full-screen-edit-mode/`. Principal views were visually inspected after the final browser run.

- `02-full-screen-edit-mode.png` adopts the compact document bar, narrow tool rail, large pasteboard, centered Card, peripheral view controls, and default-closed inspector. TapConnect deliberately keeps lifecycle/publication state immediately beneath the document tabs because a Card is an operational draft/public object, not a generic graphics file.
- `04-selected-text-toolbar.png` and the five `05-*-drawer.png` captures adopt selection-only formatting and one focused Font, Color, Effects, Animate, or Position surface. TapConnect keeps a dark, high-contrast shell and uses its licensed local font, Brand, motion, and material catalogs.
- `13-text-corner-scale.png`, `14-text-side-reflow.png`, `15-neon-transparent-glyph.png`, and `17-curved-text-radius-and-bounds.png` adopt direct text manipulation and visual treatment previews. TapConnect deliberately exposes exact radius/arc and technical controls only through the optional inspector so the common toolbar stays compact.
- `16-off-card-object-pasteboard.png` and `07-clean-preview-draft.png` adopt the reference distinction between a permissive pasteboard and clipped publication boundary. Preview resets view zoom to Fit, renders the canonical draft, and removes authoring chrome rather than reusing Focus Mode.
- `08-clone-renamed-tabs.png` and `09-cross-tab-copy-paste.png` add a TapConnect-specific persisted document contract: Main Card and independently revised Variations retain names, identities, and copied styling without conflating publication.
- `18-save-failure-blocked-exit.png`, `19-recovery-prompt.png`, and `20-recovered-state.png` deliberately extend beyond the reference with acknowledged autosave, blocked unsafe exit, and a versioned recovery journal that will not silently overwrite a newer server revision.
- `12-phone-390px.png` and `21-tablet-768px.png` retain the same canonical editor in responsive layouts. Controls wrap rather than disappearing, and Preview remains the prominent primary action.

The red “1 Issue” badge visible in captures is the repository's existing local development feedback widget; it is not part of the Card document, does not appear in the canonical public renderer, and was not copied from the reference.
