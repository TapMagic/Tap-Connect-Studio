# Workflow Traces

Audited tree: `d67d1399a064834d476a0675642c294cf13478e3`  
Execution boundary: static code and existing test-evidence inspection only. No production data, Email/Campaign send, publication, binding, payment, migration, or fixture mutation occurred. Runtime classifications use existing committed tests/documents where explicit; this audit marks its own unexecuted consequences **runtime proof required**.

Classification vocabulary: **works as intended**, **technically works but misleading**, **partial**, **broken**, **circular**, **unreachable**, **unknown**.

## A. Card appearance and Control Room entry

Target: Control Room → Demo → Studio as self → Card → Brand-linked color → Custom here → Buttons → Appearance → Save → reload → Preview → Control Room.

| Step | Component/state/API/write | Classification and evidence |
|---|---|---|
| Open Demo record | `ControlRoom` Demo card from `getControlSnapshot`; `OpenWorkspaceInStudio` selects `demo.businessId` | **Works as intended** per `e2e/control-room.spec.ts`; identity remains administrator/member, not Support Session. |
| Open Card editor | link `/dashboard/card/edit`; page calls `requireBusinessCapability("card.draft.edit")`, `beginCardDraftEditing` | **Works as intended** statically. One-time compatibility write initializes `tapCardDraft` if absent. |
| Load property | `TapCardBuilder` gets parsed `tapCardDraft`; `createInheritanceState` and `buildCardVisualModel` derive Brand state | **Technically works but misleading:** “linked” session state is not durable (`brand-inheritance.ts` comments and bar copy). |
| Choose Custom here/change color | inspector calls PS override/config patch; `setConfigHistory`; `dirty=true`; in-memory shared renderer updates | **Works in session**; tests cover visual/custom resolution. Persisted source/linkage metadata is incomplete. |
| Navigate Buttons/Appearance and back | Adaptive drawer/panel stack changes selected tool; builder remains mounted | **Works in intended shell** per Card authoring e2e; multiple nested panels raise causal-complexity risk. |
| Save | builder PUT `/api/card/draft` `{draft,expectedRevision}` → compare-and-swap `BrandKit.tapCardDraft`, increment revision, audit | **Works as intended** for saved draft; conflict returns 409 and UI reports failure. |
| Reload | page reload reads `tapCardDraft`; parser constructs config | **Partial:** value persists; exact `CUSTOM`/source explanation may not because the authority contract is not fully serialized. |
| Preview | embedded Preview uses in-memory config; view-only `/dashboard/card/preview` uses saved draft | **Works as intended** for draft Preview. |
| Public result | `/t` reads `BrandKit.tapCard`, not draft | **Broken for expected publish completion:** Save/Preview do not update public Card and ordinary Studio has no publish action. |
| Return to same Demo record | editor `doneHref` resolves only onboarding or `/dashboard/card`; no Control Room Demo `returnTo` | **Broken:** administrator lands at Card overview, not originating Control Room record. |

**Overwrite points:** `syncFromBrandKit` can update non-overridden session fields; parser fallbacks fill missing values; intelligent prefill may apply eligible values; Save replaces whole draft JSON; Demo publish later copies saved draft to public. A correct local custom value should survive, but durable proof of linkage semantics is missing.

## B. Button editing

| Transition | Current path | Classification |
|---|---|---|
| Select button | shared Outline/preview selection → `selectedId` → Button panel | **Works as intended**; e2e selection/inspector coverage. |
| Change style | `patchSection`/PS overrides → Card config history → immediate renderer | **Works in session**. |
| Reorder | drag/drop or move helpers update `order`; `sorted` derives view | **Works as intended**; `e2e/card-editor-interaction.spec.ts`, reorder unit tests. |
| Hide/show | section visibility toggle, renderer filter | **Works as intended** in current tests. |
| Lock/unlock | section `locked` toggle guards editor actions | **Partial:** object lock persists, but relationship to Brand/policy locks is not one explained contract. |
| Save | whole draft PUT | **Works as intended** for draft. |
| Preview | same renderer/current or saved draft | **Works as intended**. |
| Reload | draft parser restores section JSON | **Works for values/order/visibility/section lock**; targeted isolated DB proof required. |
| Publish/public | absent normal Card publish | **Broken** as a complete customer-result workflow. |

## C. Brand override

Target: linked Brand value → local custom → detach → later Brand change → local remains → reset.

1. Brand value enters `BrandKit` and `BrandKitSnapshot`/PS `brand` layer.
2. `overrideField` or `setItemOverride` marks current session/item custom.
3. Card Save flattens the resolved result into Card draft JSON.
4. A later Brand update changes `BrandKit`; current visual resolver preserves explicit item override when it can reconstruct it.
5. `restoreInherited`, `resetPropertyToBrand`, or Card-specific reset removes local override and resolves Brand again.

