# V1 Capability & UX Continuity Map — TapConnect Fusion

**HEAD:** `9965c8a` · **Date:** 2026-07-24  
**Rule:** V1 is the **functional floor**, not the UX ceiling (directive §5). Prove outcomes; do not infer parity from labels alone.

**Sources:** `V1_CAPABILITY_INVENTORY.md`, `V1_BUILDER_INTERACTION_PARITY_MATRIX.md`, `OWNER_WALKTHROUGH_DEFECT_LOG.md`, charter §4–5, Studio IA.

**Status vocabulary:** PARITY · BETTER · PARTIAL · MISSING · HONEST_DISABLED · INTENTIONAL_UX_IMPROVEMENT · V1_REGRESSION (open/fixed)

---

## 1. Floor statement

| Principle | Application |
|-----------|-------------|
| V2 capability ≥ V1 | Required |
| UX may change freely | Reorganize, simplify, rename, progressive disclose |
| Must not weaken capability while improving UX | Document change + evidence |
| V1 AI | **REPLACE CLEANLY** with Autopilot / Automation Team — not preserve V1 AI architecture |

---

## 2. Surface continuity matrix

| Area | V1 floor | Fusion status | Continuity | Notes |
|------|----------|---------------|------------|-------|
| Overview / Home | Dashboard | Home + readiness badges | BETTER | Derived readiness (no false OWNER-READY) |
| Studio IA | Flat V1 routes | Seven destinations + aliases | BETTER / INTENTIONAL_UX_IMPROVEMENT | V1 hrefs fold into hubs |
| Campaign Workbench | Block editor | Workbench + Format + shared renderer | PARITY+ | Blank preview fixed via normalizer |
| Tap Card Builder | Section stack | Pages-style Format + shared `TapConnectCard` | PARITY+ | Freeform HONEST_DISABLED |
| Icon / button layout | V1 placements | Full placement matrix | PARITY | D-015–D-016 FIXED |
| Finish picker | None allowed | Honest None | PARITY | D-017 FIXED (was metallic lie) |
| Media / galleries | Upload + stock | MediaPicker + Esc/focus | PARITY | D-018 FIXED; stock live credential-blocked |
| Remove Background | V1 expectation | local-mock non-destructive | PARITY (mock) | D-019 FIXED; live vendor HONEST_DISABLED |
| WYSIWYG → public | Same render | Shared renderer + dedicated proof device | PARITY | D-023/D-024 FIXED |
| Campaign Groups / schedule | Slots | Preserved + `?at=` | PARITY | Studio time-travel UI PARTIAL |
| Devices / Scan | CRUD + claim | Preserved + TapPoint bridge | PARITY / PARTIAL | Fleet depth incomplete |
| Public `/t` | Resolver | Preserved + TapPointAddress fallback | PARITY | analytics_event_assert residual |
| Leads | List + capture | Dual-write Contact/Consent | BETTER | Consent matrix PARTIAL |
| Analytics | V1 analytics | Insights hub + TapProof + V1 alias | BETTER | Alias preserved |
| Brand Kit | Logo/colors | + Keywords Brand Pack | BETTER | Analytics panel residual |
| Integrations | Env gates | Feature Registry + probes | BETTER | |
| Email | Resend paths | Mock + live gated | PARITY (mock) | Live credential-blocked |
| Billing UI | Present | Stripe-ready domain | PARITY (UI) | Live credential-blocked |
| Platform Admin | Landing CMS | Expanded Admin + kill-switches | BETTER | |
| MyTap | Stub | Privacy-safe projection + prefs | BETTER | VO prefs OPEN |
| AI | `ai-generate` | Autopilot / Keywords | INTENTIONAL REPLACE | Not V1 architecture parity |
| Freeform | Advanced | Scaffold behind flag | HONEST_DISABLED | Not a silent loss |
| Block library gaps | age_gate, feedback_form, image_gallery | Restored to ADDABLE (PO decision) | PARITY target | Confirm headed matrix if needed |

