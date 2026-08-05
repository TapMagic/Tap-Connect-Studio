# Creative Studio platform candidate — implementation and acceptance

Date: 2026-08-03  
Starting revision: `afdcaa0b89e8c1b085f7cf19990f65cc7e33afd9`

## Implemented platform spine

- Ordinary Card Edit Mode no longer mounts `CardComposerInspector` or reserves its right column. The retired Inspector implementation has been deleted; ordinary selection is served by contextual capabilities and Layers.
- `SelectionRef` names document, page, revision, object kind, object, parent path, and selection generation. Canonical mutations reject stale, moved, missing, or wrong-kind targets; there is no first-Section or last-selection fallback.
- A versioned capability registry describes Content, Text, Surface, Media, Transform, Layout, Motion, Action, States, Responsive, Visibility, Accessibility, Tracking, AI context, data binding, and reusable-composition support.
- The narrow creative rail now exposes Templates, Build, Elements, Buttons, Text, Brand, Assets, Backgrounds, Projects, Reusable, Layers, AI Assist, Tools, and Help through one left drawer.
- More → Advanced is a temporary, target-labelled overlay using the current `SelectionRef` and canonical mutation path. Opening Advanced or Resize/Adapt clears a prior focused contextual drawer.
- Buttons are canonical nested compositions with real Text and Icon children. Legacy `label` and `icon` fields remain renderer adapters during migration, not a second authoring authority.
- The visual Button library creates Round Call, Directions Glass, Glossy Claim, Website Outline, and Blank Button presets. Surface, content, action, motion, style, transform, duplicate, and delete commands stay on the selected-object path.
- AI Assist is explicitly scoped to the current canonical selection, previews a proposal, preserves protected functional and operational fields by default, applies through history, supports Undo, and never publishes or sends.
- Resize/Adapt uses a versioned exact-dimension output-profile registry. Tap Card current resize is prohibited; Copy & Adapt creates an independent, editable, related Card variation with source and registry metadata.
- System, Light, and Dark chrome; four pasteboard themes; density; canvas assistance; and accessibility preferences persist per browser user independently from document colors.
- Autosave, recovery, tabs, Preview, clone, draft publication isolation, and the existing publication authority remain in the original `TapCardBuilder` spine.

## Existing authorities reused

The implementation reuses the existing composition renderer and mutation history, Brand inheritance, `MediaPicker`/media services, Pexels and Logo.dev provider adapters, background-removal adapter, Card draft/publication APIs, and document tabs. It does not add a canvas, Asset store, Brand store, or publication path.

## Automated acceptance evidence

| Area | Evidence | Result |
| --- | --- | --- |
| Legacy excision / reclaimed canvas | Browser asserts no `card-contextual-inspector`; closes drawer and compares canvas bounding width | Pass |
| Selection safety / rapid switching | `platform-contracts.test.ts` stale generation, parent mismatch, and root/Section/Badge/Button switch matrix | Pass |
| Capability registry | Text, Button, Badge, Map, Surface, Action, Media, Motion capability assertions | Pass |
| Nested Button content | Nested Text/Icon creation, legacy migration, and content update tests; visible placement asserts two children | Pass |
| AI safety | Protected Action/destination/tracking tests plus visible scoped proposal/apply | Pass |
| Output profiles | Registry/version/dimensions and Tap Card prohibition unit proof; visible Story Copy & Adapt and source-tab preservation | Pass |
| Appearance | Local preference isolation unit tests; visible Light/checkerboard persistence after reload | Pass |
| Preview stability | Five visible Preview/Edit cycles | Pass |
| Responsive/accessibility | Desktop, 820px tablet, 390px phone, keyboard focus, and Axe serious/critical scan | Pass |
| Repository suite | Isolated PostgreSQL: 959 passed, 0 failed, 0 cancelled | Pass |
| TypeScript / changed-file ESLint | `tsc --noEmit`; scoped ESLint | Pass |
| Prisma | format, validate, generate, deploy/status, and migrate diff | Pass; no drift |
| Production build | Next.js 16.2.10 `next build --webpack` | Pass |
| Hygiene | credential-pattern scan and `git diff --check` | Pass |

Browser construction is performed through visible controls. The test does not seed its final document through an API. Its one related Story variation is created by clicking Copy & Adapt.

## Visual evidence and comparison

