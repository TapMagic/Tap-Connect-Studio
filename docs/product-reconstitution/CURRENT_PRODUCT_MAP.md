# Current Product Map

Audited tree: `d67d1399a064834d476a0675642c294cf13478e3`  
Method: static route, symbol, schema, test, documentation, and Git-history tracing. No production data or consequential runtime was used. “Confirmed” means code-path confirmed; runtime behavior is labeled separately.

## System spine

| Layer | Current authority candidates | Evidence | Finding |
|---|---|---|---|
| Tenant | `Business` + `BusinessUser`; Control Room adds `WorkspaceKind`, roles, direct permissions, entitlements, restrictions | `prisma/schema.prisma`; `lib/workspace/context.ts`; `lib/control/identity.ts` | Strong Workspace boundary, but legacy Business role checks and newer capability checks coexist. |
| Card draft | `BrandKit.tapCardDraft` + optimistic `tapCardDraftRevision` | `lib/fusion/card/draft.ts`; `/api/card/draft`; `/dashboard/card/edit` | Clear current draft store and conflict detection. |
| Card public | `BrandKit.tapCard` | `app/t/[deviceCode]/page.tsx`; `lib/services/tap-resolve.ts`; public Card renderers | Separate from draft, but ordinary Studio has no canonical draft→published Card action. |
| Brand | `BrandKit`; `BrandPropertyDecision`; editor session inheritance and visual-property stacks | `/api/brand`; `lib/fusion/brand/property-decisions.ts`; `lib/fusion/authoring/{brand-inheritance,visual-property}.ts` | Multiple overlapping precedence representations. Durable Brand linkage explicitly does not exist. |
| Campaign | `Campaign.contentBlocks`, `themeOverrides`, lifecycle fields; assignments and schedules | `Campaign`, `DeviceAssignment`, `ScheduleRule`, `CampaignGroupSlot`; `/api/campaigns/assign` | V1 authority largely preserved and extended. |
| Email | `Campaign.formSettings.emailResponse` | `components/fusion/email/email-authoring-workspace.tsx`; `/api/campaigns/assign`; `/api/email/send` | Complete draft/preview surface, but Email remains embedded in Campaign persistence and lacks its own schedule/delivery model. |
| Tap evidence | `TapEvent` + `ClickEvent`, derived Insights views | `lib/services/devices.ts`; `/api/tap/click`; `lib/services/analytics.ts`; `lib/fusion/insights/**` | Operational evidence exists, but no visible canonical Tap Trace workspace/name. |
| Publication | `PublicationSnapshot`; Demo uses `DemoPublication` + `LandingDemoBinding` | `lib/fusion/publication/snapshots.ts`; `lib/control/mutations.ts` | Campaign and Demo publication exist; ordinary Card publication contract is incomplete/conflicting. |
| AI | Ask deterministic preview; Autopilot persistent proposal | `lib/fusion/ask/policy.ts`; `AutopilotProposal`; `lib/fusion/autopilot/**` | Two proposal systems; Ask UI can claim Apply without Card/global mutation. |

## Capability map

### Public Card

- **Routes/pages:** `/t/[deviceCode]` (`app/t/[deviceCode]/page.tsx`), preview-only `/preview/card/[token]`, supporting `/api/public/card/{support,offer}` and vCard routes.
- **Components/services/models:** `TapConnectCardPublic`, `TapConnectCard`, `CampaignRenderer`, `resolveTapDestination`, `resolveGroupCampaign`, `resolveScheduledCampaign`; `DeviceSlot`, `TapPointAddress`, `BrandKit.tapCard`, `Campaign`, `TapEvent`.
- **Visible workflow:** tap stable code → resolver selects scheduled/group/assigned Campaign or Card fallback → tap logged → Card/Campaign customer renderer → click/lead/keep paths.
- **Permissions/entitlements/publication:** public route; content eligibility comes from status, assignment, schedule, and stored public Card. Public Card does not read `tapCardDraft`.
- **Tests:** `e2e/j1-first-public-tap.spec.ts`, `e2e/public-experience-redesign.spec.ts`, `lib/fusion/card/__tests__/draft-public-invariant.test.ts`.
- **V1 relationship:** preserved resolver and public route, extended with Tap Point bridge, TapSave, support, Offer, and Journey hooks.
- **Conflict/risk:** Card draft/public split has no ordinary Studio publish bridge; resolver accepts several playable statuses in `lib/services/schedule.ts` (`LIVE`, `READY`, `SCHEDULED`, `DRAFT`), which weakens status meaning. Runtime requires isolated fixture proof.

