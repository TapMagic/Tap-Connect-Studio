# Cost-Conscious Implementation Sequence — TapConnect Fusion

**HEAD:** `9965c8a` · **Date:** 2026-07-24  
**Role:** Product Architect / Planner — **no implementation in this phase**  
**Operating model:** Directive §9 (Architect → Inspector → Implementer → Verifier)  
**Status language:** Directive §16 engineering states only — implementers never declare OWNER-READY / OWNER ACCEPTED.

Relative effort: **S** · **M** · **L** · **XL** (no dollar estimates).

---

## Card-centered fuse-box sequence (authorized after J1 VERIFIED)

See authoritative matrix: `docs/fusion/CARD_FUSE_BOX_CONTRACT_MATRIX.md`.

| Order | Slice | Notes |
|------:|-------|-------|
| 1 | Action Registry + Support / Ask a Question | **Active wave** — Card → Inbox/Case → human review |
| 2 | Fuse-box assembly honesty | Host Card page connections |
| 3 | Authoring workspace + Format contracts | Shared shell; no false Pages/Canva parity |
| 5+ | Offer depth · TapLoop enroll · TapFlow binding | Later; do not destabilize J1 |

J1 remains **VERIFIED** and must not regress.

---

## Exact proposed FIRST vertical journey

### **J1 — First Successful Public Tap**

**Outcome:** A workspace operator can go from Studio context → Brand-aware Card/Campaign → schedule/assign → Tap Point → public `/t` interaction → lead or Keep retention signal → Insights visibility — with honest readiness, kill-switch safety, and no false live-provider claims.

**Why this is first**

1. **Completes the platform spine** every other journey hangs on (authoring, publish, Tap Point address, public render, events).  
2. **Maximum reuse** of existing headed proofs (builder parity, group schedule, public seed, lead capture) — fill gaps instead of greenfield.  
3. **Cost-conscious:** avoids credential-heavy TapCast/messaging/wallet-live until foundations are gap-closed.  
4. **TikTok/TapCast stay first-class but not first** — omnichannel remains mock-ready without stealing sequence priority (directive).  
5. Unblocks honest PO demos of “tap works” without OWNER ACCEPTED claims.

**In scope for J1 completion slice**

| Work | Effort | Reuse |
|------|--------|-------|
| Close public `analytics_event_assert` + Insights hook | M | Events + Insights drill |
| Consent → Contact → Relationship headed matrix (minimum) | M | Existing dual-write |
| Studio resolver/time-travel preview + fallback headed proof | M | Groups `?at=` already |
| Card/Campaign archive or retire minimum + assign where-used | M | Publication/TapPoint |
| Decision-queue honesty for publish/assign failures | S–M | Home shell |
| Retain builder residuals that block demo confidence (session undo optional defer) | S–M | Builder proofs |
| Regression: tipped builder + public WYSIWYG + seed tap | S | Existing e2e |
| A11y proxy re-gate on touched routes | S | P-a11y/responsive |

**Out of scope for J1 (explicit)**

- Live TapCast / TikTok Direct Post  
- Live Meta messaging / Resend DNS  
- Live Apple/Google Wallet  
- Freeform canvas depth  
- Full multi-facility invitations  
- True VO/NVDA (PO manual J28 — gate for OWNER ACCEPTED, not for J1 engineering complete)  
- Landing page / staging cutover  

**Credential-blocked within J1:** none required for local outcome. Optional soft: Pexels/Unsplash for media richness (upload path sufficient).

**Discoverability prerequisite (independent ID-001–ID-007) — “find the door”**  
J1 (or a thin immediate prerequisite slice) must clear HIGH/BLOCKER discoverability defects that block operators from finding the real first-tap path — **without** expanding J1 into a full platform / IA rebuild. Source: `INDEPENDENTLY_DISCOVERED_DEFECT_INVENTORY.md` · UX context: `UX_AND_ROLLOUT_ASSESSMENT.md`.

| ID | Symptom | Classification |
|----|---------|----------------|
| **ID-001** | False “Studio ready” chrome | **J1 blocker** — honest readiness is in the J1 outcome; green-lights incomplete studios |
| **ID-002** | Dead notifications bell (+ live badge) | **UX spine before J1** — chrome honesty / recovery scent; not on public-tap path |
| **ID-003** | Mobile secondary IA missing | **UX spine before J1** — cross-cutting “find the door” on `<lg`; do not fold full mobile IA into J1 |
| **ID-004** | Nav alias fan-in | **UX spine before J1** — Labs/honest labels/park scaffolds; J1 only needs path-critical honesty on Brand → Card/Campaign → Groups → Tap Point → Insights, not destination rebuild |
| **ID-005** | Create menu oversells create | **J1 blocker** — operators must start real Card/Campaign authoring for the first-tap journey |
| **ID-006** | Pulse enabled but stub-only | **UX spine before J1** — honesty gate / disable or label; full Pulse stays Band 8 (J24) |
| **ID-007** | “All locations” without location model | **UX spine before J1** — chrome honesty only; multi-facility remains Band 6 (J11) |

