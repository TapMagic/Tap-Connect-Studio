# Vertical Journey Inventory — TapConnect Fusion

**HEAD:** `9965c8a` · **Date:** 2026-07-24  
**Source:** Directive §11 categories + V1/Fusion discoveries from ledgers, IA, and proofs.  
**Rule:** Categories are outcome families, not narrow scripts. Complete user outcome — not UI/API alone.

**Engineering status legend:** NOT STARTED · MAPPED · IMPLEMENTATION IN PROGRESS · IMPLEMENTATION COMPLETE · AUTOMATED ACCEPTANCE PASSED · INDEPENDENT VERIFICATION PASSED · VERIFIED — CREDENTIALS REQUIRED · BLOCKED · OWNER ACCEPTANCE PENDING · OWNER ACCEPTED.

---

## Directive §11 families (canonical)

| ID | Journey family | Current engineering state | Primary shared systems | Local proof anchors | Credential-blocked? | Priority band |
|----|----------------|---------------------------|------------------------|---------------------|---------------------|---------------|
| **J1** | Organization setup → first successful public Tap | **VERIFIED** (independent re-verify 2026-07-26) · OWNER ACCEPTANCE PENDING | Tenancy, Brand, Card/Campaign, Groups, TapPoint, Public, Leads, Insights | `P-j1-*`, `P-studio-home`, `P-builder-*`, `P-campaign-group-schedule`, `P-public-seed-tap`, `P-03-lead-capture` | Soft (stock/Clerk optional) | **FIRST — engineering VERIFIED; not OWNER ACCEPTED** |
| **J2** | Brand & asset setup → reusable professional output | IMPLEMENTATION COMPLETE (core) · AUTOMATED ACCEPTANCE PASSED (media/keywords pack) | Brand Kit, Media, Keywords, where-used | `P-keywords-brand-pack*`, MediaPicker/bg-remove proofs | Live stock/bg-remove vendor | Early |
| **J3** | Card creation → publication → assignment → public use → retention → measurement | AUTOMATED ACCEPTANCE PASSED · OWNER ACCEPTANCE PENDING | Card, Pub, TapPoint, Public, TapSave, MyTap, Insights | `P-builder-card-matrix`, `P-builder-wysiwyg-public`, `P-03-tapsave-keep` | Wallet live | Early (overlaps J1) |
| **J4** | Campaign creation → scheduling → resolution → distribution → reporting | AUTOMATED ACCEPTANCE PASSED · residuals (time-travel UI, fallback, analytics assert) | Campaign, Groups, Resolver, Devices, Insights | `P-campaign-group-schedule`, `P-builder-campaign-matrix` | No | Early |
| **J5** | Device provisioning → placement → scan → operation → replacement → fleet oversight | IMPLEMENTATION COMPLETE (V1 core) · Sets/Rotations/Pulse incomplete | Devices, TapPoint, Scan, Groups, Pulse | Seed device + Scan paths; Pulse weak | No | Mid |
| **J6** | Visitor interaction → TapSave → MyTap → Wallet → contact history → follow-up | AUTOMATED ACCEPTANCE PASSED (Keep/MyTap/mock wallet) · consent/prefs residuals | TapSave, MyTap, Wallet, Contacts, Consent | `P-03-tapsave-keep`, `P-wallet-mock-tapsave` | Apple/Google Wallet | Mid |
| **J7** | Conversation receipt → Guardian → response → case → external work → resolution | AUTOMATED ACCEPTANCE PASSED (mock) | Inbox, Guardian, TapCase, ExternalWorkItem, Audit | `P-09`, `P-27` | Live Meta/Telegram/ManyChat | Mid |
| **J8** | Loyalty program → earn → evidence → ledger → reward → redeem → report | AUTOMATED ACCEPTANCE PASSED · referrals scaffold | TapLoop, Insights, (Wallet) | `P-10-taploop` | No (local) | Mid |
| **J9** | Commerce setup → customer action → transaction ref → loyalty effect → reporting | IMPLEMENTATION COMPLETE (mock) | TapCommerce, loyalty hook, Insights | Orders UI + kill-switch | Stripe live | Later |
| **J10** | Canvas/Flow design → test → approval → execution → monitor → recover → analyze | AUTOMATED ACCEPTANCE PASSED (local) · Journeys UI matrix residual | TapCanvas, TapFlow, Keywords, Outbox, Insights | `P-tapcanvas-*`, `P-tapflow-*`, `P-xsys-*` | Live OAuth effects | Mid-late |
| **J11** | Team & multi-facility setup → scoped operation → approval → reporting → admin | MAPPED / IMPLEMENTATION IN PROGRESS | Tenancy, Location, membership, scoped assets | Schema + Settings shell | Clerk roles optional | Foundational gap |
| **J12** | Provider connection → health → execution → failure → reconnect → audit | AUTOMATED ACCEPTANCE PASSED (mock productivity/TapCast readiness) | Integrations, Admin probes, OAuth routes | `P-productivity-*`, `P-tapcast-admin-*` | All live OAuth | Parallel / selective |

