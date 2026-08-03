# Creative editor authoring-truth stabilization

Required starting SHA: `ebae54c625e64a5ac2b6801aec75cadca04b9434`

Contextual-authoring addendum starting SHA: `52d663d8ed92594bfeb7afe2c83ddfcdf558ffb5`

This audit treats the earlier Canva references as interaction evidence (dominant pasteboard, narrow rail, one focused drawer, compact contextual controls, direct manipulation, zoom/pan, and off-canvas work area) and the attached TapConnect captures as defect evidence. TapConnect retains its own visual language and immutable draft/publication lifecycle.

## Canonical path

The canonical document is the active `TapConnectCardConfig` owned by `TapCardBuilder`. A selection resolves through `resolveComposerSelectedObject`; Element edits update the owning root/Section `CreativeCompositionBlock`; Section edits update `sections[]`; Card edits update root fields. All enabled UI surfaces must call the builder's mutation bridge, enter the labeled undo history, checkpoint recovery, debounce draft persistence, and render through `CreativeCompositionCanvas` (Edit and Preview) or the matching public composition renderer.

The selected-object contract is one tuple: active document ID, container ID (`null` for Card root), selected Section ID, and selected Element IDs. Canvas, toolbar, drawer, Layers, keyboard, transform handles, delete, and persistence must resolve that tuple rather than keeping local object copies.

## Defect and repair map

| Surface / classification | Visible symptom and screenshot evidence | Current selection → mutation → persistence → renderer path | Intended path and repair | Regression / browser evidence |
| --- | --- | --- | --- | --- |
| Canvas inline text — **MISWIRED** | `Chad Test` becomes `tseT dahC`/`dahC`; curved content inherits the damaged value. | selected node → `contentEditable.onInput` → parent config replacement on every key → autosave → composition renderer | Keep an uncontrolled DOM draft while editing; commit natural-order text on blur/debounce; never reverse data; preserve node identity/caret. | Natural-order Latin, punctuation, multiline, emoji; caret survives save; reload/clone/copy/Preview parity. |
| Curved text — **PARTIAL** | Natural order is unreliable and bounds are much larger than glyph arc. | same node text plus SVG `textPath`; generic rectangular transform | Same logical content as ordinary text; deterministic forward paths; tighter default geometry; radius/arc/rotation controls through the canonical node mutation. | `Friday Night`, curve controls, rotation, tight bounds, reload/Preview. |
| Contextual toolbar — **CANONICAL** | Ordinary Section and Button editing previously depended on the large Inspector. | selected object → focused contextual drawer → canonical Section/node patch → history/autosave → shared renderer | The selected object owns the compact toolbar and focused drawer. Section Background/Size/Layout/Position and Button Surface/Contents/Action/Motion/Styles/Position are all available without leaving the canvas. | Add Location Section, resize directly, apply a Section gradient, compose a Button, preview motion, reload, and verify the same IDs and rendered state. |
| Advanced settings — **OPTIONAL / CANONICAL** | The former Inspector competed with the contextual editor for ordinary tasks. | explicit `More` → Advanced settings → same canonical patch functions | Closed by default and never automatic. It is an optional expert surface reached only through `More → Advanced settings`; ordinary Section and Button completion does not require it. | Full addendum path completes while Advanced settings remains absent. |
| Glyph effects — **MISWIRED** | Metallic/gradient effects paint the entire rectangular text box. | preset writes `gradientFill`; renderer applies CSS background clip to wrapper while glyph is a child | Normalize one glyph-effect preset patch, clear incompatible glyph fields, apply gradient/clip to glyph span only; wrapper remains transparent. | Neon → Gold → Chrome → None; transparent wrapper in Edit/Preview/reload. |
| Text-box appearance — **PARTIAL** | Glyph color/effect and box background are conflated. | loose `props` keys | Explicit `boxFill`, `boxGradient`, border/radius/padding/shadow fields under More/Advanced only. | Glyph changes never mutate box fields; box changes are explicit. |
| Autosave — **PARTIAL** | Captures show bright duplicated status rows and perceived flicker/remount risk. | local history → dirty → recovery journal → 1400 ms PUT → acknowledgement; publication actions alone call `router.refresh()` | Keep ordinary save route-stable; quiet fixed-size top-bar status only; server acknowledgement updates revision metadata without replacing config identity. | Persistent shell/pasteboard/Card/node/drawer/tab IDs before/after typing, move, resize, effect, background. |
| Transform handles — **PARTIAL** | Rotation is hard to discover; logo ratio protection is unclear; generic corner behavior is shared. | canvas draft nodes → one settled block commit | Visible rotation handle and numeric reset/snap; text corner scales font, side reflows; media corner locks ratio by default with explicit unlock/reset. | Corner/side/rotate tests and save/clone/Preview parity. |
| Wrapped Section — **CANONICAL** | Section formerly became practical only through the large Inspector and resized unnaturally. | selected Section → contextual mutation → `patchSection`; child composition is embedded | Contextual size/layout/background/position controls and direct top/bottom resize update the Section while preserving child nodes. | Add Location Section; direct bottom resize; selected-only gradient; reload persistence. |
| Button composition — **CANONICAL** | A Button previously behaved like one opaque action row and exposed too little creative control without the Inspector. | selected Button → contextual surface/content/action/motion/style patch → canonical composition → autosave/shared renderer | Model a Button as surface + editable content + action + optional motion. Style copy/presets exclude destination, tracking, accessibility, and content identity. | Surface fill/gradient/image/pattern/texture, shapes and corners, border/shadow/glow/gloss, inline label/icon, separate action, Bounce/Pulse preview, reduced-motion fallback, reload. |
| Background library — **MISWIRED / PARTIAL** | Selection can report success while the visible surface remains plain. | some controls write root legacy fields; composition renderer reads `rootComposition.background`; Section legacy fields use another renderer path | One canonical background object per Card/Section composition; adapters update both only at legacy boundary; visual state reflects the rendered field. | Library resource → document value → computed Edit/Preview/reload/clone style. |
| Color drawer — **PARTIAL** | Oversized bubbles consume the drawer and do not distinguish glyph/surface/box roles. | contextual hard-coded colors or broad Appearance controls | Compact swatches grouped by current/recent/document/Brand/solid/gradient; role label; exact picker under Advanced. | One-click selection, retained drawer/scroll, selected state, correct property. |
| Font drawer — **CANONICAL / PARTIAL UX** | 70+ previewable fonts exist but are presented as an ungrouped grid. | contextual font catalog → node `fontFamily` → font loader → renderer | Retain canonical path; add compact category/source grouping and selected/loading state. | Selection survives autosave/reload/clone/copy/Preview. |
| Preview — **MISWIRED** | Phone Card is pressed left and clipped with a huge blank region; Tablet is better. | Preview mode reuses workspace canvas plus inherited shell sizing/offsets | Preview owns a centered viewport stage, resets view-only transform, removes drawer/outline columns, constrains Card width without document mutation. | Bounding boxes at 390/768/desktop; no horizontal overflow; center tolerance. |
| Clone/name/tabs — **PARTIAL** | Clone works; rename is unreliable; several tabs truncate to indistinguishable labels. | clone API creates ID; input patches active config; save updates open-doc metadata | Flush before switch; stable active-document identity; rename on Enter/blur; active tab gets more width/full tooltip/accessible name and immediate optimistic label. | Clone, rename, source unchanged, switch, reload, close/reopen. |
| Exit — **PARTIAL** | Desktop shows unexplained `X`. | icon invokes save-gated exit dialog | Labeled `Exit Edit Mode` on desktop; force save/checkpoint/ack; block on failure with Retry/Keep editing. | Accessible label plus success/failure browser flows. |
| Layers / keyboard / More — **CANONICAL / PARTIAL** | Most commands target canonical nodes, but selection equivalence is not explicitly asserted. | selected IDs → composition operations → block replacement | Centralize resolution/mutation metadata and assert node ID across all surfaces. | Selection-authority and keyboard focus tests. |

