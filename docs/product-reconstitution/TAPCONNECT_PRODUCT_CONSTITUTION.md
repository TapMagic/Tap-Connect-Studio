# TapConnect Product Constitution

Status: canonical product definition for human review
Audit source: `d67d1399a064834d476a0675642c294cf13478e3`
Behavioral baseline candidate: `7357fd9806d56d07d9ded68eef2beec5ea578052`

## Constitutional premise

TapConnect V1 was a functioning product core. The Card, Card authoring, Campaigns, scheduled Campaigns, tap evidence, and Email formed one understandable operating system. Later work may expand that system; it may not make those proven tasks less direct, predictable, or complete.

This document defines intended product meaning. Current code is evidence, not authority over these definitions. Statements labeled **Law** are normative. Statements labeled **Current evidence** describe the audited repository and may identify a gap.

## Canonical concepts

### TapConnect / Card

- **Definition:** TapConnect is the living customer-facing Card. The Card is the product's central hero. It remains useful after the first tap and presents the actions, information, offers, and return paths chosen by the business.
- **Primary user / job:** customer; recognize the business and complete a useful action. Owner; maintain the durable customer destination.
- **Customer result:** one recognizable, current, actionable destination.
- **Owns:** ordered Card sections and actions, local presentation overrides, visibility, lock intent, lifecycle, draft/public revision relationship.
- **May read:** approved Business facts, Brand defaults, Assets, active Campaign/Experience projections, TapSave availability, Tap Point context.
- **May perform:** render, preview, save draft, explicitly publish a revision, expose configured actions.
- **Must never perform:** silently publish draft changes; silently overwrite a local custom choice; send, charge, or contact without an explicit governed action.
- **Relationships:** Studio authors and operates it; Control Room governs access and Demo publication but is not its ordinary editor.
- **Availability:** Card create/edit/save/preview/public behavior is the minimum product floor, not a premium extension.
- **Evidence:** `app/dashboard/card/**`, `components/card/tap-card-builder.tsx`, `components/fusion/card/**`, `app/t/[deviceCode]/page.tsx`, `components/tap/tap-connect-card-public.tsx`, `BrandKit.tapCard` and `BrandKit.tapCardDraft` in `prisma/schema.prisma`.

### TapConnect Studio

- **Definition:** the Owner operating system for creating, managing, previewing, publishing, and evolving the Card and the Experiences around it.
- **Primary user / job:** Owner or authorized Workspace member; perform ordinary business work.
- **Customer result:** accurate, useful, timely Card experiences.
- **Owns:** task navigation, authoring sessions, Owner-visible save state, operational workflows.
- **May read:** all Workspace content allowed by membership, permissions, plan, and restrictions.
- **May perform:** direct manual authoring, preview, governed publication, scheduling, safe operation.
- **Must never perform:** require platform-admin concepts for ordinary work; create competing state authority; use AI as a mandatory path.
- **Relationships:** operates the Card; consumes Control Room governance; returns an administrator to the originating Control Room context.
- **Availability:** ordinary Workspace capability; individual features may be entitled, but core V1 tasks remain available according to the purchased product.
- **Evidence:** `app/dashboard/**`, `components/dashboard/**`, `components/studio/**`, `lib/fusion/studio/ia.ts`.

### Control Room

- **Definition:** the platform-governance system for authorized platform administrators.
- **Primary user / job:** platform administrator; govern users, businesses, access, services, plans, Demos, approvals, and platform operations.
- **Customer result:** safe and accountable platform operation.
- **Owns:** platform identity bindings, roles, permissions, entitlements, restrictions, support sessions, Demo governance, approvals, audit.
- **May read:** governed platform and Workspace metadata needed for administration.
- **May perform:** authorized governance actions, read-only View as User, governed Support Sessions, immutable Demo publication/binding.
- **Must never perform:** become the ordinary business-content editor; impersonate when normal membership exists; bypass Demo or approval policy.
- **Relationships:** governs Studio and its operators; may open a legitimate Workspace in Studio as the administrator's own membership.
- **Availability:** internal and permission-gated.
- **Evidence:** `/control`, `components/control/control-room.tsx`, `lib/control/**`, `app/api/control/route.ts`, `docs/control-room/FOUNDATION.md`.

### Workspace

