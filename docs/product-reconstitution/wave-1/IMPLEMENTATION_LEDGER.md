# Wave 1 Implementation Ledger

Branch: `tapconnect-operational-spine-restoration`  
Required source: `012e51b953773bea54ee46dd1a0b7a4eae83dbb3`  
Behavioral baseline: `7357fd9806d56d07d9ded68eef2beec5ea578052`

This ledger records additive restoration work for the direct Owner workflow. It is updated with implementation and proof as each slice lands. Existing JSON fields and legacy routes remain compatibility surfaces during this wave; no historical migration is removed or rewritten.

| Slice | V1 behavior being restored | Current system retained | Authority being changed | Compatibility path | Rollback / recovery path | Test proof | Visible Owner proof | Status |
|---|---|---|---|---|---|---|---|---|
| Card draft | Direct edit, save, leave, reload, preview | `BrandKit.tapCardDraft`, optimistic draft revision, shared Card renderer | One mutable saved draft per Workspace, with explicit save state and property-source metadata for Wave 1 appearance/actions | Existing `tapCardDraft` shape parses unchanged; absent draft initializes from legacy `tapCard` | Draft compare-and-swap rejects stale writes; legacy public JSON remains untouched by Save | Existing draft durability suite plus `publication-lifecycle.test.ts`; full suite 915/915 | Draft / Saved draft / Unsaved changes, From Brand / Custom on this Card | Implemented |
| Card publication | Predictable public Card result | Current public renderer, publication/audit foundations, Demo safety | Immutable Card revision plus one Workspace public pointer; Publish is separate from Save | `BrandKit.tapCard` remains a projection of the selected published revision for old callers | Roll back by moving the pointer to an earlier immutable revision and refreshing the compatibility projection | Canonical service tests plus Playwright Save/Publish proof | Published state, revision history, publisher/time, comparison summary | Implemented |
| Card parity | Preview accurately represents public output | Shared normalizer and Card renderer | One normalized document contract feeds draft Preview, public Card, and Demo publication | Legacy Card JSON is normalized at the adapter boundary | Revert renderer adapter without changing stored revisions | Existing shared-renderer/parity suites and publication identity attribute; full suite 915/915 | Saved Preview and public Card use the same `TapConnectCard` renderer | Implemented |
| Property safety | Explicit V1 Card values persist | Brand defaults and current visual-property stack | Existing explicit values are local/custom unless durable Brand provenance says otherwise | Missing values may resolve from Brand; old explicit values remain valid | Reset only the selected property to Brand; no mass relinking | Parser/property-source coverage in full suite; manual human mutation proof remains required | Use Brand value / Use custom value here / Reset to Brand | Implemented; human proof pending |
| Campaign | Direct create, edit, save, inspect and activate | `Campaign`, templates, renderer, existing routes | Canonical command/service layer with explicit lifecycle transitions | `/api/campaigns/assign` remains an explicit compatibility facade for old callers | Commands reject invalid transitions; legacy fields stay intact | `operational-lifecycle.test.ts` and repository Campaign suites | Draft, Ready, Scheduled, Active, Paused, Completed, Archived, Failed | Implemented |
| Schedule | Device and Group scheduled Campaign behavior | Campaign dates, `ScheduleRule`, Groups/slots, assignment | One deterministic normalized resolver and explanation | Existing rule/group/assignment writers remain; resolver projects their meaning | Disable a rule or remove a future intent without deleting historical mechanisms | Boundary/no-DRAFT lifecycle tests plus retained schedule/group suites | What, where, when, why it wins, fallback | Implemented |
| Tap Trace | Tap and action evidence linked to destination | `TapEvent`, `ClickEvent`, Tap Point bridge, Insights | Named tenant-scoped trace query/detail projection with resolution context | Existing event rows remain readable; absent revision/schedule context is shown honestly | Additive query/UI can be removed without touching events | Existing tap/click durability suite plus tenant-scoped query construction and Playwright surface proof | Tap Trace list and detail sequence | Implemented |
| Email | Create, save, reload, preview and safe blocked operation | Campaign `formSettings.emailResponse`, current renderer/provider gates | First-class Email document and lifecycle history, fixture-safe only | Bidirectional compatibility projection preserves Campaign-linked Email JSON | Cancel future fixture schedule; legacy JSON remains available | Email transition tests, repository renderer suites, fixture-safe API and Playwright surface proof | Draft, Scheduled, Blocked, Failed and delivery history | Implemented |
| Continuity | Move directly across the operating workflow | Studio chrome, Workspace context, signed/session-scoped Control Room return | Allowlisted exact return context and direct spine navigation | Existing `/dashboard` and safe `/control` fallbacks remain | Reject unsafe redirects and clear invalid context | Existing workspace/control authorization suites and Playwright Rich fixture return proof | Card, Campaigns, Schedule, Tap Trace, Email, exact Control Room return | Implemented |
| Demo | Stable public Demo payload | `DemoPublication`, `LandingDemoBinding`, audit and permissions | Demo publication may consume only an ordinary published Card revision | Existing immutable manifest and landing binding remain canonical | Existing Demo rollback/binding rollback | Existing Control Room publication/binding/safety suite plus enforced published-source lookup | Demo revision, binding and rollback status | Implemented; human payload proof pending |
| Ask safety | Direct manual authoring remains complete | Read-only deterministic guidance | Apply disabled unless a real host mutation callback exists | Hosts with a real callback can opt in explicitly | No data mutation occurs when unavailable | Existing Ask component/policy suite; TypeScript and changed-source ESLint | “Action assistance is being reconnected. You can continue editing directly.” | Implemented |

## Migration safety boundary

- Wave 1 uses additive tables, columns, indexes, and foreign keys only.
- Legacy Card, Campaign scheduling, event, and Email JSON storage is retained.
- Existing explicit Card values are treated conservatively as local/custom.
- No bulk Brand relinking, production-data inspection, `prisma db push`, `migrate resolve`, or historical migration rewrite is permitted.
- Forward recovery creates or repoints additive lifecycle records; rollback preserves old compatibility fields and readers.
- The full cross-product property authority redesign remains Wave 3 work.

## Precheck record

- Source branch verified: `tapconnect-product-reconstitution-audit`.
- Source SHA verified: `012e51b953773bea54ee46dd1a0b7a4eae83dbb3`.
- Source worktree verified clean before branch creation.
- Work branch created: `tapconnect-operational-spine-restoration`.
- Detached V1 certification worktree observed at `7357fd9806d56d07d9ded68eef2beec5ea578052` and left untouched.
- Current checked-in migration series inspected through `20260731120000_platform_control_room_foundation`.
- Configured isolated `tapconnect_fusion_dev` migration status is up to date.
- All 21 checked-in migrations deploy cleanly into fresh isolated database `tapconnect_fusion_dev_wave1_verify_20260801`.
- Prisma schema drift proof reports `No difference detected` against the configured isolated datasource.