## Control classification summary

- **CANONICAL:** builder history, draft save API, publication API, root/Section composition renderer, composition operations, recovery journal.
- **RECONNECT:** contextual toolbar, Advanced Inspector, Layers, Background and Brand drawers, clone rename, Section contextual actions.
- **MISWIRED:** per-keystroke controlled `contentEditable`, wrapper-level gradient clipping, Preview stage sizing, legacy background labels that do not target rendered composition fields.
- **DUPLICATE / RETIRE:** repeated success banners and permanent publication/name rows inside the builder when the full-screen top bar already owns them; Focus-as-preview aliases.
- **PARTIAL:** curve geometry, transform policies, compact Color/Font organization, document-tab distinction.

## Acceptance evidence ledger

Browser evidence is recorded under `tmp/card-authoring-truth-stabilization/`, `tmp/card-full-screen-edit-mode/`, and `tmp/card-creative-reconciliation/`. Each capture was produced from visible UI construction. Automated checks inspect API/database state only after visible actions. The in-app browser had no available session at audit start, so the authenticated repository Playwright/Chromium harness was the execution fallback; this is an environmental limitation, not evidence of a pass.

## Implemented authority and renderer reconciliation

- `TapCardBuilder` now exposes one `patchCompositionNode` bridge. It resolves the selected node in the Card root or owning Section, preserves document/node identity, pushes labeled history, marks the draft dirty, checkpoints recovery, and enters the existing debounced draft save.
- Contextual controls and Advanced Inspector both call that bridge for property edits. Whole-block operations still replace the one canonical owning composition through the existing root/Section mutation functions.
- Inline text owns a temporary DOM editing buffer only while editing. React does not replace the editable subtree on every keystroke. The buffer settles into `patchCompositionNode`, while blur flushes and Escape restores the edit-start value.
- Edit and Preview share `CreativeCompositionCanvas`; Preview changes only view state and removes Edit chrome. Draft publication remains a separate explicit action.
- Glyph presets use replacement semantics through `applyGlyphEffect`. Incompatible glyph fields are cleared while explicit box fields remain untouched. Gradient clipping and text stroke/shadow live on the glyph span; the wrapper is transparent unless a box property is deliberately set.
- Image primitives default to aspect lock. Corners preserve media ratio; unlocking permits intentional side stretch. Text corners scale glyphs, sides reflow the box, and explicit `stretch_glyphs` enables independent glyph X/Y scale.
- Wrapping moves the existing canonical node into a free-layout Section without rewriting its coordinates or dimensions. Section height uses Section state and does not mutate child geometry; remove-keep-elements returns the same node to the Card root.
- Card root backgrounds now write the composition background consumed by the renderer for solid, gradient, pattern/texture, and image choices. The image choice uses the same governed media picker plus a visible Brand-image shortcut.

