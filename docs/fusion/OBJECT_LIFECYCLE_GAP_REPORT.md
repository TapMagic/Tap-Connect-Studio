# Object Lifecycle Gap Report — TapConnect Fusion

**HEAD:** `9965c8a` · **Date:** 2026-07-24  
**Directive:** §4 Complete Object Lifecycles  
**Rule:** Do not expose objects that can be created but cannot be responsibly managed afterward.

Lifecycle dimensions assessed: creation · inspection · editing · organization · relationships · duplication/reuse · state transitions · history · permission · versioning · archival/deletion · recovery · replacement · where-used · audit · analytics · failure handling.

**Score:** Strong / Partial / Weak / Missing / N/A · Credential-gated noted separately.

---

## Summary heatmap

| Object | Create | Manage/Edit | States | Version/History | Archive/Delete | Where-used | Audit | Analytics | Facility scope | Overall gap |
|--------|--------|-------------|--------|-----------------|----------------|------------|-------|-----------|----------------|-------------|
| Card | Strong | Strong | Partial | Partial | Weak | Weak | Partial | Partial | Weak | Medium |
| Campaign / Experience | Strong | Strong | Strong | Strong (versions) | Partial | Partial | Partial | Partial | Weak | Medium |
| Campaign Group / schedule | Strong | Strong | Strong | Weak | Partial | Partial | Weak | Partial | Weak | Medium |
| Publication / release | Strong | Inspect | Strong | Strong (immutable intent) | Weak | Partial | Partial | Weak | Weak | Medium |
| Tap Point / address | Strong | Partial | Partial | Weak | Weak | Partial | Weak | Partial | Partial | Medium-High |
| Device / DeviceUnit | Strong | Strong | Partial | Weak | Partial | Partial | Weak | Partial | Partial | Medium |
| Device set / rotation | Partial | Weak | Weak | Missing | Missing | Weak | Missing | Weak | Weak | High |
| Asset / media | Strong | Strong | Partial | Weak | Partial | Partial (bg-remove util) | Weak | Weak | Weak | Medium |
| Brand Kit / vocabulary | Strong | Strong | Strong (lock/archive terms) | Partial | Partial | Partial | Partial | Weak (D-009) | Weak | Medium |
| Template / block pack | Partial | Weak | Weak | Missing | Missing | Weak | Missing | Missing | Missing | High |
| Contact / Lead | Strong | Partial | Partial | Weak | Weak | Partial | Weak | Partial | Weak | Medium |
| Relationship / TapSave | Strong | Partial | Partial | Moments partial | Weak | Partial | Weak | Partial | Weak | Medium |
| MyTap prefs | Partial | Partial | Partial | Weak | Weak | N/A | Weak | Weak | N/A | Medium |
| Wallet pass | Strong (mock) | Partial | Partial | Weak | Revoke partial | Weak | Weak | Weak | Weak | High (live) |
| Conversation / Inbox | Strong | Strong | Strong | Strong | Partial | Partial | Strong | Partial | Weak | Medium |
| TapCase / work item | Strong | Strong | Strong | Partial | Partial | Partial | Strong | Partial | Weak | Medium |
| ExternalWorkItem | Strong (mock) | Partial | Partial | Weak | Weak | Partial | Partial | Weak | Weak | Medium |
| TapFlow / Journey | Strong | Strong | Strong | Strong (published version) | Partial | Partial | Partial | Partial | Weak | Medium |
| TapCanvas board | Strong | Strong | Partial | Strong (restore proof) | Partial | Partial | Partial | Weak | Weak | Medium |
| Loyalty program / reward | Strong | Strong | Strong | Ledger history Strong | Partial | Partial | Strong | Partial | Weak | Medium |
| Loyalty membership | Strong | Strong | Strong | Strong | Partial | Partial | Strong | Partial | Weak | Medium |
| Commerce order | Strong (mock) | Partial | Strong (cancel/refund) | Weak | Weak | Weak | Weak | Partial | Weak | Medium-High |
| Provider connection | Strong (mock) | Partial | Partial | Weak | Disconnect partial | N/A | Partial | Partial | Weak | High (live) |
| Team membership | Partial | Weak | Weak | Missing | Weak | Missing | Weak | Missing | Weak | **High** |
| Facility / location | Partial | Weak | Weak | Missing | Weak | Weak | Weak | Weak | — | **High** |
| Report / saved view | Partial | Partial | Partial | Weak | Weak | N/A | Weak | — | Weak | Medium |
| Automation / Autopilot output | Strong | Accept/undo | Partial | Provenance partial | Weak | Weak | Partial | Weak | Weak | Medium |
| Feature override | Strong | Strong | Strong | Audit Strong | Re-enable Strong | N/A | Strong | Weak | Global-first | Low-Medium |
| AI Keyword term / Brand Pack | Strong | Strong | Strong | Partial | Archive/restore | Bind where-used partial | Partial | Weak | Weak | Medium |

