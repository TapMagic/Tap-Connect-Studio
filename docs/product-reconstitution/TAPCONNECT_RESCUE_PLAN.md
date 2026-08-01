# TapConnect Rescue Plan

Status: proposed, documentation only; human approval required before implementation
Baseline: current `d67d1399a064834d476a0675642c294cf13478e3`; V1 candidate `7357fd9806d56d07d9ded68eef2beec5ea578052`

## Program rules

- Preserve V1 behavior by observable Owner/customer outcomes, not by copying old architecture wholesale.
- Make no schema or data migration until its compatibility/rollback proof is approved.
- Direct manual workflows must pass before Ask TapConnect is enabled for them.
- “Complete” means the named visible result and persisted/runtime evidence exist. Route/control/test presence is not completion.
- Every wave uses isolated deterministic fixtures and blocks production providers, customer contact, real sends, payments, and production Tap Point assignments.
- Every wave has a reversible branch/commit boundary and a documented rollback test.

## Wave 0 — Safety and baselines

- **Goal:** freeze evidence, certify the V1 candidate, and create deterministic proof infrastructure.
- **Scope:** record all relevant branch/SHA tips; archive tree inventories; build isolated V1/current fixture databases; define screenshots, videos, DOM/DB assertions, public payload hashes, and status language; create no product changes.
- **Prerequisites:** human accepts the Constitution and V1 candidate for verification.
- **V1 preserved:** all five core workflows remain untouched.
- **Current retained:** all branches, migrations, Control Room safety, test harnesses.
- **Modify/retire:** test/fixture documentation only at first; retire no system.
- **Migration impact:** none. Never run `db push`, `migrate resolve`, or production migrations.
- **Tests/proof:** rerun archived V1 in a separate read-only worktree/isolated compatible DB; capture 14 V1 journeys; map each request/row/screenshot; capture current journeys with providers mocked/blocked.
- **Visible acceptance:** Owner can view side-by-side V1/current recordings with exact Save/Preview/Public/status labels.
- **Rollback:** delete only the isolated disposable proof environment through an approved cleanup procedure; repository/data tips remain intact.
- **Completion status rule:** `BASELINE CERTIFIED` only when all five core areas have exact code + DB + visible proof or are explicitly `UNRESOLVED` with a blocking test plan. Never say “fully functioning” from names alone.

## Wave 1 — Restore the V1 operational spine

- **Goal:** restore complete direct Card, Campaign, scheduled Campaign, Tap Trace, and Email workflows using the strongest current architecture.
- **Scope:** Card create/edit/save/reload/Preview/explicit publish/public; Campaign create/edit/save; one explained schedule/status/activation path over existing mechanisms; Tap Trace append/history; Email create/edit/save/Preview plus safe governed schedule/send status; direct navigation.
- **Prerequisites:** Wave 0 certified fixtures; approved lifecycle definitions; compatibility inventory of current public Cards/Campaigns/Emails.
- **V1 preserved:** direct manual task paths, stable public URL, Campaign editor/service behavior, schedule resolver outcomes, tap attribution, Email draft/Preview.
- **Current retained:** Card draft revision conflicts, shared renderers, Campaign visual core, provider/consent/Demo gates, publication snapshots where correctly scoped.
- **Modify:** add canonical ordinary Card publish command; clarify resolver status eligibility; façade Campaign save/assign/schedule commands; expose Tap Trace; define Email lifecycle projection.
- **Retire:** nothing until compatibility callers and public payloads pass.
- **Migration impact:** prefer no destructive migration. If Card revision/Email delivery records are needed, add tables/fields only after migration review; backfill conservatively.
- **Tests:** DB-backed vertical tests for Save/reload/public; Campaign schedule time matrix; tap/click append and attribution; Email draft/schedule fixture; permission/Demo/provider-denied paths; renderer parity screenshots.
- **Visible acceptance:** Owner completes all minimum restored core tasks without AI or Control Room detours and can state what is draft, saved, scheduled, published, active, or sent.
- **Rollback:** feature-gated new commands; retain current `tapCard` resolver and Campaign/Email JSON projections; migration down/forward recovery plan.
- **Completion status rule:** `OPERATIONAL SPINE RESTORED` only after database and public-output assertions pass following leave/reopen/reload. No success based only on Preview.

