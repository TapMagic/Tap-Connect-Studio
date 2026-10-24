# Slice 4A — Start and Refine: implementation handoff

**October 24, 2026 · Local candidate for independent review and Product Owner hands-on acceptance. Not a release approval.**

Rich approved the bounded scope and prompt at `8f038514d1fc4823304a11601c72d5791a6e0636`. Accepted Slice 3 source remains `f8de7b70c03c5aadebfc85b31a4509b827762e6f`. This candidate implements content-first editing, one native introduction Container in two looks, and appearance-only Surface choices. Slice 4B remains unauthorized.

## Source and isolation

Repository: `TapMagic/Tap-Connect-Studio`, checkout `/Users/rcs/Development/tap-connect-studio`, branch `codex/studio-reconstitution-slice-1`, origin `https://github.com/TapMagic/Tap-Connect-Studio.git`. Starting HEAD and independently read GitHub branch tip both equaled `8f038514d1fc4823304a11601c72d5791a6e0636`. No preexisting staged files. The handoff commit containing this document is the source checkpoint; its parent is that planning commit. A subsequent verification record supplies the exact immutable source SHA and remote blob verification.

The working checkout contains unrelated Library/Map/Video changes and other WIP. All 37 original tracked/untracked WIP file fingerprints were checked and preserved. Only the files listed below and Slice 4A evidence/documentation belong to this handoff. No branch switch, reset, history rewrite, main merge or deployment.

A clean intended-source export at `/tmp/studio-slice4-intended-source` was assembled from `git archive` of the starting HEAD plus precisely the 14 intended source/test files. All 14 were byte-compared to the checkout. It excludes unrelated Library/Map/Video WIP. It uses the installed dependency tree; a new package installation was not tested. Existing Cabinet Noir original assets were deliberately not copied in to conceal the known reproducibility failure.

All write-capable verification used explicit PostgreSQL at `127.0.0.1:5433/tapconnect_fusion_dev`. The repository's default database configuration is remote and was not used. Media verification used existing `CREATIVE_PROVIDER_MODE=fixture`, which writes to local disk. No production credentials, environment files, auth data, publication, Access, QR or production document changes are included.

## What changed and why

- **Content first:** Text opens content, Typeface and typography before advanced styling. Text Role is a disclosure. Image opens asset replacement, fit and meaning first. Button opens Label, with Action/Appearance/Position alongside. Exact geometry remains immediately available in the sibling Position task. These rearrange existing controls and transactions.
- **Target clarity:** authored names remain authoritative; generic names gain a derived content/alt/label excerpt. No node rename or identity mutation. Image gets a direct Replace action using the existing shared media browser. It captures the target and rejects a changed selection/props rather than applying a stale choice.
- **Native starting composition:** Add → Container → Designed offers Clean Minimal and Dark Cinematic. The empty canvas reaches the same catalog in two actions. A thin pure adapter composes existing native parent/insertion/placement, Text, Button and Material helpers; one existing history commit inserts a Flow Container with heading, body and CTA. Parent layout remains independent of internal Flow. Discovery resource/version/readiness/compatibility and existing activity reporting are reused. Invalid/locked destinations fail; overlap uses the existing crowding diagnostic.
- **Visual design:** Clean Minimal uses warm paper, dark green type, left alignment, 24px padding/16px gap, restrained 1px border/12px corners and a broad green rounded CTA. Dark Cinematic uses ink, light text, centered hierarchy, 28px padding/20px gap, 24px corners, depth and a narrower gold pill CTA. Both use native Inter text, independent editable children and shared Material paint. No new assets or flattened designs are required.
- **Surface only:** root treatments change background color; Container treatments change fill, edge, corners and depth. Child text/assets/actions/layout/placement/page extent are preserved. The control explains the affected scope and asks the author to check contrast; it does not silently recolor content.
- **Demonstrated adjacent renderer defect:** a standard CTA configured to an Experience Page saved its canonical destination but rendered disabled because the native Button branch considered only external `href`. The shared composition renderer now exposes the existing `data-internal-page-id` contract and keyboard-focusable link for runtime/Preview, while edit mode suppresses navigation. It uses the existing Experience click-routing authority, not a new action engine. Tests exercise both looks. The local fixture targets Home; navigation to a different Page was not demonstrated.
- **Demonstrated narrow focus defect:** at 320px, Shift+Tab from a CTA focused an off-screen header control and scrolled the entire hidden-overflow workspace horizontally (canvas x = −190.5px). The shared header now owns horizontal overflow (`min-w-0 max-w-full overflow-x-auto`). This is a bounded containment correction, not a redesigned navigation system. Final native narrow retest remains OPEN after the browser debugging connection failed. See failed-evidence screenshot 23.

Canonical document, Text transactions, geometry, parent authority, selection, Material rendering, history, persistence, validation and publishing remain the authorities. Future tApIt/guided creation can consume the same pure candidate and commands. No AI or business-domain infrastructure was introduced.

