# TapConnect Feature Inventory

Status: repository-grounded product source of truth  
Audited source: `0fafda9b77701b8747b3579a88324a010e2bc8a9`  
Last reviewed: 2026-07-30

## Purpose

This inventory governs public landing-page claims, pricing language, product presentations, sales material, onboarding copy, and product documentation.

TapConnect is the living Card. TapConnect Studio is the operating system and set of capabilities surrounding the Card. Studio does not imply that every capability is available in every subscription tier.

## Evidence standard

A route, type, registry entry, provider variable, test, or design document is not enough to call a capability available. Classification requires evidence from a visible Owner workflow.

- **OWNER-READY — VERIFIED:** visible Owner workflow, persistence proof, and no unresolved verification blockers.
- **OWNER-READY CANDIDATE — VERIFICATION PENDING:** visible and substantially proven, with remaining verification or environment blockers.
- **IMPLEMENTATION IN PROGRESS:** meaningful UI and supporting code exist, but the Owner workflow or production boundary is incomplete.
- **NOT IMPLEMENTED:** no usable Owner workflow.
- **DEFERRED:** intentionally unavailable or represented only by a placeholder.
- **INTERNAL ONLY:** administrative or engineering capability not intended for ordinary Owners.

The repository verification ledger currently reports no subsystem as fully `OWNER-READY — VERIFIED`. Public claims therefore use qualified language and never turn candidate or in-progress work into an unqualified availability promise.

## Commercial source of truth

The enforced plan catalog is `lib/plans.ts`, with runtime entitlements derived in `lib/fusion/billing/plans.ts`.

| Plan | Monthly price | Active Tap Points/devices | Active campaigns | Automation Team requests |
| --- | ---: | ---: | ---: | ---: |
| Basic | $19 | 1 | 3 | 0 |
| Studio | $49 | 10 | 10 | 50 |
| Pro | $99 | 50 | 50 | 500 |
| Growth | $199 | 150 | 150 | 500 |

Important qualifications:

- Checkout and subscription activation are not completed public workflows.
- Stripe billing is feature-flagged and deferred until configured.
- `lib/marketing/offer-catalog.ts` is a presentation/offer architecture with placeholder pricing; it is not the entitlement source.
- `lib/config/limits.ts` also controls media limits.
- `lib/fusion/features/registry.ts` and role capabilities can further limit availability.
- Some descriptive feature bullets in `lib/plans.ts` are ahead of visible workflow proof. The numeric price, device limit, campaign limit, and derived entitlements above are the safe public comparison set.

## Capability inventory

### Living Card, draft, Preview, and public state

**Classification:** OWNER-READY CANDIDATE — VERIFICATION PENDING

- **What it does:** gives the Owner a Card assembly workspace, focused authoring surface, draft revisions, Preview, and a customer-facing Card renderer.
- **Owner benefit:** one durable place to create and operate what customers see.
- **Customer benefit:** a recognizable destination with useful business actions.
- **Visible Owner proof:** `/dashboard/card`, `/dashboard/card/edit`, `/dashboard/card/preview`; `components/fusion/card/card-assembly-workspace.tsx`; `components/fusion/card/card-authoring-workspace.tsx`; `components/fusion/card/card-preview-workspace.tsx`.
- **Public proof:** `/t/[deviceCode]`; `components/tap/tap-connect-card-public.tsx`.
- **Controls:** Card draft/edit and Brand approval capabilities; campaign and Tap Point limits vary by plan.
- **Qualifications:** freeform canvas remains internal/scaffolded; full assistive-technology and persistence gates remain open; Preview does not publish.
- **Public placement:** landing hero, onboarding, presentation, help.

### Card-first onboarding

**Classification:** OWNER-READY CANDIDATE — VERIFICATION PENDING