**Classification: partial / technically works but misleading.** Unit tests prove helper semantics, and UI copy admits existing saved/public Cards do not auto-update. However:

- `BrandInheritanceMode="linked"` is explicitly session copy, not durable synchronization.
- source/linkage/lock/save state are not one persisted property record;
- whole-document JSON may contain the resolved value without its origin after reload;
- Card, Campaign, and Email each adapt the visual resolver separately.

**Required runtime proof:** change Card action color to Custom, Save/reload, change Brand via Brand Workspace, reopen Card, assert custom value/source label, Reset to Brand, Save/reload, assert Brand value/source label.

## D. Campaign

| Step | Component/API/write | Classification |
|---|---|---|
| Open/create | `/dashboard/campaigns` → `/dashboard/workbench`; template POST `/api/campaigns` → `createCampaignFromTemplate` → `Campaign(DRAFT)` | **Works as intended**; V1 spine preserved. |
| Edit content/theme | `CampaignEditor` block and visual histories; shared renderer | **Works as intended** with substantial tests; multiple histories add complexity. |
| Save | PATCH `/api/campaigns/assign` writes title/blocks/theme/dates/form/end fields, usage, audit/outbox | **Technically works but endpoint is misleading:** “assign” owns content saves. |
| Schedule fixture | dates in Campaign and/or `/api/schedule` `ScheduleRule`, or group slot API | **Partial:** all mechanisms work individually; one precedence/status contract is not visible. |
| Inspect status | Campaign list/detail/actions/schedule/group pages | **Works but can mislead:** assignment and status can change each other; resolver considers DRAFT playable. |
| Connect to Card/Tap Point | DeviceAssignment/Tap Point resolver; Offer Spotlight projection where eligible | **Works in existing proofs**, runtime fixture revalidation required. |

**State transitions:** save retains current public-like state unless publishing; publish sets `LIVE`; assignment service can set `LIVE`; actions expose `READY/SCHEDULED/LIVE/PAUSED/ARCHIVED/CLOSED`; public resolver additionally tests schedule and assignment.

## E. Tap Trace

| Step | Path | Classification |
|---|---|---|
| Fixture tap reaches resolver | `/t/[deviceCode]` → `resolveTapDestination`/schedule/group | **Works in existing J1 e2e evidence**. |
| Record trace | `logTapEvent` → `TapEvent` with Business/Device/Campaign; CTA → `/api/tap/click` → `ClickEvent` | **Works as intended** functionally. |
| Connect Tap Point | legacy DeviceSlot ID plus newer TapPoint address bridge | **Partial:** operational link works, dual identity remains. |
| Connect Card/Campaign | Campaign ID recorded when resolved; Card fallback has Business/device context but no immutable Card revision key | **Partial:** Campaign attribution stronger than Card revision attribution. |
| Display to Owner | `/dashboard/analytics` aggregates; `/dashboard/insights` provides drill/provenance | **Technically works but misleading/discoverability regression:** no Tap Trace history surface or canonical label. |

Deletion paths in `lib/services/campaigns.ts` can null Campaign IDs on historical events. Preserve trace meaning with tombstones/snapshots in a later implementation.

## F. Email

| Step | Component/API/write | Classification |
|---|---|---|
| Create/open | Campaign detail → `/dashboard/campaigns/[id]/email`; parse existing/default Email document | **Works**, but Email cannot exist independently of a Campaign row. |
| Edit | `EmailAuthoringWorkspace` document/visual history | **Works as intended** in e2e/unit evidence. |
| Save | PATCH `/api/campaigns/assign` merges `formSettings.emailResponse`, records Asset/Resource usage and audit | **Works but endpoint/model authority is misleading/overloaded.** |
| Preview | `EmailLivePreview` desktop/mobile/dark inbox | **Works as intended** for document rendering. |
| Schedule | no Email schedule model/path found | **Unreachable** as a complete scheduled Email workflow. Campaign dates do not safely equal send schedule. |
| Send fixture/live | `/api/email/send`, feature gate, readiness, `sendTransactionalEmail` | **Partial:** explicit immediate send exists; Demo blocks and credentials gate it. This audit did not invoke it. |
| Inspect delivery state | provider response only; reply routing has separate status models | **Broken/incomplete:** no first-class outbound Email delivery state/history. |

## G. Ask TapConnect

| Step | Current behavior | Classification |
|---|---|---|
| Open | global top-bar or Card drawer | **Works as intended**. |
| Request concrete Card changes | prompt stored locally | **Works**. |
| Proposal | `buildDeterministicAskPreview` returns generic “prepare reversible draft” lines and source labels | **Technically works but misleading:** it does not interpret exact Card mutations. |
| Edit proposal | only Reject/Apply/Undo; no editable fields/diff | **Unreachable**. |
| Apply | global host provides no callback; Card host callback is empty; drawer sets `applied=true` | **Broken:** UI says “Applied as a reversible draft” although no object changed. |
| Card mutates/save | no mutation from Ask | **Broken**. |
| Undo | calls host Undo when provided; after no-op Apply it may undo an unrelated prior manual edit | **Broken/high risk**. |

