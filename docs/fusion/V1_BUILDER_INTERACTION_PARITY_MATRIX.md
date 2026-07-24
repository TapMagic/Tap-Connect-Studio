# V1 ↔ Fusion Builder Interaction Parity Matrix

**Branch:** `tapconnect-v1-v2-fusion`  
**Audit baseline HEAD:** `0714367` (owner walkthrough closeout)  
**Working tree:** parallel implementer WIP present (uncommitted) — see § WIP note  
**Scope:** Card Builder · Campaign Workbench · public `/t/` render · media / Remove Background  
**Rule:** Isolated DB `tapconnect_fusion_dev` only. Never push / Railway / prod.  
**Status vocabulary:** `PARITY` | `BETTER` | `PARTIAL` | `MISSING` | `HONEST_DISABLED` | `N/A` | `IN_PROGRESS`  
**Severity for gaps:** `BLOCKER` | `HIGH` | `MEDIUM` | `POLISH`  

**§7 columns (this matrix):** V1 label · V1 behavior · V1 range · persistence · preview · public · Fusion control · Fusion behavior · parity · enhancement · regression · test · screenshot  

**PO HIGH themes (defect log):** dead controls · no live render · no close/back · missing icon placement · icon misalignment · rough layout · not WYSIWYG · incomplete Card Builder · V1 regressions · Remove Background missing  

---

## Audit method

| Source | What was inspected |
|--------|-------------------|
| Committed HEAD `0714367` | `components/workbench/*`, `components/card/tap-card-builder.tsx`, `components/media/media-picker.tsx`, `components/design/format-controls.tsx`, `components/tap/{rich-button,campaign-renderer,tap-connect-card}.tsx`, `app/t/[deviceCode]/page.tsx`, `app/t/tap.css`, `lib/types/campaign.ts`, `lib/brand/tap-card.ts`, `lib/fusion/attributes/contracts.ts` |
| V1 history | Builder commits (`3fc31a5`, `eac5ecd`, `f5a2e63`, `5c9cd06`, `aed1cda`, …) — icon pick / finishes / Look / media exist; **no** placement Format panel, **no** bg-remove |
| Prior agents | `29419bec` / `612d5cb6` (failed mid-burn-down) — useful uncommitted WIP kept in tree |
| Prior proofs | `e2e/builder-owner-gate.spec.ts` (`P-builder-*` save/publish/format/card) — does **not** cover placement / bg-remove / Esc gallery |

### WIP note (parallel stream — do not treat as FIXED)

Uncommitted implementer files (keep; do not discard):

- `components/design/button-layout-controls.tsx`, `lib/design/button-layout.ts`
- `components/media/bg-remove-panel.tsx`, `lib/media/bg-remove/*`
- diffs on campaign-editor, tap-card-builder, rich-button, tap-connect-card, media-picker, format-controls, tap.css, types
- `e2e/builder-interaction-parity.spec.ts` + unit `button-layout-bg-remove.test.ts`

**Audit verdict until that WIP is committed + headed proofs pass:** gaps remain **HIGH** / matrix rows **MISSING** or **IN_PROGRESS**, not `PARITY`.

---

## Shared renderer contract (WYSIWYG)

| Surface | Renderer (HEAD) | Preview | Public | Parity | Notes / defect |
|---------|-----------------|---------|--------|--------|----------------|
| Campaign editor phone | `CampaignPageRenderer` via `data-testid=campaign-phone-preview` | Yes | Same component on `/t/[deviceCode]` | `PARTIAL` | Shared path exists; layout attrs (placement/gap/pad) **absent at HEAD** → Format ≠ canvas for new controls | D-023, D-024 |
| Draft / LIVE campaign | same JSON → same renderer | Yes | Yes | `PARTIAL` | Save/publish/assign proved (`P-builder-save-publish-assign-public`); placement fields not in HEAD schema | D-024 |
| Card builder canvas | `TapConnectCard` | Yes | Public card / Keep | `PARTIAL` | Shared component; action pills lack placement Format at HEAD | D-022, D-015 |
| Finish empty state | `FinishPicker` | Misleading | Misleading | `MISSING` | Empty coerced to `metallic` (lie) | D-017 |

**True live WYSIWYG (control → preview → save → publish → public):** **not met at HEAD** for icon/layout Format and bg-remove. Basic Look/appearance/text/block style **are** live.

---

## Control matrix — Campaign Workbench

