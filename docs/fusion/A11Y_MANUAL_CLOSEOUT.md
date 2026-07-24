# Accessibility manual closeout (Owner walkthrough)

**Purpose:** Record true VoiceOver + OS-native zoom steps required before any surface may be classified **OWNER-READY**.  
**Rule:** Automated axe + Playwright SR proxies + 200% CSS zoom are **not** substitutes. Do not flip OWNER-READY without dates + tester names below.

**Related:** `A11Y_RUNTIME_CHECKLIST.md` (structural + automated), `OWNER_WALKTHROUGH_DEFECT_LOG.md` (D-001, D-002).

---

## Status summary (2026-07-24)

| Check | Agent / CI | PO required | Classification |
|-------|------------|-------------|----------------|
| Axe serious/critical (P-a11y-owner-gate) | PASS | — | Evidence only |
| Keyboard + aria-live / role / name (SR-oriented headed) | PASS | — | Evidence only |
| 200% CSS zoom proxy (P-responsive-owner-gate) | PASS | — | Evidence only |
| **True VoiceOver (macOS)** | **NOT RUN** (agent cannot drive VO) | **YES** | Residual → D-001 |
| **True NVDA (Windows)** | **NOT RUN** | **YES** (optional if VO complete for mac-first) | Residual → D-001 |
| **OS-native Cmd+/Ctrl+ 200% zoom** | **NOT RUN** | **YES** | Residual → D-002 |

**Agent-automatable portion:** complete via headed Playwright.  
**Manual PO portion:** sections below — record results in the attestation table.

---

## A. VoiceOver walkthrough (macOS)

**Prereqs:** Local `npm run dev` on `http://127.0.0.1:3000`, seeded isolated DB, signed-in Studio + Platform Admin user.

**Start VoiceOver:** `Cmd+F5` (or System Settings → Accessibility → VoiceOver).  
**Useful:** VO+A (read all), VO+Right/Left (move), VO+Cmd+H (next heading), VO+U (rotor).

### Routes & steps

| # | Route | Steps | Pass criteria | Result (PO) | Tester / date |
|---|-------|-------|---------------|-------------|----------------|
| VO-1 | `/dashboard` | Tab from load; confirm skip link → main; hear Home heading | Focus order matches checklist; skip works | ☐ | |
| VO-2 | `/dashboard` | Rotor → landmarks / headings | One primary `h1`; nav `aria-current` announced | ☐ | |
| VO-3 | `/dashboard/experiences/canvas` | Create/select board; change sticky selection | Selection live region (`aria-live=polite`) announces change | ☐ | |
| VO-4 | `/dashboard/experiences/canvas` | Trigger status message (save/error) | Message region announced without mouse | ☐ | |
| VO-5 | `/dashboard/experiences/campaigns` (editor) | Reorder block via keyboard; note status | Status region polite; controls named | ☐ | |
| VO-6 | `/dashboard/experiences/journeys` | Open journey editor; validation error | Errors listed as text / live, not toast-only | ☐ | |
| VO-7 | `/dashboard/audience/inbox` | Open thread; focus reply composer | Thread list + composer operable; Guardian reasons as text | ☐ | |
| VO-8 | `/dashboard/audience/wallet` | Scan status badges | Status not color-only (text present) | ☐ | |
| VO-9 | `/dashboard/insights` | Tab through KPIs; find export | Chart not sole carrier; export path announced | ☐ | |
| VO-10 | `/dashboard/brand` | Keywords panel readiness | Kill-switch / readiness text readable | ☐ | |
| VO-11 | `/admin/platform` → Features | Open kill-switch confirm | Dialog labelled; reason field associated; Cancel/Apply announced | ☐ | |
| VO-12 | Public seeded tap URL | Focus primary CTA | CTA is product action — not “Powered by Tap The Magic” alone | ☐ | |
| VO-13 | Public tap | Logo / mark | Tap Connect mark has meaningful `alt`; decorative icons hidden | ☐ | |
| VO-14 | `/mytap/[relationshipId]` | Preference toggles + frequency | Switches named; frequency labelled; save confirmation spoken | ☐ | |

**Pass rule:** All applicable rows ☐→☑ with tester + date. Failures → new rows in `OWNER_WALKTHROUGH_DEFECT_LOG.md`.

---

## B. OS-native zoom walkthrough (Cmd+ / Ctrl+)

**Do not use CSS `zoom` or Playwright viewport scale.** Use browser zoom only.

1. Chrome or Safari → open `http://127.0.0.1:3000/dashboard`
2. Press **Cmd+** (macOS) or **Ctrl+** (Windows) until status shows **200%**
3. For each route, confirm: no horizontal clipping of primary nav/CTAs; focus rings visible; no overlapping text.

| # | Route | Pass criteria | Result (PO) | Tester / date |
|---|-------|---------------|-------------|----------------|
| Z-1 | `/dashboard` | Home CTA + nav usable at 200% | ☐ | |
| Z-2 | Campaign editor | Block list + format controls usable | ☐ | |
| Z-3 | `/dashboard/experiences/canvas` | Graph + sticky controls usable | ☐ | |
| Z-4 | Public tap | Primary CTA + powered-by footer not clipped | ☐ | |
| Z-5 | `/admin/platform` Features | Registry table + confirm dialog usable | ☐ | |

**CSS zoom proxy (agent):** already recorded in `P-responsive-owner-gate` — complementary only.

---

## C. Agent-automatable commands (already used)

```bash
export DATABASE_URL='postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev'
export BASE_URL='http://127.0.0.1:3000'
export PROOF_HEADED=1
npx playwright test e2e/a11y-owner-gate.spec.ts e2e/responsive-owner-gate.spec.ts --headed
```

---

## D. Attestation (required for OWNER-READY)

| Surface | VO pass | OS zoom pass | Tester | Date | Notes |
|---------|---------|--------------|--------|------|-------|
| Platform overall | ☐ | ☐ | | | Must remain NOT OWNER-READY until all HIGH residuals closed |
| TapCanvas | ☐ | ☐ | | | |
| Public tap | ☐ | ☐ | | | |
| Admin Feature Registry | ☐ | ☐ | | | |

When complete, update `A11Y_RUNTIME_CHECKLIST.md` unchecked VO/OS items and cite this file + defect log IDs.
