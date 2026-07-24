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
| D-015 | Campaign + Card builders | Format / icon placement | Full placement matrix + live preview + persist | before/after/left/right/above/below/only/none work WYSIWYG | Was missing / incomplete | HIGH | `P-builder-icon-placement` | campaign / card | Yes (V1 regression risk) | `ButtonLayoutControls` + shared renderer attrs/CSS | `e2e/builder-interaction-parity.spec.ts` | Headed PASS on tip incl. `64e27d9` | FIXED |
| D-016 | Campaign + Card + public | Button / pill layout polish | Alignment, wrap, long labels, icon-only, mobile, interaction states | No clip / misaligned icons; polished composition | Rough under stress | HIGH | `P-builder-exploratory-audit` | campaign / card | Yes | Layout CSS + Format fields + stress e2e | headed | FIXED |
| D-017 | Builders | FinishPicker | Honest None when unset | No silent metallic lie | Empty coerced to metallic | HIGH | `P-builder-exits-bg-remove` | campaign / card | Yes | `allowNone` + None option | headed | FIXED |
| D-018 | MediaPicker galleries / panels | Close / Esc / focus return | Every panel exits cleanly | Traps / missing Esc | HIGH | `P-builder-exits-bg-remove` | assets / media | Yes | Esc + focus restore on gallery + bg-remove | headed | FIXED |
| D-019 | MediaPicker | Remove Background | Provider-neutral non-destructive workflow | Preview / apply / restore / provenance | Missing / destructive clear only | HIGH | `P-builder-remove-background` | assets / media | Yes | `lib/media/bg-remove` local-mock + panel | `e2e/builder-remove-background.spec.ts` | Headed PASS on tip incl. `8f10711` | FIXED |
| D-020 | Campaign editor | QR / schedule / email tabs | Esc returns to Content + focus | Inline tabs with Esc consistency | No Esc | MEDIUM | `P-builder-exits-bg-remove` | campaign | No | Esc → Content + focus return | headed | FIXED |
| D-021 | Builders | Visible controls | Every control works or honestly disabled | Dead chrome / silent fail | Finish lie + missing Format | HIGH | `P-builder-exploratory-audit` | campaign / card | Yes | Control sweep; honest disable | headed | FIXED |
| D-022 | Card builder | Composition polish | Finished card under stress cases | Incomplete polish | Rough rhythm / mobile margins | HIGH | headed + CSS | card | Yes | TCC placement CSS + builder controls | headed | FIXED |
| D-023 | Campaign + Card + `/t` | True live WYSIWYG | control→preview→save→publish→public same render | Layout Format absent | Shared renderer path OK; layout gaps | HIGH | `P-builder-wysiwyg-public` | campaign / card | Yes | Shared attrs + DOM compare | headed | FIXED |
| D-024 | Public `/t/[deviceCode]` | Live public match | Published public matches editor phone for layout attrs | Mismatch risk | HIGH | `P-builder-wysiwyg-public` | public tap | Yes | Public CSS + e2e editor↔public | headed | FIXED |

## How to add a defect

Copy a row. Fill every column. Prefer screenshot refs under `tmp/fusion-proofs/` or `docs/fusion/screenshots/`. Link pillar to `PILLAR_CATALOG.md`. Mark **V1 regression** Yes only when Fusion change broke a V1 path **or** Fusion lacks a V1 interaction the PO still expects.

## Kill-switch coverage (walkthrough)

See matrix in `lib/fusion/features/kill-switch-matrix.ts` and Admin Control Plane § Kill-switch coverage. Headed proof: `P-admin-killswitch-matrix`.

## Honest residuals after builder interaction stream

- **Builder PO HIGHs D-015–D-024:** **FIXED locally** (commit + headed proofs on isolated DB). Not platform OWNER-READY.
- **Icon placement / alignment (D-015):** proved via `P-builder-icon-placement` (headed PASS on tip incl. `64e27d9`).
- **D-001 / D-002 / D-006 / D-013** remain OPEN (VO/NVDA, OS zoom, live credentials, platform OWNER-READY claim).
- D-009 / D-010 / D-011 remain OPEN (non-blocking polish / follow-ups).
- **Freeform canvas:** HONEST_DISABLED until `card.builder.freeform`.
- **Bg-remove live vendor:** HONEST_DISABLED (credentials residual); local-mock proved via `P-builder-remove-background` (headed PASS on tip incl. `8f10711`).
- Remove Background live vendor = credentials residual even after local-mock ships.
- Do **not** classify platform or builder OWNER-READY from this audit alone.
- Railway: **untouched**.