### Card draft/editor

- **Routes/pages:** `/dashboard/card`, `/dashboard/card/edit`, `/api/card/draft`.
- **Components/stores:** `CardAssemblyWorkspace`, `CardAuthoringWorkspace`, legacy-host `TapCardBuilder`; client config history from `useLabeledUndoRedo`; shell state in `workspace-shell-persist.ts`.
- **Data/save:** `beginCardDraftEditing` copies an initial public/fallback Card once; `saveCardDraft` writes `BrandKit.tapCardDraft` with revision compare-and-swap. UI `save()` in `TapCardBuilder` PUTs the complete config.
- **Permissions:** `requireBusinessCapability("card.draft.edit")`.
- **Tests:** `e2e/card-authoring-workspace.spec.ts`, `e2e/card-editor-interaction.spec.ts`, `e2e/card-builder-recovery.spec.ts`, draft unit tests.
- **V1 relationship:** reuses the V1 `TapCardBuilder` and Card JSON but changes save authority from `tapCard` to `tapCardDraft`; adds shells, inspectors, creative composition, visibility/lock/reorder, and Undo/Redo.
- **Conflicts/duplicates:** legacy builder state, adaptive shell state, Brand session state, and visual-property state coexist. `brand-inheritance.ts` says session copy is not durable, while property UI uses linked/custom language. Ask host Apply callback is empty. Advanced nested panel stacks increase paths to ordinary controls.

### Card Preview

- **Routes/pages:** embedded Preview mode in `CardAuthoringWorkspace`; `/dashboard/card/preview`; signed `/preview/card/[token]`; preview session/revoke APIs.
- **Authority:** current in-memory config for embedded Preview; saved `tapCardDraft` for view-only page; signed preview session payload for remote device.
- **Renderer:** shared `TapConnectCard` paths across editor/preview/public, with current draft substituted in `app/dashboard/card/preview/page.tsx`.
- **Tests:** `e2e/authoring-escape-preview.spec.ts`, `e2e/creative-studio-evidence.spec.ts`, preview token tests.
- **Finding:** Preview is comparatively strong and explicit that it does not publish. Parity with current in-memory edits is strongest embedded; view-only route shows last saved draft.

### Card publication

- **Paths:** legacy `/api/brand` can write `tapCard` and snapshots the prior value; `lib/fusion/publication/snapshots.ts` lists/restores snapshots; Demo publication copies `tapCardDraft` to `tapCard` in `lib/control/mutations.ts`.
- **Current visible workflow:** ordinary Card assembly says “Studio publish,” but exposes no action. The editor saves draft and exposes a legacy landing-demo publish control based on an `isLandingDemo` Campaign record. Control Room separately performs governed Demo publication.
- **Models:** `BrandKit.tapCard`, `tapCardPublishedAt`, `PublicationSnapshot`, `DemoPublication`.
- **Tests:** draft/public invariant test; Control Room Demo e2e; builder publish/assign proofs primarily cover Campaign/public resolver.
- **Classification:** partial and internally contradictory. Ordinary Card publish is the highest-risk lifecycle gap.

### Brand and Brand inheritance

- **Routes/components/APIs:** `/dashboard/brand`, `/dashboard/brand/edit`, `BrandKitWorkspace`, `BrandInheritanceBar`, `/api/brand`, `/api/brand/decisions`.
- **Models/state:** `BrandKit`, `BrandPropertyDecision`, `BrandLink`; `BrandInheritanceState` modes `linked|copied|overridden|ignored`; visual stacks with `brand|surface|preset|custom`.
- **Behavior:** current Brand values seed/resolve editor presentation; local overrides flatten into document JSON on save. `syncFromBrandKit` updates session state, not persisted live linkage.
- **Permissions:** Brand propose/approve/lock capabilities plus general Workspace role checks depending on route.
- **Tests:** `brand-inheritance.test.ts`, `visual-authoring-core.test.ts`, Brand authoring e2e.
- **Conflict:** two vocabularies and no durable source/linkage metadata on Card properties. A saved value cannot reliably explain whether it was linked, copied, or custom after reload. `BrandLink` is legacy/shared-link metadata, not the canonical per-property linkage contract.

