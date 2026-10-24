# Slice 4 — Effortless Professional Design

> **Subsequent Product Owner approval — October 24, 2026:** Bounded Slice4A local implementation was explicitly approved. [Implementation/evidence handoff](SLICE4A_START_AND_REFINE_HANDOFF_2026-10-24.md) records the candidate and remaining gates. The proposal wording below is retained as historical scope; Slice4B and release remain unauthorized.


October 24, 2026 · **Revised proposal: Start and Refine. Planning only. Explicit scope approval required before application code.**

[Readiness assessment and evidence](SLICE4_EFFORTLESS_DESIGN_READINESS_2026-10-24.md) · [Self-authored implementation prompt](SLICE4_DESIGN_DISCOVERY_IMPLEMENTATION_PROMPT_2026-10-24.md) · [Slice 3 desktop acceptance](SLICE3_DESKTOP_FUNCTIONAL_ACCEPTANCE_2026-10-24.md).

Accepted integrated source is `f8de7b70c03c5aadebfc85b31a4509b827762e6f`. This revision supersedes the previous three-look/two-Container proposal and its already-fixed Flow pointer work. Preserve the accepted pointer, Text, page and geometry behavior.

## Smallest coherent outcome

A beginner starts with one attractive, native introduction section, changes the words and CTA, optionally adds an image, refines its Surface and previews the result without learning normalized geometry. An expert retains exact Position, layout, Material and component controls. **One native Designed Container in two intentional looks: Clean Minimal and Dark Cinematic.** No global editor reskin or large catalog.

Two construction milestones within the proposed 4A scope:

1. **Refine what I selected:** content-first Text/Image/Button tasks, target labels, reliable task return and reachable exact Position. Demonstrable on existing native content before any catalog work.
2. **Start with a finished section:** one editable Flow Container recipe in two quality-gated looks, native preview, appearance-only Surface equivalents, atomic insertion and complete customize/save/return evidence.

Neither milestone is authorized by this document. A complete two-Container Experience starting point is proposed as **4B, separately scoped and approved after 4A**. Do not label a section as a complete Experience or silently replace the current page.

## Three distinct operations

| Operation | Allowed mutation | Explicitly preserved |
| --- | --- | --- |
| Surface treatment | Selected root/Container appearance: declared fill, edge, radius, depth/Material fields | Children, text, actions, images, parent identity, internal layout, placement, page extents; root Inset/full-bleed mode |
| Designed Container insertion | New native Container plus heading, body and standard CTA children with authored composition and new IDs | Existing nodes, page identity, existing sibling relationships and content; insertion follows canonical destination/placement rules |
| Experience starting point (deferred) | New independent document with complete native composition through existing creation authority | Source document, publication/access/QR and domain identity rules; never a hidden current-page restyle |

A Designed Container is ordinary editable composition, not a governed Curated System or a Group. Outer placement within its parent and internal Flow layout are independent. It may be inserted into Flow or Layered destinations using existing parent/insertion authorities without converting the destination's mode. Nested governed/locked/incompatible destinations explain why insertion is unavailable and offer a valid parent explicitly; no silent reparenting.

## Interaction architecture

- Existing Add → Containers shows **Designed** and **Blank** choices within the same drawer. A blank-canvas prompt opens that same destination. No additional permanent navigation. Keep existing blank choices and native Add options reachable.
- Display a rendered preview, short purpose and target context. Selection of the finished section inserts once, selects it and brings it into view. Existing intelligent insertion/explicit extension handles crowding; no new positioning solver.
- Direct Text entry continues via accepted canvas controls. Edit Text leads with content and core type settings; Image leads with Replace/Fit/alt; Button leads with Label/Action and familiar appearance. Existing Position remains a sibling contextual action, never buried or duplicated. Preserve exact dimension controls and advanced typography without adding new semantics.
- Root/Container **Surface** leads with two appearance-only choices and existing refine controls. **Placement** edits the frame relative to its parent; **Contents** edits internal Flow/Layered layout. A look never doubles as layout switching.
- Use authored names first; otherwise derive short Text content, Image alt/name and Button label for Outline and breadcrumbs. Keep node kind and parent context visible. No persisted identity/name rewrite. Curated names/locks remain authoritative.
- All task exits restore the exact target and relevant controls. Cancel leaves document/history unchanged. Apply uses canonical history and returns to editable state with Preview/Save/Undo available. If target or source generation changed, invalidate or explicitly retarget; never apply to stale selection.
- At narrow widths reuse the adaptive single-task surface; no stacked drawer/Inspector/modal collision. Returning from media selection restores the Image task and focus. Hover is not required. No new keyboard authority.
- Clarify labels on the touched paths: “Replace image,” “Fit,” “Alt text,” “Label,” “Action,” “Surface,” “Position.” Preserve deeper controls rather than removing capability. Rail-wide restructuring and new font/media browsers remain deferred.