| V1 label | V1 behavior | V1 range | persistence | preview | public | Fusion control | Fusion behavior (HEAD) | parity | enhancement | regression | test | screenshot |
|----------|-------------|----------|-------------|---------|--------|----------------|------------------------|--------|-------------|------------|------|------------|
| Block library | Add / reorder / enable / duplicate / delete | Archaeology block set | Yes (campaign JSON) | Live phone | `/t` | Block list + add select `campaign-add-block*` | Wired; `age_gate` / `feedback_form` / `image_gallery` addable | `PARITY` | Fusion undo/versions | No | `P-builder-campaign-matrix` | owner-gate |
| Block design | Font/size/weight/align/spacing/card/italic/underline/colors | BlockStyle enums | Yes | Live | Live | `BlockStyleControls` | Wired + testids | `PARITY` | a11y labels | No | `P-builder-format-media` | — |
| Text quick format | Bold/size/align on text blocks | Toolbar | Yes | Live | Live | `text-block-format-toolbar` | Wired | `PARITY` | — | No | format-media | — |
| Button Look | icon+text / text / icon-only / image / image+label | appearance enum | Yes | Live | Live | `button-look` select | Wired | `PARITY` | — | No | owner-gate | — |
| Icon placement Format | before/after/left/right/above/below / only / none | Full matrix | Persist on button | Live | Live | **Absent at HEAD**; WIP `ButtonLayoutControls` / `icon-placement` | Always icon-before-label (except Look modes) | `MISSING` → WIP `IN_PROGRESS` | Pages-style panel (WIP) | Yes (V1 expected Format depth) | WIP `P-builder-icon-placement` unproven | D-015 |
| Icon size / gap / align / pad / minH / wrap / fit | Layout Format | numeric + enums | Persist | Live | Live | Absent HEAD; WIP layout fields on `ButtonItem` | No controls; CSS lacks place-* at HEAD | `MISSING` → WIP `IN_PROGRESS` | Shared `lib/design/button-layout` | Yes | WIP exploratory | D-015, D-016 |
| Bold / italic label | Per-button toggles | bool | Yes | Live | Live | `btn-bold` / `btn-italic` | Wired | `PARITY` | — | No | — | — |
| Finish picker | Optional finish; honest empty | finishes + none | Yes | Live | Live | `FinishPicker` | Empty → shows/saves as metallic | `MISSING` → WIP `allowNone` `IN_PROGRESS` | Honest None (WIP) | Yes | WIP exits proof | D-017 |
| Media upload / paste / drop | Attach image | library | Library URL | On select | Yes | `MediaPicker` | Wired | `PARITY` | paste-focus WIP | No | format-media | — |
| Stock / logo galleries | Search Pexels/Unsplash/Logo.dev | API | Library | On select | Yes | MediaPicker galleries | Close btn; **no Esc / focus return at HEAD**; stock honestly gated | `PARTIAL` | Esc+focus WIP | Yes (exit UX) | WIP `P-builder-exits-bg-remove` | D-018 |
| Remove Background | Non-destructive cutout workflow | preview/apply/restore/provenance | Derived asset | Live | Live | **Absent at HEAD** (only “Remove” clears image) | No panel / adapter | `MISSING` → WIP local-mock `IN_PROGRESS` | Provider-neutral adapter | Yes | WIP bg-remove e2e | D-019 |
| Undo / redo / save / publish / versions | History + publish assign | toolbar | Yes | Yes | Yes | campaign-undo/redo/save/publish/versions | Wired | `PARITY` | retry path | No | save-publish + rollback | — |
| QR / schedule / email / AI tabs | Side panels | tab content | Partial (schedule dates yes) | N/A panels | N/A | Editor tabs | Inline panels; Close not always Esc; AI gated by integrations | `PARTIAL` | Keywords panel | No | exploratory residual | D-020 |
| Dead / decorative chrome | None — every control works or honest disable | — | — | — | — | Audit needed | Most wired; Finish lie + missing Format = effective dead expectations; stock hint OK | `PARTIAL` | Honest disable pattern exists for stock | Yes | WIP sweep | D-021 |

---

## Control matrix — Tap Card Builder

