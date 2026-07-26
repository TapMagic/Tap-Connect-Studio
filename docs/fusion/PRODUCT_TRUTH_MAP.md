# Product Truth Map — TapConnect Fusion

**Role:** Product Architect / Planner (read-only)  
**Branch:** `tapconnect-v1-v2-fusion`  
**HEAD at authorship:** `9965c8a409e4f47b67a5c47a7d6da96dc41f9f97`  
**Date:** 2026-07-24  
**Rule:** No app implementation. Classifications are engineering truth — **not** OWNER ACCEPTED. Implementation agents may not declare OWNER-READY; only PO assigns OWNER ACCEPTED (directive §16).

**Primary evidence reused (not re-audited):**  
`BUILD_STATUS.md`, `OWNER_READY_COMPLETION_MATRIX.md`, `OWNER_WALKTHROUGH_DEFECT_LOG.md`, `V1_BUILDER_INTERACTION_PARITY_MATRIX.md`, `PROVIDER_READINESS.md`, `A11Y_MANUAL_CLOSEOUT.md`, `ROUTE_AND_ACTION_RUNTIME_AUDIT.md`, `lib/fusion/readiness/display-status.ts` (`VERIFICATION_LEDGER`), `lib/fusion/studio/ia.ts`, `tmp/fusion-proofs/*`, headed e2e suite ancestry.

**Platform overall:** **AUTOMATED ACCEPTANCE PASSED** on many local workflows · UX spine discoverability **INDEPENDENT VERIFICATION PASSED** (ID-002/003/004/006/007/009) · **OWNER ACCEPTANCE PENDING** · live providers **VERIFIED — CREDENTIALS REQUIRED**.

---

## Classification vocabulary (directive §10)

| Label | Meaning |
|-------|---------|
| functioning | Real user outcome works end-to-end in local mock/adapter path |
| partially functioning | Core path works; matrices / edges incomplete |
| UI present but workflow incomplete | Discoverable UI; create/manage/complete outcome incomplete |
| architecture/scaffold only | Schema, route, flag, or shell without full workflow |
| missing | Required capability not present |
| duplicated/conflicting | Parallel owners / conflicting implementations |
| credential-blocked | Local mock OK; live path needs external credentials / review |
| inaccessible/undiscoverable | Exists but weak IA scent / wrong nav / Admin-hidden without path |
| V1 regression | Fusion broke or lacks expected V1 interaction |
| verified local workflow | Headed + persistence proof on isolated DB (implementer evidence) |
| independently verified | Independent Verifier closed findings (UX spine ID-002/003/004/006/007/009 @ `cc58c06`) |

**Engineering states (directive §16):** NOT STARTED · MAPPED · IMPLEMENTATION IN PROGRESS · IMPLEMENTATION COMPLETE · AUTOMATED ACCEPTANCE PASSED · INDEPENDENT VERIFICATION PASSED · VERIFIED — CREDENTIALS REQUIRED · BLOCKED · OWNER ACCEPTANCE PENDING · OWNER ACCEPTED.

---

## Operating model note (directive §9)

| Role | Duty |
|------|------|
| **A. Architect / Planner** | This document set — map truth, dependencies, journeys, sequence. No implementation. |
| **B. Independent Inspector** | Explore app; find defects; compare V1/reference; evidence only; no fix/self-certify. |
| **C. Implementer** | Bounded journey + defects; complete workflow + shared foundations + regression proof; never declare OWNER-READY. |
| **D. Independent Verifier** | Re-test journey without implementer narrative; close/reopen on evidence; no silent repair. |

Prefer targeted proofs per journey; expensive full local gates only at integrated checkpoints. Parallel only when dependency-isolated.

---

## 1. Studio / global experience