### Business Knowledge, website discovery, intelligent prefill

- **Routes/services:** `/api/business/knowledge`, `/api/business/knowledge/website`; `lib/fusion/knowledge/{repository,website-discovery,website-intake,apply-website-candidates}.ts`; `lib/fusion/authoring/intelligent-prefill.ts`.
- **Models:** `KnowledgeSource`, `KnowledgeFact` with provenance, approval, contradiction, evidence classes.
- **Workflow:** onboarding/Owner input → source/fact proposals → explicit approval → eligible empty draft fields receive suggested/applied prefill.
- **Tests:** knowledge and intelligent-prefill unit suites; onboarding e2e.
- **V1 relationship:** valuable extension; Business direct fields remain fallback.
- **Risk:** several sources can propose the same fact. Prefill policy is deterministic in helper tests, but property-level persisted provenance is incomplete once flattened into Card JSON.

### Assets and Media

- **Routes/components/APIs:** `/dashboard/assets`; `AssetStudioWorkspace`, `AssetsLibrary`, shared media browser; `/api/media/**`, `/api/creative-resources/**`, provider search/probe/import APIs.
- **Models:** `MediaAsset` plus collection/favorite/recent/usage models; `CreativeResource` plus revisions/usages/favorites.
- **Authority:** durable `MediaAsset` is correct media truth; `CreativeResource` is reusable design truth. Provider results are candidates until imported/approved.
- **Permissions/entitlements:** media limits, approval and Brand capabilities, provider readiness.
- **Tests:** media Slice 1 unit/e2e, Creative Platform e2e.
- **V1 relationship:** replaces V1 per-editor media convenience with shared durable assets while retaining upload/provider paths.
- **Duplicates/dormancy:** legacy `MediaPicker` convenience state and newer shared browser coexist; CreativeResource and MediaAsset overlap unless “design” versus “media” remains explicit.

### Campaigns

- **Routes/pages:** `/dashboard/campaigns`, `/dashboard/workbench`, `/dashboard/campaigns/[id]`; Campaign APIs and actions.
- **Components/services:** `CampaignsList`, `CampaignEditor`, templates, `createCampaignFromTemplate`, assignment/actions APIs.
- **Models:** `Campaign` JSON content/theme/form/offer fields, status, dates, assignments/events.
- **State/save/publication:** editor local block/theme histories → PATCH `/api/campaigns/assign` → Campaign row; status `LIVE` creates a publish-intent snapshot/outbox event; device assignment can set live.
- **Permissions/entitlements:** active Campaign limit; Campaign capabilities and feature gates on extensions.
- **Tests:** campaign format migration/precommit/e2e, builder parity, group schedule proof.
- **V1 relationship:** proven V1 editor and services retained, then migrated to shared visual authoring. Strong restoration candidate rather than replacement.
- **Risks:** route name `assign` also saves content and Email; status, publication, assignment, and date scheduling remain coupled. `publish` may mean status mutation plus optional device assignment.

### Scheduled Campaigns

- **Routes/components:** schedule tab in `CampaignEditor`; `SchedulePanel`; Campaign Groups pages and group manager; `/api/schedule`, group APIs.
- **Models/services:** `scheduledStart/End`, legacy `ScheduleRule`, `CampaignGroup`, `CampaignGroupSlot`, `DeviceAssignment`; `resolveScheduledCampaign`, `resolveGroupCampaign`.
- **Workflow:** set dates and/or create day/time device rule/group slot → same Tap Point URL resolves eligible Campaign at time → inspect rules/group status.
- **Tests:** group schedule and campaign-format proofs; time-travel resolver unit/e2e.
- **V1 relationship:** V1 contained both day/time device rules and Group slots; current preserves both and adds time-travel/snapshots.
- **Risk:** three scheduling mechanisms can compete; canonical priority and Owner-visible status are not presented as one lifecycle. Resolver treating `DRAFT` as playable is especially high risk.