- **Definition:** one business or controlled operating context with its own Business information, Brand, Card, Assets, Audience, Experiences, Campaigns, Email, Tap Points, tap evidence, Insights, memberships, and permissions.
- **Primary user / job:** member; operate one business without cross-tenant leakage.
- **Customer result:** coherent experiences from the correct business context.
- **Owns:** tenant boundary and membership context; domain objects remain owned by their canonical systems.
- **May read / perform:** only what effective membership and permissions allow.
- **Must never perform:** infer access from platform status alone; merge separate businesses or personal sandboxes.
- **Relationships:** Studio operates within it; Control Room creates and governs it; the Card is its customer-facing center.
- **Availability:** every operating business has one; kinds include customer, internal, sandbox, Demo, partner, and test fixture.
- **Evidence:** `Business`, `BusinessUser`, `WorkspaceKind`, `lib/workspace/context.ts`, `lib/control/snapshot.ts`.

### Demo Workspace and Demo Studio

- **Definition:** a Demo Workspace is a real Studio Workspace with server-enforced safety. Demo Studio is the Control Room area governing Demo Workspaces, Demo Managers, safety, revisions, rollback, and landing bindings.
- **Primary user / job:** Demo Manager; prepare and govern truthful demonstrations without production consequences.
- **Customer result:** safe, representative product proof.
- **Owns:** Demo metadata, policy, immutable Demo publications, and binding history.
- **May read:** the Demo Workspace's current saved draft and approved fixture data.
- **May perform:** clone/reset fixtures, publish immutable Demo revisions, activate or roll back bindings.
- **Must never perform:** real sends, payments, refunds, production imports, production Tap Point assignment, or mutable landing bindings to drafts.
- **Relationships:** the Workspace is edited in Studio as self; publication and binding are governed in Control Room.
- **Availability:** internal, permission-gated, and fixture-safe.
- **Evidence:** `DemoWorkspaceMetadata`, `DemoPublication`, `LandingDemoBinding`; `lib/control/demo-policy.ts`; `lib/control/mutations.ts` operations `demo.publish`, `demo.rollback`, and `demo.binding.*`.

### Tap Point

- **Definition:** a physical or digital entry point—NFC, QR, or supported equivalent—that resolves to the correct Card or Experience.
- **Primary user / job:** Owner or operator; provision, assign, and understand an entry point.
- **Customer result:** a stable route to the intended current experience.
- **Owns:** address/code, placement/identity, health, assignment context.
- **May read:** Card, Campaign, Experience, schedule, and Workspace policy.
- **May perform:** resolve an eligible destination and record tap evidence.
- **Must never perform:** mutate content; conceal fallback; cross Workspace boundaries.
- **Relationships:** reaches the Card or an Experience; operated in Studio, governed by entitlements/restrictions.
- **Availability:** limited by plan and effective entitlement.
- **Evidence:** legacy `DeviceSlot` plus `TapPoint` and `TapPointAddress`; `/dashboard/tap-points`; `lib/services/tap-resolve.ts`; `lib/fusion/devices/tap-point-bridge.ts`.

### Tap Trace

- **Definition:** the evidence and history of meaningful tap activity: where it occurred, which Tap Point was involved, what Card/Campaign/Experience resolved, and supported downstream actions.
- **Primary user / job:** Owner; understand what happened after a tap.
- **Customer result:** the business can improve experiences from evidence rather than guesses.
- **Owns:** immutable tap/action facts and attribution keys.
- **May read:** Tap Point, Card, Campaign, Experience, and supported interaction context.
- **May perform:** record, aggregate, filter, and explain evidence.
- **Must never perform:** alter the originating content or present demo/mock metrics as customer truth.
- **Relationships:** visible in Studio as Tap Trace and consumable by Insights; governed but not authored in Control Room.
- **Availability:** core recording is part of the operational spine; advanced analysis may be entitled.
- **Evidence:** V1 `TapEvent`/`ClickEvent`, `logTapEvent` in `lib/services/devices.ts`, `/api/tap/click`, `/dashboard/analytics`; current `app/dashboard/insights`, `lib/fusion/insights/**`. The repository does not currently expose the canonical name “Tap Trace,” so discoverability is a product gap.

### TapSave