## Wave 2 — Workspace and state continuity

- **Goal:** preserve actor, Workspace, mode, return context, draft state, and revision meaning across Control Room and Studio.
- **Scope:** Control Room→Studio as self→exact Control Room record; legitimate membership; view-as read-only; Support Session exceptional; unsaved guard; saved draft/revision/Preview/public labels.
- **Prerequisites:** Wave 1 canonical commands.
- **V1 preserved:** direct Studio routes remain usable outside Control Room.
- **Current retained:** `OpenWorkspaceInStudio`, Workspace context, Control identity/permission/support policies.
- **Modify:** signed/session-scoped `returnContext` with allowlisted route/resource; Studio top bar/editor Done actions; one effective-access explanation facade.
- **Retire:** ad hoc return links that discard origin; never retire compatibility URLs until redirects tested.
- **Migration impact:** none expected; session/context storage only, with privacy/security review.
- **Tests:** actor and Workspace assertions on every transition; malicious return URL rejection; browser back/forward; expired session; unsaved leave; View as mutation denial; Support sensitive-action denial.
- **Visible acceptance:** administrator returns to the same Demo/business record and sees audit/publication context; Owner entering normally returns to Card/Studio, not Control Room.
- **Rollback:** ignore new return token and fall back to safe Studio/Control section; context writes are non-destructive.
- **Completion status rule:** `ROUND TRIP TRUSTWORTHY` only after identity, Workspace, origin, and unsaved state are asserted at every hop.

## Wave 3 — Property authority

- **Goal:** establish one durable linked/custom/source/lock/save contract across authoring.
- **Scope:** canonical property record/resolver; Brand, Business, Location, Website proposal, Custom, AI proposal, Default; Linked/Custom/Reset; locks; prefill; migrations/adapters.
- **Prerequisites:** Wave 1 stable draft commands; approved migration semantics.
- **V1 preserved:** explicit local values remain local and persist.
- **Current retained:** `PropertyStack` resolution functions, Brand decisions, Knowledge provenance, intelligent-prefill eligibility, visual adapters.
- **Modify:** merge `BrandInheritanceState` and PS vocabulary; persist provenance/linkage; expose current value/source/link/lock/save UI; treat old explicit values as Custom unless proven.
- **Retire:** session “linked” claims that mean copy; silent parser/prefill overwrites; duplicate source vocabularies.
- **Migration impact:** additive metadata; lazy/conservative backfill; no mass relinking. Publish snapshots remain immutable.
- **Tests:** property matrix for every source/mode/lock; Save/reload; later source change; Reset; concurrent conflict; invalid/removed source; Card/Campaign/Email adapter equivalence.
- **Visible acceptance:** Owner always answers “what value, where from, will it update, is it locked, is it saved?” and a Custom value survives Brand changes.
- **Rollback:** readers tolerate absent metadata; old values resolve as Custom; feature-gate durable linkage.
- **Completion status rule:** `AUTHORITY PROVEN` only after persisted metadata and rendered value match across reload and source changes—not merely within one session.

## Wave 4 — Card authoring rescue

