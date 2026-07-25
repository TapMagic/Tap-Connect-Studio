# Test & Verification Architecture — TapConnect Fusion

**HEAD:** `9965c8a` · **Date:** 2026-07-24  
**Directive:** §9 operating model · §13 testing · §16 status language  
**Rule:** Implementer tests are supporting evidence. Independent Verifier acceptance is separate. Only PO assigns OWNER ACCEPTED.

---

## 1. Roles and evidence authority

| Role | May write tests? | May claim | May not |
|------|------------------|-----------|---------|
| **Architect** | Spec only | MAPPED | Implement / OWNER ACCEPTED |
| **Inspector** | Exploratory notes / defect log | Defect OPEN | Fix / self-certify |
| **Implementer** | Unit, integration, headed regression | IMPLEMENTATION COMPLETE · AUTOMATED ACCEPTANCE PASSED | OWNER-READY · OWNER ACCEPTED · INDEPENDENT VERIFICATION PASSED |
| **Independent Verifier** | Re-run / add verification proofs | INDEPENDENT VERIFICATION PASSED · reopen defects | Silent product fixes during verify |
| **Product Owner** | Manual VO/OS zoom, live creds policy | OWNER ACCEPTED | — |

Engineering states: NOT STARTED · MAPPED · IMPLEMENTATION IN PROGRESS · IMPLEMENTATION COMPLETE · AUTOMATED ACCEPTANCE PASSED · INDEPENDENT VERIFICATION PASSED · VERIFIED — CREDENTIALS REQUIRED · BLOCKED · OWNER ACCEPTANCE PENDING · OWNER ACCEPTED.

Legacy ledger labels (`IMPLEMENTED BUT NOT OWNER-READY`, etc.) remain in `display-status.ts` for UI honesty — map them to engineering states above; do not treat them as PO acceptance.

---

## 2. Proof layers

| Layer | Tooling | Proves | Cost | When |
|-------|---------|--------|------|------|
| Unit | `npm test` | Pure logic, normalizers, layout, kill-switch contracts | Low | Every implementer PR |
| Integration unit | e.g. `owner-ready-integration.test.ts` | Cross-module contracts without browser | Low | Shared contract changes |
| DB / migrate | Prisma validate + migrate status | Schema safety on isolated DB only | Low | Schema changes; checkpoints |
| Headed browser | Playwright `PROOF_HEADED=1` | Outcome + persistence + UI | Medium | Per journey slice |
| Exploratory headed | Builder exploratory specs / manual | Dead controls, traps, stress | Medium | Authoring / new UI |
| Visual / editor↔public | Screenshot + DOM attr compare | WYSIWYG | Medium | Authoring / public |
| Responsive | `P-responsive-owner-gate` + viewports | Layout at sizes + CSS zoom proxy | Medium | Checkpoints; touched surfaces |
| A11y automation | axe + keyboard + SR-oriented | Automated a11y | Medium | Checkpoints |
| Manual AT | VoiceOver / NVDA | True SR | High (PO) | Before OWNER ACCEPTED |
| OS-native zoom | Cmd+/Ctrl+ 200% | Real zoom | High (PO) | Before OWNER ACCEPTED |
| Console / hydration / network / DB | Playwright + server logs | Silent failures | Medium | Headed runs |
| Failure / recovery | Dedicated specs | Retry, kill-switch, undo | Medium | Per journey |
| Isolation | Tenant/facility tests (to deepen) | No cross-leak | Medium-High | Band 6+ |
| Audit / analytics | API + Insights assert | Events + audit rows | Medium | J1 residual; Admin |
| Provider adapter | Mock + live cert checklist | Failure classes | Medium / High live | Band 7 |
| Rollback | Version restore / feature re-enable | Recovery | Medium | Canvas/Flow/Admin |

**Isolated DB only:** `tapconnect_fusion_dev` @ `127.0.0.1:5433`. Never Railway for proofs.

---

## 3. Journey → proof map

| Journey | Unit | Integration | Headed (implementer) | Exploratory / visual | A11y/responsive | Isolation | Audit/analytics | Independent Verifier focus |
|---------|------|-------------|----------------------|----------------------|-----------------|-----------|-----------------|----------------------------|
| **J1 First public Tap** | Content normalize, resolve | Owner-ready contracts | Builder save/publish/assign; group schedule; public seed; lead | WYSIWYG public | Owner gates on touched routes | Workspace seed | **analytics_event_assert**; publish audit | Full spine without narrative |
| J2 Brand/assets | Vocabulary rules | Keywords API | Brand pack create/reuse; MediaPicker | Bg-remove preview | Brand Kit VO later | — | Keywords analytics (gap) | Pack reuse + kill-switch |
| J3 Card retention | Card model | — | Card matrix; Keep; MyTap | Card stress | MyTap prefs | — | Keep events | Keep→MyTap→prefs |
| J4 Campaign schedule | Resolver | — | Group schedule; fallback; time-travel UI | — | — | — | Campaign Insights | Resolver correctness |
| J5 Fleet | Bridge | — | Device create; Scan claim; replacement | — | — | Location scope later | Fleet Insights | Address permanence |
| J6 Wallet/consent | Consent util | — | Consent matrix; wallet mock list | — | Wallet status text | — | — | Consent + mock revoke |
| J7 Inbox | Guardian rules | — | P-09 / P-27 | — | Inbox keyboard | — | Case audit | Guardian reasons + case |
| J8 Loyalty | Ledger idempotency | — | P-10 full matrix | — | TapLoop selects | Multi-location later | Loyalty Insights | Reverse/adjust audit |
| J9 Commerce | Order state machine | — | Mock checkout/refund | — | — | — | Commerce Insights | Refund states |
| J10 Canvas/Flow | Execution | Cross-system xsys | Tapcanvas/tapflow specs; live visitor | Mode matrix | Live regions | — | Execution analytics | Publish→execute→recover |
| J11 Team/facility | ACL | — | Invite/switch/scope (to build) | — | — | **Required** | Membership audit | Cross-tenant negative tests |
| J12 Providers | Adapter | — | Productivity mock; readiness | — | — | — | Connect audit | Failure classes |
| J13 Keywords | Suggest rules | Kill-switch | P-keywords-* | — | — | — | Analytics panel gap | Bind + 503 |
| J14 TapCast | Registry | — | Ladder mock; TikTok coexist | — | Ladder a11y residual | — | Publish audit mock | Honest Snapchat + mock publish |
| J15 Admin kill-switch | Matrix | — | P-admin-killswitch-matrix | — | Registry tables | — | Override audit | Off→503→on |
| J16 Autopilot | Budget | — | Accept/apply/undo | — | — | — | Proposal provenance | Undo integrity |
| J17 Insights | — | — | Export; drill; provenance | — | Tables | — | TapProof classes | Provenance honesty |
| J18 Controls | — | — | A11y + responsive owner gates | — | Proxies | — | — | PO J28 for AT/zoom |
| J19 Productivity | Closeout steps | — | P-productivity-closeout-18 | — | — | — | ExternalWorkItem | Mock ladder |
| J20 Email | Suppression | — | Mock send | — | — | — | Comms Insights | Live = credentials |
| J21 Freeform | — | — | Flag off honesty | — | — | — | — | Defer |
| J28 AT/zoom | — | — | — | — | **Manual PO** | — | — | Attestation table |

