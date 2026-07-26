# UX Simplification, Guided Flow & Product Intelligence Wave

**Branch:** `tapconnect-v1-v2-fusion`  
**Starting HEAD:** `e6b9ccd829f445048f6b710c05b3dfcb83e9f457`  
**Scope:** Host Studio UX only. J1 remains VERIFIED. No J2. No push/merge/deploy/Railway/production.

**Standing obligation (cross-reference):** This wave was executed under — and remains governed by — **CONTINUOUS PRODUCT IMPROVEMENT AND REDESIGN DUTY** in `docs/fusion/GLOBAL_QUALITY_STANDARDS.md` §4A and `docs/fusion/PRODUCT_OWNER_DECISIONS.md` (locked 2026-07-26). Governing sentence: *Do not merely build the requested product. Continuously make it the strongest coherent version of the product that the approved architecture, current scope, and available evidence support.* This ledger does not redefine that duty’s limits.

---

## 1. Red-team findings (pre-edit)

### Host goals (top)

1. Get a first public tap live (brand → experience → Tap Point → assign).
2. Create / edit Cards and Campaigns without learning platform taxonomy.
3. Capture contacts and follow up (email, Inbox, loyalty).
4. Know what needs attention and recover from failures.
5. See whether taps and campaigns are working (Insights).
6. Keep brand assets coherent.

### Visitor / customer goals

1. Tap → understand offer → act (save, call, book, join loyalty).
2. Trust consent and preferences (TapSave / MyTap).
3. Receive relevant follow-ups without spam.

### Current hubs (pre-wave)

| Hub | Pre-wave nature |
|-----|-----------------|
| Home | Ops queue + readiness + **module catalog** |
| Experiences | **Catalog-first** (counts only) |
| Tap Points | Catalog + live fleet registry |
| Audience | Catalog + operational workspaces |
| Insights | Catalog + KPI workspace |
| Assets | Catalog + Keywords-first scent |
| Settings | Catalog + operational panels |

### Primary UX failures confirmed

1. Hub pages pack too many concepts (readiness catalogs).
2. Architecture nouns dominate (Tap\*, workbench, outbox aggregates).
3. Permanent ~17.5rem sidebar + secondary density crowds the canvas.
4. Primary and secondary nav compete in one scroll column.
5. Experiences / Assets are directories, not workspaces.
6. Readiness chips dominate secondary nav.
7. Semi-technical errors still surface (decision meta, Insights raw).
8. TapLoop / TapFlow use JSON as primary edit for rules/definitions.
9. Format lives only in narrow inspectors — no expanded Format workspace.
10–16. Guidance is readiness/ops, not teaching; Create is honest but long and object-named; related actions fan across modules; next-action intelligence is thin.

---

## 2. Ideas rejected (and why)

| Idea | Why rejected |
|------|----------------|
| Replace seven destinations | **PO-locked** in `PRODUCT_OWNER_DECISIONS.md`. Improve chrome, not destination count. |
| Remove readiness honesty entirely | Honesty is charter-critical. **Demote** badges from primary chrome; keep inspectable detail. |
| Top-nav-only IA | Seven destinations + dense sections lose discoverability on desktop without a rail. |
| Permanent dual pane (icon + always-open secondary) | Recreates crowding; secondary should be contextual/on-demand. |
| Clone Pages / Canva / Figma chrome | Benchmarks only; brand + Studio atmosphere must stay Tap Connect. |
| Speculative J2 pillars / live providers | Out of scope; would invent capability. |
| Delete V1 routes / aliases | Capability preservation; fold into hubs instead. |
| Separate “Help Center” docs wall | Prefer interface teaching + light drawer; Settings remains recovery. |
| Auto-create multi-object recipes without host confirmation | Risk of surprise data; recipes **guide** into existing create surfaces with clear next steps. |

---

## 3. Product-owner ideas modified

