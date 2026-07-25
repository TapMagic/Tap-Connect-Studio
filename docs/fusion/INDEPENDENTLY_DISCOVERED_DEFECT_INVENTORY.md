# Independently Discovered Defect Inventory

**Inspector:** Independent product inspector (read-only)  
**Tip:** `9965c8a`  
**Discovery window:** 2026-07-24  
**Rule:** Items below were found by this inspection. They are **not** copied from the owner walkthrough as primary findings. Overlaps with `OWNER_WALKTHROUGH_DEFECT_LOG.md` are marked with cross-refs and **Discovery source = Independent (overlap)**.

**Severity:** BLOCKER | HIGH | MEDIUM | POLISH  
**Status:** All rows OPEN unless noted — this inspector does **not** fix or self-certify.

Owner log IDs use `D-###`. Independent IDs use `ID-###`.

---

## Summary table

| ID | Severity | Route / screen | One-line | Status |
|----|----------|----------------|----------|--------|
| ID-001 | BLOCKER | Global top bar | “Studio ready” ≠ workspace readiness | OPEN |
| ID-002 | HIGH | Top bar Notifications | Bell is dead; badge can still light | FIXED pending independent verify |
| ID-003 | HIGH | Mobile nav | Secondary IA unavailable on `<lg` | FIXED pending independent verify |
| ID-004 | HIGH | Studio IA sections | Many distinct labels alias to same routes | FIXED pending independent verify |
| ID-005 | HIGH | Create menu | Several “Create” items only navigate to lists/hubs | OPEN |
| ID-006 | HIGH | `/dashboard/pulse` | Enabled Pulse still stub-only field UX | FIXED pending independent verify |
| ID-007 | HIGH | Top bar | “All locations” with no location model/UI | FIXED pending independent verify |
| ID-008 | MEDIUM | Help control | Help icon → Settings, not help | OPEN |
| ID-009 | MEDIUM | Experiences IA | Secondary “Experiences” vs primary Experiences collision | FIXED pending independent verify (via ID-004 rename) |
| ID-010 | MEDIUM | `/dashboard/assets` | Keywords/Instagram panel as Assets first scent | OPEN |
| ID-011 | MEDIUM | Template gallery | “Save as user template (coming soon)” | OPEN |
| ID-012 | MEDIUM | Home onboarding | No provider / team / billing setup steps | OPEN |
| ID-013 | MEDIUM | Home → Automation Team | Links to workbench; Autopilot scent split | OPEN |
| ID-014 | MEDIUM | Freeform canvas | Scaffold / HONEST_DISABLED residual in builder | OPEN |
| ID-015 | MEDIUM | Create → Booking / Orders | Scaffolded commerce invited from Create | OPEN |
| ID-016 | POLISH | Sidebar readiness chips | Truncated one-word badges | OPEN |
| ID-017 | POLISH | Nav footer | Engineer-facing V1/Admin footnote | OPEN |
| ID-018 | HIGH | Platform claim surface | Overlaps owner D-013 — independent confirmation | OPEN |

---

## Defects

### ID-001 — Misleading “Studio ready” readiness chrome

| Field | Detail |
|-------|--------|
| **Route / screen** | All `/dashboard/*` — `StudioTopBar` readiness pill |
| **Expected** | Status reflects real setup/readiness (onboarding, providers, failures) or uses neutral language (“Local demo”, “Alerts”) |
| **Actual** | Layout sets `readinessLabel={alertCount > 0 ? "Attention needed" : "Studio ready"}` where `alertCount` is only `fusionOutboxEvent` FAILED count for the business |
| **Severity** | **BLOCKER** (rollout trust — green-lights incomplete studios) |
| **Discovery method** | Code review + UX review |
| **Evidence** | `app/dashboard/layout.tsx` (alertCount query + `readinessLabel`); `components/studio/studio-top-bar.tsx` (Sparkles + status display) |
| **Related pillar** | Platform / controls |
| **Owner overlap** | Related in spirit to **D-013** (platform OWNER-READY claim) — distinct symptom (chrome wording). Discovery source: **Independent** |