---

## 4. Mapping existing proof IDs

Proof JSON: `tmp/fusion-proofs/`. Index: `tmp/fusion-proofs/index.json`.

| Family | Example IDs | Journey |
|--------|-------------|---------|
| Builder | `P-builder-*`, icon-placement, wysiwyg-public, remove-background, exploratory-* | J1, J3, J4 |
| Public / schedule | `P-public-seed-tap`, `P-campaign-group-schedule` | J1, J4 |
| Audience | `P-03-lead-capture`, `P-03-tapsave-keep`, `P-wallet-mock-tapsave` | J1, J6 |
| Loyalty | `P-10-taploop` | J8 |
| Inbox | `P-09-inbox-operator`, `P-27-inbox-guardian-matrix` | J7 |
| Insights | `P-11-*`, `P-insights-export`, `P-insights-drilldown-provenance` | J17 |
| Canvas/Flow | `P-tapcanvas-*`, `P-tapflow-*`, `P-xsys-*` | J10, J13 |
| TapCast | `P-tapcast-*`, `P-tiktok-mock-persist` | J14 |
| Keywords | `P-keywords-*` | J13 |
| Admin | `P-12-admin-shell`, `P-admin-killswitch-matrix` | J15 |
| A11y/responsive | `P-a11y-owner-gate`, `P-responsive-owner-gate` | J18 |
| Productivity | `P-productivity-*` | J19 |
| Home | `P-studio-home` | J1 |

Ledger: `lib/fusion/readiness/display-status.ts` → `VERIFICATION_LEDGER`. Update blockers only with proof.

---

## 5. Cost-conscious gate policy

| Gate type | Frequency | Owner |
|-----------|-----------|-------|
| Targeted unit + headed for changed journey | Every implementer slice | Implementer |
| Full headed suite (75) + unit + tsc + lint + migrate | End Band 2, 5, 6; pre-acceptance | Implementer then Verifier spot-check |
| Cross-system integration | When spine/automation touched | Implementer |
| Live provider cert | Per credential, serial | Implementer + Verifier |
| True VO/NVDA + OS zoom | Once per OWNER ACCEPTED candidate surface | **PO** (`A11Y_MANUAL_CLOSEOUT.md`) |
| Re-audit unchanged pillars | Only if dependency/contract change or defect reopens | Architect/Inspector reason required |

Do not re-run full 75 on every TikTok-only tweak.

---

## 6. Journey outcome checklist (Verifier template)

For critical journeys, Verifier must confirm:

1. Entry discoverable without tribal knowledge  
2. Comprehension (labels/readiness honest)  
3. Operation (controls work or honestly disabled)  
4. Feedback (errors as text / live regions)  
5. Persistence (reload)  
6. Reopen (edit again)  
7. Collaboration/permission (as applicable)  
8. Completion (user outcome done)  
9. Final output (public/customer artifact)  
10. Analytics (event or Insights signal)  
11. Audit (who/when/why for gated actions)  
12. Failure (kill-switch / provider error class)  
13. Recovery (retry/re-enable/undo)  
14. Exit (Esc/focus/no trap)  

Record: proof IDs · screenshots · PASS/FAIL · residual blockers · engineering state update.

---

## 7. Defect → test loop

1. Inspector/Verifier opens row in `OWNER_WALKTHROUGH_DEFECT_LOG.md`  
2. Implementer fixes + adds regression proof  
3. Verifier re-runs; FIXED only with evidence  
4. Never FIXED from WIP alone  

---

## 8. Commands (local)

```bash
export DATABASE_URL='postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev'
npm run fusion:db-ready && npm run fusion:seed
npm test
npm run lint && npx tsc --noEmit
PROOF_HEADED=1 BASE_URL=http://127.0.0.1:3000 npx playwright test e2e/*.spec.ts --headed
```

Railway untouched. No secrets in proofs.

---

## Related

`COST_CONSCIOUS_IMPLEMENTATION_SEQUENCE.md` · `OWNER_READY_COMPLETION_MATRIX.md` · `A11Y_MANUAL_CLOSEOUT.md` · `ISOLATED_DB_PROOF_QUEUE.md`