| V1 label | V1 behavior | V1 range | persistence | preview | public | Fusion control | Fusion behavior (HEAD) | parity | enhancement | regression | test | screenshot |
|----------|-------------|----------|-------------|---------|--------|----------------|------------------------|--------|-------------|------------|------|------------|
| Section stack | Add / select / reorder / delete | section types | Brand Kit / snapshots | `TapConnectCard` | Same | Segment list + canvas | Wired | `PARITY` | versions/rollback | No | `P-builder-card-matrix` | — |
| Typography Format | Pages-style text inspector | TextFormat | Yes | Live | Live | `TextFormatControls` | Wired on sections | `PARITY` | depth expanded | No | card-matrix | — |
| Finish / shell / tile | Premium finishes | finishes | Yes | Live | Live | `FinishPicker` | Metallic coercion on empty | `PARTIAL` | allowNone WIP | Yes | — | D-017 |
| Action Look / icon | Icon picker + link | icons/URLs | Yes | Live | Live | `IconPicker` + fields | Wired; **no placement Format** | `PARTIAL` | — | Yes | — | D-015, D-022 |
| Action icon placement / layout | Full matrix on pills | same as campaign | Yes | Live | Live | Absent HEAD; WIP `ButtonLayoutControls` on actions | Default left icon; misalignment under stress | `MISSING` → WIP `IN_PROGRESS` | shared CSS `tcc-pill-place-*` WIP | Yes | WIP placement + exploratory | D-015, D-016, D-022 |
| Media / logo | MediaPicker | upload/stock/url | Yes | Live | Live | MediaPicker | Same exit/bg gaps as campaign | `PARTIAL` | — | Yes | — | D-018, D-019 |
| Composition polish | Rhythm, wrap, long labels, mobile | stress cases | Yes | Live | Live | CSS `.tcc-*` | Rough under long/many/icon-only | `PARTIAL` → WIP CSS `IN_PROGRESS` | interaction states WIP | Yes | WIP exploratory | D-016, D-022 |
| Freeform canvas | Optional freeform | flag | — | — | — | `card-freeform-toggle` | `HONEST_DISABLED` unless `freeformEnabled` | `HONEST_DISABLED` | scaffold panel | No | — | residual MEDIUM |

---

## Button / icon layout Format (detail)

| Placement / control | V1 / expected | HEAD Fusion | WIP Fusion | Persist field | Public CSS | Defect |
|---------------------|---------------|-------------|------------|---------------|------------|--------|
| before / left | Icon then label | Hardcoded order | `tap-btn-place-before` / `tcc-pill-place-*` | `iconPosition` | WIP classes | D-015 HIGH |
| after / right | Label then icon | Missing | place-after | same | WIP | D-015 |
| above / below | Column flex | Missing | place-above/below | same | WIP | D-015 |
| only | Icon-only | via Look `icon_only` only | placement `only` ↔ appearance | + appearance | WIP | D-015 |
| none / text-only | No icon | via Look `text` | placement `none` | + appearance | WIP | D-015 |
| size sm/md/lg | Icon px | Fixed ~18px | `iconSize` + classes | `iconSize` | WIP | D-015 |
| gap / pad / minH | Sliders | Missing | ranges in `ButtonLayoutControls` | fields | inline style WIP | D-015, D-016 |
| align / wrap / fit | Content align + wrap | Limited wrap CSS | align/wrap/fit classes | fields | WIP | D-016 |
| hover/focus/pressed/disabled/loading | Shared interaction | Partial pressable | deepened pill states WIP | CSS | WIP | D-016 |

`lib/fusion/attributes/contracts.ts` documents a narrower `iconPosition` on action contracts — **spec not wired into builders at HEAD**.

---

## Remove Background workflow

| Step | V1 / expected | HEAD | WIP | Status | Defect |
|------|---------------|------|-----|--------|--------|
| Entry from MediaPicker | Dedicated control | Only “Remove” clears image | `bg-remove-open` | `MISSING` / `IN_PROGRESS` | D-019 |
| Provider adapter | Neutral; mock OK | None | `lib/media/bg-remove` local-mock | `IN_PROGRESS` | D-019 |
| Preview cutout | Checker / light / dark | None | panel preview | `IN_PROGRESS` | D-019 |
| Apply derived + keep original | Non-destructive | N/A | provenance + restore | `IN_PROGRESS` | D-019 |
| Refine / padding / shadow / crop | Panel | None | panel controls | `IN_PROGRESS` | D-019 |
| Where-used | Helper | None | `findBgRemoveWhereUsed` | `IN_PROGRESS` | D-019 |
| Live vendor | Certified provider | N/A | Not certified | `HONEST_DISABLED` (creds) | D-006 related |

---

## Panel exits

| Panel | Close btn (HEAD) | Esc (HEAD) | Focus return (HEAD) | WIP | Defect |
|-------|------------------|------------|---------------------|-----|--------|
| Media gallery | Yes | **No** | **No** | Esc + focus restore | D-018 HIGH |
| Bg-remove | N/A | N/A | N/A | Overlay / Esc / restore focus | D-018, D-019 |
| Format / finish selects | Native | N/A | N/A | — | — |
| Versions / QR / schedule / email | Inline / links | No modal Esc | N/A | Optional consistency | D-020 MEDIUM |
| Icon picker / nested | Varies | Partial | Partial | Audit in exploratory | D-018 / D-021 |

---

## HIGH defect burn-down (audit stream)