---

### ID-002 — Notifications control is non-functional

| Field | Detail |
|-------|--------|
| **Route / screen** | Studio top bar — Bell button |
| **Expected** | Opens activity/notifications feed or navigates to recovery (e.g. Settings outbox); or is honestly disabled with explanation |
| **Actual** | ~~`<button>` with `aria-label="Notifications"` and title “Activity feed — Functional” but **no `onClick` / `href`**. When `alertCount > 0`, a dot still appears~~ **FIXED (pending independent verify):** Bell opens a notifications dialog with empty/alert copy and CTA to `/dashboard/settings#outbox`. Badge still reflects failed outbox count only. |
| **Severity** | **HIGH** |
| **Status** | **FIXED pending independent verification** — proofs: `P-ux-spine-notifications` |
| **Discovery method** | Code review + UX review (dead control) |
| **Evidence** | `components/studio/studio-top-bar.tsx` (notifications panel + recover CTA) |
| **Related pillar** | Controls / Settings (outbox) |
| **Owner overlap** | None direct. Discovery source: **Independent** |

---

### ID-003 — Mobile primary nav omits secondary sections

| Field | Detail |
|-------|--------|
| **Route / screen** | `<lg` viewport — `MobileDashboardNav` |
| **Expected** | Operators can reach secondary destinations (Devices, Inbox, Brand, Scan, etc.) without memorizing URLs — via drawer, overflow, or hub-equivalent |
| **Actual** | ~~Mobile shows only seven primary destination chips. `featureCtx` is accepted on the component type but unused; no secondary list. Secondary IA only in desktop `DashboardNav`~~ **FIXED (pending independent verify):** “More in {destination}” disclosure lists secondary sections with readiness chips; Escape closes; links navigate. |
| **Severity** | **HIGH** |
| **Status** | **FIXED pending independent verification** — proofs: `P-ux-spine-mobile-secondary` |
| **Discovery method** | Responsive review + code review |
| **Evidence** | `components/dashboard/nav.tsx` (`MobileDashboardNav` secondary panel) |
| **Related pillar** | Studio IA / cross-cutting |
| **Owner overlap** | Adjacent to **D-002** (responsive residual) but distinct (IA omission vs zoom). Discovery source: **Independent** |

---

### ID-004 — IA alias fan-in (undiscoverable / misleading destinations)

| Field | Detail |
|-------|--------|
| **Route / screen** | Hub sidebars + `StudioHubSections` across Experiences / Tap Points / Audience / Insights / Assets |
| **Expected** | Each nav label opens a distinct surface or an anchored panel that matches the label; scaffolded items gated or Labs-grouped |
| **Actual** | ~~Distinct labels share destinations without naming the surface~~ **FIXED (pending independent verify):** Collapsed pure fan-in; shared-route rows declare `opensSurface` and honest labels (e.g. “TapTrail — not shipped · Insights”, “Campaign workbench”); Labs group for not-shipped aliases; unit guard `findDishonestAliasFanIn`. |
| **Severity** | **HIGH** |
| **Status** | **FIXED pending independent verification** — proofs: `lib/fusion/studio/__tests__/ia-honesty.test.ts` |
| **Discovery method** | UX review + code review of `STUDIO_SECTIONS` |
| **Evidence** | `lib/fusion/studio/ia.ts` (`opensSurface`, honest labels, Labs); `findDishonestAliasFanIn` |
| **Related pillar** | Studio IA / multiple pillars |
| **Owner overlap** | Complements route audit narrative in `ROUTE_AND_ACTION_RUNTIME_AUDIT.md` — not an owner D-ID. Discovery source: **Independent** |

---

### ID-005 — Create menu oversells create semantics