| Field | Record |
|-------|--------|
| **Classification** | partially functioning · verified local workflow (Home shell) · UX spine discoverability **independently verified** (ID-002/003/004/006/007/009 @ `cc58c06`) |
| **Engineering state** | AUTOMATED ACCEPTANCE PASSED (P-studio-home) · UX spine **INDEPENDENT VERIFICATION PASSED** · J1 **VERIFIED** (local) · OWNER ACCEPTANCE PENDING |
| **Real user outcome** | Operator opens Studio Home, sees readiness signals, jumps to hubs |
| **Current** | Seven-nav IA wired (`ia.ts`); honest alias labels + Labs; mobile “More in …” secondary; notifications → outbox recovery; workspace chrome (no “All locations”); Pulse honesty panel when enabled |
| **Intended** | Decision queue, first-run, rich activity feed, facility context switch, guided first Tap |
| **V1** | Overview dashboard preserved |
| **Shared deps** | Feature registry, Clerk/session, integrations probes, seed |
| **Downstream** | All hubs |
| **Lifecycle** | N/A (shell) — decision items lack full create→resolve lifecycle |
| **Team/facility** | Multi-location not shipped (honest chrome); dedicated UX still Band 6 |
| **Admin / audit / analytics** | Readiness panel; limited Home analytics |
| **Responsive / a11y** | Owner-gate proxies PASS; true VO/NVDA + OS zoom OPEN (D-001/D-002) |
| **Failure/recovery** | Partial decision-queue; outbox recovery scent via notifications |
| **Public-output** | Indirect (readiness honesty) |
| **Evidence** | `P-studio-home`, `P-ux-spine-*`, `ia-honesty.test.ts`, ledger `upcoming`/`controls_a11y_responsive` |
| **Remaining** | Onboarding depth; facility switcher; VO/OS zoom; platform OWNER ACCEPTED |

| Subcomponent | Class |
|--------------|-------|
| Global Create / search | partially functioning (Create oversell = ID-005 **FIXED / VERIFIED** via `P-j1-create-honesty`) |
| Notifications | functioning (outbox recovery panel) · independently verified |
| Pulse field shell | partially functioning (fleet + honesty; claim/offline not shipped) · independently verified |
| First-run / help | UI present but workflow incomplete |

---

## 2. Authoring (Card + Campaign builders)

| Field | Record |
|-------|--------|
| **Classification** | functioning (structured) · verified local workflow · V1 regressions D-015–D-024 **FIXED** · freeform = architecture/scaffold only · stock/bg-remove live = credential-blocked · **not** independently verified |
| **Engineering state** | AUTOMATED ACCEPTANCE PASSED (builder tipped proofs @ ancestry incl. tip `9965c8a`) · OWNER ACCEPTANCE PENDING |
| **Real user outcome** | Author Card/Campaign with WYSIWYG preview; save/publish; public matches editor |
| **Current** | Shared renderers (`CampaignPageRenderer`, `TapConnectCard`); Format + icon placement; Finish None; Esc/focus exits; Remove Background **local-mock**; exploratory dead-controls sweep PASS |
| **Intended** | Premium Pages-style Format; freeform canvas; durable session undo across refresh; live stock/logo/bg-remove vendors |
| **V1** | Floor restored for interaction parity (see continuity map) |
| **Shared deps** | Brand Kit, MediaPicker, R2/UploadThing, Feature `card.builder.*`, public CSS |
| **Downstream** | Groups, devices, `/t`, TapSave, Insights |
| **Lifecycle** | Create/edit/preview/publish/version/rollback proved; archive/where-used incomplete |
| **Team/facility** | Workspace-scoped; facility-scoped authoring incomplete |
| **Admin** | Feature flags; freeform behind `card.builder.freeform` HONEST_DISABLED |
| **Audit / analytics** | Save/publish events partial; public TapEvent → Insights **VERIFIED** (`P-j1-analytics-event-assert`) |
| **Responsive / a11y** | Headed stress + a11y proxy PASS; VO residual |
| **Failure/recovery** | `P-builder-failure-recovery` |
| **Public-output** | **Verified local** editor↔public (`P-builder-wysiwyg-public`) |
| **Evidence** | `P-builder-*`, `V1_BUILDER_INTERACTION_PARITY_MATRIX.md`, D-015–D-024 FIXED |
| **Remaining** | Freeform depth; live stock/bg-remove creds; session undo persistence; VO; block-library archaeology residual (`age_gate` etc. restored to ADDABLE — confirm matrix) |