## Verification results

| Check | Result |
| --- | --- |
| Focused new tests, isolated intended source | **16/16 PASS** — native hierarchy, fresh identities, serialization, appearance isolation, root/nested Flow/Layered with padding/rotation, invalid/locked destination rejection, canonical Button label/appearance agreement, runtime/edit routing markup |
| Studio/Card regressions, working checkout | **703/703 PASS**; includes unrelated WIP, not the reproducible-source certification |
| Studio/Card regressions, isolated intended source | **700 PASS / 1 FAIL of 701**; the existing Cabinet Noir original-asset byte comparison requires an untracked `tmp/Cabinet Noir v1/.../CN-001_identity-topper-brand-crest.png`. No tests weakened or excluded |
| TypeScript, isolated intended source | **PASS**, `npx tsc --noEmit --incremental false` |
| Production build, final isolated intended source | **PASS**, `npm run build -- --webpack`, explicit local DB, isolated output; no deployment |
| Lint on intended changed modules | **NOT CLEAN**: same baseline 1 error and 14 warnings. Error is existing synchronous effect `finishPaste(pasteReview)`; diagnostic text differs only in source path/line. No new rule violations; removed now-unused label helper |
| Diff whitespace and source-overlay comparison | **PASS** |
| WIP fingerprint preservation | **37/37 unchanged** |

Commands and output are retained in the proof directory. The initial ad-hoc SSR probe could not load CSS in Node; it was replaced by a repository test using the existing CSS-module stub pattern. Initial Turbopack dev output produced invalid CSS; verification used webpack. Several UI locators required correction after inspecting actual control roles and the clean baseline's different Add labels. None of these failed attempts is counted as a successful interaction.

## Native interaction evidence

Both looks were inserted with native controls and independently inspected. Tests used real UI actions, not document mutation scripts. Read-only DOM measurements and a local database SELECT corroborated the saved output.

1. Fresh Blank creation produced a new identity, empty canvas and Saved status with no recovery prompt. The isolated source repeated this independently.
2. Text Edit exposed `Edit Text content` immediately, with no geometry scrolling. Entered exact line breaks and customized the heading. Button Edit exposed Label; Action configured each CTA to the actual local Home Page.
3. Selected a Container through Outline and inserted a Designed child into it. Native breadcrumb confirmed the intended parent. One Undo reduced the document from 12 to 8 native nodes; Redo restored all 12 exact identities. The nested probe was then undone to keep the fixture simple.
4. Applied an appearance-only treatment to the nested Container; Fill/corners/depth changed through Surface controls, while native children and widths remained. Undo restored the original treatment. The focused invariant test checks content/action/asset/layout/geometry properties explicitly. An early immediate DOM style sample did not observe the paint layer and is not claimed as pixel-isolation proof.
5. Imported two deterministic fixture assets through the existing Pexels fixture browser into local disk storage. Image Edit showed replacement/fit/alt first. Direct Replace opened the same browser. Cancel preserved the source; replacement preserved node identity; Undo/Redo restored the respective assets and alt labels.
6. Exact Image Position width 80% rendered 292.796875px in a 366px parent; center alignment applied. Move earlier changed Flow position 3→2; Undo restored order. ArrowLeft in alt text left object geometry unchanged. This is field-ownership evidence, not an OS IME or physical touch test.
7. Preview showed the same native content and configured CTAs. Saved/returned/reopened the working-tree fixture at revision18 with nine native nodes and image intact. Then repeated Blank→both looks→customized heading→Action→Preview→Saved→Return→Reopen on isolated source, revision6, without a recovery prompt. The final return/reopen used native Chrome accessibility controls after DOM debugging disconnected.
8. Real editor viewports 1200, 512, 390 and 320 were measured. At390, the bottom Inspector fit the viewport and Close measured44×44. No native child horizontal overflow was measured. Viewport width is **not output width**: root introduction frames were366px desktop,332px at512 viewport,308px at390 and238px at320. Exact standalone output320/390/512 remains unverified. The 320 focus-scroll failure prevents a blanket narrow-width pass.

The full earlier Slice1–3 pointer/rotation/group/paste matrix is covered by retained automated regressions but was **not completely repeated manually for these new compositions**. Native nested Layered dragging, pointer-vs-Inspector resize under rotation, zoom75/100, long/double-copy stress, incompatible Curated destination interaction, and stale media retarget cancellation remain explicit hands-on checks. They are not inferred from passing pure tests.

### Measured task paths, not novice claims

- Blank to Designed section: **2 clicks** (shortcut → look).
- Closed Add to Designed section: **3 clicks** (Add → Container → look).
- Selected Text to content: **1 Edit click**, zero geometry scrolling.
- Selected Image to replacement browser: **1 Replace click**.
- Selected Container to treatment: **2 clicks** (Surface → treatment).
- Text/Image content to exact geometry: **1 Position click**.