### Email

- **Route/components:** `/dashboard/campaigns/[id]/email`; `EmailAuthoringWorkspace`, visual drawer, live Preview, legacy `CampaignEmailBuilder` ancestry.
- **APIs/services:** saves via PATCH `/api/campaigns/assign` into `Campaign.formSettings.emailResponse`; `/api/email/send`; fusion Email document/render/approval/audience helpers; reply routing models/APIs.
- **State:** document history plus visual model; Brand resolved into flattened Email document/theme; session shell persistence.
- **Workflow:** open from Campaign → edit blocks/theme → Preview desktop/mobile/dark inbox → Save → gated live Send UI where configured.
- **Permissions/entitlements:** Campaign/communication permission, consent readiness, service/feature/provider gates; Demo policy blocks send.
- **Tests:** `e2e/email-authoring-workspace.spec.ts`, Email migration/replies/comms unit suites.
- **V1 relationship:** V1 Email builder/save/send path retained, expanded with shared authoring, Audience readiness, and replies.
- **Gap:** no canonical Email entity, schedule, or delivery-state model; Campaign form JSON is overloaded. Send endpoint is transactional immediate delivery, not a complete governed scheduled lifecycle.

### Tap Points

- **Routes/components:** `/dashboard/tap-points`, legacy `/dashboard/devices/**`, `/dashboard/scan`; fleet/assignment/scan components.
- **Models/services:** legacy `DeviceSlot`, `DeviceAssignment`; newer `TapPoint`, `TapPointAddress`; bridge service and tap resolver.
- **Workflow:** provision/claim → assign Campaign/group → stable public code → resolver/tap record → health/Insights.
- **Permissions/entitlements:** active-device limit, assignment permissions, Demo blocks production assignment.
- **Tests:** public tap, scan, cross-system, Pulse/fleet proofs.
- **V1 relationship:** preserves V1 DeviceSlot operational path and overlays the intended Tap Point model.
- **Conflict:** dual models remain; the newer permanent address is a fallback bridge rather than sole authority.

### Tap Trace and Insights

- **Routes:** legacy `/dashboard/analytics`; current `/dashboard/insights`; `/api/insights/export`.
- **Models/services:** `TapEvent`, `ClickEvent`, lead/conversion relationships; `getAnalyticsTimeseries`; Insights metrics, drilldown, provenance, TapProof, evidence display.
- **Workflow:** public resolution logs TapEvent; actions log ClickEvent; pages aggregate by Campaign/Tap Point/time and show drilldowns.
- **Tests:** Insights drilldown/evidence/failure-recovery e2e/unit; J1 public event proofs.
- **V1 relationship:** V1 real analytics preserved and expanded.
- **Gap:** no route or navigation named Tap Trace and no first-class event-history view. Legacy Analytics and new Insights duplicate IA while the canonical evidence concept is obscured.

### TapSave

- **Routes/services/models:** public Keep controls; `/api/tapsave/**`; `/mytap/[relationshipId]`; TapSave service/moments; `TapSaveMoment`, `CustomerRelationship`, wallet models.
- **Workflow:** public customer chooses supported keep method → consent/relationship-safe return → MyTap/preferences/wallet projection.
- **Tests:** retention, TapSave moments, wallet lifecycle/evidence, Card retention e2e.
- **V1 relationship:** valuable post-V1 extension around the Card.
- **Risk:** mock Wallet versus live issuance must remain explicit; dual Lead/Contact/Relationship writes need reconciliation.

### Audience

- **Routes/components:** `/dashboard/audience`, wallet, inbox, cases; legacy `/dashboard/leads`.
- **Models/services:** `Lead`, `Contact`, `CustomerRelationship`, `ConsentRecord`, message/thread/case/suppression models; fusion Audience services.
- **Workflow:** lead/keep/message event → Contact/Consent/Relationship projection → Owner search/timeline/eligibility.
- **Tests:** consent, health, inbox guardian, TapSave/lead cross-system proofs.
- **V1 relationship:** V1 Leads retained; newer normalized Audience is valuable.
- **Conflict:** legacy Lead remains a person-like record alongside Contact; exact merge/reconciliation authority is partial.

