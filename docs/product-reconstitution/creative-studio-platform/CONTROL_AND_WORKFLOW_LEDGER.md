# Creative Studio control and workflow ledger

Baseline revision: `acfdfa34273d57ba213db6bd36e2c1037223cdf6`

Inventory method: static JSX/control-path audit plus browser evidence. Dynamic preset collections are counted as one control family and their visible instances are listed in the notes. Inventory: **118 reachable control families across 18 surfaces**. The table preserves initial state for forensic traceability; final dispositions are recorded below.

Legend: W = WORKING, M = MISWIRED, WT = WRONG TARGET, D = DUPLICATE, L = LEGACY DEPENDENCY, P = PARTIAL, X = DEAD/FAKE, H = OWNER-HIDDEN, MM = MOBILE-MISSING, A = ACCESSIBILITY-DEFECT, R = RETIRE, RC = RECONNECT, RB = REBUILD. Initial classification occurrences (compound classifications count in each applicable state): **W 40, P 40, M 5, WT 2, A 2, D 1, L 1, H 1, MM 1, R 1**.

## Control ledger

| # | Surface / visible control family | Route and component | Requirement / mutation / canonical field | Initial state | Final disposition target |
| ---: | --- | --- | --- | --- | --- |
| 1 | Document name | `/dashboard/card/edit` · `CardAuthoringWorkspace` | rename active document; draft document name; Undo/autosave/reload/tab | W | Keep, verify clone/reload |
| 2 | Saved state | same | read-only save state | D | Keep one quiet top-bar state; retire covering success banner |
| 3 | Undo / Redo | same → builder history | labelled config snapshots | W | Keep; keyboard parity |
| 4 | Preview draft | same | mode-only transition, no save/public mutation | W | Keep; five-cycle proof |
| 5 | Save now | same → `save()` | saved draft/revision | W | Keep |
| 6 | Clone | same → `cloneDocument()` | independent Card variation | W | Keep; identity proof |
| 7 | Resize / Adapt | same → output overlay | related variation metadata | W/P | Keep Card prohibition; prove source unchanged |
| 8 | Publish / Update | same → existing publication | saved draft only | W | Preserve authority; do not invoke live in test |
| 9 | Editor preferences | same | user-local view preferences | W | Keep; dialog keyboard proof |
| 10 | Exit Edit Mode | same | guarded save then route | W/P | Verify focus/blocked state |
| 11 | Overflow: History | same | existing adaptive operational drawer | P | Keep only if functional |
| 12 | Motion preview/restart/reduced motion | same | view-only/motion props | W | Keep; selection persistence proof |
| 13 | Document tabs select/close | same | save-before-switch and active document | W | Keep; close/reopen proof |
| 14 | Tab context Rename/Duplicate/Close | same | active document operations | P/A | Add Escape/outside close and focus return |
| 15 | Rail tool buttons (14) | `CardCreativeToolRail` | one active drawer | W | Keep; all-tools browser traversal |
| 16 | Drawer close/search | same | view state/query only | W | Keep; canvas width recovery |
| 17 | Templates start points (4) | `CreativeDrawer` | blank/brand/template/clone | P | Confirm destructive start intent; no silent overwrite |
| 18 | Section templates | `CardComposerLibrary` | append Section | W | All presets additive |
| 19 | Element library rows | `CreativeDrawer(elements)` | insert element | M/WT | Explicit parent and collision-aware insertion |
| 20 | Badge wording presets | Elements drawer | insert Badge | M | Dedicated visual Badge library; additive proof |
| 21 | Icon library | Elements drawer | insert Icon | P | Visual grid, transform/action proof |
| 22 | Button presets (5) | Buttons drawer | insert canonical Button | M | Additive count/identity/layer proof for every preset |
| 23 | Text presets (5) | Text drawer | insert text variants | P | Shared Text parity and selection proof |
| 24 | Brand primary/alternate/sponsor logo | Brand drawer | insert canonical image node with Brand reference | P | direct select/ratio/replace/action proof |
| 25 | Brand color swatches | Brand drawer | patches Card accent color | WT | Label target as Card root; do not imply selected-object styling |
| 26 | Brand font | Brand drawer | insert Brand-linked Text | W/P | Explicit insertion destination |
| 27 | Asset MediaPicker | Assets drawer | durable Asset/provider selection and image insertion | P | reconnect selected media to new Image node |
| 28 | Product thumbnail | Assets drawer | insert thumbnail | P | media metadata/ratio proof |
| 29 | Root background solid/gradient/image/pattern/texture/transparent | Backgrounds drawer | root composition background | W/P | target label, undo isolation |
| 30 | Project document tiles | Projects drawer | switch open document | W/P | folders remain unavailable, labelled honestly |
| 31 | Reusable save/place | Reusable drawer | reusable composition config/instances | W/P | unique identities, Layers and reload proof |
| 32 | Layers root/Section/node selection | Layers drawer | selection only | P | rebuild canonical navigation/actions/hierarchy |
| 33 | AI prompt/Preview/Apply/Cancel/Refine/Undo | AI drawer | SelectionRef proposal/history | P | stale-target visible error and Undo proof |
| 34 | Quick Select/Text/Shape/QR | Tools drawer | canonical insertion/selection | P | explicit parent, hide QR operation claims |
| 35 | Charts/Captions/background removal disabled | Tools drawer | none | H/P | remain disabled/hidden until execution exists |
| 36 | Help | Help drawer | guidance only | W | update after kernel changes |
| 37 | Section name/Layout/Width/Height/Fit/Background/Position | contextual toolbar | Section patch/history | P | docked target-labelled capability panel |
| 38 | Section Duplicate/Delete | contextual toolbar | Section array | W | preserve child semantics; confirmation |
| 39 | Section Surface modes and fields | contextual focused panel | Section Surface fields | M | shared Surface engine and gutter docking |
| 40 | Section position/order | contextual focused panel | Section order | W/P | keyboard and target proof |
| 41 | Text Content/Font/Size/B/I/U/Color | contextual toolbar | node props | W/P | extend to Badge and Button child |
| 42 | Effects/Animate/Position | contextual toolbar | node props/transform | P/A | exact object label and selection boundary |
| 43 | Button Surface/Content/Action/Motion/Styles/Position | contextual toolbar | Button parent props and content composition | P | nested child selection; shared engines |
| 44 | Duplicate/Delete/More | contextual toolbar | node collection/Advanced | W/P | kernel APIs and docked Advanced |
| 45 | Advanced Transform/accessibility/tracking | `CardAdvancedSettingsOverlay` | SelectionRef node/Section patch | M | gutter dock; Escape/focus trap; object switch closes |
| 46 | Canvas object click/Shift-click | `CreativeCompositionCanvas` | selected node ids | W/P | hit-order/locked/hidden/nested proof |
| 47 | Marquee | same | selected node ids | W/P | visible master proof |
| 48 | Tab cycle / Select beneath | same | z-order selection | W/P | overlap matrix proof |
| 49 | Eight resize handles / rotation | same | node transform | W/P | ratio-lock by capability |
| 50 | Drag move / keyboard nudge | same | node x/y | W | boundary and mobile proof |
| 51 | Context Copy/Paste/Style/Duplicate | same | module clipboard/node collection | P | keyboard/cross-tab/incompatible filtering proof |
| 52 | Context Group/Ungroup | same | `groupId` | P | Layers hierarchy/group boundary |
| 53 | Context z-order | same | zIndex | W | Layers order parity |
| 54 | Context Hide/Lock/Unlock | same | visible/locked | P | Layers recovery path required |
| 55 | Context Move to Card/Section | same → builder | parent collections | W/P | geometry and identity preservation proof |
| 56 | Context Wrap in Section | same → builder | Section plus moved nodes | W/P | multi-object and unwrap proof |
| 57 | Context Delete | same | node collection | W | canonical delete API |
| 58 | Section reorder grip/menu | `TapConnectCard` | Section order | W | keep |
| 59 | Section top/bottom resize | same | Section height/coordinate plane | W/P | prove children stable/new space usable |
| 60 | Canvas root/Section drop | same | move/insert explicit target | P | destination highlight and drop point |
| 61 | Inline Text edit | canvas | node text | W | shared Text normalization |
| 62 | Inline Button label edit | canvas | Button content adapter | P | select actual child |
| 63 | Empty Image placeholder | canvas | none | L/R | remove Inspector language; choose-media state |
| 64 | Map empty/configured rendering | canvas | map props/action | P | provider-free visible setup and persistence |
| 65 | Preview viewport controls | preview toolbar | view state only | W | desktop/tablet/phone proof |
| 66 | Preview exit/live device | preview toolbar | view state/token | W/P | five cycles; no route/remount |
| 67 | Resize profile search/selection/Copy & Adapt | overlay | versioned output profile/clone | W | keep; accessibility/focus proof |
| 68 | Mobile creative tool rail (8) | workspace | creative tool/drawer state | P/MM | replace squeezed columns with bottom sheet |
| 69 | Recovery prompt actions | workspace | recovery journal | W | focus/alert proof |
| 70 | Exit confirmation actions | workspace | save/exit state | W/P | focus trap/return focus |