Safety intent detection in `lib/fusion/ask/policy.ts` is valuable and should be retained. The visible action contract must be disabled or replaced before general use.

## H. Control Room round trip

| Transition | Current path | Classification |
|---|---|---|
| Control Room → Demo record | snapshot and Demo card | **Works as intended**. |
| Open Studio as self | `OpenWorkspaceInStudio` sets Workspace context; legitimate membership required | **Works as intended** per Control Room design. |
| Edit/save/Preview | Card draft path described above | **Works for saved draft/Preview**. |
| Return same Demo record | no originating record context in editor/Studio shell | **Broken**. |
| Publish current saved revision | Control Room `demo.publish` reads valid `tapCardDraft`, safety-checks, creates immutable `DemoPublication`, copies to BK public | **Works by static/domain/e2e evidence**; this audit did not execute it. |
| Bind | `demo.binding.activate`, published-only check, optional separation-of-duties approval | **Works as intended**. |
| Inspect public payload | `/api/public/demo-card/[slotKey]`, safe manifest, ETag/cache | **Works as intended**. |
| Change draft | Studio saves a new draft revision; bound Demo remains unchanged | **Works as intended by data separation**. |
| Publish/activate new | new immutable version then bind | **Works**, but “activate” is currently the binding operation rather than a named publication activation. |
| Roll back | `demo.rollback` changes Demo current publication; binding rollback is a separate operation | **Technically works but lifecycle may mislead:** rolling current Demo revision and rolling landing binding are distinct. |

Legacy `/api/admin/landing-demo*`, `LandingDemoSlot`, and `Campaign.isLandingDemo` remain parallel and must not be mistaken for the governed round trip.

## I. Internal marketing use

Target: Control Room → internal TapConnect Workspace → Studio → Brand → Assets → Card → Campaign draft → scheduled fixture → Email draft → Audience → Tap Trace → return → Audit.

| Segment | Classification | Evidence/gap |
|---|---|---|
| Open internal Workspace as self | **Works as intended** | Control bootstrap memberships and Workspace menu. |
| Brand | **Works with authority caveat** | Brand Workspace/decisions exist; durable linkage incomplete. |
| Asset Studio | **Works as intended candidate** | durable media/collections/usages; provider/live storage depends on configuration. |
| Card direct edit/save/Preview | **Works for draft; publication partial** | `/api/card/draft`; no normal publish. |
| Campaign draft/edit | **Works as intended candidate** | V1 editor/service plus shared visual core. |
| Scheduled Campaign fixture | **Partial** | deterministic group/schedule available; competing mechanisms/status semantics. |
| Email draft/Preview | **Works as intended candidate** | Campaign-scoped document. |
| Audience | **Partial** | normalized Audience plus legacy Leads; consent/relationship reconciliation incomplete. |
| Tap Trace | **Partial/misnamed** | events/Insights exist, direct history absent. |
| Return to Control Room | **Broken** | no preserved return context. |
| Audit | **Partial** | Control/selected Studio actions append audit; not every authoring mutation has one canonical audit/revision record. |

## Cross-workflow breakpoints

1. **Save is not publication:** correct as a law, but normal Card publication is missing.
2. **Preview source varies:** embedded = unsaved in-memory; view-only = saved draft; public = old public Card; labels must remain explicit.
3. **Source labels are not durable:** Brand/custom behavior can work visually while its explanation disappears after reload.
4. **Return context stops at Studio entry:** Workspace continuity exists, task-origin continuity does not.
5. **Campaign scheduling has multiple authorities:** date window, device rule, group slot, status, and assignment.
6. **Email operation stops after immediate send attempt:** schedule and durable delivery state are absent.
7. **Tap Trace facts lack a first-class Owner history:** analysis cannot substitute for inspectable evidence.
8. **Ask Apply is a no-op with success copy:** the most severe misleading-control defect.

## Required runtime evidence before reclassification

- isolated database before/after rows for Card draft revision, source/linkage metadata, public Card, Campaign status/rules, Email document, TapEvent/ClickEvent, Demo publication/binding, and audit;
- screenshots/recordings at every Save/Preview/Publish/status boundary;
- same-session and reload assertions;
- public payload hashes before/after draft and publication changes;
- no network calls to live Email, Campaign, payment, customer, or production providers;
- failure cases: 409 draft conflict, invalid schedule, blocked Demo send, expired Preview, denied permission, and binding approval.