### Experiences and Offers

- **Routes:** `/dashboard/experiences`, journeys, orders, canvas, TapCast; public `/offer/[slug]`.
- **Models/services:** Journey draft/published/execution models, Offer projection in Campaign/Card JSON, Commerce models/helpers, Canvas models.
- **Workflow:** heterogeneous hubs rather than one shared Experience lifecycle.
- **Permissions/publication:** feature gates, Journey lifecycle policy, Offer approval/claim policy.
- **Tests:** Journey, Card Offer fuse, Commerce, Canvas e2e/unit suites.
- **V1 relationship:** extensions around Card/Campaign.
- **Conflict:** “Experience” is currently an IA container for unrelated systems; Offer authority is Campaign content with Card projection, which is sound only when explicitly enforced.

### TapCanvas

- **Route/components/services:** `/dashboard/experiences/canvas`; `TapCanvasShell`; `lib/fusion/canvas/**`; `/api/canvas`.
- **Models:** document, version, item, connector, frame, comment, proposal, approval, binding, overlay, issue, audit.
- **Workflow:** create/edit graph → comment/approve → explicitly promote/bind/operate.
- **Tests:** Canvas persist/owner gates/promotion/tapflow e2e/unit.
- **V1 relationship:** valuable later planning extension.
- **Risk:** extensive Canvas lifecycle can duplicate Journey/Campaign authority; promotions must remain explicit projections into canonical systems.

### Ask TapConnect

- **Paths:** global drawer in `components/studio/studio-top-bar.tsx`; Card drawer host in `card-shell-tool-drawer.tsx`; deterministic policy in `lib/fusion/ask/policy.ts`.
- **Current workflow:** prompt → “Prepare proposal” → generic changes list → Apply → UI marks applied. Global host has no `onApplyDraft`; Card host passes an empty callback. No Edit Proposal action exists.
- **Tests:** Ask policy and Owner compliance tests validate blocking/copy, not an end-to-end real object mutation.
- **V1 relationship:** intended replacement/improvement over basic V1 AI generation.
- **Classification:** presentational shell only for Card/global use; confirmed misleading and requires replacement of the action contract while keeping safety policy.

### Autopilot

- **Paths/models:** `AutopilotProposal`; `/api/ai/proposals`, `/api/autopilot/live/**`; proposal, prepared execution, live activation, policy, budget, knowledge modules.
- **Workflow:** durable recipes/proposals → accept/partial/reject → apply/undo governed artifacts; some surfaces remain mock/prepared.
- **Tests:** extensive F0–F3 proposal/execution suites and e2e.
- **V1 relationship:** valuable governed replacement for V1 one-shot AI.
- **Conflict:** overlaps Ask's proposal vocabulary and action promise. One canonical proposal/mutation contract is needed; Autopilot remains background, Ask interactive.

### Workspaces and memberships

- **Paths/models:** `Business`, `BusinessUser`, Workspace context API/menu; Control Room membership, Platform roles/direct permissions.
- **Workflow:** signed-in user resolves current Business membership; Control Room can open a specific Workspace in Studio via `OpenWorkspaceInStudio`.
- **Tests:** workspace context and Control Room e2e/domain tests.
- **Conflict:** `OpenWorkspaceInStudio` context is server/session based, but return context is not carried into Card editor: `doneHref` only recognizes onboarding and otherwise returns `/dashboard/card`.

### Control Room

- **Route/components/services:** `/control`, `ControlRoom`, snapshot/mutations/identity/permissions/entitlements/audit/approval/support policies.
- **Models:** Platform identities, roles, permissions, invitations, sessions, services/plans/overrides/restrictions, Demo and approval/audit models.
- **Workflow:** govern directory/business/service/plan/support/Demo; all mutations same-origin and server-authorized.
- **Tests:** `lib/control/__tests__/control-foundation.test.ts`, `e2e/control-room.spec.ts`, `docs/control-room/FOUNDATION.md` acceptance matrix.
- **V1 relationship:** high-value later platform architecture.
- **Gap:** opens Studio but provides no trustworthy originating record return. Ordinary content edits should not occur inside Control Room.