| Input | Disposition |
|-------|-------------|
| Compact icon rail | **Adopted** as default desktop nav with remembered expand preference. |
| Outcome Create | **Adopted** as recipe strip first; object `CREATE_ACTIONS` kept as “More actions” for honesty/tests. |
| Expanded Format workspace | **Adopted** as dockable Format panel (Card builder first); contextual inspector retained. |
| Progressive disclosure of readiness | **Adopted** — badges off primary rail; secondary tray + hub “Browse tools” disclose detail. |
| Guided editors over JSON | **Adopted** for TapLoop rules/tiers; JSON remains Advanced escape hatch. |
| Permanent wide left pane | **Rejected** as default — collapses to rail. |

---

## 4. Target interaction model

- **Outcomes first** on Home and Create.
- **Seven destinations** preserved; chrome is compact.
- **Workspaces** prioritize recent / search / primary actions / alerts / recommendations; catalogs are progressive (“Browse all tools”).
- **Complexity in platform:** guardians, outbox, feature registry stay internal; hosts see plain language + View details.
- **Progressive disclosure:** automatic → recommended → basic → contextual → advanced → admin-only.
- **Product intelligence:** grounded next actions from setup progress, decision queue, fleet health, drafts — never fabricated business facts.

---

## 5. Revised information architecture (host-facing)

Unchanged destination IDs/routes. Changed presentation:

- Home → outcome cockpit (not pillar map).
- Experiences → make/resume workspace.
- Assets → Brand Kit + media workspace (Keywords secondary).
- Secondary sections → contextual tray / mobile drawer, not permanent wide column.
- Create → recipes → more actions (honest create/open/unavailable).

---

## 6. Navigation model (chosen)

**Desktop:** Icon rail (~3.5rem) default → expand to labeled rail (~14rem) with remembered `localStorage` preference. Active destination opens a **contextual secondary tray** (sections without readiness chip spam; readiness on hover/title + expand). Full-screen builders keep rail.

**Mobile/tablet:** Primary chips retained (J1 testids). Secondary via existing “More in {hub}” + improved drawer semantics. Touch targets ≥44px.

**Also retained:** Cmd+K palette, breadcrumbs not required for seven-destination depth.

---

## 7. Format workspace model

- Quick Format remains in inspector.
- **Format** control opens expanded workspace with tabs: Typography · Style · Layout · Appearance · Advanced.
- Depth targets Pages maturity / Canva ease without cloning UI.
- Card builder ships first; campaign workbench can reuse the shell later.

---

## 8. Risks

- E2E selectors (`mobile-secondary-nav*`, `studio-create-menu`, create intent attrs) must remain.
- Over-hiding advanced tools could slow power users — mitigated by expand preference + Browse tools + Cmd+K.
- Format workspace width on tablet — stack below canvas on `max-lg`.

---

## 9. Changes that should not be made

- No J2 feature expansion.
- No production DB / Railway / push / merge / deploy.
- No removal of approved capability or Feature Registry honesty.
- No inventing provider readiness.
- No renaming product to Tap The Magic in Studio chrome.

---

## 10. Consequential additions (this wave)

Documented in completion report: create recipes, humanizeError + ErrorMessage, FormatWorkspace shell, TapLoop guided rule/tier editors, outcome Home, Experiences/Assets operational workspaces, nav rail preference, optional help drawer tips.

---

## Completion report (2026-07-26)

### 1. Starting / ending HEAD
- **Starting HEAD:** `e6b9ccd829f445048f6b710c05b3dfcb83e9f457`
- **Ending HEAD:** `e6b9ccd829f445048f6b710c05b3dfcb83e9f457` (working tree changes **uncommitted** — no commit requested)

### 2. Files changed
**Modified:** `app/dashboard/{page,experiences,assets,audience,insights,settings,tap-points}/page.tsx`, `components/dashboard/nav.tsx`, `components/studio/{hub-sections,studio-top-bar}.tsx`, `components/card/tap-card-builder.tsx`, `components/fusion/audience/taploop-workspace.tsx`, `lib/fusion/studio/ia.ts`, `docs/fusion/{PRODUCT_OWNER_DECISIONS,BUILD_STATUS,UX_SIMPLIFICATION_WAVE}.md`