## Contextual-authoring addendum

The governing interaction law is now: contextual editing owns ordinary work; Advanced settings is optional. Selecting a Section or Button never opens a competing dock. The toolbar opens one focused drawer at a time, and `More → Advanced settings` is the only route to the expert surface.

A Button is persisted and rendered as four separable concerns: its surface, editable internal content, functional action, and optional motion. Surface/style operations do not overwrite the label, icon, destination, accessibility label, or tracking metadata. Motion preview is view-only, supports restart, and exposes an explicit reduced-motion fallback and simulator.

## Executed acceptance matrix

| Area | Automated visible proof | Outcome |
| --- | --- | --- |
| Natural text / autosave | Latin text, punctuation, multiline, emoji, continued typing after the save window; route, editor, pasteboard, Card, and selected node IDs compared before/after | Pass |
| Curved text | Visible Curved Text placement, contextual Content change to `Friday Night`, SVG logical order | Pass |
| Effects / box separation | Neon → Gold → Chrome → None; wrapper computed background remains `none`; glyph background changes; unit replacement invariant | Pass |
| Text transform | Corner increases font size; side changes box without changing font size; explicit stretch controls available in Advanced | Pass |
| Image transform | Default ratio-locked corner resize, unlocked side stretch, visible rotation handle, numeric rotate/reset | Pass |
| Section wrap | Visible Brand logo → Wrap blank → direct Section selection → height resize → unchanged child style geometry → remove Section, keep Element | Pass |
| Contextual Section authoring | Visible Location Section placement without Advanced settings, direct bottom-edge resize, selected-only gradient, and reload persistence | Pass |
| Contextual Button composition | Visible Button placement without Advanced settings; surface, corners, border, shadow, glow, gloss, internal label/icon, separate action, Bounce/Pulse preview, reduced-motion fallback, and reload persistence | Pass |
| Backgrounds | Solid, gradient, pattern, and Brand image render immediately; image survives save/reload; Preview uses the same renderer | Pass |
| Clone / tabs / exit | Two visible clones, independent rename, cross-tab copy/paste, distinguishable accessible document controls, force-save exit confirmation, return to Operations | Pass |
| Preview | Phone 390, Tablet 768, Desktop 1280: centered within 3px, no horizontal overflow or clipping, no Edit chrome | Pass |
| Recovery / responsive / accessibility | Save failure blocks exit and retains recovery journal; 390px and tablet editor checks; serious/critical axe gate | Pass |

Human verification remains required for subjective feel: caret placement at arbitrary click positions, visual smoothness under prolonged editing, fine-grained curve bounds, and the complete 113-step Owner walkthrough. Automated evidence is not represented as human acceptance.

## Verification record

- Authoring-truth Playwright: 3 passed, including the 25-step contextual Section/Button addendum path.
- Full-screen Edit Mode: 4 passed, including 390px, tablet, recovery/save-failure, exit, and serious/critical axe gates.
- Creative reconciliation Playwright: 1 passed, including serious/critical axe gate.
- Focused model/store tests: 15 passed.
- Full repository suite on isolated PostgreSQL: 950 passed, 0 failed, 0 cancelled.
- TypeScript and changed-file ESLint: passed.
- Prisma format, validate, and generate: passed.
- Isolated database: 22 migrations, no pending migrations, status current, no schema drift.
- Next.js 16.2.10 production Turbopack build: passed; 89 static pages generated and dynamic route collection completed.
- Credential-pattern scan of the patch: no matches.
- `git diff --check`: passed.

## Remaining genuine variances

- The local acceptance Card is intentionally stress-filled from prior creative tests, so proof screenshots demonstrate interaction truth and geometry rather than a polished marketing composition.
- Font browsing is compact and canonical but does not yet reproduce every Canva grouping/filter nuance.
- Curved text retains rectangular transform handles around the SVG primitive; its defaults are tighter, but an exact glyph-hull selection outline is not implemented.
- Native VoiceOver/NVDA and physical-device touch/keyboard behavior are outside the automated Chromium evidence and remain human verification items.