## Native design contract

Both versions contain heading, body and one standard CTA. The default is intentionally complete without external photography, avoiding a new rights/asset dependency. Users can add an Image with existing controls. The CTA initially has no fabricated external action: show the existing unconfigured-action state and make Set action easy; the acceptance workflow configures a real local test destination before Preview. Do not present an inert CTA as functional completion.

Proposed starting values: 24px padding, 16px gap, coordinated zero/explicit child margins, 32px/1.15 heading, 16px/1.5 body, CTA at least 44px high. Use the existing Inter family and supported weights; no additional font family or effect in 4A. Flow children use existing flexible-width/Auto-height behavior. These are recipe defaults, not new universal restrictions or responsive overrides.

Clean Minimal emphasizes open whitespace, neutral light fill and restrained edge. Dark Cinematic emphasizes a strong light heading, darker hierarchy, deliberate contrast and controlled depth/accent. Refine with existing Material/Text/Button properties. Both must be meaningfully different and visually defensible; colors alone do not establish two excellent designs. Qualify concrete values using the real renderer during authorized construction; this is not a certified visual mockup.

Appearance-only variants reuse the same scoped Surface fields but never recolor descendants. On existing light/dark text, show an honest target preview and affected-field explanation. Use existing readability diagnostics where available; otherwise state that content contrast needs checking. Never invent a universal contrast pass or automatically change child text to compensate. Creation may initialize coordinated text colors on its own new children.

## Existing authorities and minimal foundation

| Authority | Use |
| --- | --- |
| `lib/fusion/creative-studio/platform/discovery.ts` | Existing versioned resource identity, readiness, compatibility and preview contract. No second registry/service. |
| `lib/fusion/card/composition-parent-authority.ts`, canonical composer operations and `platform/layered-region.ts` | True parentId/compositionKind, insertion, sizing and page constraints. Legacy pseudo-container `props.containerId` insertion is not a compatible implementation path. |
| `platform/surface-capability.ts`, `material-engine.ts`, `material-surface.ts`, Visual Plane and Material surface layers | Same root/Container preview, application and render truth. No preview-only CSS look. |
| `platform/text-authoring.ts`, existing typography and standard Button authorities | Exact content, Text transactions, supported type/appearance/action state. |
| `platform/studio-selection-target.ts`, existing selection/pointer/keyboard/task state | One target/scope/ownership and return context across all consumers. |
| Builder canonical command/history, validation, persistence and renderer | Validate full candidate then commit once; existing save/reload/Preview path. |
| Shared Media browser, asset provenance and activity | Existing Replace/Add and recent resources; no scattered new localStorage or asset backend. |

The only proposed foundational addition is a **small pure native-composition adapter** beside existing catalog adapters: take resource ref/version, target context and current canonical document; build through existing native operations; validate; return a candidate plus affected identities/fields; commit once through existing commands. It must not own layout, rendering, history or persistence. If current pure insertion helpers already support this, compose them without a new contract. No future AI operation framework is justified.

Risks to verify: legacy pseudo-parent helpers; partial sequential insertion/history; stale targets; accidental appearance scope expansion; nested normalized geometry; duplicate child spacing; default fixed heights; missing assets/font fallback; unconfigured CTA; thumbnail/apply drift; recovery of the wrong document. Repair only a demonstrated shared defect necessary for this scope. A locked-contract conflict or new service/schema requires a separate proposal.