- **Goal:** make rich Card authoring direct, causal, and no less reliable than V1.
- **Scope:** Appearance, content, actions, sections, background, typography, button style/order/visibility/lock, consolidated inspector, Preview, Undo/Redo, failure explanation.
- **Prerequisites:** Waves 1–3.
- **V1 preserved:** complete direct Card editor, immediate Preview, Save/reload/public parity.
- **Current retained:** adaptive shell, shared renderer, creative composition, responsive/Live Device Preview, Assets, labeled history.
- **Modify:** one document transaction/history; consolidate one-control/narrow nested panels; optional explicit jumps to Brand/Assets; all controls write canonical property state.
- **Retire:** duplicate legacy controls only after equivalent direct control and migration proof; dead/misleading controls immediately disabled with explanation.
- **Migration impact:** document adapters only unless authority metadata requires approved Wave 3 backfill.
- **Tests:** every control cause→Preview→Save→reload→publish→public; keyboard/drag alternatives; Undo/Redo across mixed edits; inspector selection; phone/tablet/desktop/assistive-tech.
- **Visible acceptance:** `Card → Appearance → change → Preview → Save → leave/reopen → publish → public` succeeds without another workspace.
- **Rollback:** retain legacy builder adapter behind internal flag until parity evidence; snapshots before public mutation.
- **Completion status rule:** `CARD AUTHORING RESTORED` only when every visible enabled control causes the promised persisted/customer result.

## Wave 5 — Ask TapConnect action contract

- **Goal:** make Ask a real governed accelerator after manual editing works.
- **Scope:** interpret prompt/selection; structured exact diff; source/confidence; editable proposal; Apply into canonical draft transaction; Save; Undo; audit; policy blocks.
- **Prerequisites:** Waves 1, 3, and 4; shared proposal schema decision with Autopilot.
- **V1 preserved:** AI optional; manual task remains complete.
- **Current retained:** consequential-intent guard, Autopilot proposal/governance/audit/budget patterns.
- **Modify:** replace deterministic generic preview; host-specific mutation adapters; proposal editor; revision/conflict handling.
- **Retire:** current no-op Apply success and unrelated Undo risk; duplicate proposal semantics.
- **Migration impact:** proposal records may need shared schema/version, no content migration required initially.
- **Tests:** exact diff generation fixtures; edit proposal; partial/invalid changes; Apply changes real Card; Save/reload; Undo only applied transaction; blocked publish/send/delete/spend; stale draft conflict.
- **Visible acceptance:** Owner asks for two concrete Card changes, edits one, applies, sees both expected results/no others, saves, reloads, and undoes predictably.
- **Rollback:** disable Ask Apply and retain read-only guidance; proposal records are non-authoritative.
- **Completion status rule:** `ASK ACTIONABLE` only if object revision and visible render change; prose/success copy cannot satisfy completion.

## Wave 6 — Shared authoring contract

- **Goal:** apply proven property/mutation/history behavior to Email, Campaigns, Offers, Experiences, TapCanvas, and Assets without replacing proven V1 workflows.
- **Scope:** adapters and shared contracts, first-class Email lifecycle, Campaign lifecycle clarity, Offer projection freshness, Canvas/Journey explicit promotion, Audience reconciliation.
- **Prerequisites:** Wave 3 authority and Wave 4/5 transaction patterns.
- **V1 preserved:** existing Campaign and Email direct paths/JSON compatibility.
- **Current retained:** rich Email/Campaign drawers, shared renderer/resources, Audience/consent, Offer fuse, Journey/Canvas governance.
- **Modify:** separate save/assign/send APIs behind compatibility façade; additive Email identity/schedule/delivery; canonical projections/where-used.
- **Retire:** overloaded endpoints/stores only after all callers migrate; legacy Lead person authority after reconciliation.
- **Migration impact:** likely additive Email/projection/reconciliation migrations; explicit backfill/double-read period and no destructive column removal.
- **Tests:** cross-surface Brand/custom matrix; Asset reuse/where-used; Campaign public resolution; Email render/schedule fixture/delivery states; Offer/Card projection; Canvas promotion idempotency.
- **Visible acceptance:** shared behaviors feel consistent while each product completes its own job; Brand change never overwrites Custom.
- **Rollback:** compatibility projections remain source-readable; feature-gated new entities; idempotent backfill.
- **Completion status rule:** `SHARED CONTRACT ADOPTED` is per surface, not all-or-nothing; a surface is complete only with end-to-end task proof.

## Wave 7 — Demo publication and landing binding