**Added:** `lib/fusion/studio/create-recipes.ts`, `lib/fusion/errors/humanize.ts` (+ test), `components/ui/error-message.tsx`, `components/studio/{outcome-recipes,studio-help-drawer}.tsx`, `components/design/format-workspace.tsx`, `components/fusion/audience/taploop-rules-editor.tsx`

### 3–7. Red team / rejected / implied / new interactions
See sections 1–3 and 10 above. Key additions: outcome recipes, grounded Home recommendations, compact nav + tray, Format workspace, humanizeError + View details, TapLoop guided rules, help tips drawer, Browse all tools progressive disclosure.

### 8. Navigation before/after
- **Before:** Permanent ~17.5rem labeled rail + secondary readiness chips in same column.
- **After:** Default icon rail (3.5rem) with remembered expand; contextual secondary tray without readiness chip spam; mobile drawer + retained “More in {hub}” (J1 testids).

### 9. Workspace before/after
- **Before:** Experiences/Assets (and others) catalog-first.
- **After:** Operational headers, CTAs, recent work / Brand Kit first; catalogs under collapsible Browse all tools.

### 10. Format before/after
- **Before:** Narrow inspector only.
- **After:** Card builder **Format** opens expanded Format workspace (Typography / Style / Layout / Appearance / Advanced); inspector quick controls retained.

### 11. Error language
`humanizeError` + `ErrorMessage` View details; decision queue technical meta behind details; Insights errors humanized.

### 12. Guided editors
TapLoop earn rules / tiers: Guided default; Advanced · JSON escape hatch (same payloads / testids).

### 13. Desktop / tablet / mobile evidence
Viewport smoke: Home outcomes + Create recipes on 1440 / 768 / 390; nav-rail desktop; mobile drawer + secondary toggle; Format workspace opens; Experiences workspace CTAs present.

### 14. Accessibility evidence
Axe WCAG 2 A/AA on `/dashboard`, `/dashboard/experiences`, `/dashboard/card`: **0 serious/critical** after secondary-tray contrast bump. Keyboard: Create / Escape / secondary toggle retained. VO/NVDA not run.

### 15. Test results
| Gate | Result |
|------|--------|
| `tsc --noEmit` | PASS |
| `npm run lint` | 0 errors (4 pre-existing img warnings) |
| `npm test` | **424/424** PASS |
| `npm run build` | PASS |
| Prisma validate | PASS |
| Headed ID-001, ID-005, UX spine ID-002/003/006/007 | **6/6 PASS** |

### 16. Remaining UX defects
- Campaign workbench / TapFlow still lack full expanded Format / guided visual builders (JSON definition remains expert path on TapFlow).
- Create menu is long (recipes + More actions) — acceptable honesty; could later progressive-collapse More.
- Help tips are static, not contextual per route.
- True VO/NVDA attestation still outstanding (platform-wide).

### 17. Deferred
- Full Pages-class tables/media-wrap/animation engines across all builders.
- Multi-object auto-create recipes without confirmation.
- Changing locked seven destinations.
- J2 feature expansion.

### 18. J1 VERIFIED
**Confirmed.** Headed re-proof of ID-001 + ID-005 + UX spine discoverability suite passed against local `next start` + isolated DB.

### 19. Limits confirmation
No push, merge, deploy, production DB change, Railway action, branch change, or J2 work.

### 20. Product Owner walkthrough
1. Open `/dashboard` — see **What do you want to do?**, Recommended next, Needs attention, Setup, Recent work.
2. Click **+ Create** — recipes first; Campaign under More actions still opens workbench; Booking disabled.
3. Desktop: icon rail; expand labels; open tools tray for destination sections.
4. Mobile: drawer + **More in {hub}** secondary.
5. `/dashboard/experiences` — New Card / New Campaign + recent list; Browse all tools collapsed.
6. `/dashboard/assets` — Brand Kit primary; Keywords under optional details.
7. `/dashboard/card` — **Format** opens Format workspace.
8. Audience → TapLoop — Guided earn/tier editors; Advanced JSON available.
9. Help (?) — quick tips; Settings still owns recovery.
10. Confirm readiness pill never says “Studio ready” from empty outbox alone.