These counts were observed in agent-operated tasks. No 3–5 participant novice trial, completion-time study, or percentage improvement is claimed. The reference screenshot comparison remains open.

## Local acceptance fixtures

Primary, created entirely through the isolated intended source:

`http://127.0.0.1:3055/dashboard/card/edit?experience=cmvm1ln0u0000g29k34qz7sxb&returnTo=%2Fdashboard%2Fexperiences%2Flibrary`

**Slice 4A · Clean Source Review**, client **Local Slice 4A acceptance**, draft6, both native looks, custom Clean heading, both CTAs → Home. Saved, publication inactive, no publication snapshot. Library showed Access off and QR not generated. Keep all publish/Access/QR controls untouched.

Additional image/Undo/nested evidence fixture, also viewable on the isolated server:

`http://127.0.0.1:3055/dashboard/card/edit?experience=cmvm0p5a30000o59k6u25pe7t&returnTo=%2Fdashboard%2Fexperiences%2Flibrary`

**Slice 4A · Start and Refine**, draft18, both looks plus local fixture image. Its two original CTAs predate the final default nested-label mirror adjustment; the primary fixture contains final defaults. No documents were silently migrated.

Review: select heading → Edit; select CTA → Edit/Label/Action; select Container via Outline → Surface/Placement/Contents; Add→Container→choose a look; use Undo/Redo; use the second fixture's Image→Replace/Position; Preview→Edit; Close editor→Open/Edit. At390, use the bottom task bar. Explicitly retest Tab/Shift+Tab across the header at320/390 and confirm the canvas never shifts horizontally.

The isolated server runs from `/tmp/studio-slice4-intended-source` on3055. Reproduce from the handoff source with the existing local database/dependencies and explicit environment:

```sh
DATABASE_URL='<local PostgreSQL URL only>' \
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= CLERK_SECRET_KEY= \
CREATIVE_PROVIDER_MODE=fixture NEXT_DIST_DIR=.next-control-dev \
npm run dev -- --webpack --hostname 127.0.0.1 --port 3055
```

Use an independently confirmed local database, not repository defaults. Database fixture rows are local runtime data, not source-controlled seeds. Image fixture files remain in local `tmp/creative-media-storage`; the isolated checkout links only that media directory. Original Cabinet Noir source assets were not linked into test certification.

## Evidence index and remaining gates

[Proof directory](proofs/slice4a-start-and-refine-2026-10-24/). Important images:17 Blank;18 final Text task;19 desktop Preview;21 Clean390;22 Dark390;24 clean Library identity;25 clean reopen. Images13/14 show Image content/Replace;11/12 nested insertion/Surface. Image23 records the **failed** focus-scroll case. Earlier02 shows the intermediate expanded role picker, superseded by18;08 does not show the complete Dark section, use22. Existing before-state screenshots remain in [Slice4 readiness](SLICE4_EFFORTLESS_DESIGN_READINESS_2026-10-24.md).

Open: Product Owner Slice4A hands-on acceptance; final narrow header correction retest; native file upload automation (Chrome extension file access blocked, no permissions changed); physical touch and OS keyboard/IME; Safari/WebKit; assistive technology; delayed-font readiness; original reference comparison; Cabinet Noir original-asset reproducibility; existing recovery/version and cloning/empty-projection issues outside these fresh Blanks; novice formative testing and the explicit manual matrix above. Production hash verification remains **BLOCKED**.

The existing Slice1–3 desktop acceptance stands. Source synchronization does not close any gate. No Slice4B, main merge, migration, staging, Railway/production deployment, publishing, Access, credentials or permanent QR mutation. Next step: independent architecture/product review and hands-on acceptance of this candidate, including the unresolved focus retest, before any further construction or release.

## Exact source/test files

- `components/card/tap-card-builder.tsx`
- `components/fusion/card/card-editor-live.ts`
- `components/fusion/card/reconstitution/card-studio-reconstitution-workspace.tsx`
- `components/fusion/card/reconstitution/studio-card-surface-inspector.tsx`
- `components/fusion/card/reconstitution/studio-composition-inspector.tsx`
- `components/fusion/card/reconstitution/studio-discovery-drawer.tsx`
- `components/fusion/card/reconstitution/studio-selection-inspector.tsx`
- `components/fusion/creative-studio/creative-composition-canvas.tsx`
- `components/fusion/card/reconstitution/studio-designed-introductions.tsx`
- `components/fusion/card/reconstitution/studio-introduction-surfaces.tsx`
- `lib/fusion/creative-studio/platform/studio-selection-target.ts`
- `lib/fusion/creative-studio/reconstitution/native-starting-compositions.ts`
- `lib/fusion/creative-studio/__tests__/native-starting-compositions.test.ts`
- `lib/fusion/creative-studio/__tests__/native-introduction-rendering.test.ts`
