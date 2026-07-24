# V1 ↔ Fusion Builder Interaction Parity Matrix

**Branch:** `tapconnect-v1-v2-fusion`  
**Scope:** Card Builder · Campaign Workbench · public `/t/` render · media / Remove Background  
**Rule:** Isolated DB only. Never push / Railway / prod.  
**Status vocabulary:** PARITY | BETTER | PARTIAL | MISSING | HONEST_DISABLED | N/A  
**Severity for gaps:** BLOCKER | HIGH | MEDIUM | POLISH  

Live proof IDs (headed): `P-builder-icon-placement`, `P-builder-wysiwyg-public`, `P-builder-exits-bg-remove`, `P-builder-exploratory-audit` (+ prior `P-builder-*` owner-gate suite).

---

## Shared renderer contract (WYSIWYG)

| Surface | Renderer | Status | Notes |
|---------|----------|--------|-------|
| Campaign editor phone preview | `CampaignPageRenderer` | PARITY | `data-testid=campaign-phone-preview` |
| Draft / LIVE campaign | same | PARITY | Status badge in chrome; same blocks |
| Public `/t/[deviceCode]` | same | PARITY | Proof: editor↔public DOM attrs + screenshots |
| Card builder canvas | `TapConnectCard` | PARITY | Same component as public card / Keep Card |
| Public card / MyTap keep | `TapConnectCard` | PARITY | Shared CSS `app/t/tap.css` |

**Verdict:** True live rendering — editor, preview, draft, published, and public share one renderer path per product surface. Not OWNER-READY until VO/NVDA + remaining platform HIGHs outside this scope clear.

---

## Control matrix — Campaign Workbench

| V1 / expected control | Fusion control | Live preview | Persist | Exit / Esc | Status | Defect |
|-----------------------|----------------|--------------|---------|------------|--------|--------|
| Block library add/reorder/enable | Block list + add | Yes | Yes | N/A | PARITY | — |
| Format text (size/weight/align/color) | `BlockStyleControls` + text toolbar | Yes | Yes | N/A | PARITY | — |
| Button Look (icon+text / text / icon-only / image) | Look select `data-testid=button-look` | Yes | Yes | N/A | PARITY | — |
| Icon placement matrix | `ButtonLayoutControls` (`icon-placement`) | Yes | Yes | N/A | PARITY | D-015 FIXED |
| Icon size / gap / content align | Layout controls | Yes | Yes | N/A | PARITY | D-015 FIXED |
| Padding / min-height / full-width / wrap | Layout controls | Yes | Yes | N/A | PARITY | D-016 FIXED |
| Bold / italic label | checkboxes → renderer style | Yes | Yes | N/A | PARITY | — |
| Finish picker with honest None | `FinishPicker` `allowNone` | Yes | Yes | N/A | PARITY | D-017 FIXED |
| Media upload / paste / drop | `MediaPicker` | Yes | Library | Esc gallery | PARITY | D-018 FIXED |
| Stock / logo galleries | MediaPicker galleries | On select | Library | Esc + focus return | PARITY | D-018 FIXED |
| Remove Background | `BgRemovePanel` + adapter | Preview → apply | Provenance + restore | Esc + focus return | PARITY (local-mock) | D-019 FIXED |
| Undo / redo / save / publish / versions | Toolbar testids | Yes | Yes | N/A | PARITY | — |
| QR / schedule / email panels | Side tabs | N/A | Partial | Esc → Content + focus return | PARITY | D-020 FIXED |
| Dead / decorative controls | Audited in exploratory | — | — | — | HONEST_DISABLED or wired | D-021 FIXED |

---

## Control matrix — Tap Card Builder

| V1 / expected control | Fusion control | Live preview | Persist | Status | Defect |
|-----------------------|----------------|--------------|---------|--------|--------|
| Section add / select / snap preview | Builder + `TapConnectCard` | Yes | Brand Kit / snapshots | PARITY | — |
| Action icon placement / layout | `ButtonLayoutControls` on action sections | Yes | Yes | PARITY | D-015 FIXED |
| Finish / shell / tile | `FinishPicker` (shell/tile disallow empty) | Yes | Yes | PARITY | — |
| Text format on labels | `TextFormatControls` | Yes | Yes | PARITY | — |
| Media / icon / logo pickers | MediaPicker + IconPicker | Yes | Yes | PARITY | — |
| Remove Background on media | Same panel | Yes | Provenance | PARITY (local-mock) | D-019 FIXED |
| Composition polish (long labels, icon-only, wrap, mobile) | CSS + wrap + stress e2e | Yes | Yes | PARITY | D-016 / D-022 FIXED |
| Freeform canvas | Feature-flagged | — | — | HONEST_DISABLED until flag | residual MEDIUM |