- **Goal:** converge all Demo/public landing behavior on immutable, governed revisions.
- **Scope:** saved Card draft → Demo publish → binding → public payload → new draft/new revision → activation/binding → publication rollback and binding rollback.
- **Prerequisites:** Wave 1 Card publish semantics, Wave 2 return context, Wave 3 authority snapshots.
- **V1 preserved:** Card content and stable customer experience; legacy consumers remain during migration.
- **Current retained:** Demo policy/readiness, `DemoPublication`, `LandingDemoBinding`, approval/audit, ETag/cache/sanitization.
- **Modify:** public landing consumers; revision/status language; inspection and round-trip UI.
- **Retire:** `Campaign.isLandingDemo`, mutable `/api/admin/landing-demo*`, and `LandingDemoSlot` only after read/write/caller migration and rollback proof.
- **Migration impact:** create immutable publications for active legacy slots, compare payload hashes, switch binding atomically; retain rollback pointer.
- **Tests:** safety blocks; immutable hash; draft cannot alter bound payload; publish/bind/rollback/unbind; approval separation; cache/ETag; private-key stripping; exact Control Room return.
- **Visible acceptance:** Demo Manager can explain current saved draft, current published revision, bound revision, and prior rollback target.
- **Rollback:** reactivate prior binding; public fallback remains explicit; legacy read path temporarily available behind internal switch.
- **Completion status rule:** `DEMO LOOP TRUSTWORTHY` only after two revisions plus both rollback types pass and public payload hashes match expectations.

## Wave 8 — Landing Page V2

- **Goal:** present the real proven product through the canonical bound Card.
- **Scope:** landing narrative/components, real bound Demo payload, truthful capability/readiness copy, acquisition continuation.
- **Prerequisites:** Waves 1 and 7; Campaign, Email, Tap Trace, and Card loops trusted.
- **V1 preserved:** Card remains hero and stable destination.
- **Current retained:** strongest public landing design/components and feature-inventory qualification.
- **Modify:** remove stale mock/legacy Demo consumers and unsupported claims.
- **Retire:** decorative product-map claims or fake interactions without task outcomes.
- **Migration impact:** none beyond landing binding consumer already handled in Wave 7.
- **Tests:** bound payload/fallback, responsive/a11y/performance, claim-to-feature evidence, acquisition routes, no demo metrics as customer proof.
- **Visible acceptance:** landing shows a real immutable Card and accurately explains the operational spine.
- **Rollback:** restore previous landing deployment/binding without altering Demo revisions.
- **Completion status rule:** `LANDING V2 READY FOR HUMAN RELEASE REVIEW`; deployment remains a separate authorized action.

## Recommended first implementation slice

### Outcome

Prove the restored spine in one deterministic Demo Workspace without live providers:

```text
Control Room Demo record
→ Open Studio as self
→ Card: Brand-linked color → Custom here
→ reorder/style/visibility/lock buttons
→ Save → leave/reopen → reload → Preview
→ explicit publish → public parity
→ Campaign create/edit/schedule fixture/status
→ fixture tap → Tap Trace attribution
→ Email draft/edit/Preview/scheduled fixture state
→ return to same Demo record/audit
→ publish immutable Demo revision → bind → inspect payload
→ change draft (bound payload unchanged)
→ publish/bind new revision → roll back
```

### Exact current systems involved

- Control/Workspace: `OpenWorkspaceInStudio`, Workspace context, Control snapshot/mutations/audit.
- Card: `/dashboard/card/edit`, `CardAuthoringWorkspace`, `TapCardBuilder`, `/api/card/draft`, shared Card renderer, `BrandKit.tapCardDraft`/`tapCard`.
- Authority: `visual-property.ts`, Brand adapters/decisions; later canonical property metadata.
- Campaign: Workbench/templates, `CampaignEditor`, Campaign save/actions, ScheduleRule/Group resolver.
- Tap Trace: public resolver, `logTapEvent`, click API, new trace view backed by TapEvent/ClickEvent.
- Email: `EmailAuthoringWorkspace`, Email document/render, compatibility save, fixture schedule/delivery record.
- Demo: `demo.publish`, `DemoPublication`, `LandingDemoBinding`, public Demo Card endpoint.