Rows 15, 18–23, 29, 41–43, 49, and 68 contain repeated visible instances, producing the stated 118 reachable families/instances for audit accounting.

## Workflow ledger

Initial workflows audited: **32**.

| Workflow | Initial state | Required final proof |
| --- | --- | --- |
| Blank / variation / rename / clone / close-reopen | W/P | visible UI, saved identity |
| Add root / add to Section | M | explicit destination and unique geometry |
| Move root↔Section / Section A→B | W/P | identity, style, geometry, order |
| Wrap / remove Section keep Elements | W/P | no reconstruction |
| Group / Ungroup / Shift-select / marquee | P | visible boundary and Layers hierarchy |
| Copy / paste / style copy-paste / cross-tab | P | independent identity and filtering |
| Reusable save/place | P | independent instance and reload |
| Nested Button child select/edit | X | rebuild |
| Media replace / Image/Logo/Icon/Map insert | P/L | visual media selection and transform |
| Preview/exit five cycles | W | repeat with master Card |
| Save/reload/Exit/return | W/P | quiet autosave and state retention |
| Undo/Redo | W | one mutation per step |
| Theme / Resize-Adapt | W | source document unchanged |
| AI proposal/Apply/Undo | P | scope and protected fields |

## Final disposition and proof map

| Ledger rows | Final disposition | Automated proof |
| --- | --- | --- |
| 15–16, 68 | RECONNECTED | controlled desktop/mobile rail state; phone acceptance proves no horizontal overflow and a bottom-sheet focused panel |
| 19–24, 27–28 | REBUILT / RECONNECTED | explicit-target `insertObject`; master acceptance proves three Badges, three Buttons, thumbnail, Image media route, and Brand logo remain independently selectable |
| 32, 46, 53–57 | REBUILT | authoritative hierarchy with nested Button children and node/Section select, visibility, lock, rename, order, duplicate, and delete actions |
| 37–45 | REBUILT | target-specific contextual controls; Badge shares Text/Surface; Section and Advanced panels dock in the right gutter or phone bottom sheet |
| 41, 43, 62 | RECONNECTED | Button child label/icon identities appear in Layers and child-path selection enters content editing; Badge wording uses shared Text |
| 49–50 | RECONNECTED | independently selectable objects retain transform handles and collision-aware initial geometry |
| 60 | RECONNECTED | drops and library insertion supply an explicit root or Section target |
| 63 | RETIRED | no ordinary insertion renders retired Inspector language; Image opens shared Assets/Media |
| 2 | RETIRED DUPLICATE | covering insertion/save message removed; quiet top-bar state remains |
| 4, 65–66 | VERIFIED | Preview is clean of authoring rail, contextual controls, and selection UI |

The master scenario is `e2e/card-direct-manipulation-forensic.spec.ts`. Rows outside the authorized Card direct-manipulation boundary retain their honest partial/hidden state; no Campaign, QR-operation, messaging, payment, scheduling, Wallet, social-publication, or Autopilot execution was enabled.
