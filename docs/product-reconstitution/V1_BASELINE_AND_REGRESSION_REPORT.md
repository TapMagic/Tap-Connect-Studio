# V1 Baseline and Regression Report

Current audit source: `d67d1399a064834d476a0675642c294cf13478e3`
Exact V1 reference candidate: `7357fd9806d56d07d9ded68eef2beec5ea578052`
Smallest coherent construction range: `f5ea2b0ab7f9cec398c4adff10039dc50824715f..7357fd9806d56d07d9ded68eef2beec5ea578052` (inclusive)

## Finding

`7357fd9806d56d07d9ded68eef2beec5ea578052` is the strongest exact V1 candidate.

Evidence:

- Git labels it as `main`, `origin/main`, `origin/HEAD`, and tag `pre-tapflow-tapsave-2026-07-21` in the audited object database.
- The next lineage commit, `df6787b…`, is explicitly “TapConnect V2 Slice 1.”
- Repository archaeology later recorded the same exact SHA as V1 in `docs/fusion/V1_CAPABILITY_INVENTORY.md`.
- Its tree contains one coherent App Router product with the Card, Campaign editor/lifecycle, both scheduled-Campaign mechanisms, tap/click event recording and Analytics, Email builder/save/send path, and the public resolver joining those systems.

This is a **confirmed coherent code baseline**. It is not yet a freshly rerun runtime certification: V1 contains no committed Playwright/unit suite, and this audit was forbidden from checking it out or modifying it. Before restoration implementation, Wave 0 must build a read-only worktree or archive from this SHA against an isolated compatible fixture database and capture the historical journeys.

## Commit evidence by capability

| Capability | Establishing/refining commits | Exact V1 paths present at candidate | Proof in code |
|---|---|---|---|
| Card | `a2e761769fbe5857a30b24f2c622e06bb12d0ab3` vCard setup; Card builder refinements through `3db808bcd1cc36884749766a8cf46c5514da6033` and `7357fd9806d56d07d9ded68eef2beec5ea578052` | `/dashboard/card`; `TapCardBuilder`; `lib/brand/tap-card.ts`; `/api/brand`; `TapConnectCard`; `/t/[deviceCode]` | Builder `save()` POSTs `{tapCard: config}` to `/api/brand`; API writes `BrandKit.tapCard`; dashboard reload parses it; public fallback renders same stored Card. |
| Campaign create/edit/lifecycle | Phase 1 `f5ea2b0ab7f9cec398c4adff10039dc50824715f`; lifecycle `23777e3…`; refinements through `0812604…` | `/dashboard/workbench`; `/dashboard/campaigns/**`; `CampaignEditor`; `/api/campaigns`; `/api/campaigns/assign`; actions API; `lib/services/campaigns.ts` | Template creates `Campaign` DRAFT; editor PATCH persists blocks/theme/dates; publish/assignment changes status; list/detail reload DB state. |
| Scheduled Campaign | `1517d0959159e31fa7a077742ab98b2e661d270f` device day/time rules; `904c1ec507d9ee076686515f11c9c28219f2d521` groups; `e6af4cdbf1a76f506f16b2d01e3a08d1b7004daf` mini-Campaign refinements | `SchedulePanel`; `/api/schedule`; `ScheduleRule`; Groups pages/APIs; `CampaignGroupSlot`; `lib/services/schedule.ts` | Rule/group slot persists day/time/timezone/priority; public resolver evaluates enabled slots then fallback Campaign. |
| Tap Trace function | Phase 1 tap/click models and public logging `f5ea2b0…`; real charts `9b3243b30924b66c758f5a59fe4f2e0f782f3729` | `TapEvent`, `ClickEvent`; `logTapEvent`; `/api/tap/click`; `/dashboard/analytics`; `lib/services/analytics.ts` | Public resolution records business/device/Campaign attribution; CTA clicks append event type; Analytics joins and aggregates taps, leads, Campaigns, devices. The visible name was “Analytics,” not Tap Trace. |
| Email | `4eaf447d53e9c8f0d626a4a004b78ed7f158d0c4`; layout refinement `9ad244eaaa40728d1b92b42b48aa0d715066b6e8` | `/dashboard/campaigns/[id]/email`; `CampaignEmailBuilder`; `lib/campaign-email.ts`; `/api/email/send`; `Campaign.formSettings` | Builder parses/stores `formSettings.emailResponse`, renders live preview, saves through Campaign PATCH, and sends only through explicit API/provider readiness. |

## V1 database contracts

The single `prisma/schema.prisma` at the candidate contained:

- `BrandKit.tapCard` as the direct Card source of truth.
- `Campaign` with `contentBlocks`, `themeOverrides`, `formSettings`, `scheduledStart`, `scheduledEnd`, and lifecycle `status`.
- `DeviceSlot` and `DeviceAssignment` connecting stable public codes to Campaigns.
- `CampaignGroup`, `CampaignGroupSlot`, and `ScheduleRule` for day/time resolution.
- `TapEvent` and `ClickEvent` attributed to Business, DeviceSlot, and optional Campaign.
- `Lead` linked to the same context.

There were no migration files in the candidate tree; schema deployment depended on direct Prisma/runtime ensure patterns. That is a V1 limitation and must not be restored.

## Exact V1 Owner workflows

### 1. Create a Card

1. Onboarding/Business and Brand setup created `Business` and `BrandKit` through `/api/business` and `/api/brand` (`app/onboarding/page.tsx`, `components/onboarding/form.tsx`, `components/brand/brand-kit-form.tsx`).
2. `/dashboard/card` loaded Business, BrandKit, profile, logo, and review data.
3. `parseTapConnectCard(brandKit.tapCard, fallbacks)` produced a usable initial Card instead of an empty runtime failure.
4. Owner added/reordered/configured sections and actions in `TapCardBuilder`; `TapConnectCard` showed the result.
5. Save POSTed the full config to `/api/brand`, which upserted `BrandKit.tapCard`.

**Source/save path:** `BrandKit.tapCard`; direct, whole-document write.
**Tests:** none committed at V1; later parity documents/tests use this behavior as the floor.

### 2–5. Edit, save/reopen, Preview, and public Card

- Editor local `config` was initialized from the stored Card; every control mutated that one config.
- The adjacent rendered Card acted as live Preview.
- Save waited for `/api/brand`, showed success/failure, and left the stored JSON as the next page-load source.
- Reopen/reload repeated server load and parse from `BrandKit.tapCard`.
- `/t/[deviceCode]` first resolved Campaign/group/schedule context; when Card behavior applied it rendered the business Card from the same BrandKit data and shared Card component lineage.
- Admin landing-demo controls could project the current config, but this was not a clean general immutable publication model.

**What made it dependable:** one Card object, one direct save endpoint, one DB JSON field, immediate adjacent preview, and a public fallback reading that field.
**Limitation:** Save and public state were effectively coupled; there was no robust draft/revision/publish separation.

### 6–9. Create, edit, schedule, and inspect Campaign

1. `/dashboard/workbench` showed templates from `lib/campaign-templates.ts`.
2. POST `/api/campaigns` called `createCampaignFromTemplate`, copied blocks and current Brand defaults, and created `Campaign(status=DRAFT)`.
3. Redirect/open `/dashboard/campaigns/[id]`; page loaded Campaign, BrandKit, devices, and siblings into `CampaignEditor`.
4. Blocks/theme/dates lived in editor state and rendered in `CampaignRenderer` Preview.
5. Save PATCHed `/api/campaigns/assign` with title, blocks, theme, dates, end behavior, and a status preserving already-live pages.
6. Publish optionally set `LIVE` and assigned a selected DeviceSlot; `/api/campaigns/actions` exposed lifecycle changes.
7. Scheduling used either Campaign dates plus a per-device `ScheduleRule` in `SchedulePanel`, or a `CampaignGroupSlot` managed under `/dashboard/groups/[id]`.
8. Campaign list/detail, Groups, Devices, and Analytics exposed status, assignments, schedules, and results.

**Source/save path:** `Campaign` plus schedule/assignment rows.
**Status transitions:** `DRAFT → READY/SCHEDULED/LIVE → PAUSED/ARCHIVED/CLOSED`, with assignment helpers able to set `LIVE`.
**Dependability:** explicit pages and DB rows, stable public URL, deterministic resolver, visible list status.
**Limitations:** overlapping schedule mechanisms and permissive playable-status policy already existed.

### 10. Use Tap Trace

1. Visitor opened `/t/[deviceCode]`.
2. Resolver identified Business, DeviceSlot, optional group/schedule/assignment Campaign.
3. `logTapEvent` appended `TapEvent` with Business, device, Campaign, and request context.
4. Customer CTA called `/api/tap/click`, appending `ClickEvent` with event type and the same context.
5. Owner opened `/dashboard/analytics`, which showed totals, 14-day taps/leads, conversion, actions, top Campaigns, and top Devices.

**Source:** append-only `TapEvent` and `ClickEvent`.
**Dependability:** recording was in the public path and views joined to the operating objects.
**Limitation:** no event-history route and no “Tap Trace” product name; deletion code could null attribution.