- **Definition:** the retention layer that keeps the business accessible after the first tap through supported save and return methods.
- **Primary user / job:** customer; keep and return to the Card. Owner; retain a consent-aware relationship.
- **Customer result:** a reliable way back without requiring another physical tap.
- **Owns:** keep moments and supported retention state; Audience owns people, consent, and relationship truth.
- **May read:** Card identity and configured return methods.
- **May perform:** save/return operations and consent-aware handoff.
- **Must never perform:** imply live wallet issuance when mock; create messaging consent silently.
- **Relationships:** extends the Card; operated in Studio/Audience; governed by entitlements and consent policy.
- **Evidence:** `/api/tapsave/**`, `lib/fusion/tapsave/**`, `/mytap/[relationshipId]`, `TapSaveMoment`.

### Experience

- **Definition:** a reusable customer-facing outcome, interaction, or journey that works through or around the Card.
- **Primary user / job:** Owner; create a repeatable customer outcome.
- **Customer result:** a coherent task or journey anchored to the business.
- **Owns:** its specific interaction structure and lifecycle, not shared Business/Brand/Audience facts.
- **May read:** Card, Brand, Assets, Audience eligibility, Tap Points, Campaign context.
- **May perform:** preview, publish, and execute within its explicit lifecycle and policy.
- **Must never perform:** replace the Card as product center; duplicate Campaign or Audience authority.
- **Relationships:** reachable through/around the Card; authored in Studio; governed by Control Room entitlements.
- **Evidence:** `/dashboard/experiences/**`, Journey models and `lib/fusion/journey/**`, Offers under `lib/fusion/card/offer*`.

### Campaign and Scheduled Campaign

- **Definition:** a Campaign is a governed activation or distribution of approved content and Experiences to an Audience, schedule, or Tap Point context. A Scheduled Campaign has a governed future activation, delivery, rotation, or availability schedule.
- **Primary user / job:** Owner or marketer; prepare, preview, schedule, activate, and inspect timely content.
- **Customer result:** relevant content from the stable Card/Tap Point relationship.
- **Owns:** Campaign content, theme projection, lifecycle status, assignment and schedule intent.
- **May read:** Brand defaults, Assets, Audience eligibility, Card/Experience references, Tap Points.
- **May perform:** create, edit, save, preview, schedule, assign, publish/activate, pause, archive.
- **Must never perform:** silently send or publish; obscure schedule/status; overwrite Card-local choices.
- **Relationships:** supports or temporarily resolves around the Card; operated in Studio; plan/policy governed in Control Room.
- **Availability:** V1 lifecycle is a preservation floor; capacity may vary by plan.
- **Evidence:** `Campaign`, `CampaignGroup`, `CampaignGroupSlot`, `ScheduleRule`, `DeviceAssignment`; `/dashboard/campaigns/**`, `/dashboard/workbench`, `lib/services/campaigns.ts`, `lib/services/schedule.ts`.

### Audience

- **Definition:** people, relationships, permissions, consent, segments, and relevant interaction history.
- **Primary user / job:** Owner; understand and serve permitted relationships.
- **Customer result:** relevant interaction with respected preferences.
- **Owns:** Contact identity, CustomerRelationship, ConsentRecord, segments, channel eligibility.
- **May read:** tap/lead/keep/communication history.
- **May perform:** capture, reconcile, segment, export where permitted, and supply eligible recipients.
- **Must never perform:** infer consent; let legacy Lead and newer Contact stores silently disagree.
- **Relationships:** supports Card, Campaign, Email, TapSave, and Insights; operated in Studio; governed by permissions and restrictions.
- **Evidence:** `Lead`, `Contact`, `CustomerRelationship`, `ConsentRecord`; `/dashboard/audience/**`, `/dashboard/leads`, `lib/fusion/audience/**`.

### Email

- **Definition:** a complete governed communication workflow, not merely a visual extension of Campaigns.
- **Primary user / job:** Owner or marketer; create, edit, preview, schedule/send, and inspect delivery state in the correct business/Audience context.
- **Customer result:** coherent and permitted communication.
- **Owns:** Email document/content, medium-specific presentation, subject/sender settings, delivery intent and state.
- **May read:** Campaign context, Brand defaults, Assets, Audience and consent.
- **May perform:** draft, save, preview, schedule, and explicitly send when provider/policy gates pass.
- **Must never perform:** send during setup or Demo; infer consent; hide provider or delivery state.
- **Relationships:** can support a Campaign but remains a complete Studio workflow; Control Room governs service availability and restrictions.
- **Evidence:** `/dashboard/campaigns/[id]/email`, `components/fusion/email/email-authoring-workspace.tsx`, `Campaign.formSettings.emailResponse`, `/api/email/send`, Email reply models.

