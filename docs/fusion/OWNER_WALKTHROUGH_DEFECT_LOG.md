# Owner walkthrough — defect log

**Branch tip (at authorship):** see git HEAD after `fusion: expand admin kill-switches and owner walkthrough a11y log`  
**Rule:** Isolated DB only. Never push / Railway / prod.  
**Classification vocabulary:** BLOCKER | HIGH | MEDIUM | POLISH  
**Status vocabulary:** OPEN | IN_PROGRESS | FIXED | WONTFIX | DEFERRED_TO_PO  

Seeded from closeout residuals (`BUILD_STATUS.md`, `OWNER_READY_COMPLETION_MATRIX.md`, `A11Y_RUNTIME_CHECKLIST.md`) plus findings from Admin kill-switch expansion / manual a11y prep.

| ID | Route | Screen | Action | Expected | Actual | Severity | Screenshot ref | Pillar | V1 regression | Fix | Test | Verification | Status |
|----|-------|--------|--------|----------|--------|----------|----------------|--------|---------------|-----|------|--------------|--------|
| D-001 | `/dashboard/*`, public tap | Global / TapCanvas | True VoiceOver / NVDA live-region + image alt spot-check | Screen reader announces status regions and meaningful logo alt | Playwright SR proxies + axe pass; **true VO/NVDA not run in CI** | HIGH | `tmp/fusion-proofs/P-a11y-owner-gate.json` | controls / a11y | No | PO macOS VoiceOver + Windows NVDA per `A11Y_MANUAL_CLOSEOUT.md` | Manual VO checklist | Pending PO attestation | OPEN |
| D-002 | Studio + public | All primary surfaces | OS-native Cmd+/Ctrl+ 200% zoom | Layout usable; no clip of primary controls | **200% CSS zoom proxy** headed PASS; OS zoom residual | HIGH | `tmp/fusion-proofs/P-responsive-owner-gate.json` | controls / responsive | No | Manual Cmd+ zoom walkthrough | `A11Y_MANUAL_CLOSEOUT.md` § Zoom | Pending PO | OPEN |
| D-003 | `/dashboard/experiences/campaigns/*`, card builder | Builder | Save / publish / assign + formatting matrix | Persisted headed matrix green | Matrix incomplete / open in ledger | HIGH | — | campaign / card | Possible | Builder agent matrix; do not claim OWNER-READY | Headed builder proofs | OPEN |
| D-004 | `/dashboard/insights` | Insights | Drill-down + provenance | Evidence classes + drill paths | Shell + export proved; drill/provenance residual | MEDIUM | `P-11-insights-shell` / `P-insights-export` | insights | No | Insights agent | Headed drill proofs | OPEN |
| D-005 | `/admin/platform` Feature Registry | Platform Admin | Kill-switch disable → API 503 → audit → re-enable beyond Keywords/TapCanvas/TapFlow | Full matrix | Triad proved; **expanded matrix added** (`P-admin-killswitch-matrix`) | MEDIUM | `tmp/fusion-proofs/P-admin-killswitch-matrix.json` | admin | No | Expand registry + API gates + headed proof | `e2e/admin-killswitch-matrix.spec.ts` | FIXED (local proof; not OWNER-READY) |
| D-006 | TapCast / TikTok / productivity live | Experiences / Settings | Live provider publish / OAuth | Live paths credentialled | Live = **VERIFIED — CREDENTIALS REQUIRED** | HIGH | `PROVIDER_READINESS.md` | tapcast / integrations | No | One provider at a time with real creds | Live cert checklist | OPEN |
| D-007 | `/dashboard/audience/inbox` | Inbox | Thread reply + Guardian + TapCase keyboard | Fully operable without mouse; block reasons as text | Shell proved; reply/Guardian matrix residual | MEDIUM | `P-09-inbox-shell` | messaging | No | Inbox agent (coordinate; gate via `comms.inbox`) | Headed inbox matrix | OPEN |
| D-008 | `/dashboard/audience` TapLoop | TapLoop | Program UI + reverse + enroll UI | Full loyalty operator UI | Ledger award/redeem proofs; program UI residual | MEDIUM | `P-10-taploop` | taploop | No | TapLoop agent; kill-switch via `loyalty.taploop` | Headed + API | OPEN |
| D-009 | Brand Kit / Keywords | Keywords analytics | Dedicated analytics UI panel | Keywords performance panel | Pipeline + kill-switch proved; analytics UI residual | MEDIUM | `P-keywords-*` | autopilot | No | Keywords follow-up | Headed analytics | OPEN |
| D-010 | `/admin/platform` Feature Registry | Overrides / audit tables | Sortable headers announced; empty states; reason-tied errors | Full a11y for tables | Confirm dialog + reason field present; table a11y residual | POLISH | — | admin | No | Admin a11y pass | Manual VO + keyboard | OPEN |
| D-011 | MyTap `/mytap/[id]` | Preference toggles | Accessible switches + labeled frequency + announced save | WCAG operable prefs | Checklist unchecked for true SR | MEDIUM | `A11Y_RUNTIME_CHECKLIST.md` | tapsave | Possible | MyTap a11y wiring | Manual VO | OPEN |
| D-012 | `/api/email/send`, `/api/tapcast*`, `/api/connectors/productivity` | APIs | Kill-switch off returns `503` `{ code: feature_off }` | Gated | Previously ungated / inconsistent (loyalty 403) | HIGH | — | admin / multi | No | Gate routes + standardize 503 | Unit + `P-admin-killswitch-matrix` | FIXED |
| D-013 | Platform overall | — | Claim OWNER-READY | Only with zero ledger blockers + VO proof | Platform **IMPLEMENTED BUT NOT OWNER-READY** | BLOCKER | `OWNER_READY_COMPLETION_MATRIX.md` | platform | N/A | Clear all OPEN HIGH/BLOCKER with proof | Full gate suite | OPEN |

## How to add a defect

Copy a row. Fill every column. Prefer screenshot refs under `tmp/fusion-proofs/` or `docs/fusion/screenshots/`. Link pillar to `PILLAR_CATALOG.md`. Mark **V1 regression** Yes only when Fusion change broke a V1 path.

## Kill-switch coverage (walkthrough)

See matrix in `lib/fusion/features/kill-switch-matrix.ts` and Admin Control Plane § Kill-switch coverage. Headed proof: `P-admin-killswitch-matrix`.
