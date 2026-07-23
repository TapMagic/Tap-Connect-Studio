# Requirements Traceability Matrix

Map every requirement to source → pillar → UX → domain → module → status → test → local proof → PO approval.

| Req ID | Source | Requirement | Pillar | UX | Module | Status | Test / proof |
|--------|--------|-------------|--------|-----|--------|--------|--------------|
| F-000 | Charter §0 | V2 ≥ V1 capability | Platform | All | A–L | Active | Continuous |
| F-001 | Charter §5 | Tap Card Builder parity + expand | Card | Experiences | A | In progress | Local builder |
| F-002 | Charter §7–8 | Pages Format + attribute contracts | Card | Experiences | A | In progress | Unit + UI |
| F-003 | Charter §9 | Block library + restore missing blocks | Card/Campaign | Experiences | A | In progress | Addable parity |
| F-004 | Charter §10 | Structured + Freeform + visual ref | Card | Experiences | A | Scaffolded | — |
| F-005 | Charter §11–12 | Media providers + Brand Kit | Assets | Assets | A | Preserve | Existing APIs |
| F-006 | Charter §13–15 | Campaigns/Groups/Scan/TapPoint | Campaign/Devices | Experiences/Tap Points | B | Wired | `lib/fusion/devices/tap-point-bridge.ts`, device create/activate/claim/tap paths |
| F-007 | Charter §16 | Cody spine selective import | Platform | — | A/B/J | In progress | Schema additive |
| F-008 | Charter §17 | Seven-part Studio IA | Platform | Nav | J | Wired | `/dashboard/experiences`, `/tap-points`, `/audience`, `/insights`, `/assets` hubs |
| F-009 | Charter §18–25 | Relationship/comms/loyalty pillars | Multiple | Audience+ | C–H | FUNCTIONAL (TapSave + TapLoop + Inbox case lifecycle + Wallet evidence + suppression UX) | Audience workspace + MyTap; TapLoop Prisma/`/api/loyalty/*`; live wallet certs pending |
| F-010 | Charter §26 | Replace V1 AI with Autopilot | AI | Home/Experiences | D | FUNCTIONAL | Recipes v1.2 + accept→apply→undo + budget/ledger API + Knowledge stub; live RAG incomplete |
| F-011 | Charter §31–33 | Admin control plane + Stripe-ready | Admin | Settings/Admin | J | FUNCTIONAL | Prisma KPIs + drill-downs + email/Stripe readiness; live billing pending |
| F-012 | Charter §34 | Wide safe file formats | Assets | Assets | A | CONTRACTED | Matrix |
| F-013 | Charter §38 | Landing last | Marketing | Public | L | EXPLICITLY DEFERRED BY CHARTER | — |
| F-014 | Charter §41 | Credential inventory | Integrations | Settings | J | DEFINED | CREDENTIALS_FINAL_CHECKLIST |
| F-015 | Owner-occupancy | Durable outbox | Platform | — | B | FUNCTIONAL | enqueue/drain/dead-letter retry+discard+process tick |
| F-016 | Owner-occupancy | TapSave Keep Card E2E | TapSave | Public/MyTap | C | FUNCTIONAL | CTA + prefs + moments + loyalty balance display |
| F-017 | Owner-occupancy | TapFlow editor + lifecycle | TapFlow | Experiences | E | FUNCTIONAL | publish/activate/pause/resume + dry-run + analytics/recovery + live tap executor (queue-only); provider effects open |
| F-018 | Owner-occupancy | TapLoop loyalty persistence | TapLoop | Audience | H | FUNCTIONAL | Prisma + `/api/loyalty/*` + Audience UI |
| F-019 | Owner-occupancy | TapCommerce mock | Commerce | Experiences | I | FUNCTIONAL | In-memory orders + mock checkout + cancel/refund |
| F-020 | Owner-occupancy | Isolated DB proof queue | Platform | — | — | DEFINED | `ISOLATED_DB_PROOF_QUEUE.md` — blocks OWNER-READY labels |

Update rows as modules land. Do not rely on chat memory.