---

## 3. Builder interaction continuity (detail)

Authoritative matrix: `V1_BUILDER_INTERACTION_PARITY_MATRIX.md`.

| Theme | Defect | Continuity result |
|-------|--------|-------------------|
| Icon placement | D-015 | FIXED — PARITY |
| Layout polish / wrap | D-016 / D-022 | FIXED — PARITY / BETTER |
| Finish None | D-017 | FIXED — PARITY |
| Panel Esc / focus | D-018 / D-020 | FIXED — BETTER consistency |
| Remove Background | D-019 | FIXED (local-mock) |
| Dead controls | D-021 | FIXED — HONEST_DISABLED or wired |
| Editor↔public layout | D-023 / D-024 | FIXED — PARITY |

**Open builder residuals (not regressions of fixed items):** freeform scaffold; live stock credentials; session undo lost on full refresh; platform VO/NVDA.

---

## 4. Intentional UX improvements already made

Documented improvements (preserve capability, improve experience):

| Change | Original V1 | Improved outcome | Continuity effect | Evidence |
|--------|-------------|------------------|-------------------|----------|
| Seven-destination Studio IA | Many top-level routes | Clearer objectives; aliases preserve deep links | No capability loss | `ia.ts`, hubs |
| TikTok nested under TapCast | Risk of sibling product | Omnichannel authority; TikTok first-class channel | Capability preserved; IA honesty | PO decision 2026-07-23 |
| Derived readiness badges | Static “ready” risk | Honest VERIFIED — CREDENTIALS REQUIRED / residuals | Trust | `display-status.ts` |
| Shared public/editor renderer | Drift risk | True WYSIWYG | Floor + increase | `P-builder-wysiwyg-public` |
| Kill-switch control plane | Env-only gates | Admin reason + audit + 503 | Increase | `P-admin-killswitch-matrix` |
| Insights TapProof / provenance | Classic analytics | Evidence classes + drill | Increase | Insights proofs |
| Autopilot replaces V1 AI | Legacy generate | Governed accept/apply/undo + budget hooks | Intentional replace | Autopilot APIs |
| Brand Vocabulary / Keywords | Limited | Contextual Brand Pack + kill-switch | Increase | Keywords proofs |
| Inbox Guardian as text reasons | Opaque blocks | Deterministic, readable | Increase | P-27 |
| Snapchat honesty | Overclaim risk | MOCK ONLY / NO LIVE PUBLISH | Trust | TapCast Snapchat proof |

---

## 5. Open / risk V1 continuity items

| Item | Risk | Severity | Action |
|------|------|----------|--------|
| True VO/NVDA not run | A11y floor for OWNER ACCEPTED | HIGH (D-001) | PO manual closeout |
| OS-native zoom | Responsive floor | HIGH (D-002) | PO manual |
| Consent → Contact → Relationship headed matrix | Relationship floor | MEDIUM | Journey J6 |
| Public analytics event assert | Measurement floor | MEDIUM | J1 residual |
| Freeform not available | Advanced design floor | MEDIUM | Honest disabled until flag |
| Sets/Rotations dedicated UX | Fleet floor | MEDIUM | J5 |
| Session undo across refresh | Authoring recovery | MEDIUM | Builder residual |
| Landing page | Marketing | Deferred | Charter last |

No open **HIGH V1 interaction regressions** remain for builder D-015–D-024 (FIXED locally). Platform still OWNER ACCEPTANCE PENDING.

---

## 6. How to document future UX changes

When changing a V1 interaction, record:

1. Original capability  
2. Reason for change  
3. Improved outcome  
4. Preserved or expanded behavior  
5. Migration / continuity effect  
6. Verification evidence  

Append rows to this file + defect log if any capability risk.

---

## Related

`V1_BUILDER_INTERACTION_PARITY_MATRIX.md` · `V1_CAPABILITY_INVENTORY.md` · `PRODUCT_TRUTH_MAP.md`