Evidence lives in `tmp/creative-studio-platform/` and is intentionally not committed. The adopted reference patterns are the narrow permanent rail, one left drawer, dominant pasteboard, compact selected-object toolbar, visual Button discovery, scoped AI beside the document, and an exact-dimension Resize/Adapt task. TapConnect deliberately retains governed Card dimensions, functional bindings, operational publication boundaries, and its own product language and artwork.

The inspected captures prove dark and light chrome, no right Inspector, drawer space recovery, visual Buttons, nested Button content, target-labelled Advanced, scoped AI, output profiles, a real Story variation, clean Preview, tablet, and phone. Remaining visual variance is a denser operational top bar and a horizontally pannable mobile canvas; human judgment is still required for calmness, touch comfort, and physical-device behavior.

## Human acceptance matrix

These are candidate states, not claims of completed human verification.

| Brief group | Candidate status | Human work still required |
| --- | --- | --- |
| A. Editor shell (1–9) | Automated candidate | Visually judge System/Light/Dark, pasteboard separation, Fit behavior, and drawer calmness. |
| B. Shared Text (10–18) | Partial candidate | Root Text and nested Button Text share normalized node properties, but direct child selection and Badge wording through the identical focused Text drawer need completion. |
| C. Shared Surface (19–26) | Partial candidate | Capability registry is shared; identical visual Surface drawer coverage across root/Section/Button/Badge still needs full UI parity proof. |
| D. Buttons (27–38) | Automated candidate with variance | Visual presets, nested content, Action preservation, Motion, styles, and Preview exist; independent drag selection of child label/icon requires human/product follow-up. |
| E. Any object as Action (39–43) | Contract candidate | Registry and existing action engine allow compatible nodes; the exact car Icon visible journey is not captured in this candidate. |
| F. Section coordinate plane (44–48) | Existing automated coverage | Human manipulation pass still required. |
| G. Assets/providers (49–56) | Existing service and repository-test coverage | The new rail reuses media authority, but visible Pexels/Logo.dev placement and deliberate Add to Brand screenshots remain required. |
| H. Media editing (57–63) | Existing capability coverage | Full visible crop/contain/flip/rotate/removal journey is not recaptured here. |
| I. AI (64–71) | Automated selected-Button candidate | Selected-image fixture variation and visual Undo proof remain required. |
| J. Pages/Resize (72–80) | Partial candidate | Story related variation and Tap Card prohibition are proved. Generic multi-page flyer creation, duplicate/reorder, and Letter adaptation are not yet implemented in the Card editor. |
| K. Projects (81–86) | Partial candidate | Searchable current document/variations view exists. Durable folder/Collection move and reopen are not yet implemented here. |
| L. Preview/Exit (87–95) | Partial automated candidate | Five cycles and autosave/reload pass; guarded Exit confirmation still needs the final human pass. |

## Intentionally unavailable or honestly disabled

- Charts remain disabled until a canonical data-binding contract and renderer are approved.
- Captions remain disabled until timed media/transcription is available.
- Background removal is gated by selected-image and provider readiness; no unconfigured success is claimed.
- Tap Card current-document resize to print/social output is prohibited.
- Multi-page scopes are described as available only to compatible future document types and are not presented as working in Tap Card.
- Live AI execution, publishing, customer messaging, Campaign deployment, social publication, payment processing, and Tap Point assignment are outside this editor candidate.

## Remaining genuine defects

1. Generic creative documents need a persisted page/artboard model with duplicate/reorder and page-range adaptation.
2. Projects need durable folders/Collections and move/reopen UI, distinct from Asset Collections.
3. Nested Button Text/Icon nodes need direct child selection and shared focused Text toolbar parity, not only Button content-mode controls.
4. Shared Surface UI needs one visibly identical panel across Card, Section, Button, and Badge, with complete target-isolation browser proof.
5. The full 33-view evidence inventory in the brief is not complete; the committed browser proof captures the highest-risk new flows and must not be represented as the entire human acceptance set.
6. `CardComposerInspector` and `SelectionPanelStack` have been deleted. Legacy selection entry points alias to Layers during compatibility reads and no ordinary command mounts an Inspector.

No deployment, production-data access, live publication/send, payment, Tap Point assignment, schema push, migration rewrite, force-push, merge, or destructive database cleanup occurred.

TAPCONNECT CREATIVE STUDIO PLATFORM CANDIDATE
— HUMAN VERIFICATION REQUIRED
