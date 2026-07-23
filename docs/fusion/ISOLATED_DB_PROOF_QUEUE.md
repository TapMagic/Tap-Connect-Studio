# Isolated DB proof queue

Workflows implemented in code but **not** classified OWNER-READY / VERIFIED until proven on `tapconnect_fusion_dev` with browser E2E.

**Blocked by:** Docker / local Postgres on `127.0.0.1:5433` (PO-NOW-001).

| ID | Workflow | Code ready | Needs |
|----|----------|------------|-------|
| P-01 | Migrate `000000`→`000005` | Yes | Docker up + `fusion:db-ready` + `db:migrate:deploy` |
| P-02 | Seed `[SEED]` data | Yes | `fusion:seed` |
| P-03 | TapSave Keep → MyTap prefs/moments | Yes | Public `/t/` + `/mytap` browser |
| P-04 | MyTap TapLoop balance | Yes | Enroll + award then reload MyTap |
| P-05 | Autopilot generate → accept/reject/undo + kill switch | Yes | OpenAI optional; kill switch Admin |
| P-06 | TapFlow publish/activate/pause/resume + dry-run record | Yes | Journeys UI + API |
| P-07 | Outbox dead-letter retry/discard/process | Yes | Settings + Admin |
| P-08 | Wallet mock issue/revoke | Yes | Audience wallet UI |
| P-09 | Inbox reply + lead auto-thread | Yes | Audience inbox |
| P-10 | TapLoop award/redeem/idempotency | Yes | Audience TapLoop forms |
| P-11 | Insights date range + CSV | Yes | Insights page |
| P-12 | Platform Admin KPI drill-downs | Yes | `/admin/platform/*` |
| P-13 | TapPoint health / capacity / fleet badges | Yes | Tap Points hub |
| P-14 | Commerce mock checkout | Yes | Experiences orders |
| P-15 | Tenant isolation spot-check | Partial | Two seeded businesses |
| P-16 | V1 Builder parity browser pass | Partial | Card builder routes |
| P-17 | A11y checklist pass | Doc only | Manual / axe |
| P-18 | TapFlow analytics overlay + recovery dry-run | Yes | Journeys editor Recover + overlay panel |
| P-19 | Admin outbox dead-letter console | Yes | `/admin/platform/outbox` |
| P-20 | TapFlow live executor on public `/t/` tap | Yes | ACTIVE journey + feature on + outbox effects |
| P-21 | Pulse fleet badges | Yes | `/dashboard/pulse` with `ops.pulse` |

Do not mark OWNER-READY until the matching P-* row is executed and recorded in BUILD_STATUS.