| Field | Detail |
|-------|--------|
| **Route / screen** | Top bar **Create** menu |
| **Expected** | Create actions start a create flow (new entity editor, modal, or wizard) or are labeled “Open …” |
| **Actual** | Examples: Email → `/dashboard/campaigns`; Form / Offer / section / Whiteboard → `/dashboard/workbench`; Template → `/dashboard/campaigns`; Moment → `/dashboard/audience` — navigation only |
| **Severity** | **HIGH** |
| **Discovery method** | UX review + code review |
| **Evidence** | `CREATE_ACTIONS` in `lib/fusion/studio/ia.ts`; menu render in `components/studio/studio-top-bar.tsx` |
| **Related pillar** | Experiences / Audience / Assets |
| **Owner overlap** | None. Discovery source: **Independent** |

---

### ID-006 — Pulse enabled path is stub-only

| Field | Detail |
|-------|--------|
| **Route / screen** | `/dashboard/pulse` when `ops.pulse` enabled |
| **Expected** | Field PWA workflows (claim, offline queue, rotation) are real or honestly disabled |
| **Actual** | ~~Page mounts claim/rotation/offline stubs~~ **FIXED (pending independent verify):** Enabled path shows fleet health + `PulseFieldHonestyPanel` with exact “not shipped” explanation and exits to Scan Mode / Campaign Groups; stub interactive UIs removed from the page. |
| **Severity** | **HIGH** |
| **Status** | **FIXED pending independent verification** — proofs: `P-ux-spine-pulse-honesty` |
| **Discovery method** | Code review + scaffold spot-check |
| **Evidence** | `app/dashboard/pulse/page.tsx`; `components/fusion/pulse/pulse-field-honesty.tsx` |
| **Related pillar** | Pulse / Tap Points |
| **Owner overlap** | None as D-ID; route audit notes Pulse alpha. Discovery source: **Independent** |

---

### ID-007 — “All locations” without location switching

| Field | Detail |
|-------|--------|
| **Route / screen** | Studio top bar business chip |
| **Expected** | Location switcher if multi-location is claimed; omit copy if single-location only |
| **Actual** | ~~Static text `All locations` with no control~~ **FIXED (pending independent verify):** Chrome reads **Workspace · This workspace** (no multi-location claim). Settings Locations row labeled “multi-facility not shipped”. |
| **Severity** | **HIGH** (trust / IA honesty) |
| **Status** | **FIXED pending independent verification** — proofs: `P-ux-spine-location-chrome` |
| **Discovery method** | UX review + code review |
| **Evidence** | `components/studio/studio-top-bar.tsx` (`studio-workspace-chip`) |
| **Related pillar** | Workspace / Settings |
| **Owner overlap** | None. Discovery source: **Independent** |

---

### ID-008 — Help control misrouted

| Field | Detail |
|-------|--------|
| **Route / screen** | Top bar CircleHelp |
| **Expected** | Help center, TapGuide, or docs; aria matches destination |
| **Actual** | `Link` to `/dashboard/settings` with `aria-label="Help and settings"` and title “Help · Settings” |
| **Severity** | **MEDIUM** |
| **Discovery method** | UX review + code review |
| **Evidence** | `components/studio/studio-top-bar.tsx` ~232–239; TapGuide itself is scaffolded alias (ID-004) |
| **Related pillar** | TapGuide / Settings |
| **Owner overlap** | None. Discovery source: **Independent** |

---

### ID-009 — Naming collision: Experiences → Experiences (workbench)

| Field | Detail |
|-------|--------|
| **Route / screen** | Experiences destination secondary nav |
| **Expected** | Distinct names for hub vs workbench (e.g. “Campaign workbench”) |
| **Actual** | ~~Section id `workbench` labeled **“Experiences”** → `/dashboard/workbench` while primary nav **Experiences** → `/dashboard/experiences`~~ **FIXED (pending independent verify):** Secondary label is now **Campaign workbench** (ID-004 honesty pass). |
| **Severity** | **MEDIUM** |
| **Status** | **FIXED pending independent verification** — covered by `ia-honesty.test.ts` |
| **Discovery method** | UX review / naming |
| **Evidence** | `lib/fusion/studio/ia.ts` `STUDIO_SECTIONS.experiences` workbench entry |
| **Related pillar** | Campaign / Experiences |
| **Owner overlap** | None. Discovery source: **Independent** |

