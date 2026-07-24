# Owner walkthrough — defect log

**Branch tip (at authorship):** audit against HEAD `0714367`; parallel builder WIP uncommitted  
**Rule:** Isolated DB only. Never push / Railway / prod.  
**Classification vocabulary:** BLOCKER | HIGH | MEDIUM | POLISH  
**Status vocabulary:** OPEN | IN_PROGRESS | FIXED | WONTFIX | DEFERRED_TO_PO  

Seeded from closeout residuals (`BUILD_STATUS.md`, `OWNER_READY_COMPLETION_MATRIX.md`, `A11Y_RUNTIME_CHECKLIST.md`) plus Admin kill-switch / a11y prep. **Builder interaction audit** (2026-07-24): PO findings below classified **HIGH until FIXED with headed proof** — see `docs/fusion/V1_BUILDER_INTERACTION_PARITY_MATRIX.md`. Failed agents `29419bec` / `612d5cb6` left useful uncommitted WIP; do **not** mark FIXED from WIP alone.

| ID | Route | Screen | Action | Expected | Actual | Severity | Screenshot ref | Pillar | V1 regression | Fix | Test | Verification | Status |
|----|-------|--------|--------|----------|--------|----------|----------------|--------|---------------|-----|------|--------------|--------|
| D-001 | `/dashboard/*`, public tap | Global / TapCanvas | True VoiceOver / NVDA live-region + image alt spot-check | Screen reader announces status regions and meaningful logo alt | Playwright SR proxies + axe pass; **true VO/NVDA not run in CI** | HIGH | `tmp/fusion-proofs/P-a11y-owner-gate.json` | controls / a11y | No | PO macOS VoiceOver + Windows NVDA per `A11Y_MANUAL_CLOSEOUT.md` | Manual VO checklist | Pending PO attestation | OPEN |
| D-002 | Studio + public | All primary surfaces | OS-native Cmd+/Ctrl+ 200% zoom | Layout usable; no clip of primary controls | **200% CSS zoom proxy** headed PASS; OS zoom residual | HIGH | `tmp/fusion-proofs/P-responsive-owner-gate.json` | controls / responsive | No | Manual Cmd+ zoom walkthrough | `A11Y_MANUAL_CLOSEOUT.md` § Zoom | Pending PO | OPEN |
| D-003 | `/dashboard/experiences/campaigns/*`, card builder | Builder | Save / publish / assign + formatting matrix | Persisted headed matrix green | **7/7 headed PASS** (`e2e/builder-owner-gate.spec.ts`) | HIGH | `P-builder-*` | campaign / card | No | Builder stream `2e04988` + re-gate selector harden | Headed builder proofs | FIXED (local; not OWNER-READY) |
| D-004 | `/dashboard/insights` | Insights | Drill-down + provenance | Evidence classes + drill paths | **P-insights-drilldown-provenance PASS** | MEDIUM | `P-insights-drilldown-provenance` | insights | No | Insights stream `f0426b8` | Headed drill proofs | FIXED (local; VO residual) |
| D-005 | `/admin/platform` Feature Registry | Platform Admin | Kill-switch disable → API 503 → audit → re-enable beyond Keywords/TapCanvas/TapFlow | Full matrix | Triad proved; **expanded matrix** (`P-admin-killswitch-matrix`) | MEDIUM | `tmp/fusion-proofs/P-admin-killswitch-matrix.json` | admin | No | Expand registry + API gates + headed proof | `e2e/admin-killswitch-matrix.spec.ts` | FIXED (local proof; not OWNER-READY) |
| D-006 | TapCast / TikTok / productivity live | Experiences / Settings | Live provider publish / OAuth | Live paths credentialled | Live = **VERIFIED — CREDENTIALS REQUIRED** | HIGH | `PROVIDER_READINESS.md` | tapcast / integrations | No | One provider at a time with real creds | Live cert checklist | OPEN |
| D-007 | `/dashboard/audience/inbox` | Inbox | Thread reply + Guardian + TapCase keyboard | Fully operable without mouse; block reasons as text | **P-09 + P-27 headed PASS** (local mock) | MEDIUM | `P-09-inbox-operator` / `P-27-inbox-guardian-matrix` | messaging | No | Inbox stream `9dfa949` + a11y scroll fixes | Headed inbox matrix | FIXED (local; live = credentials) |
| D-008 | `/dashboard/audience` TapLoop | TapLoop | Program UI + reverse + enroll UI | Full loyalty operator UI | **P-10-taploop PASS** (program/award/redeem/adjust/reverse) | MEDIUM | `P-10-taploop` | taploop | No | TapLoop stream `73bbd39` + select a11y name | Headed + API | FIXED (local; not OWNER-READY) |
| D-009 | Brand Kit / Keywords | Keywords analytics | Dedicated analytics UI panel | Keywords performance panel | Pipeline + kill-switch proved; analytics UI residual | MEDIUM | `P-keywords-*` | autopilot | No | Keywords follow-up | Headed analytics | OPEN |
| D-010 | `/admin/platform` Feature Registry | Overrides / audit tables | Sortable headers announced; empty states; reason-tied errors | Full a11y for tables | Confirm dialog + reason field present; table a11y residual | POLISH | — | admin | No | Admin a11y pass | Manual VO + keyboard | OPEN |
| D-011 | MyTap `/mytap/[id]` | Preference toggles | Accessible switches + labeled frequency + announced save | WCAG operable prefs | Checklist unchecked for true SR | MEDIUM | `A11Y_RUNTIME_CHECKLIST.md` | tapsave | Possible | MyTap a11y wiring | Manual VO | OPEN |
| D-012 | `/api/email/send`, `/api/tapcast*`, `/api/connectors/productivity` | APIs | Kill-switch off returns `503` `{ code: feature_off }` | Gated | Previously ungated / inconsistent (loyalty 403) | HIGH | — | admin / multi | No | Gate routes + standardize 503 | Unit + `P-admin-killswitch-matrix` | FIXED |
| D-013 | Platform overall | — | Claim OWNER-READY | Only with zero ledger blockers + VO proof | Platform **IMPLEMENTED BUT NOT OWNER-READY** | BLOCKER | `OWNER_READY_COMPLETION_MATRIX.md` | platform | N/A | Clear all OPEN HIGH/BLOCKER with proof | Full gate suite | OPEN |
| D-014 | Audience / Inbox / Insights | Stream UIs | Axe serious/critical clear after stream land | select-name + scrollable-region-focusable | Fixed: aria-label on selects; tabindex+label on scroll regions | HIGH | P-a11y-owner-gate | a11y | No | Re-gate a11y patches | `e2e/a11y-owner-gate.spec.ts` | FIXED |
| D-015 | Campaign + Card builders | Format / icon placement | Full placement matrix + live preview + persist | before/after/left/right/above/below/only/none work WYSIWYG | **HEAD:** missing Format panel; icon hardcoded before label (Look modes only). Attribute contract partial/unwired | HIGH | matrix § Button layout | campaign / card | Yes | Wire `ButtonLayoutControls` + renderer/CSS + persist | `P-builder-icon-placement` | OPEN (WIP IN_PROGRESS uncommitted) |
| D-016 | Campaign + Card + public | Button / pill layout polish | Alignment, wrap, long labels, icon-only, mobile, interaction states | No clip / misaligned icons; polished composition | **HEAD:** rough under stress; no gap/pad/align/wrap Format | HIGH | matrix § Composition | campaign / card | Yes | Layout CSS + Format fields + stress e2e | `P-builder-exploratory-audit` | OPEN (WIP IN_PROGRESS) |
| D-017 | Builders | FinishPicker | Honest None when unset | No silent metallic lie | **HEAD:** `value \|\| "metallic"` coerces empty | HIGH | matrix § Finish | campaign / card | Yes | `allowNone` + None option; shell/tile may disallow | `P-builder-exits-bg-remove` | OPEN (WIP IN_PROGRESS) |
| D-018 | MediaPicker galleries / panels | Close / Esc / focus return | Every panel exits cleanly; focus restores | Close btn only; **no Esc / focus return** at HEAD | HIGH | matrix § Panel exits | assets / media | Yes | Esc + focus restore on gallery (+ bg-remove) | `P-builder-exits-bg-remove` | OPEN (WIP IN_PROGRESS) |
| D-019 | MediaPicker | Remove Background | Provider-neutral non-destructive workflow | Preview / apply / restore / provenance | **HEAD:** missing (only clears image). No adapter/panel | HIGH | matrix § Remove Background | assets / media | Yes | `lib/media/bg-remove` local-mock + panel; live vendor later | unit + headed | OPEN (WIP IN_PROGRESS) |
| D-020 | Campaign editor | QR / schedule / versions | Esc closes if modal | Inline panels — no Esc; no traps observed | Inline only | MEDIUM | matrix § Panel exits | campaign | No | Optional Esc for consistency | exploratory | OPEN |
| D-021 | Builders | Visible controls | Every control works or honestly disabled | Dead chrome / silent fail / misleading Finish | Finish lie + missing Format = dead PO expectations; stock hint OK | HIGH | matrix § Dead controls | campaign / card | Yes | Control sweep; honest disable with reason | `P-builder-exploratory-audit` | OPEN (WIP IN_PROGRESS) |
| D-022 | Card builder | Composition polish | Finished card under stress cases | Incomplete polish vs V1 Card screenshot bar | Rough rhythm / pill alignment / mobile margins | HIGH | matrix § Card | card | Yes | TCC placement CSS + builder controls + stress | headed + CSS | OPEN (WIP IN_PROGRESS) |
| D-023 | Campaign + Card + `/t` | True live WYSIWYG | control→preview→save→publish→public same render | Layout Format / bg-remove absent → not WYSIWYG for those | Shared renderer path OK for Look/text; gaps for placement/bg | HIGH | matrix § Shared renderer | campaign / card | Yes | Shared attrs + DOM/screenshot compare | `P-builder-wysiwyg-public` | OPEN (WIP IN_PROGRESS) |
| D-024 | Public `/t/[deviceCode]` | Live public match | Published public matches editor phone for new layout attrs | No placement attrs at HEAD; mismatch risk once WIP lands without public CSS | HIGH | matrix § WYSIWYG | public tap | Yes | Ensure public CSS + e2e editor↔public | `P-builder-wysiwyg-public` | OPEN (WIP IN_PROGRESS) |

## How to add a defect

Copy a row. Fill every column. Prefer screenshot refs under `tmp/fusion-proofs/` or `docs/fusion/screenshots/`. Link pillar to `PILLAR_CATALOG.md`. Mark **V1 regression** Yes only when Fusion change broke a V1 path **or** Fusion lacks a V1 interaction the PO still expects.

## Kill-switch coverage (walkthrough)

See matrix in `lib/fusion/features/kill-switch-matrix.ts` and Admin Control Plane § Kill-switch coverage. Headed proof: `P-admin-killswitch-matrix`.

## Honest residuals after builder interaction audit

- **Builder PO HIGHs D-015–D-019 / D-021–D-024:** **OPEN** (parallel WIP may be IN_PROGRESS in working tree — not FIXED until commit + headed proof).
- **D-001 / D-002 / D-006 / D-013** remain OPEN (VO/NVDA, OS zoom, live credentials, platform OWNER-READY claim).
- D-009 / D-010 / D-011 / D-020 remain OPEN (non-blocking polish / follow-ups).
- Remove Background live vendor = credentials residual even after local-mock ships.
- Do **not** classify platform or builder OWNER-READY from this audit alone.
- Railway: **untouched**.