### Demo Studio, publication, and landing binding

- **Paths:** Demo section of `ControlRoom`; `demo.*` mutations; `/api/public/demo-card/[slotKey]`.
- **Models:** `DemoWorkspaceMetadata`, `DemoManager`, immutable `DemoPublication`, versioned `LandingDemoBinding`, approval/audit.
- **Workflow:** real Demo Workspace edited in Studio → publish current saved draft → immutable revision → optionally approval → bind slot → public payload → rollback.
- **Tests:** Control Room domain/e2e.
- **Finding:** governance/public payload architecture is strong. Round-trip context is incomplete; legacy landing-demo APIs and `Campaign.isLandingDemo` coexist with the new immutable system and should be retired/rewired.

### Permissions, plans, entitlements, audit, approvals

- **Authority:** platform permission resolution uses scoped ALLOW/DENY with deny precedence; commercial access uses plan + add-on/override − restriction + dependency; Studio also retains legacy roles/limits and feature gates.
- **Paths:** `lib/control/{permissions,entitlements,approval-policy,audit}.ts`; `lib/fusion/authz/**`; `lib/fusion/features/**`; `lib/plans.ts`.
- **Models:** role/direct permission, plan/service, override/restriction, approval, audit models.
- **Tests:** Control foundation, feature gate, business capability suites.
- **Conflict:** four layers—membership role, business capability, entitlement, feature flag—are legitimate but not always composed through one visible decision. Owners can see “unavailable” without one canonical explanation.

### Public landing experience

- **Routes/components:** `/`; `card-centered-landing.tsx`/public experience components; public Demo Card slot API and older `/api/public/landing-demo` services.
- **Authority:** marketing content in code and legacy landing CMS models; Demo Card may come from new immutable binding or older landing slot system depending component.
- **Tests:** landing/public redesign, card-centered and studio assembly e2e.
- **Conflict:** duplicate landing Demo systems (`LandingDemoSlot`/legacy services versus `DemoPublication`/`LandingDemoBinding`). New immutable binding is the correct authority.

## Dormant, duplicated, or unreachable candidates

| Candidate | Evidence | Disposition pending dependency trace |
|---|---|---|
| Legacy `/dashboard/devices` alongside `/dashboard/tap-points` | both route trees; `DeviceSlot` plus TapPoint bridge | Keep alias temporarily; converge on Tap Point authority. |
| Legacy `/dashboard/analytics` alongside `/dashboard/insights` | both routes and services | Merge IA; preserve Tap Trace event history and Insights analysis. |
| Legacy landing Demo APIs/slots | `/api/admin/landing-demo*`, `LandingDemoSlot`, `lib/services/landing-demos.ts` | Rewire landing to immutable Control Room binding; retain only compatibility until callers move. |
| `BrandInheritanceState` versus property stacks | two separate authoring modules | Merge into one persisted linkage/provenance contract. |
| Global/Card Ask Apply | empty or absent host callbacks | Replace misleading action behavior before general availability. |
| `PublicationSnapshot` Card restore without normal publish | snapshot API plus absent Studio publish | Rewire as revision history behind canonical publish; do not present pre-save snapshots as published revisions. |
| Legacy Leads as person authority | `/dashboard/leads`, `Lead` plus normalized Audience models | Rewire capture history to Contact/Relationship authority. |
| Pulse as standalone area | `/dashboard/pulse` plus Tap Point health elsewhere | Demote/merge unless Owner approves distinct fleet product. |

## Current runtime confidence

- **Repository/test evidence:** substantial unit and Playwright coverage exists, but existing documents explicitly keep many systems at Owner-acceptance pending.
- **This audit:** performed no production access, sends, publication, migrations, or fixture mutations. Static paths are confirmed; consequential end-to-end workflows remain **runtime proof required** where noted in `WORKFLOW_TRACES.md`.