| ID | Theme | Severity | Status (audit) | Parallel WIP |
|----|-------|----------|----------------|--------------|
| D-015 | Missing / incomplete icon placement Format | HIGH | **OPEN** | Controls + renderer + e2e drafted |
| D-016 | Rough layout / icon misalignment / wrap stress | HIGH | **OPEN** | CSS + layout fields drafted |
| D-017 | Finish picker lies as metallic when empty | HIGH | **OPEN** | `allowNone` drafted |
| D-018 | Gallery / picker exits (Esc / focus return) | HIGH | **OPEN** | Esc + focus drafted |
| D-019 | Remove Background missing / incomplete | HIGH | **OPEN** | local-mock panel drafted |
| D-021 | Dead controls / silent fail / not honest disable | HIGH | **OPEN** | Control sweep e2e drafted |
| D-022 | Incomplete Card Builder composition | HIGH | **OPEN** | Pill placement CSS + controls drafted |
| D-023 | Not WYSIWYG (control≠preview≠public for layout/bg) | HIGH | **OPEN** | Shared attrs/CSS drafted |
| D-024 | Live render / public mismatch risk for new layout attrs | HIGH | **OPEN** | `P-builder-wysiwyg-public` drafted |
| D-020 | Side panels lack Esc (inline, not traps) | MEDIUM | OPEN | Optional |

**Builder OWNER-READY claim:** **NOT OWNER-READY**. Do not mark FIXED until implementer commit + headed proofs pass on `tapconnect_fusion_dev`.

---

## Top 20 control gaps (implementers)

1. **Icon placement select** — wire `ButtonLayoutControls` on campaign buttons + card actions; persist `iconPosition`.
2. **Renderer placement** — `RichTapButton` / `TapConnectCard` pills must honor placement (not hardcoded before).
3. **Public CSS** — `.tap-btn-place-*` / `.tcc-pill-place-*` + mobile wrap in `app/t/tap.css`.
4. **Icon size / gap / content align** — controls + attrs on save payload.
5. **Padding X/Y + min-height + full-width/fit + wrap** — Format panel + live style.
6. **Look ↔ placement sync** — `text`↔`none`, `icon_only`↔`only`, restore `icon_text` when leaving those.
7. **FinishPicker honest None** — `allowNone`; stop empty→metallic lie (shell/tile may disallow empty).
8. **Media gallery Esc + focus return** — document + overlay keydown; restore opener focus.
9. **Remove Background entry** — non-destructive panel from MediaPicker (not only clear image).
10. **Bg-remove adapter** — provider-neutral; ship `local-mock`; provenance + restore original.
11. **Bg-remove preview modes** — checker / light / dark; apply derived asset URL.
12. **WYSIWYG proof** — editor phone DOM attrs ≡ public `/t/` after publish/assign.
13. **Card stress layout** — long labels, many actions, icon-only, mixed media, narrow width.
14. **Hover/focus/pressed/disabled/loading** — shared button/pill interaction CSS.
15. **Exploratory e2e** — open panels, mutate Format, save/reload, undo, Esc, no traps/overflow.
16. **Attribute contracts** — align `contracts.ts` action `iconPosition` with full matrix (or document subset).
17. **Stock credentials** — keep honest disable/hint (already); never silent empty gallery.
18. **Nested pickers** — IconPicker / color popovers: confirm exit + focus.
19. **QR/schedule/versions** — optional Esc for consistency (MEDIUM; don’t block HIGH burn-down).
20. **Freeform** — remain `HONEST_DISABLED` behind flag; do not fake parity.

---

## Proof index

| Proof ID | Workflow | Status |
|----------|----------|--------|
| `P-builder-campaign-matrix` | Blocks + format + undo + save | PASS (prior owner-gate) |
| `P-builder-format-media` | Format + media probes | PASS (prior) |
| `P-builder-save-publish-assign-public` | Publish assign public | PASS (prior) |
| `P-builder-version-rollback` | Versions | PASS (prior) |
| `P-builder-card-matrix` | Card save/reload/rollback | PASS (prior) |
| `P-builder-icon-placement` | Placement matrix + persist | **WIP / unproven** |
| `P-builder-wysiwyg-public` | Editor↔public DOM/screenshots | **WIP / unproven** |
| `P-builder-exits-bg-remove` | Esc + Finish None + bg-remove | **WIP / unproven** |
| `P-builder-exploratory-audit` | Control sweep / traps / wrap | **WIP / unproven** |

---

## How to re-run (after implementer lands)

```bash
export DATABASE_URL='postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev'
export BASE_URL='http://127.0.0.1:3000'
export PROOF_HEADED=1
npx playwright test e2e/builder-interaction-parity.spec.ts --headed
```

Railway: **untouched** by this audit stream.