---

## 3. Campaigns / Groups / calendar / resolver

| Field | Record |
|-------|--------|
| **Classification** | functioning · verified local workflow · partially functioning (Studio time-travel UI / fallback matrix) |
| **Engineering state** | AUTOMATED ACCEPTANCE PASSED (`P-campaign-group-schedule`) · OWNER ACCEPTANCE PENDING |
| **Real user outcome** | Schedule campaigns on groups; public resolver serves correct content at time |
| **Current** | Groups + slots; public `?at=` time-travel; seed schedule works |
| **Intended** | Full Studio resolver preview workspace; explicit fallback path headed proof |
| **V1** | Preserved |
| **Shared deps** | Campaigns, devices/Tap Points, publications |
| **Downstream** | Public tap, Insights |
| **Lifecycle** | Schedule create/edit strong; release/archive weaker |
| **Evidence** | ledger `calendar`/`resolver`; `P-campaign-group-schedule` |
| **Remaining** | `studio_time_travel_ui_matrix`, `fallback_path_browser_proof` |

---

## 4. Tap Points / devices / Scan / fleet

| Field | Record |
|-------|--------|
| **Classification** | partially functioning · verified local (seed device + public) · Sets/Rotations/Placement dedicated UX incomplete · Pulse scaffold |
| **Engineering state** | IMPLEMENTATION COMPLETE (V1 paths) · AUTOMATED ACCEPTANCE PASSED (public seed) · OWNER ACCEPTANCE PENDING |
| **Real user outcome** | Provision device/Tap Point; assign campaign; public address resolves |
| **Current** | Device CRUD, Scan Mode, TapPoint bridge, permanent address |
| **Intended** | Full fleet ops: sets, rotations, replacement, capacity, Pulse offline |
| **V1** | Devices/Scan preserved |
| **Shared deps** | Campaign groups, publications, Cody DeviceUnit/TapPoint separation (bridge) |
| **Lifecycle** | Provision/activate/claim strong; replacement/transfer partial |
| **Team/facility** | Location labels partial |
| **Evidence** | `P-public-seed-tap`, tap-point-bridge |
| **Remaining** | Dedicated Sets/Rotations UX; Pulse; fleet depth |

---

## 5. Audience (leads, contacts, TapSave, MyTap, consent)

| Field | Record |
|-------|--------|
| **Classification** | partially functioning · verified local (lead capture, Keep→MyTap) · consent→relationship matrix incomplete · prefs/moments headed residual |
| **Engineering state** | AUTOMATED ACCEPTANCE PASSED (P-03-*) · OWNER ACCEPTANCE PENDING |
| **Real user outcome** | Visitor submits lead / Keep Card; operator sees lead; visitor opens MyTap |
| **Current** | Leads list; dual-write Contact/Consent on capture; MyTap projection; Moments service |
| **Intended** | Full consent/channel matrix; segmentation; customer timeline; prefs headed |
| **V1** | Leads preserved; MyTap expanded |
| **Shared deps** | Public tap, Brand Kit card, Wallet, TapLoop |
| **Lifecycle** | Lead create strong; contact merge/archive partial |
| **A11y** | MyTap prefs VO checklist OPEN (D-011) |
| **Evidence** | `P-03-lead-capture`, `P-03-tapsave-keep` |
| **Remaining** | consent_relationship_matrix; prefs_moments_headed; Audience wallet list headed |

---