- **What it does:** collects business information, confirms knowledge, prepares Brand decisions, creates a first Card draft, and requires Preview before completion.
- **Owner benefit:** a useful first draft instead of a blank editor.
- **Customer benefit:** a more accurate and recognizable first Card.
- **Visible proof:** `/onboarding`; `components/onboarding/card-first-onboarding-workspace.tsx`.
- **Controls:** session, business role, knowledge proposal/approval, Brand approval.
- **Qualifications:** discovered facts remain proposals until confirmed; Brand assets require approval; Preview is not publication.
- **Public placement:** primary landing acquisition journey, presentation, onboarding help.

### Business Knowledge and website intake

**Classification:** IMPLEMENTATION IN PROGRESS

- **What it does:** stores proposed, approved, and rejected business facts; can prepare website-derived suggestions.
- **Owner benefit:** durable confirmed facts can support the Card and future assisted work.
- **Customer benefit:** fewer inaccurate or contradictory Card details.
- **Visible proof:** onboarding stages one and two; `/api/business/knowledge`; `/api/business/knowledge/website`.
- **Controls:** `knowledge.propose` and `knowledge.approve`.
- **Qualifications:** no dedicated post-onboarding Knowledge workspace; discovery never equals approval.
- **Public placement:** onboarding, Autopilot explanation, presentation; not a standalone landing feature.

### Brand Starter Kit and Brand decisions

**Classification:** OWNER-READY CANDIDATE — VERIFICATION PENDING

- **What it does:** manages logo, color, typography, Brand candidates, approval, and promotion to the approved Brand.
- **Owner benefit:** establishes a reusable visual foundation for the Card.
- **Customer benefit:** consistent recognition across customer-facing surfaces.
- **Visible proof:** `/dashboard/brand/edit`; `components/fusion/brand/brand-kit-workspace.tsx`; onboarding Brand stage.
- **Controls:** `brand.propose`, `brand.approve`, and `brand.lock`.
- **Qualifications:** discovered/imported assets are not silently approved; live Logo.dev behavior requires provider configuration.
- **Public placement:** three-step journey, Creative Platform section, presentation, onboarding.

### Creative Studio and reusable creative resources

**Classification:** IMPLEMENTATION IN PROGRESS

- **What it does:** provides gradients, image and textured backgrounds, image treatments, masks, frames, typography, shapes, layers, composition controls, reusable resources, viewport previews, and live-device QR preview.
- **Owner benefit:** professional treatments can be created once and reused without rebuilding every surface.
- **Customer benefit:** more coherent, readable, on-Brand experiences.
- **Visible proof:** Card authoring tools; `components/fusion/creative-studio/*`; `components/fusion/creative-platform/*`.
- **Controls:** feature registry, media limits, Brand permissions.
- **Qualifications:** freeform canvas is internal/scaffolded; some advanced tools remain in progress; Creative Studio supports the Card rather than replacing it as the product.
- **Public placement:** qualified landing section and presentation; detailed help after verification.

### Shared Media and Asset Browser

**Classification:** OWNER-READY CANDIDATE — VERIFICATION PENDING

- **What it does:** uploads, imports, approves/rejects, favorites, duplicates, tracks revisions and usage, and reuses media.
- **Owner benefit:** one governed library for Card, Email, and Campaign work.
- **Customer benefit:** consistent and appropriately sourced visuals.
- **Visible proof:** `/dashboard/assets`; `components/fusion/assets/assets-library.tsx`; `components/media/shared-media-asset-browser.tsx`.
- **Controls:** plan media/storage limits and Brand/media permissions.
- **Qualifications:** external storage configuration affects production delivery.
- **Public placement:** Creative Platform section, presentation, help.

### Pexels and Logo.dev

**Classification:** OWNER-READY CANDIDATE — VERIFICATION PENDING

- **What it does:** supplies stock-photo search and logo discovery inside visible media/Brand workflows.
- **Owner benefit:** faster visual sourcing.
- **Customer benefit:** stronger visual context and recognition.
- **Visible proof:** media picker, logo search, provider status surfaces.
- **Controls:** provider credentials, rights/provenance metadata, approval.
- **Qualifications:** live provider access depends on credentials; found assets remain unapproved until the Owner approves them.
- **Public placement:** qualified Creative Platform and trust copy; not a universal availability claim.