### 11–13. Create, edit/Preview, and send Email

1. Owner opened `/dashboard/campaigns/[id]/email` from Campaign context.
2. Page loaded Campaign/Brand and initialized `CampaignEmailBuilder` from `Campaign.formSettings.emailResponse` or safe defaults.
3. Owner edited Email blocks and watched `EmailBlockPreview` update.
4. Save PATCHed `/api/campaigns/assign`, merging `formSettings.emailResponse` into Campaign JSON.
5. Reopen reparsed that JSON.
6. Explicit Send POSTed `/api/email/send`; provider readiness controlled whether Resend could be invoked.

**Source/save path:** `Campaign.formSettings.emailResponse`.
**Dependability:** one visible builder, Preview, explicit Save, explicit Send, Campaign context.
**Limitations:** no first-class Email entity, governed schedule, audience selection/consent contract, or delivery-status history.

### 14. Operational relationship

```text
Business + BrandKit.tapCard
          │
          ├── stable Card fallback at /t/{deviceCode}
DeviceSlot ── assignment/schedule/group ── Campaign
          │                                 ├── Campaign page blocks
          │                                 └── Email document in formSettings
          └── TapEvent / ClickEvent ── Analytics
```

The stable device URL and shared Business ID connected the system. Campaigns could temporarily resolve for a Tap Point; the Card remained the reusable business destination/fallback; Email was prepared in Campaign context; tap evidence attributed the result.

## V1 versus current

| Area | V1 worked like this | Current works like this | Result | Root cause / recommended action |
|---|---|---|---|---|
| Card creation | Business/Brand + parser fallback → direct Card config | Governed onboarding/Knowledge/Brand → first `tapCardDraft` | IMPROVED | Preserve current onboarding/provenance; keep nonblank V1 outcome. |
| Card editing | One builder state and one adjacent Preview | V1 builder inside adaptive shell plus multiple histories/inspectors/property systems | REGRESSED in causal simplicity; IMPROVED in capability | Retain creative systems; merge state/authority and consolidate inspectors. Likely introduction: adaptive/visual waves `7133088…`, `ae30d3a…`, later Creative Studio commits. |
| Card persistence | Save wrote public `BrandKit.tapCard`; reload/public read it | Save writes `tapCardDraft`; reload/Preview read draft; public reads `tapCard` | REGRESSED/INTENTIONAL SPLIT INCOMPLETE | Keep draft separation and optimistic revision; add explicit ordinary publish. |
| Preview/public parity | Same direct object; “save” effectively public | Shared renderer but different draft/public values | TECHNICALLY IMPROVED, workflow REGRESSED | Renderer is valuable; lifecycle bridge is missing. |
| Navigation | Flat direct routes | Card-centered hubs plus focused editor and many task drawers | MIXED | Keep Card-centered IA; guarantee direct paths and round-trip context. |
| Brand | Defaults copied directly; local object owned saved JSON | Brand decision + session inheritance + PS stacks | VALUABLE EXTENSION MISWIRED | Merge to durable linked/custom contract; do not restore primitive V1 Brand behavior. |
| Assets | Upload/provider convenience in builders | Durable governed Assets/collections/usage/resources | IMPROVED | Preserve and reconnect through references. |
| Campaign create/edit | Template → direct Campaign editor/save | Same V1 spine with shared visual authoring | PRESERVED/IMPROVED | Keep V1 service/editor core; simplify overlapping visual state. |
| Campaign scheduling/status | dates + device rules + groups; direct status | same plus snapshots/time travel/feature policy | PRESERVED but still ambiguous | Consolidate visible lifecycle and priority; never make Draft playable publicly. |
| Tap Trace | tap/click rows shown as Analytics | same facts plus Insights/TapProof | IMPROVED evidence, REGRESSED discoverability | Restore Tap Trace name/history; keep Insights analysis. |
| Email create/edit | Campaign-scoped builder, Preview, save | same underlying JSON with richer authoring | PRESERVED/IMPROVED | Keep editor/render work; give Email first-class lifecycle incrementally. |
| Email operation | explicit immediate provider send | feature/provider/consent gates and reply system | IMPROVED safety, INCOMPLETE schedule/status | Preserve gates; add governed schedule/delivery state without breaking V1 direct draft. |
| AI | one-shot campaign generation | governed Autopilot plus Ask shell | Autopilot IMPROVED; Ask REGRESSED/MISLEADING | Keep policy/proposal infrastructure; replace no-op Ask Apply contract. |
| Control/Demo | limited admin landing tools | robust Control Room, immutable Demo revisions/bindings, safe section-level Studio return | IMPROVED/PARTIAL | Preserve; extend return to exact record/task and retire legacy Demo publication paths. |