## 6. Wallet

| Field | Record |
|-------|--------|
| **Classification** | partially functioning (mock) · credential-blocked (Apple/Google live) · verified local mock |
| **Engineering state** | VERIFIED — CREDENTIALS REQUIRED (live) · AUTOMATED ACCEPTANCE PASSED (mock) |
| **Real user outcome** | Issue pass after Keep; manage lifecycle |
| **Current** | Mock adapter via `/api/mytap/wallet`; Audience wallet UI |
| **Intended** | Live Apple/Google issue/update/revoke/reissue |
| **Evidence** | `P-wallet-mock-tapsave` |
| **Remaining** | Live certs; Audience list headed matrix |

---

## 7. Communications (Email, Inbox, Guardian, TapCase, TapGuide)

| Field | Record |
|-------|--------|
| **Classification** | Inbox mock = functioning · verified local · live messaging = credential-blocked · Email mock = partially functioning · TapGuide = architecture/scaffold only |
| **Engineering state** | AUTOMATED ACCEPTANCE PASSED (P-09, P-27) · live = VERIFIED — CREDENTIALS REQUIRED |
| **Real user outcome** | Operator handles thread, Guardian decision, TapCase, attachments |
| **Current** | Full mock operator matrix; kill-switch 503; Meta/Telegram/ManyChat not live |
| **Intended** | Live Meta family + SMS + email send with DNS |
| **Evidence** | `P-09-inbox-operator`, `P-27-inbox-guardian-matrix` |
| **Remaining** | Live transports; TapGuide; VO residual |

---

## 8. Loyalty (TapLoop)

| Field | Record |
|-------|--------|
| **Classification** | functioning · verified local · referrals = architecture/scaffold only · not independently verified |
| **Engineering state** | AUTOMATED ACCEPTANCE PASSED (`P-10-taploop`) · OWNER ACCEPTANCE PENDING |
| **Real user outcome** | Create program; enroll; award/redeem/adjust/reverse; audit; Insights KPI hooks |
| **Current** | Program UI + append-only ledger APIs |
| **Intended** | Multi-location programs; Wallet/CRM/commerce deep links; referrals |
| **Evidence** | `P-10-taploop`, ledger `taploop` |
| **Remaining** | Referrals; VO; multi-facility loyalty |

---

## 9. Commerce (TapCommerce)

| Field | Record |
|-------|--------|
| **Classification** | partially functioning (mock checkout) · bookings/invoices scaffold · Stripe live credential-blocked |
| **Engineering state** | IMPLEMENTATION COMPLETE (mock) · VERIFIED — CREDENTIALS REQUIRED (Stripe) |
| **Real user outcome** | Mock order/cancel/refund; Insights commerce view |
| **Evidence** | Feature `commerce.tapcommerce`; orders route |
| **Remaining** | Catalog depth; booking; live payment; financial reporting |

---

## 10. Journeys / Canvas / Flow / Trail

| Field | Record |
|-------|--------|
| **Classification** | TapFlow = partially functioning · verified local (lifecycle + live visitor queue) · TapCanvas = partially functioning · verified local · TapTrail = architecture/scaffold only · live OAuth effects credential-blocked |
| **Engineering state** | AUTOMATED ACCEPTANCE PASSED (P-tapflow-*, P-tapcanvas-*) · live = VERIFIED — CREDENTIALS REQUIRED |
| **Real user outcome** | Design canvas/journey; bind keywords/campaigns; publish; public tap creates JourneyExecution; kill-switch |
| **Current** | JourneyPublishedVersion/Execution migrations; mock provider effects; comments/approvals proofs |
| **Intended** | Full Journeys studio UI matrix; live email/SMS effects; TapTrail overlays |
| **Evidence** | `P-tapcanvas-*`, `P-tapflow-*`, `P-xsys-*` |
| **Remaining** | `full_journeys_studio_ui_matrix`; live OAuth; TapTrail |