---

### ID-010 — Assets hub first scent is Keywords (Instagram default)

| Field | Detail |
|-------|--------|
| **Route / screen** | `/dashboard/assets` |
| **Expected** | Brand Kit / media / templates as primary scent; channel tools secondary |
| **Actual** | After hub sections, page mounts `KeywordsSuggestPanel` with `defaultChannel="instagram"` before any Brand Kit embed |
| **Severity** | **MEDIUM** |
| **Discovery method** | UX review + code review |
| **Evidence** | `app/dashboard/assets/page.tsx` |
| **Related pillar** | Assets / Autopilot keywords |
| **Owner overlap** | Adjacent to owner **D-009** (Keywords analytics UI residual) — different defect (placement/scent). Discovery source: **Independent (overlap note)** |

---

### ID-011 — Coming-soon control in template gallery

| Field | Detail |
|-------|--------|
| **Route / screen** | Workbench template gallery |
| **Expected** | Control omitted or HONEST_DISABLED with next action |
| **Actual** | Button/title `Save as user template (coming soon)` |
| **Severity** | **MEDIUM** |
| **Discovery method** | Automated exploration pattern search (`coming soon`) + code review |
| **Evidence** | `components/workbench/template-gallery.tsx` |
| **Related pillar** | Campaign / Assets templates |
| **Owner overlap** | Spirit of owner **D-021** (dead chrome) — distinct instance still present. Discovery source: **Independent (overlap)** |

---

### ID-012 — Onboarding omits providers / team / billing

| Field | Detail |
|-------|--------|
| **Route / screen** | `/dashboard` readiness checklist; `/` onboarding form |
| **Expected** | Guided path includes Brand Kit depth, integrations/credentials scent, optional team invite when those matter for “live” |
| **Actual** | Checklist: brand logo/colors, campaign, device, assign only. Business form: name/website/phone only |
| **Severity** | **MEDIUM** |
| **Discovery method** | UX review + code review |
| **Evidence** | `app/dashboard/page.tsx` `onboardingSteps`; `components/onboarding/form.tsx`; `components/dashboard/onboarding-checklist.tsx` |
| **Related pillar** | Onboarding / Integrations / Brand |
| **Owner overlap** | Complements **D-006** (live credentials) as setup-path gap. Discovery source: **Independent** |

---

### ID-013 — Automation Team entry points to workbench

| Field | Detail |
|-------|--------|
| **Route / screen** | Home secondary “Automation Team” |
| **Expected** | Opens Automation Team / Autopilot settings or contextual Autopilot with clear title |
| **Actual** | `href: "/dashboard/workbench"`; Settings holds budget/ledger under Autopilot feature gate — split scent |
| **Severity** | **MEDIUM** |
| **Discovery method** | UX review + cross-workflow |
| **Evidence** | `lib/fusion/studio/ia.ts` home `autopilot` section; `app/dashboard/settings/page.tsx` Automation Team budget |
| **Related pillar** | AI / Autopilot |
| **Owner overlap** | None. Discovery source: **Independent** |

---

### ID-014 — Freeform canvas remains scaffold / honest-disabled

| Field | Detail |
|-------|--------|
| **Route / screen** | Card builder freeform panel |
| **Expected** | Either full canvas or absent from product promises |
| **Actual** | Feature-gated scaffold; disabled state honest; enabled path is bounded manifest UI, not full freeform canvas per file header |
| **Severity** | **MEDIUM** |
| **Discovery method** | Code review + V1 comparison / residual scan |
| **Evidence** | `components/fusion/builder/freeform-canvas-panel.tsx`; readiness notes in `lib/fusion/readiness/display-status.ts`; owner residual notes |
| **Related pillar** | Card builder |
| **Owner overlap** | Documented in owner residuals / matrix — **Independent confirmation**. Cross-ref owner freeform HONEST_DISABLED notes (not a single D-ID). Discovery source: **Independent (overlap)** |