### Brand

- **Definition:** reusable approved defaults and resources that accelerate consistency without imprisoning deliberate local creative choices.
- **Primary user / job:** Owner/brand manager; define reusable identity defaults.
- **Customer result:** recognizable, coherent presentation.
- **Owns:** approved logos, color/font roles, reusable Brand decisions, locks at Brand scope.
- **May read:** approved Business Knowledge and approved Assets.
- **May perform:** propose, approve, lock, and supply defaults.
- **Must never perform:** silently overwrite or relink local custom values, disguise inheritance, or require leaving a task for an ordinary override.
- **Relationships:** supplies defaults to Card, Campaign, Email, Experiences, and TapCanvas; Studio operates it; Control Room governs access only.
- **Evidence:** `BrandKit`, `BrandPropertyDecision`, `BrandLink`, `/dashboard/brand/edit`, `lib/fusion/authoring/brand-inheritance.ts`, `lib/fusion/authoring/visual-property.ts`.

### Assets

- **Definition:** permanent shared media source of truth across customer-facing creative surfaces.
- **Primary user / job:** Owner/creator; find, approve, organize, reuse, and understand media usage.
- **Customer result:** consistent, rights-aware visual material.
- **Owns:** stored media identity, provenance, approval, rights metadata, revisions, collections, favorites, and usage links.
- **May read:** provider candidates and Workspace permissions.
- **May perform:** upload/import, approve/reject, organize, duplicate, and project into documents.
- **Must never perform:** let a provider candidate become approved automatically; duplicate durable media into hidden per-editor stores.
- **Relationships:** supports Card, Brand, Email, Campaign, Experiences, and TapCanvas; operated in Studio.
- **Evidence:** `MediaAsset`, Media collection/usage models, CreativeResource models, `/dashboard/assets`, `lib/media/**`.

### Ask TapConnect

- **Definition:** the interactive governed assistant that interprets an Owner request, creates a concrete reversible proposal, lets the Owner edit it, applies approved changes, and supports Undo.
- **Primary user / job:** Owner; accelerate a current task without surrendering control.
- **Customer result:** faster, still-accurate improvements to a real object.
- **Owns:** proposal conversation and reversible proposed mutation; it owns no canonical business fact or final property until applied.
- **May read:** current selection, approved Business Knowledge, Brand/lock state, relevant Workspace objects.
- **May perform:** interpret, propose exact diffs, allow proposal editing, apply to the host draft, undo.
- **Must never perform:** parrot a request as a result; claim mutation without mutation; publish/send/charge/contact/delete without authority; create a second truth store.
- **Relationships:** embedded in Studio tasks; Control Room governs availability/policy only.
- **Evidence:** `components/fusion/ask/ask-tapconnect-drawer.tsx`, `lib/fusion/ask/policy.ts`, `docs/product/ASK_TAPCONNECT_PROMPT_AND_ACTION_POLICY.md`. Current Card/global hosts do not mutate an object on Apply; this is a confirmed gap.

### Autopilot

- **Definition:** governed background intelligence that identifies needs, contradictions, missing information, opportunities, and recommended actions.
- **Primary user / job:** Owner; receive useful, explainable preparation and recommendations.
- **Customer result:** more accurate and timely experiences after Owner authorization.
- **Owns:** proposal lifecycle, evidence references, readiness, budget/governance trail.
- **May read:** approved Workspace facts and operational evidence.
- **May perform:** prepare proposals and, only under deterministic policy plus explicit authorization, apply reversible changes.
- **Must never perform:** become an invisible source of truth; invent approved facts; publish, send, spend, or contact by implication.
- **Relationships:** supports Studio systems; governed by Control Room entitlements, kill switches, approval, and audit.
- **Evidence:** `AutopilotProposal`, `lib/fusion/autopilot/**`, `/api/ai/proposals`, `/api/autopilot/live/**`.

### TapCanvas