---

## 11. Distribution / TapCast (TikTok first-class inside)

| Field | Record |
|-------|--------|
| **Classification** | Omnichannel registry/mock = partially functioning · verified local mock · all live channels credential-blocked · Snapchat = MOCK ONLY / NO LIVE PUBLISH · TikTok nested correctly (not Experiences sibling) |
| **Engineering state** | AUTOMATED ACCEPTANCE PASSED (mock ladder) · VERIFIED — CREDENTIALS REQUIRED (live) |
| **Real user outcome** | Prepare channel variants; mock publish; Admin health; TikTok coexist under TapCast |
| **Current** | Channel registry, variants, audit log, Snapchat honest packaging |
| **Intended** | Live OAuth/publish per channel with failure classes |
| **Evidence** | `P-tapcast-*`, `P-tiktok-mock-persist`, `PROVIDER_READINESS.md` |
| **Remaining** | Live creds one channel at a time; full a11y ladder matrix — **do not overweight TikTok vs foundations** |

---

## 12. AI / Automation / Keywords

| Field | Record |
|-------|--------|
| **Classification** | Autopilot mock = partially functioning · Keywords local grounded = functioning · verified local · live OpenAI/trends = credential-blocked · dedicated Keywords analytics UI = UI present but workflow incomplete (D-009) · visual-reference = architecture/scaffold only |
| **Engineering state** | AUTOMATED ACCEPTANCE PASSED (P-keywords-*) · live AI = VERIFIED — CREDENTIALS REQUIRED |
| **Real user outcome** | Suggest/approve/reject Brand Pack terms; kill-switch; Autopilot accept→apply→undo without key |
| **Evidence** | `P-keywords-*`, ledger `keywords_brand_pack` |
| **Remaining** | Analytics panel; live enhance/trends; VO |

---

## 13. Brand / Assets

| Field | Record |
|-------|--------|
| **Classification** | Brand Kit + media upload = functioning · stock/logo live search = credential-blocked · bg-remove local-mock verified · rights/packs/marketplace scaffold · where-used partial |
| **Engineering state** | AUTOMATED ACCEPTANCE PASSED (builder media + keywords pack) · OWNER ACCEPTANCE PENDING |
| **Evidence** | MediaPicker proofs; Brand Kit; `P-builder-remove-background` |
| **Remaining** | Live Pexels/Unsplash/Logo.dev; asset lifecycle where-used; block packs |

---

## 14. Insights / TapProof

| Field | Record |
|-------|--------|
| **Classification** | functioning · verified local (export + drill + provenance) · messaging/social views scaffold · public analytics_event_assert **VERIFIED** (J1) · Insights OWNER ACCEPTED still pending |
| **Engineering state** | AUTOMATED ACCEPTANCE PASSED · OWNER ACCEPTANCE PENDING |
| **Evidence** | `P-11-insights-shell`, `P-insights-export`, `P-insights-drilldown-provenance` |
| **Remaining** | VO; TapTrust/Sense/Graph/Reach foundations (Admin-hidden) |

---

## 15. Teams / multi-facility / organizations

| Field | Record |
|-------|--------|
| **Classification** | partially functioning (Business/Location/BusinessUser schema) · UI present but workflow incomplete · invitations/approvals/scoped assets weak · safe context switching incomplete |
| **Engineering state** | MAPPED → IMPLEMENTATION IN PROGRESS |
| **Real user outcome** | Multi-location operators with scoped data/providers |
| **Current** | Settings shell; Location model; Clerk roles when on |
| **Intended** | Full membership, invitations, facility-scoped reporting/assets/providers |
| **Evidence** | Schema + Settings routes; ROUTE audit |
| **Remaining** | End-to-end facility journey; isolation tests |

---

## 16. Admin / Feature Registry / billing