---

## Critical gaps (cross-platform)

### G1 — Archival / soft-delete consistency
Many objects support create/edit but lack uniform archive, restore, and retention policy UX (Cards, assets, contacts, Tap Points, canvas boards). Risk: operators accumulate undeletable clutter or hard-delete without recovery.

### G2 — Where-used awareness
Operators cannot reliably answer “what breaks if I change/delete this?” across Brand assets, vocabulary terms, campaigns on devices, keyword triggers, and Tap Points. Partial util exists for bg-remove where-used; not productized.

### G3 — Team / facility lifecycle
Business/Location/BusinessUser exist in schema; invitations, ownership transfer, scoped sharing, cross-location visibility, and safe context switching are incomplete. Blocks honest multi-facility claims for loyalty/commerce/reporting.

### G4 — Device sets / rotations / replacement
V1 Groups/devices aliases cover some scheduling; dedicated set/rotation/replacement lifecycles remain weak relative to directive Tap Points ops.

### G5 — Template / reusable section packs
Scaffold/alpha — create without marketplace-grade manage/version/rights.

### G6 — Wallet live lifecycle
Mock issue proved; live update/revoke/reissue/restore credential-blocked and incomplete as certified paths.

### G7 — Provider connection lifecycle
Mock connect/health/readiness exist; live OAuth rotate/reconnect/failure-class certification incomplete (expected credential gate — still a lifecycle hole for OWNER ACCEPTED live).

### G8 — Session / durable undo
Builder undo works in-session; lost on full refresh (ledger blocker) — recovery dimension incomplete.

### G9 — Analytics binding on lifecycle events
Public tap analytics_event_assert residual; Keywords dedicated analytics UI missing; several objects lack lifecycle→Insights hooks.

### G10 — Permission dimension on objects
Clerk roles when enabled; fine-grained per-object permission, approval handoffs, and facility-scoped ACL incomplete.

---

## Object notes (selected)

### Cards & Campaigns
- **Strengths:** Create/edit/preview/publish/version/rollback headed proofs; shared public render.  
- **Gaps:** Archive/retire UX; facility ownership; where-used on assigned Tap Points; session undo persistence.

### Publications
- **Strengths:** Immutable publication intent / snapshots.  
- **Gaps:** Operator-facing release history browser; rollback UX beyond campaign versions.

### Tap Points & Devices
- **Strengths:** Permanent address; seed public resolve; Scan claim.  
- **Gaps:** Replacement workflow polish; transfer; capacity; Pulse offline; set membership lifecycle.

### Audience objects
- **Strengths:** Lead create; Keep→relationship; Moments service; Inbox case lifecycle.  
- **Gaps:** Consent matrix; merge/dedupe; archive; prefs headed; timeline completeness.

### Loyalty
- **Strengths:** Program CRUD; enroll; award/redeem/adjust/reverse; audit; idempotency.  
- **Gaps:** Referrals object lifecycle; multi-location program scope; Wallet projection coupling.

### Journeys / Canvas
- **Strengths:** Draft/publish/activate/pause; execution rows; version restore; kill-switch.  
- **Gaps:** Full studio UI matrix; archival; TapTrail; live effect recovery classes.

### Admin feature overrides
- **Strengths:** Reasoned enable/disable + audit + API gate — reference lifecycle for governance objects.

---

## Recommended lifecycle completion policy

1. **During J1–J4:** Card, Campaign, Group, Publication, Tap Point, Lead — add minimum archive/restore + where-used for publish/assign path.  
2. **During J6–J8:** Consent, Relationship, Wallet mock revoke, Loyalty archive rules.  
3. **During J10–J13:** Journey/Canvas archive + keyword where-used + analytics panel.  
4. **During J11:** Membership/facility invitation/transfer/context switch as first-class.  
5. **Defer:** Marketplace template packs, Pulse offline, live wallet/provider until credentials.

Do not invent parallel lifecycle frameworks — extend existing Prisma models + Admin audit patterns.

---

## Related

`PRODUCT_TRUTH_MAP.md` · `VERTICAL_JOURNEY_INVENTORY.md` · `COST_CONSCIOUS_IMPLEMENTATION_SEQUENCE.md`