### Tap Points, device assignment, and Scan Mode

**Classification:** OWNER-READY CANDIDATE — VERIFICATION PENDING

- **What it does:** manages physical/digital entry points, assigns Campaigns, supports scan claim, and reports fleet health.
- **Owner benefit:** one Card can be reached from multiple managed entry points.
- **Customer benefit:** a quick route into the current Card experience without an app download.
- **Visible proof:** `/dashboard/tap-points`, `/dashboard/devices`, `/dashboard/scan`, Campaign assignment UI.
- **Controls:** active-device plan limit and device permissions.
- **Qualifications:** the advanced permanent Tap Point spine remains in development.
- **Public placement:** living Card story, pricing limits, presentation.

### TapSave and MyTap

**Classification:** OWNER-READY CANDIDATE — VERIFICATION PENDING

- **What it does:** lets a customer keep the Card, receive a relationship return path, and manage a saved Card experience.
- **Owner benefit:** the relationship can remain useful after the first tap.
- **Customer benefit:** the business stays easy to find and revisit.
- **Visible proof:** public Keep Card controls; `/mytap/[relationshipId]`; `components/tap/keep-card-cta.tsx`.
- **Controls:** `tapsave.core`, consent and relationship state.
- **Qualifications:** live Apple/Google wallet passes are not verified; TapSave does not imply uncontrolled messaging.
- **Public placement:** dedicated landing section, FAQ, presentation.

### Card actions: contact, phone, email, website, directions, reviews

**Classification:** OWNER-READY CANDIDATE — VERIFICATION PENDING

- **What it does:** renders configured Card actions and sections.
- **Owner benefit:** directs each visitor to an appropriate next step.
- **Customer benefit:** fast access to useful, familiar actions.
- **Visible proof:** public Card renderer and Card draft generation.
- **Controls:** configured business facts and Card section state.
- **Qualifications:** actions appear only when configured; Google Reviews is a destination link, not native review management.
- **Public placement:** living Card section, onboarding outcome examples, presentation.

### Appointments

**Classification:** DEFERRED

- **What it does today:** can represent an external URL or phone action in a Card draft.
- **Visible proof:** onboarding outcome and placeholder link behavior.
- **Qualifications:** native booking is explicitly unavailable; campaign booking blocks are stubs.
- **Public placement:** presentation deferral and FAQ qualification only. Do not advertise native appointments.

### Offers, Coupons, and Card Spotlight

**Classification:** IMPLEMENTATION IN PROGRESS

- **What it does:** creates offer/coupon blocks, binds an approved Campaign offer to Card Spotlight, and supports a public claim path.
- **Owner benefit:** adds a timely, measurable reason to act without replacing the Card.
- **Customer benefit:** a clear promotion or claim action.
- **Visible proof:** Campaign Workbench, Card offer wire panel, public offer claim API.
- **Controls:** Studio plan copy, Card offer fuse feature, Campaign permissions.
- **Qualifications:** checkout is simulated unless production billing is configured; follow-up delivery can be mock/credential-gated.
- **Public placement:** qualified presentation and use cases; avoid implying universal availability.

### Campaign authoring and lifecycle

**Classification:** OWNER-READY CANDIDATE — VERIFICATION PENDING

- **What it does:** creates Campaign drafts from templates, edits blocks, publishes/archives Campaign state, schedules groups, and assigns Campaigns to Tap Points.
- **Owner benefit:** changes timely emphasis while keeping the Card stable.
- **Customer benefit:** sees relevant current content from the same trusted destination.
- **Visible proof:** `/dashboard/workbench`, `/dashboard/campaigns`, Campaign detail and group surfaces.
- **Controls:** active-campaign plan limits and Campaign permissions.
- **Qualifications:** publication is an explicit Owner action; advanced provider paths remain configuration-dependent.
- **Public placement:** presentation, Creative reuse story, pricing limits; secondary landing mention only.