## Journey and objective measurements

Native journey: New Experience → Blank → Add/Containers → choose Designed look → edit heading/body → set CTA action → optionally Add/Replace Image → Surface refine → Preview → Save → leave → reopen the same identity → continue editing. Do not use a source-code-generated screenshot or API-only insertion as the customer journey evidence. Separate read-only document assertions may corroborate the UI.

| Task | Current observation | Proposed acceptance target (unmeasured) |
| --- | --- | --- |
| Open root Surface | 1 header action | Preserve 1 action |
| Reach Container choices | Add then Containers: 2 actions | Preserve 2; select a look in the third action |
| Reach Text/Image content from selected target | 1 Edit action, then geometry precedes content and requires scrolling | 1 contextual action, primary content visible without scrolling past unrelated geometry |
| Reach font search | Edit, scroll, Browse fonts | Same canonical browser, common type controls immediately visible; no new catalog target |
| Reach Replace from selected Image | Edit, scroll, Replace | Direct Replace entry in 1 contextual action; browser return to same image |
| Start a finished section | Not offered in inspected Add path | At most 3 deliberate clicks from closed drawer, excluding New dialog fields |
| Apply Surface look | Current appearance controls; no two-look set | Surface then choose: 2 actions from selected target, with scope visible |
| Beginner useful Preview | Not timed | 3–5 novice formative trials; each completes primary journey without coaching, zero wrong-target/destructive edits, useful Preview within 5 minutes |

Record actual clicks, unrelated panel transitions, scrolls, wrong turns, time, help requests and failures on identical pre/post tasks. Counts above are observed route counts or explicit targets, not measured improvements. A small formative trial is not statistical usability certification. If no participants are available, mark novice criteria unverified; engineering automation cannot substitute.

## Visual and interaction acceptance

- Inspect native output at 320/390/512px and editor at 390px plus desktop. Verify actual innerWidth; failed viewport automation is not evidence. No unintended clipping, horizontal overflow, overlapping controls or detached CTA with long heading and twice normal body copy.
- Deliberate hierarchy, spacing scale 4/8/12/16/24/32, aligned edges within 1 CSS px at 100% except documented optical choices. No compounded gap/margin surprise.
- Proposed product contrast targets: normal text 4.5:1; large text 3:1. Measure actual rendered combinations, especially when users change backgrounds. No automatic accessibility certification. Primary touch actions target 44×44 CSS px separately from small visible manipulation marks.
- Native preview and applied result use the same renderer, fonts and props. Canvas/Preview/reload match borders, corners, material depth, clipping, text and image fit at 75%/100% zoom. No rasterized text/section substitutes. Original reference comparison stays open until the proper reference is evaluated.
- Exercise direct edit, caret, Escape, Delete, arrows 1px/Shift10px where Layered permits, Shift selection, paste, rotate, resize, groups, alignment and history. Fields/IME own keys. No arbitrary Flow offsets.
- Insert into root/nested Flow/Layered; pad/rotate destination; reject locked/Curated targets appropriately. Preserve unrelated children, all parent identities and authored responsive intent. No Scale Contents.
- Appearance apply must leave text/action/asset IDs/geometry/internal layout/page extents unchanged. One insertion Undo removes the whole section; Redo restores its identities. Refinement operations use existing transaction semantics. Do not promise history across reload beyond the established contract.
- Browse/Cancel, stale-target change, media return, Preview return, save failure/retry and reopen must leave a coherent editable state. New → Save → Return must be verified on an unambiguous disposable local draft before claiming completion.
- Physical phone keyboard/caret/touch, actual IME, Safari and AT remain independent gates; report every unexecuted case. Desktop acceptance does not waive them.

## Dependencies, regression and rollback

Prerequisites: explicit PO scope approval; deterministic disposable Blank fixture; available canonical font/assets; baseline dependency classification. No Cabinet Noir assets are needed for the selected no-photo designs, but its existing integrity failure remains visible. Cloning defect and recovery/version ambiguity are separate high-priority issues; if either blocks the chosen journey, stop at that dependency and obtain bounded approval instead of expanding into infrastructure.

