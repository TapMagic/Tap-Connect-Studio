# V1 Runtime Certification

Candidate: `7357fd9806d56d07d9ded68eef2beec5ea578052`  
Detached worktree: `/private/tmp/tap-connect-studio-v1-certification`  
Execution: 2026-07-31 EDT / 2026-08-01 UTC  
Evidence root: `/private/tmp/tapconnect-v1-cert-evidence`

## Decision

**V1 RUNTIME BASELINE CONDITIONALLY CERTIFIED — HUMAN DECISION REQUIRED**

The actual V1 runtime completed the Card, Campaign, scheduled Campaign, Tap Trace, Email, and integrated fixture journeys against an isolated PostgreSQL database. API responses, server-rendered browser-visible HTML, deterministic resolver output, and before/after database state support the functional baseline. The condition is evidence-medium completeness: the in-app Browser reported that no browser was available, so required screenshots and short recordings could not be captured. No substitute automation was presented as browser evidence.

Additional V1 limitations are real but do not negate the demonstrated baseline: V1 has no committed test suite or migrations; schedule helpers noisily retry existing foreign-key creation (`42710`); playable schedule status includes `DRAFT`; Email has no independent scheduling/delivery history; and direct Card Save is immediately public rather than a separate draft/publish lifecycle.

## Journey results

| Journey | Functional result | Certification result | Detail |
|---|---|---|---|
| Card | create/edit appearance/actions/Save/reload/public all persisted | **CONDITIONALLY CERTIFIED** | [CARD.md](CARD.md) |
| Campaigns | create/edit/Save/status/assign/activate persisted | **CONDITIONALLY CERTIFIED** | [CAMPAIGNS.md](CAMPAIGNS.md) |
| Scheduled Campaigns | device and Group behavior plus before/during/after resolver proven | **CONDITIONALLY CERTIFIED** | [SCHEDULED_CAMPAIGNS.md](SCHEDULED_CAMPAIGNS.md) |
| Tap Trace | public taps, action click, attribution, Analytics and rows proven | **CONDITIONALLY CERTIFIED** | [TAP_TRACE.md](TAP_TRACE.md) |
| Email | edit/save/reload/Preview and provider-blocked send proven | **CONDITIONALLY CERTIFIED** | [EMAIL.md](EMAIL.md) |
| Integrated flow | Device → resolver → Campaign/Card context → events/action → Email relation proven | **CONDITIONALLY CERTIFIED** | [INTEGRATED_FLOW.md](INTEGRATED_FLOW.md) |

Environment, compatibility, isolation, and evidence limitations are in [ENVIRONMENT_AND_COMPATIBILITY.md](ENVIRONMENT_AND_COMPATIBILITY.md). The row-level gate is in [V1_CERTIFICATION_MATRIX.md](V1_CERTIFICATION_MATRIX.md).

No production/staging/customer data or provider was accessed. No Email or Campaign was sent. No implementation, schema, or checked-in migration was changed in either source tree.