### Email authoring and replies

**Classification:** IMPLEMENTATION IN PROGRESS

- **What it does:** prepares branded email, previews it, loads consent-aware audiences, and configures reply routing.
- **Owner benefit:** extends the Card relationship into professional communication.
- **Customer benefit:** receives coherent, relevant communication where permitted.
- **Visible proof:** `/dashboard/campaigns/[id]/email`; Email & Replies integration card.
- **Controls:** communication permissions, consent, provider credentials, plan feature descriptions.
- **Qualifications:** authoring is visible; live delivery and inbound providers require configuration. Setup does not send Email, and nothing is sent automatically.
- **Public placement:** qualified Creative reuse and FAQ; presentation with a clear availability note.

### Contacts, leads, consent, and Audience

**Classification:** OWNER-READY CANDIDATE — VERIFICATION PENDING

- **What it does:** captures leads, records consent, searches contacts, shows relationship context, and exports where permitted.
- **Owner benefit:** turns anonymous moments into manageable, consent-aware relationships.
- **Customer benefit:** clearer preferences and less disconnected follow-up.
- **Visible proof:** `/dashboard/leads`, `/dashboard/audience`.
- **Controls:** role permissions; Lead export is described for Pro; consent state.
- **Qualifications:** legacy Leads and newer Audience models coexist; complete assistive-technology verification remains.
- **Public placement:** TapSave story, trust section, presentation, pricing qualification.

### TapLoop loyalty

**Classification:** OWNER-READY CANDIDATE — VERIFICATION PENDING

- **What it does:** manages programs, tiers, enrollment, awards, redemptions, reversals, and a loyalty ledger.
- **Owner benefit:** adds structured repeat-visit value.
- **Customer benefit:** can understand and use earned value.
- **Visible proof:** `/dashboard/audience#taploop`.
- **Controls:** `loyalty.taploop` and `loyalty:manage`.
- **Qualifications:** referrals are not implemented.
- **Public placement:** presentation/current-candidate appendix; not a primary landing claim.

### Autopilot / Automation Team

**Classification:** IMPLEMENTATION IN PROGRESS

- **What it does:** organizes Business Knowledge, surfaces missing or contradictory information, prepares recommendations and drafts, identifies readiness issues, and supports explicit activation/rollback paths.
- **Owner benefit:** reduces repetitive setup and makes unfinished work easier to understand.
- **Customer benefit:** more accurate, timely experiences after Owner review.
- **Visible proof:** outcome experience, prepared outcome, settings knowledge and cost surfaces, live activation workflow.
- **Controls:** `ai.autopilot` entitlement, feature flags, provider credentials, approval policies.
- **Qualifications:** Autopilot does not invent approved facts, silently replace decisions, publish, send, or spend without the required deterministic gates and Owner action.
- **Public placement:** dedicated landing section, FAQ, presentation.

### Analytics, Insights, and TapProof

**Classification:** OWNER-READY CANDIDATE — VERIFICATION PENDING

- **What it does:** reports tap/action trends, top Campaigns and Tap Points, KPI/drill views, evidence classes, and export.
- **Owner benefit:** shows what the Card and surrounding work accomplished.
- **Customer benefit:** indirect—Owners can improve useful experiences using evidence.
- **Visible proof:** `/dashboard/analytics`, `/dashboard/insights`.
- **Controls:** `insights.core`; plan descriptions distinguish basic and advanced analytics.
- **Qualifications:** marketing demonstrations must not be presented as customer metrics; dedicated social/messaging analytics are not implemented.
- **Public placement:** landing proof-of-value section, presentation, pricing qualification.

### TapInbox, support, and cases

**Classification:** IMPLEMENTATION IN PROGRESS