Use focused discovery compatibility, Surface field isolation, native parent/hierarchy/placement, Text ownership, history and persistence tests. Run relevant Studio/Card regression suites, typecheck and production build after source changes. Report the known Cabinet Noir failure and lint baseline separately; no skipping or weakening existing checks. Native controls and visual inspection are mandatory alongside tests. Retain accepted fixtures; create a new local hands-on fixture through supported controls.

Keep milestones as reviewable development-branch commits. Roll back an unaccepted candidate through a normal revert or disabling its new discovery entries through existing readiness rules, preserving documents already created as ordinary native nodes. Never rewrite history, reset unrelated WIP or create a permanent parallel legacy editor. No release flag service is needed. Independent review → PO acceptance → separately authorized staging/release remains the sequence.

## Exact expected files and boundaries

Paths are repository-relative and denote proposed changes only. Preserve any unrelated existing hunks, especially discovery WIP.

| Expected path | Responsibility |
| --- | --- |
| `components/fusion/card/reconstitution/card-studio-reconstitution-workspace.tsx` | Content-first contextual routing and clear target return; empty-canvas shortcut to existing drawer |
| `components/fusion/card/reconstitution/studio-composition-inspector.tsx` | Text/Image/Button task ordering and labels, precision as sibling task |
| `components/fusion/card/reconstitution/studio-card-surface-inspector.tsx` | Root appearance-only look entry |
| `components/fusion/card/reconstitution/studio-surface-materials.tsx` | Canonical look preview/apply/refine for root and Container |
| `components/fusion/card/reconstitution/studio-discovery-drawer.tsx` | Designed/Blank choices and meaningful derived Outline labels where owned here |
| `lib/fusion/creative-studio/reconstitution/studio-catalog-adapters.ts` | Native resource registration and compatibility mapping |
| `lib/fusion/creative-studio/reconstitution/native-starting-compositions.ts` (new, proposed) | Small typed recipe consumer/pure adapter; use existing authority helpers |
| `components/card/tap-card-builder.tsx` | One validated command integration with existing history/selection/dirty handling |
| `lib/fusion/creative-studio/__tests__/native-starting-compositions.test.ts` (new, proposed) | Native identity/hierarchy, insertion atomicity and scope invariants |
| `lib/fusion/creative-studio/__tests__/surface-authoring-truth.test.ts` | Appearance-field isolation and parity regressions |
| `lib/fusion/creative-studio/__tests__/studio-selection-target.test.ts` | Target/context validity and derived labeling tests if shared helper changes |
| `docs/product-reconstitution/creative-studio-platform/SLICE4_*` and a new proof directory | Evidence, changed-file manifest, fixture instructions, independent review handoff |

Consume `platform/discovery.ts`, `surface-capability.ts`, `studio-selection-target.ts`, parent/geometry/Text authorities without changes by default. Modify an authority only if a demonstrated blocker requires a minimal shared correction and report it explicitly. No planned edits to the geometry engine, pointer engine, publishing/API/schema, recovery engine or asset backend. If actual Outline label ownership differs, identify the existing owner in the implementation handoff; do not build another hierarchy representation.

## Deliberate deferrals and extension path

Defer complete Experience starters to 4B; Editorial/glass/metal/soft families until qualified; personal saved templates, synchronized resources, global restyling, advanced typography/font-browser overhaul, new crop modes, responsive overrides, wrapping, Scale Contents, cross-parent matching and business domains.

Future manual/guided/tApIt consumers should select the same versioned resources, inspect compatible operations/affected fields, preview a validated candidate and commit through the same commands. Newly created nodes remain manually editable. This slice establishes no AI prompts, execution service, entitlement system, membership, collectible, commerce or Campaign infrastructure. Artist/operator reuse follows the same document/asset ownership and requires the separately tracked cloning defect to be verified.

Approval sought is **local construction of Start and Refine 4A only**. No staging, deployment, main merge, migration, publication, Access, credentials, permanent QR or production changes. Production hashes remain BLOCKED. All release gates in the acceptance record remain open.