---

## Button / icon layout Format (detail)

| Placement | Campaign `.tap-btn` | Card `.tcc-pill` | Persist field | Proof |
|-----------|---------------------|------------------|---------------|-------|
| before | adjacent icon+text | same | `iconPosition` | P-builder-icon-placement |
| after | adjacent reversed | same | same | same |
| left / right | edge-spread (icon pinned, label flex) | same | same | same (distinct classes) |
| above / below | column flex | column flex | same | same |
| only | icon-only chrome | icon-only | + `appearance` | same |
| none / text-only | no icon slot | text-only | + `appearance=text` | same |
| size sm/md/lg | `tap-btn-icon-*` | sizePx | `iconSize` | same |
| gap / pad / minH | inline style | inline style | fields | unit + headed |
| align / wrap / fit | classes | classes | fields | P-builder-exploratory-audit |

---

## Remove Background workflow

| Step | Behavior | Status |
|------|----------|--------|
| Provider adapter | `lib/media/bg-remove` — `local-mock` default; swap-ready | PARITY (mock OK) |
| Preview cutout | Canvas chroma-key; light/dark/checker | PARITY |
| Apply derived | New asset URL; original remembered | PARITY |
| Restore original | Non-destructive restore | PARITY |
| Refine / padding / shadow / crop | Panel controls | PARITY |
| Where-used helper | `findBgRemoveWhereUsed` | PARITY (util) |
| Live vendor | Not certified | HONEST_DISABLED — credentials residual |

---

## Panel exits

| Panel | Close | Esc | Focus return | Proof |
|-------|-------|-----|--------------|-------|
| Media gallery | Close btn / overlay | Yes | Yes | P-builder-exits-bg-remove |
| Bg-remove | Close / overlay / apply | Yes | Yes | same |
| Color swatch popover | Close | Yes | Yes | ColorSwatchPicker |
| QR / schedule / email tabs | Tab back to Content | Yes | Yes | same proof |
| Freeform (flag off) | N/A | N/A | N/A | honest disabled copy |

---

## HIGH defect burn-down (this stream)

| ID | Theme | Status |
|----|-------|--------|
| D-015 | Missing / incomplete icon placement Format | FIXED (local headed) |
| D-016 | Rough layout / misalignment / wrap stress | FIXED (local headed) |
| D-017 | Finish picker lied as metallic when empty | FIXED |
| D-018 | Gallery / picker exits + paste focus | FIXED |
| D-019 | Remove Background incomplete / destructive | FIXED (local-mock adapter) |
| D-020 | Side tabs lack Esc | FIXED (Esc → Content + focus) |
| D-021 | Dead controls / not WYSIWYG | FIXED for builder scope |
| D-022 | Incomplete Card Builder composition | FIXED (local; freeform residual) |
| D-023 / D-024 | WYSIWYG / public mismatch for layout attrs | FIXED (shared renderer + proof) |

**Builder OWNER-READY claim:** **NOT OWNER-READY** — builder HIGH interaction defects for this burn-down are cleared locally; platform still blocked by D-001/D-002/D-006/D-013 (VO/NVDA, OS zoom, live credentials, overall claim).

---

## Proof index

| Proof ID | Workflow |
|----------|----------|
| P-builder-icon-placement | Placement matrix (incl. left/right) + text-only + persist reopen |
| P-builder-wysiwyg-public | Editor↔public DOM/class/attr + screenshots |
| P-builder-exits-bg-remove | Esc gallery/bg-remove/side tabs + paste + Finish None |
| P-builder-exploratory-audit | Toolbar sweep, wrap stress, undo, no modal traps |
| P-builder-save-publish-assign-public | Prior owner-gate chain |
| P-builder-campaign-matrix / card-matrix / format-media / version-rollback | Prior suite |

---

## How to re-run

```bash
export DATABASE_URL='postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev'
export BASE_URL='http://127.0.0.1:3000'
export PROOF_HEADED=1
npx playwright test e2e/builder-interaction-parity.spec.ts --headed
```

Railway: **untouched**.