- **Definition:** a freeform planning and creative surface using the same Brand, Assets, permissions, and history systems.
- **Primary user / job:** Owner/creator; sketch and organize reusable ideas and journeys.
- **Customer result:** better-prepared experiences when intentionally promoted.
- **Owns:** Canvas document structure, versions, items, connectors, comments, approvals, and promotion intent.
- **May read:** Brand, Assets, Campaigns, keywords, and Experience references.
- **May perform:** plan, annotate, version, approve, and explicitly promote.
- **Must never perform:** become a second Campaign/Card/Brand truth store; publish through an implicit Canvas state.
- **Relationships:** supports the Card and Experiences; operated in Studio; governed by permissions/entitlements.
- **Evidence:** TapCanvas models, `/dashboard/experiences/canvas`, `lib/fusion/canvas/**`.

### Insights

- **Definition:** evidence of taps, actions, responses, conversions, outcomes, and operational condition.
- **Primary user / job:** Owner; understand outcomes and decide what to improve.
- **Customer result:** experiences improved from evidence.
- **Owns:** derived views, comparisons, saved views, provenance labels—not originating tap facts.
- **May read:** Tap Trace, Audience, Campaign, Email, Commerce, and provider-health evidence.
- **May perform:** aggregate, filter, compare, explain, and export where permitted.
- **Must never perform:** hide Tap Trace under generic terminology; alter evidence; present mock/demo data as customer truth.
- **Relationships:** explains the Card and surrounding operations in Studio; Control Room may inspect platform condition separately.
- **Evidence:** `/dashboard/insights`, `/dashboard/analytics`, `lib/fusion/insights/**`, `lib/services/analytics.ts`.

## Non-negotiable product laws

1. **Card-centered law.** TapConnect is the Card. Studio works through or around it; Control Room governs its operators and systems.
2. **V1 preservation law.** Functioning V1 Card, Campaign, scheduled Campaign, Tap Trace, and Email workflows are the behavioral baseline.
3. **Control Room / Studio law.** Control Room governs; Studio operates. Legitimate members act as themselves. View as User is read-only; Support Session is governed impersonation only when normal membership is absent.
4. **Property authority law.** Every editable property exposes current value, source, linkage mode, lock state, and save state. Canonical modes are `LINKED`, `CUSTOM`, and `RESET TO SOURCE`. A deliberate `CUSTOM` value wins until explicit reset. Prefill fills only eligible empty values. AI is non-authoritative until Apply.
5. **Brand law.** Brand supplies defaults and never silently overwrites, relinks, disguises, or blocks a deliberate local choice.
6. **Authoring integrity law.** A change updates Preview immediately, survives in-editor navigation, exposes unsaved state, persists on Save, restores on reload, and reaches predictable Preview/Public behavior. A failure is explained at the control.
7. **Task-locality law.** Ordinary edits remain in the current task; deeper Brand, Asset, or Business workspaces are optional explicit paths.
8. **Direct-manual-workflow law.** Complete direct manual workflows precede AI assistance.
9. **Ask TapConnect law.** `Ask → interpret → exact editable proposal → Apply → real mutation → Undo`.
10. **Inspector law.** The contextual inspector edits the selected object. Nested panels require substantial coherent groups; isolated ordinary controls are consolidated.
11. **Draft / Preview / Publication law.** Edit changes draft; Save persists draft; Preview shows intended customer output; Publish creates an immutable revision; a landing binding targets one published Demo revision. Draft edits never silently alter a bound revision.
12. **Campaign law.** Campaign create/edit/schedule/status/activation remain direct, dependable, and understandable.
13. **Tap Trace law.** Tap evidence remains visible and linked to Card, Tap Point, Campaign, or Experience context.
14. **Email law.** Email remains a complete authoring and operation workflow; shared systems improve it without subsuming it.
15. **Reversibility law.** Material authoring and AI-applied changes have understandable Undo/Redo; consequential platform actions carry audit, reason, confirmation, and policy approval.

## Canonical property resolution contract

At render and save time, resolve each editable property in this order:

1. valid locked policy constraint, visibly labeled;
2. deliberate local `CUSTOM` value;
3. current `LINKED` approved source value;
4. accepted one-time proposal/prefill copied locally with provenance;
5. generated safe default.

Website discovery and AI create proposals, never authority. Business and Location may be authoritative for facts, while Brand is authoritative only for approved reusable defaults. Publication snapshots resolved values plus provenance needed for explanation; they do not remain live-linked to mutable drafts.

## Constitutional acceptance rule

A capability is not complete because a route, component, schema, control, or test exists. It is complete only when the Owner can finish the intended task, understand what happened, leave and return without loss, and observe the correct customer result under the applicable policy.