| Field | Record |
|-------|--------|
| **Classification** | Kill-switch matrix = functioning · verified local · Platform Admin shell = partially functioning · Stripe = credential-blocked · table a11y residual (D-010) |
| **Engineering state** | AUTOMATED ACCEPTANCE PASSED (`P-admin-killswitch-matrix`) · billing live = VERIFIED — CREDENTIALS REQUIRED · production cutover = BLOCKED |
| **Evidence** | `ADMIN_CONTROL_PLANE_SPEC.md`, kill-switch proofs |
| **Remaining** | VO on registry tables; Stripe test products; staging |

---

## 17. Integrations / productivity / external work

| Field | Record |
|-------|--------|
| **Classification** | Mock closeout = verified local · live OAuth = credential-blocked · Zapier/Make/n8n etc. largely missing/scaffold |
| **Engineering state** | AUTOMATED ACCEPTANCE PASSED (P-productivity-*) · VERIFIED — CREDENTIALS REQUIRED (live) |
| **Evidence** | `P-productivity-ui`, `P-productivity-closeout-18` |
| **Remaining** | One live OAuth provider at a time |

---

## 18. Foundations

| Subsystem | Classification | Notes |
|-----------|----------------|-------|
| Tenancy / Prisma spine | functioning | 11 migrations on isolated DB |
| Feature registry + resolve | functioning | Kill-switch audited |
| Immutable publication / snapshots | partially functioning | PublicationSnapshot present |
| DeviceUnit vs TapPoint | partially functioning | Bridge wired; dual vocabulary during migration |
| Outbox / retries | functioning | Drain/dead-letter |
| Idempotency | partially functioning | Loyalty + journey provider events |
| A11y / responsive proxies | verified local workflow | True VO/NVDA + OS zoom OPEN |
| Observability | partially functioning | Insights + Admin health |
| Production cutover | BLOCKED | Explicit PO authorization |
| Landing / commercial packaging | intentionally deferred | Charter §38 / F-013 |

---

## Cross-cutting residuals (platform holes)

1. **D-001 / D-002** — True VoiceOver/NVDA + OS-native zoom (blocks OWNER ACCEPTED everywhere)  
2. **D-006** — Live provider credentials (TapCast, messaging, wallet, AI, stock, Stripe)  
3. **D-013** — Platform must not claim OWNER-READY / OWNER ACCEPTED  
4. **Object lifecycle gaps** — archive, where-used, facility scope (see `OBJECT_LIFECYCLE_GAP_REPORT.md`)  
5. **Teams / multi-facility** incomplete  
6. **Analytics event assert** on public distribution  
7. **Freeform / TapTrail / TapGuide / referrals / Pulse** scaffolds  
8. **Independent verification** — not started for any pillar  

---

## Evidence index (local)

| Gate | Result (ledger / BUILD_STATUS) |
|------|--------------------------------|
| Unit | 399/399 (builder parity checkpoint ancestry) |
| Integration unit | 24/24 `owner-ready-integration` |
| Headed e2e | 75/75 prior re-gate; tipped builder proofs retained through `9965c8a` |
| Proof JSON | `tmp/fusion-proofs/` (~77 records) |
| Isolated DB | `tapconnect_fusion_dev` @ `127.0.0.1:5433` |
| Railway / prod | Untouched |

---

## Related deliverables

- `PRODUCT_DEPENDENCY_MAP.md`  
- `VERTICAL_JOURNEY_INVENTORY.md`  
- `V1_CAPABILITY_UX_CONTINUITY_MAP.md`  
- `OBJECT_LIFECYCLE_GAP_REPORT.md`  
- `COST_CONSCIOUS_IMPLEMENTATION_SEQUENCE.md`  
- `TEST_AND_VERIFICATION_ARCHITECTURE.md`  
- `UX_AND_ROLLOUT_ASSESSMENT.md`  
- `INDEPENDENTLY_DISCOVERED_DEFECT_INVENTORY.md`  