**PO note:** Prefer a short **UX-spine-first** slice (ID-002/003/004/006/007 + shared chrome honesty) immediately before Band 1 if walkthroughs fail “find the door”; keep ID-001/ID-005 inside J1 completion. Do not absorb Pulse, full multi-location, or full IA destination builds into J1.

**UX spine status (2026-07-24):** tip `cc58c06` — **INDEPENDENT VERIFICATION PASSED** for ID-002/003/004/006/007/009 (see `BUILD_STATUS.md`).

**J1 status (2026-07-26 independent re-verify on baseline `8b67bee`):** **VERIFIED** locally — prior agent VERIFIED claim reconfirmed with fresh headed evidence; ID-001 + ID-005 closed; analytics TapEvent+Insights deltas recorded; decision-queue failure path; time-travel slot/default/end; V1 parity; J1 a11y/responsive. Schedule UI uses operator “Check:” diagnostics (not “Proof:” hooks). **Not OWNER ACCEPTED.** See `BUILD_STATUS.md` · artifacts `tmp/j1-independent-verify-20260726/`.

**Proven locally already:** builder interaction/WYSIWYG, group schedule, public seed tap, lead API+list, Home readiness, J1 residuals above.  
**Not OWNER ACCEPTED:** J1 and platform.  
**Expensive full gate:** after J3/J4 band — one full headed suite + unit/tsc/lint checkpoint (not every PR).

---

## Why this overall order is correct

```
Foundations spine (J1)
  → Authoring/retention polish (J2–J4, J6)
    → Fleet depth (J5)
      → Loyalty + service mock (J8, J7)
        → Measurement & Admin (J17, J15)
          → Automation graph (J10, J13)
            → Teams/facility (J11)   // late enough to know what to scope; early enough before multi-location claims
              → Selective live credentials (J12, J14, J16, J20, J25) one-at-a-time
                → Optional scaffolds (J21–J24)
                  → PO a11y (J28) → OWNER ACCEPTED candidates
                    → Staging (J27) → Landing last (J26)
```

- Shared systems completed **once** via journeys, not per department.  
- Credential work deferred until mock ladders are green (avoids expensive failed live loops).  
- Teams/facility after object shapes stabilize (G3) but before loyalty multi-location marketing.  
- Expensive full gates only at band checkpoints.

---

## Sequence bands

### Band 0 — Truth map (this deliverable set) · Effort S · DONE when PO accepts sequence
Architect docs only. No code.

### Band 1 — J1 First Public Tap · Effort L
See above. Shared systems completed: Brand touch, Card/Campaign, Format/Media, Groups/Pub, TapPoint, Public, Leads/events, Insights baseline, Features honesty.

**Implementer proofs:** targeted headed + unit.  
**Independent Verifier:** full J1 outcome checklist once Implementer claims IMPLEMENTATION COMPLETE.  
**Full expensive gate:** optional mid-band if churn high; otherwise end of Band 2.

### Band 2 — J3/J4/J2 authoring & brand polish · Effort L
Card retention path polish; campaign reporting; Brand Pack/media where-used. Reuse builder/keywords proofs.  
Defer freeform (J21).  
**Full gate:** unit + headed suite + Prisma migrate status (checkpoint).

### Band 3 — J6 retention prefs/consent + J5 fleet · Effort L
Consent/prefs/moments headed; Audience wallet list (mock); Sets/Rotations/replacement minimum. Pulse deferred (J24).

### Band 4 — J8 loyalty residuals + J7 inbox mock hardening + J17 Insights · Effort M–L
Referrals still deferred (J23). Live messaging still credential-blocked.  
Verifier on loyalty reverse/idempotency + Insights provenance.

### Band 5 — J10/J13 automation · Effort L
Journeys studio UI matrix; keyword analytics panel (D-009); Canvas/Flow recovery. Live OAuth effects still credential-blocked.  
TapTrail (J22) deferred.

### Band 6 — J11 teams / multi-facility · Effort XL
Membership, invitations, context switch, scoped reporting/assets. Isolation tests required.  
Unblocks multi-location loyalty/commerce honesty.

### Band 7 — Selective credentials · Effort M each (serial)
Order suggestion (adjust by PO): Resend → one productivity OAuth → Stripe test → Pexels/Unsplash → OpenAI enhance → Apple/Google Wallet → Meta messaging → **one** TapCast channel (TikTok or Meta — not all).  
Classify VERIFIED — CREDENTIALS REQUIRED until probe + failure classes green. Never swarm.