---

## Discovered additional journeys (V1 / Fusion)

| ID | Journey | State | Why included | Notes |
|----|---------|-------|--------------|-------|
| **J13** | Keywords Brand Pack → approve → bind trigger → Canvas/Flow → kill-switch | AUTOMATED ACCEPTANCE PASSED | Autopilot/Brand vocabulary | Live AI/trends credential-blocked; analytics UI residual (D-009) |
| **J14** | TapCast omnichannel package → variant → mock publish → Admin health (TikTok nested) | AUTOMATED ACCEPTANCE PASSED (mock) | Distribution pillar | Live = VERIFIED — CREDENTIALS REQUIRED; Snapchat mock-only honesty |
| **J15** | Admin kill-switch → API 503 → audit → re-enable | AUTOMATED ACCEPTANCE PASSED | Control plane | Required before enabling live paths |
| **J16** | Autopilot propose → accept → apply → undo | IMPLEMENTATION COMPLETE (mock) | V1 AI replacement | Live OpenAI credential-blocked |
| **J17** | Insights drill → provenance → export → TapProof | AUTOMATED ACCEPTANCE PASSED | Measurement floor | VO residual |
| **J18** | A11y / responsive owner gate (cross-surface) | AUTOMATED ACCEPTANCE PASSED (proxies) · manual VO/OS zoom OPEN | Controls | D-001/D-002 block OWNER ACCEPTED |
| **J19** | Productivity ExternalWorkItem closeout ladder | AUTOMATED ACCEPTANCE PASSED (mock 18/18) | Integrations | Live OAuth selective |
| **J20** | Email send / suppression (mock → Resend) | partially functioning | Comms | Resend + DNS credential-blocked |
| **J21** | Freeform canvas author → compile → public | architecture/scaffold only | Authoring expansion | Flag `card.builder.freeform` OFF |
| **J22** | TapTrail visitor path overlay | architecture/scaffold only | Journey analytics | Prefer after J10 |
| **J23** | Referrals earn/redeem | architecture/scaffold only | Loyalty expansion | After J8 |
| **J24** | Pulse field claim/rotation offline | architecture/scaffold only | Field ops | After J5 |
| **J25** | Billing / plan entitlement change | VERIFIED — CREDENTIALS REQUIRED | Admin | Stripe test first |
| **J26** | Landing / commercial packaging | BLOCKED / deferred by charter | Marketing | **Last** (F-013) |
| **J27** | Staging cutover rehearsal | BLOCKED until PO | Production safety | See `PRODUCTION_CUTOVER_CHECKLIST.md` |
| **J28** | True VoiceOver/NVDA + OS-native zoom attestation | NOT STARTED (PO manual) | Acceptance | `A11Y_MANUAL_CLOSEOUT.md` |

---

## Outcome completeness checklist (per journey)

For critical journeys verify (directive §13): entry · comprehension · operation · feedback · persistence · reopen · collaboration · permission · completion · final output · analytics · audit · failure · recovery · exit.

| Layer | Required when journey touches |
|-------|-------------------------------|
| Public output | J1–J4, J6, J10, J14 |
| Analytics | All customer-facing |
| Audit | Admin, kill-switch, money, loyalty reverse, messaging |
| Facility scope | J8, J11, multi-location loyalty/commerce |
| Credential honesty | J6 wallet, J7 live, J12, J14, J16, J20, J25 |

---

## Recommended completion order (summary)

See `COST_CONSCIOUS_IMPLEMENTATION_SEQUENCE.md` for rationale.

1. **J1** (first) — close residual gaps on first public Tap spine  
2. J3/J4/J2 polish as same-band (shared authoring)  
3. J6 consent/prefs · J5 fleet depth  
4. J8 · J7 mock hardening · J17  
5. J10 · J13 residuals  
6. J11 teams/facility (unblocks multi-location claims)  
7. J12/J14/J16/J20/J25 **one live credential at a time**  
8. J21–J24 scaffolds only when foundations stable  
9. J28 PO a11y before any OWNER ACCEPTED  
10. J26–J27 last  

**Independent verification:** J1 = **VERIFIED** (independent re-verify on baseline `8b67bee`, 2026-07-26). Remaining journeys J2–J28 do not yet have INDEPENDENT VERIFICATION PASSED / VERIFIED for the full journey.

---

## Related

`PRODUCT_TRUTH_MAP.md` · `PRODUCT_DEPENDENCY_MAP.md` · `COST_CONSCIOUS_IMPLEMENTATION_SEQUENCE.md`