---

### ID-015 — Create Booking / Order invites scaffolded commerce

| Field | Detail |
|-------|--------|
| **Route / screen** | Create menu → Booking / Order → `/dashboard/experiences/orders` |
| **Expected** | Create for beta/scaffold surfaces blocked or clearly “Open mock commerce” |
| **Actual** | Create entries exist; orders UI documents mock checkout / loyalty stubs |
| **Severity** | **MEDIUM** |
| **Discovery method** | Cross-workflow + code review |
| **Evidence** | `CREATE_ACTIONS` booking/order; `components/fusion/commerce/orders-list.tsx` mock/stub copy |
| **Related pillar** | TapCommerce |
| **Owner overlap** | None. Discovery source: **Independent** |

---

### ID-016 — Sidebar readiness chip truncation

| Field | Detail |
|-------|--------|
| **Route / screen** | Desktop secondary nav badges |
| **Expected** | Readable readiness token or icon+tooltip only |
| **Actual** | Renders first whitespace token of label (e.g. “FUNCTIONAL”, “VERIFIED”) via `readiness.label.split("—")[0].trim().split(" ")[0]` |
| **Severity** | **POLISH** |
| **Discovery method** | UX review + code review |
| **Evidence** | `components/dashboard/nav.tsx` badge span |
| **Related pillar** | Studio IA |
| **Owner overlap** | None. Discovery source: **Independent** |

---

### ID-017 — Engineer-facing nav footer

| Field | Detail |
|-------|--------|
| **Route / screen** | Desktop sidebar footer |
| **Expected** | Operator-safe support/status copy |
| **Actual** | “V1 routes remain available inside hubs. Platform Admin is under Settings.” |
| **Severity** | **POLISH** |
| **Discovery method** | UX review |
| **Evidence** | `components/dashboard/nav.tsx` footer |
| **Related pillar** | Studio IA |
| **Owner overlap** | None. Discovery source: **Independent** |

---

### ID-018 — Platform still not claimable as ready (independent confirmation)

| Field | Detail |
|-------|--------|
| **Route / screen** | Platform-wide |
| **Expected** | OWNER-READY only with zero blockers + attested VO/credentials per charter |
| **Actual** | Verification ledger explicitly retains blockers; display-status comments: no section locally OWNER-READY; live providers credentials-required |
| **Severity** | **HIGH** (claim risk) / aligns with owner **BLOCKER D-013** |
| **Discovery method** | Code review of readiness ledger + docs cross-check |
| **Evidence** | `lib/fusion/readiness/display-status.ts` `VERIFICATION_LEDGER` header + blockers; `docs/fusion/OWNER_READY_COMPLETION_MATRIX.md` |
| **Related pillar** | Platform |
| **Owner overlap** | **D-013** — Discovery source: **Independent (overlap)** — do not double-count as two separate product bugs; confirms owner blocker still true at `9965c8a` |

---

## Spot-check notes (routes / shells)

| Surface | Observation |
|---------|-------------|
| `/dashboard` | Ops home + checklist + hub sections — useful but catalog-heavy |
| `/dashboard/experiences` | Hub-only + counts |
| `/dashboard/card`, `/workbench`, `/campaigns`, `/groups` | Primary make/ship paths (not re-proved headed here) |
| `/dashboard/experiences/canvas` | TapCanvas shell mount — alpha |
| `/dashboard/experiences/tapcast` | Credential-status labeled hub (TikTok not over-weighted) |
| `/dashboard/experiences/journeys` | TapFlow (gated) |
| `/dashboard/experiences/orders` | Mock commerce |
| `/dashboard/tap-points`, `/devices`, `/scan` | Fleet + V1 device/scan paths |
| `/dashboard/pulse` | Gate + stubs |
| `/dashboard/audience`, `/inbox`, `/wallet` | Workspace + inbox + wallet credential path |
| `/dashboard/insights`, `/analytics` | Insights richer than V1 analytics alias |
| `/dashboard/assets`, `/brand` | Assets hub thin vs Brand Kit form |
| `/dashboard/settings`, `/integrations`, `/billing` | Provider/billing honesty relatively strong |
| Shells | Create + Cmd+K present; Bell dead; Help→Settings |