### V1 patterns worth restoring

- one direct manual path per job;
- Card controls mutate one document and immediate Preview;
- explicit Campaign template→editor→Save/status flow;
- stable Tap Point URL with deterministic schedule resolution;
- tap evidence recorded in the public path and linked to operating objects;
- Email builder with obvious Save/Preview and explicit operation.

### Current architecture worth preserving

- separate Card draft and public state with optimistic revision conflict;
- shared edit/Preview/public renderers;
- durable Assets and approved Brand/Knowledge sources;
- permission, entitlement, Demo, support, audit, approval, and provider gates;
- immutable Demo revisions/bindings/rollback;
- responsive authoring shell and labeled Undo/Redo.

### Authority changes required

1. canonical ordinary Card publish from saved draft to immutable public revision;
2. one persisted Card property source/linkage/lock contract for tested color/buttons;
3. one document history/transaction for tested Card edits;
4. unified visible Campaign scheduling precedence/status for fixture path;
5. Tap Trace event view with Card/Tap Point/Campaign revision context;
6. first-class fixture-only Email schedule/delivery state or an explicitly approved narrower first slice;
7. return context from Studio to exact Control Room Demo record;
8. landing consumes only immutable bound Demo revision.

### Exact tests and visible proof

- Playwright serial journey at desktop and 390px; keyboard route for reorder.
- DB assertions after each Save/status/publish/bind/rollback.
- public DOM/payload hash equals expected published revision and remains unchanged after draft-only edit.
- property assertions before/after Brand change/Reset.
- resolver matrix immediately before/inside/after schedule window.
- TapEvent/ClickEvent attribution and human-readable trace row.
- Email fixture state without calling Resend.
- audit rows for Workspace open context, Card Save/publish, Demo publish/bind/rollback.
- screenshots at unsaved, saved draft, Preview, published, scheduled, active, bound, and rolled-back states.

### Migration needs

Prefer an additive slice:

- optional Card published-revision pointer/manifest while preserving `tapCard` compatibility;
- property authority metadata only for supported tested property keys, with old values defaulting Custom;
- optional Email fixture schedule/delivery entity or approved temporary deterministic record;
- no destructive removal of legacy landing/schedule/Email fields in the slice.

### Risks

- accidentally exposing a draft through public resolver;
- misclassifying existing values as Brand-linked;
- schedule priority changing current public Campaigns;
- audit/return token leaking cross-Workspace context;
- duplicate Demo publication paths mutating different stores;
- Email fixture accidentally reaching a live provider.

### Exclusions

- Ask TapConnect until the full direct slice passes;
- live sends, customer contact, payments, production Tap Points/data;
- wholesale TapPoint/DeviceSlot or Audience migration;
- full Canvas/Journey/TapCast unification;
- Landing Page V2 redesign;
- deleting compatibility fields/routes.

### Rollback path

- gate new publish/property/schedule/return behavior per fixture Workspace;
- preserve old public `tapCard`, Campaign rows, and Email JSON as compatibility projections;
- create immutable snapshots before every public mutation;
- restore prior Card/Demo publication pointer and binding independently;
- disable new route façade and fall back to current reads without data deletion.

## Human decisions required before implementation

1. Confirm V1 candidate after isolated runtime replay.
2. Approve whether ordinary Card publication is Owner-operated directly or subject to plan/role approval (it must remain available to the legitimate Owner).
3. Approve canonical scheduling priority and prohibit Draft public eligibility.
4. Decide the minimum first-class Email schedule/delivery model required for Wave 1.
5. Approve conservative existing-value migration as Custom.
6. Decide TapCast/TapLoop/TapProof customer-facing names.
7. Approve whether authoring Save/audit logs every property diff or one document revision summary.
8. Approve legacy landing Demo retirement sequence and compatibility window.