### Band 8 — Scaffolds only if needed · Effort L–XL each
J21 Freeform · J22 TapTrail · J23 Referrals · J24 Pulse.

### Band 9 — Acceptance & cutover · Effort M–XL
J28 PO VO/OS zoom · J27 staging · J26 landing last · production only with explicit PO authorization (BLOCKED until then).

---

## Shared systems completed by band (rollup)

| Band | Shared systems hardened |
|------|-------------------------|
| 1 | Publish/resolve spine, public render, events baseline |
| 2 | Authoring contracts, Brand/media lifecycle |
| 3 | Relationship/consent, Tap Point fleet ops |
| 4 | Ledger loyalty, service desk mock, Insights evidence |
| 5 | Journey execution + vocabulary governance |
| 6 | Tenancy/membership/scoping |
| 7 | Provider abstraction live paths (selective) |
| 8 | Advanced design/field (optional) |
| 9 | Acceptance + cutover safety |

---

## Existing code reused (do not rebuild)

- Shared renderers + Format / button layout  
- MediaPicker + bg-remove local-mock  
- Campaign Groups + public resolver  
- TapPoint bridge + Scan  
- TapSave/MyTap/Wallet mock  
- TapLoop APIs + UI  
- Inbox/Guardian mock  
- TapCanvas/TapFlow + journey execution tables  
- TapCast registry mock ladder  
- Keywords Brand Pack + kill-switches  
- `VERIFICATION_LEDGER` + proof JSON under `tmp/fusion-proofs/`  
- Admin kill-switch matrix  

---

## Credential-blocked (sequence awareness)

See `PROVIDER_READINESS.md`. Sequence never waits on these for Bands 1–6 local outcomes. Band 7 serializes them.

---

## What is proven locally today

- Unit 399/399 · integration 24/24 · headed 75/75 (ancestry) + tipped builder proofs through tip `9965c8a`  
- Builder D-015–D-024 FIXED  
- TapLoop, Inbox mock, Insights drill, Keywords, TapCanvas/TapFlow, TapCast mock, Admin kill-switches  
- A11y/responsive **proxies** PASS — true VO/NVDA + OS zoom **not** proven  

## Where expensive full gates occur

| Checkpoint | Includes |
|------------|----------|
| End Band 2 | Full `e2e/*.spec.ts` headed + unit + tsc + lint + migrate status |
| End Band 5 | Same + cross-system `e2e/cross-system-integration.spec.ts` |
| End Band 6 | Same + tenant/facility isolation suite (new) |
| Each live credential (Band 7) | Provider-specific cert checklist only — not full 75 unless shared contracts change |
| Pre–OWNER ACCEPTED candidate | Full gate + J28 PO a11y attestation |

## Where independent verification occurs

After each Band’s Implementer marks IMPLEMENTATION COMPLETE for the journey slice:

- Verifier re-runs journey outcome checklist without implementer narrative  
- May reopen defects; must not silently fix  
- Only Verifier may set INDEPENDENT VERIFICATION PASSED  
- Only PO may set OWNER ACCEPTED  

**Today:** zero journeys Independently Verified.

---

## What will NOT be built yet (and why)

| Item | Why deferred |
|------|--------------|
| Live TapCast swarm / TikTok Direct Post first | Foundations incomplete; credential cost; directive anti-disproportion |
| Freeform canvas | HONEST_DISABLED; not needed for J1 outcome |
| TapTrail / Pulse / Referrals | Scaffolds; depend on J10/J5/J8 maturity |
| Zapier/Make/n8n marketplace | Missing; after ExternalWorkItem live pattern |
| Landing rebuild | Charter last (F-013) |
| Railway / prod cutover | BLOCKED — explicit PO only |
| Claiming OWNER-READY | Forbidden for implementers; residuals remain |

---

## Agent staffing (cost model)

| Phase | Agents |
|-------|--------|
| Now | Architect (done) → Independent Inspector (defects/UX) |
| Band N | One Implementer on bounded journey + required shared fixes |
| After Implementer | One Independent Verifier |
| Parallel | Only if file ownership non-overlapping and reconciliation owner assigned |

Prefer targeted headed proofs during implementation; full suite at checkpoints above.

---

## Related

`PRODUCT_TRUTH_MAP.md` · `UX_AND_ROLLOUT_ASSESSMENT.md` · `INDEPENDENTLY_DISCOVERED_DEFECT_INVENTORY.md` · `VERTICAL_JOURNEY_INVENTORY.md` · `PRODUCT_DEPENDENCY_MAP.md` · `TEST_AND_VERIFICATION_ARCHITECTURE.md`