**Scaffold / TODO / HONEST_DISABLED / mock samples found**

- HONEST_DISABLED: freeform canvas; bg-remove live vendor (owner residual)
- Stub: Pulse field components; commerce loyalty award stub
- Coming soon: template save; marketing comparison tables (marketing only)
- Mock: email adapter when Resend unset; orders/checkout; wallet adapters (credential-gated)

---

## Explicitly not re-listed as independent primaries

These remain **owner-ledger** items; inspected docs/code confirm they still matter, but this inventory does not re-own them:

| Owner ID | Topic | Independent note |
|----------|-------|------------------|
| D-001 | True VO/NVDA | Not re-run; still OPEN per docs |
| D-002 | OS zoom | Not re-run; mobile IA gap is separate (ID-003) |
| D-006 | Live provider credentials | Confirmed scent still credentials-required |
| D-009 | Keywords analytics UI | Related scent issue ID-010 |
| D-015–D-024 | Builder interaction | Marked FIXED in owner log at prior tip — **not re-certified** in this read-only pass |

---

## Top BLOCKER / HIGH (independent) — short list

1. **ID-001 BLOCKER** — “Studio ready” false readiness signal  
2. **ID-002 HIGH** — Dead notifications control with live badge — **FIXED pending independent verify** (`P-ux-spine-notifications`)  
3. **ID-003 HIGH** — Mobile loses secondary IA — **FIXED pending independent verify** (`P-ux-spine-mobile-secondary`)  
4. **ID-004 HIGH** — Alias fan-in / fake destinations — **FIXED pending independent verify** (`ia-honesty.test.ts`)  
5. **ID-005 HIGH** — Create does not create  
6. **ID-006 HIGH** — Pulse stubs when enabled — **FIXED pending independent verify** (`P-ux-spine-pulse-honesty`)  
7. **ID-007 HIGH** — “All locations” chrome lie — **FIXED pending independent verify** (`P-ux-spine-location-chrome`)  
8. **ID-018 HIGH** — Platform claim still invalid (overlap D-013)

---

### Implementer notes (UX spine slice)

**Engineering state:** IMPLEMENTATION COMPLETE for ID-002 / ID-003 / ID-004 / ID-006 / ID-007 (not OWNER-READY / not independently verified).

**New defects discovered during implementation:** none.

**Side-fix:** ID-009 naming collision resolved by Campaign workbench rename (same IA honesty pass).

**Verifier should run:**
- `node --import tsx --test lib/fusion/studio/__tests__/ia-honesty.test.ts`
- `npx playwright test e2e/ux-spine-discoverability.spec.ts --headed` (with local DB + `BASE_URL`)
- Spot-check desktop secondary nav labels under Experiences / Audience / Settings
- Confirm Pulse stubs are absent when `ops.pulse` is enabled
- Confirm no “All locations” string in Studio chrome

---

## Related

- `UX_AND_ROLLOUT_ASSESSMENT.md` — UX / rollout framing for these findings  
- `COST_CONSCIOUS_IMPLEMENTATION_SEQUENCE.md` — J1 vs UX-spine classification for ID-001–ID-007 (“find the door”)  
- `PRODUCT_TRUTH_MAP.md` — engineering truth map (not OWNER ACCEPTED)

*End of independent inventory update for UX spine.*