## Regression introduction candidates

| Regression | First likely system/commit | Current conflict | Valuable part to retain | Safest restoration |
|---|---|---|---|---|
| Ordinary Card Save no longer reaches public and no publish action replaces it | draft split/onboarding implementation `0faad20…` / `0fafda9…` | `/api/card/draft` versus public `tapCard`; Card assembly has status text only | separate draft, revision conflict detection, onboarding | add explicit validated publish from saved draft; never return to save-is-public coupling |
| Card authority spread across shell/builder/Brand/visual histories | `ae30d3a…`, `7133088…`, Creative Studio waves | `BrandInheritanceState`, PS, config JSON, shell session | rich authoring, Undo, preview, task shell | one document transaction + persisted authority metadata; adapters for panels |
| “Linked” presentation without durable link | `ae30d3a072576953fa3e025e64aa4b033e5ade44` | module comment says copy/session only | honest copy/restore helpers and resolver | rename current copied states; implement durable LINKED later with migration |
| Ask Apply claims success without mutation | `0f6d07fbfd03b746d403bedf7eb896409b658985` | global host absent callback; Card host empty callback | safety policy and intent detection | disable Apply until structured host mutation exists; then editable diff/apply/undo |
| Control Room→Studio return is only section-level | `071b874cb5e84022ca2bb880721a3a9ae054ce29` | OpenWorkspace safely stores the Control URL and Studio banner returns; editor Done and Control URL omit exact Demo record/task | governance, identity, safe return, Demo publication/binding | extend the existing safe context to exact allowlisted Demo record/task, identity preserved |
| Landing Demo duplication | legacy V1 admin path plus new Control Room | `LandingDemoSlot`, `Campaign.isLandingDemo`, `DemoPublication/Binding` | immutable Demo system | migrate consumers/bindings, then retire legacy mutable path |
| Tap Trace obscured | Fusion Insights IA beginning after V1 | Analytics/Insights routes, no Tap Trace | provenance, drilldown, export | first-class Tap Trace history feeding Insights |

## Minimum restored core

Before expansion continues, prove in one isolated fixture Workspace:

1. Card create/edit/save/leave/reopen/reload/Preview/publish/public with exact draft/public language.
2. Local Card custom value survives navigation, Save, reload, later Brand change, and public publication until Reset.
3. Button style/order/visibility/lock mutations persist and render identically.
4. Campaign create/edit/save/schedule/status/activate and stable Tap Point resolution.
5. Tap Trace append and understandable attribution to Tap Point/Card/Campaign.
6. Email create/edit/save/reload/Preview plus safely governed schedule/send status.
7. Direct navigation and Control Room round trip without identity/Workspace loss.

## Valuable post-V1 capabilities to preserve

- Card-first onboarding, Business Knowledge, website proposals, and approval provenance.
- Shared Assets, provider boundaries, rights/approval, collections, usage.
- Shared renderer, creative composition, responsive/remote Preview, Undo/Redo.
- Audience/consent/relationships, TapSave/MyTap, Inbox/replies.
- Insights provenance/drilldown, Journey/Canvas when projections stay explicit.
- Autopilot governance, deterministic policy, audit, budget, and reversibility.
- Control Room permissions/entitlements/restrictions/support safety.
- Immutable Demo revisions, landing binding, rollback, and public sanitization.

## Miswired extensions

- Card draft/public split without normal publish.
- Brand “inheritance” and visual stacks without persisted one-contract authority.
- Ask TapConnect proposal theater without real host mutation/edit.
- Control Room section-level return without exact record/task continuity.
- legacy and new landing Demo systems.
- Email's rich authoring constrained inside Campaign JSON.
- Tap Trace evidence hidden behind Analytics/Insights naming.

## Do not restore

- Save-immediately-means-public coupling.
- Schema management by `prisma db push` or runtime table creation.
- Provider actions without feature/permission/consent/Demo gates.
- V1 one-shot AI as authority.
- Flat ungoverned media copies.
- Lack of audit, approval, immutable Demo revisions, or tenant-safe permissions.
- Weak accessibility/responsive behavior and ambiguous provider readiness.

## Historical evidence limitations

- No V1 automated tests are present in the candidate tree.
- No historical screenshots were found in that tree; current `screenshots/dashboard-before.jpg` is not sufficient to prove all workflows.
- Existing later documents assert V1 and parity but are secondary evidence, not a substitute for rerunning the archived tree.
- The exact first runtime-breaking commit for each regression remains a candidate until `git bisect`-style isolated journey replay is performed in Wave 0.