- **What it does:** accepts public Card questions into consent/relationship context and presents Inbox/case operations.
- **Owner benefit:** centralizes service moments around the Card.
- **Customer benefit:** can ask for help from the Card.
- **Visible proof:** public Card support form; `/dashboard/audience/inbox`; `/dashboard/audience/cases`.
- **Controls:** support fuse and messaging permissions.
- **Qualifications:** production transports require credentials; do not promise omnichannel live service.
- **Public placement:** presentation/current-candidate appendix; not a headline claim.

### Roles, permissions, tenancy, approvals, and locks

**Classification:** IMPLEMENTATION IN PROGRESS

- **What it does:** applies Owner, Manager, Marketing, Viewer, and Staff Scanner capabilities to business-scoped actions.
- **Owner benefit:** separates editing, approval, scanning, and viewing responsibilities.
- **Customer benefit:** reduces accidental public changes.
- **Visible proof:** capability checks across onboarding, Card, Brand, Campaigns, Settings, and scanning.
- **Controls:** `lib/fusion/authz/business-capability.ts`, permission matrix, Clerk membership.
- **Qualifications:** multi-location tenancy is not a completed Owner workflow; Platform Admin is separate and internal.
- **Public placement:** trust section and presentation; detailed documentation later.

### Integrations and productivity connectors

**Classification:** IMPLEMENTATION IN PROGRESS

- **What it does:** represents connector maturity and can route context to configured external systems.
- **Owner benefit:** preserves existing operating workflows.
- **Customer benefit:** smoother handoffs where configured.
- **Visible proof:** `/dashboard/integrations`; productivity work panel.
- **Controls:** feature flags, provider OAuth/credentials.
- **Qualifications:** mocks and setup-ready connectors are not live integrations; maturity labels must remain visible.
- **Public placement:** presentation with maturity labels; selective landing mention only.

### Wallet passes

**Classification:** IMPLEMENTATION IN PROGRESS

- **What it does:** presents a wallet management/mock path around saved relationships.
- **Visible proof:** `/dashboard/audience/wallet`; MyTap wallet stub.
- **Qualifications:** live Apple and Google Wallet require credentials and verification.
- **Public placement:** presentation deferral/candidate appendix only.

### TapFlow Journeys, TapCanvas, TapCast, TapCommerce, Pulse

**Classification:** IMPLEMENTATION IN PROGRESS

- **What they do:** provide emerging journey, canvas, social publishing, commerce/order, and field-operation surfaces.
- **Visible proof:** Experiences and Pulse routes/components.
- **Controls:** feature flags and provider credentials.
- **Qualifications:** these are alpha, mock, disabled-by-default, or credential-gated depending on the capability. They are not safe as primary public promises.
- **Public placement:** presentation “in progress” slide and product documentation only.

### Platform administration and feature registry

**Classification:** INTERNAL ONLY

- **What it does:** supports platform audit, readiness, feature flags, kill switches, and operator controls.
- **Visible proof:** `/admin/platform`.
- **Public placement:** never a customer acquisition claim.

## Explicitly not current public promises

- Native appointment booking
- Completed multi-location management
- Referrals
- Live Apple/Google Wallet passes
- Automatic Email or Campaign sending
- Automatic publication
- Production Stripe checkout or entitlement activation
- Unconfigured provider integrations
- Autonomous consequential Autopilot action
- TapTrail, TapGuide, advanced Tap Point spine, or other scaffold-only IA entries

## Surface policy

- **Landing page:** living Card, Card-first onboarding, configured Card actions, TapSave, qualified Autopilot, qualified Creative Platform, focused use cases, Owner control, numeric pricing truth, and qualified analytics.
- **Pricing:** plan names, monthly prices, active-device limits, active-campaign limits, and implemented entitlements only.
- **Presentation:** coherent whole-product story plus explicit verified-candidate, in-progress, and deferred slides.
- **Onboarding:** Business Knowledge, Brand approval, first Card draft, Preview, and Owner control.
- **Help/documentation:** detailed capability instructions only after the visible workflow and qualification are clear.

