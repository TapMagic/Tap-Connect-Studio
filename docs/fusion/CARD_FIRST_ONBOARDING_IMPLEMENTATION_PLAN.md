# Card-First Onboarding Implementation Plan

Status: implementation-ready proposal; no application implementation is authorized by this document  
Repository: `TapMagic/Tap-Connect-Studio`  
Branch: `tapconnect-card-first-onboarding`  
Audited checkpoint: `8e73f840aefcac18ed1992efa2b1bce79e9473e5`  
Target experience: **TELL US ABOUT YOUR BUSINESS → WE FOUND YOUR BRAND → HERE IS YOUR FIRST CARD**

## 1. Executive recommendation

Build one thin, visible, end-to-end onboarding slice around the existing permanent Business, Location, BrandKit, MediaAsset, TapConnect Card, Creative Studio, preview, and Autopilot systems. The slice should begin at `/onboarding`, create or resume the permanent workspace, collect only the facts needed for a useful first Card, show a living Card immediately, and finish with a saved draft that is explicitly not published.

The strongest first slice is not a settings wizard and is not a new builder. It is a responsive onboarding workspace with:

- a short guided path on the left and the existing Card renderer on the right;
- a safe provisional Card as soon as the business name and desired outcome are known;
- evidence-backed business and Brand suggestions that remain **Suggested** until the Owner approves them;
- one concise batch of missing-fact questions;
- durable Brand decisions and Business Knowledge provenance;
- a first draft saved to a new draft field in the existing BrandKit aggregate;
- a direct handoff to the existing Creative Studio and existing customer-preview renderer;
- no publication, assignment, Campaign send, customer contact, payment, or Email action.

Draft/public separation is a prerequisite, not a later refinement. At the checkpoint, Creative Studio saves `BrandKit.tapCard`, and an assigned public Tap Point can read that same value. The current UI can therefore call a change “saved” while the data is already public. Slice 1 must add `BrandKit.tapCardDraft` and leave `BrandKit.tapCard` as the published representation.

The implementation should be additive and feature-flagged. Existing workspaces and public tap behavior must remain unchanged. The onboarding deterministic generator must be available without OpenAI and must not use the current general AI prompt that instructs the model to invent offer details.

## 2. Actual current-state findings

### Onboarding and continuation

- `app/onboarding/page.tsx` is a small authenticated setup page. It redirects users with an existing membership to `/dashboard`.
- `components/onboarding/form.tsx` collects a required name plus optional website and phone, posts to `/api/business`, and navigates directly to `/dashboard`.
- `app/auth/continue/page.tsx` routes admins to admin, existing members to dashboard, and users without a membership to onboarding. It does not consider onboarding completion after the Business exists.
- `app/api/business/route.ts` validates name, website, and phone; it rejects a second membership and calls `createBusinessWithDefaults`.
- `lib/services/campaigns.ts#createBusinessWithDefaults` creates the permanent Business, OWNER membership, empty/default BrandKit, and an empty `Main Location`. It does not create knowledge, Brand decisions, a Card draft, a device, or an assignment.
- The dashboard checklist in `components/dashboard/onboarding-checklist.tsx` and `lib/fusion/readiness/workspace-status.ts` asks the Owner to configure Brand, Campaign, device, and live assignment. It is settings-first and live-oriented.

### Permanent data and platform systems

- Business, Location, BrandKit, MediaAsset, DeviceSlot, DeviceAssignment, TapPoint, PublicationSnapshot, AutopilotProposal, and BrandVocabularyTerm are real Prisma models.
- `BrandKit.tapCard` is the current persisted Card source. There is no distinct saved draft.
- `PublicationSnapshot` exists, but `app/api/brand/route.ts` records a snapshot when the Card is saved. It does not represent an explicit draft-to-published transition.
- Public `/t/[deviceCode]` resolves a live Campaign first and otherwise can render `BrandKit.tapCard`. A normal Card save can therefore alter the fallback public experience.
- `lib/brand/tap-card.ts` supplies the established Card schema and parser. Its default includes generic promotional language and enabled actions that are inappropriate as evidence-backed onboarding defaults.
- `components/card/tap-card-builder.tsx`, `components/fusion/card/card-authoring-workspace.tsx`, `components/tap/tap-connect-card.tsx`, and `components/tap/tap-connect-card-public.tsx` are substantial reusable assets.

### Business Knowledge and Autopilot

- `lib/fusion/autopilot/knowledge-fact.ts` is the strongest knowledge contract. It models source, scope, confidence, approval, verification, contradiction, evidence, version lineage, and usage, but it is pure TypeScript and not persisted.
- `lib/fusion/autopilot/knowledge.ts` and `/api/ai/knowledge` implement a second, simpler process-memory snippet store. It is not durable, loses richer governance, and appears only as “Autopilot Knowledge” in dashboard settings.
- No uploaded file or website ingestion currently produces governed Business Knowledge.
- `lib/fusion/authoring/intake.ts#intakeFromWebsiteUrl` is a deterministic local fixture. It parses a URL and does not crawl the website.
- The outcome recipe and assembler under `lib/fusion/autopilot` correctly avoid invented prices and discounts and ask concise questions. They are the right deterministic policy base.
- The general runtime behind `/api/ai/generate` uses `lib/services/ai-generate.ts`, whose prompt explicitly permits inventing names, prices, dates, codes, and FAQ details. That runtime must not be called by onboarding.
- `AutopilotProposal` is durable when the configured persistence path is available, but several Fusion services intentionally fall back to memory outside an isolated Fusion database. Onboarding cannot treat a memory fallback as a saved Owner decision.

### Brand and media

- `app/dashboard/brand/edit/page.tsx` and `components/fusion/brand/brand-kit-workspace.tsx` provide a real Brand workspace.
- `lib/fusion/authoring/brand-starter-kit.ts` produces deterministic suggested logo/color/font/hero items. Its Keep/Approve/Ignore/Replace session decisions are not durable.
- Approving a visual immediately patches existing BrandKit fields; there is no permanent per-property suggestion, approval, comparison, or lock record.
- Existing inheritance and `Reset to Brand` behavior are reusable. Brand changes do not silently live-sync stored Cards.
- Logo.dev is accessed server-side through `/api/logos/search` and `/api/logos/image`. The token is not exposed. Search has non-Logo.dev remote fallbacks but no deterministic provider mock.
- Pexels is accessed through `/api/stock/search`; it returns honest configuration/upstream errors and retains provider attribution data. Unsplash is an alternate provider, not a deterministic test path.
- `/api/media/import` validates remote hosts, limits remote files, stores them through R2, and preserves MediaAsset provenance. `/api/upload` supports images and PDFs, but PDF contents are not extracted into knowledge.
- `SharedMediaAssetBrowser` is the correct reusable media selector. Its current assumption that a Logo.dev import is automatically Brand-approved must be removed.
- The older `MediaPicker` can persist generic external URLs without complete provider rights metadata and should not be introduced into onboarding.

### Security, devices, and tests

- `requireBusiness()` scopes relevant server operations to the authenticated user's first Business membership. It does not select among multiple workspaces.
- A documented permission matrix exists, but relevant Brand, Card, and media mutation routes do not enforce role capabilities. A VIEWER membership can reach more mutations than the intended model permits.
- DeviceSlot and the TapPoint bridge exist. New onboarding does not seed or assign a Tap Point. Some TapPoint persistence is deliberately restricted to the isolated Fusion database.
- Preview tokens are signed, short-lived, revocable, and memory-backed. Creation checks the Business; token update/revoke paths rely primarily on possession of the token and need authenticated tenant hardening.
- There are useful Card, Brand, Autopilot, publication, preview, responsive, and accessibility tests. There are no complete tests for post-auth onboarding continuation, durable governed knowledge, safe website ingestion, or saved-draft-versus-published behavior. Several browser proof suites only run with `PROOF_HEADED=1`.

## 3. Route and screen inventory

| Route/screen | Current responsibility | Slice 1 disposition |
| --- | --- | --- |
| `/auth/continue` | Post-auth router | Modify: route an existing but incomplete workspace back to onboarding |
| `/onboarding` | Create a basic Business | Replace screen composition while retaining the route and auth boundary |
| `/dashboard` | Owner control center and setup checklist | Modify completion/readiness links; do not make it the first value screen |
| `/dashboard/brand/edit` | Full Brand Kit workspace | Reuse after onboarding; share decision primitives |
| `/dashboard/card` | Card assembly/readiness landing | Reuse after onboarding |
| `/dashboard/card/edit` | Existing Creative Studio | Reuse directly, loading/saving the draft representation |
| `/dashboard/card/preview` | View-only Card preview | Reuse with an explicit draft source and draft banner |
| `/preview/card/[token]` | Live-device-shaped draft preview | Reuse with tenant/auth hardening; no assignment or publication |
| `/t/[deviceCode]` | Public tap resolution | Do not change behavior in Slice 1 except to prove drafts cannot affect it |
| `/api/business` | Create the permanent Business | Extend for idempotent basics/category/outcome updates |
| `/api/brand` | Brand and current Card persistence | Retain Brand updates; stop using it for draft publication semantics |
| `/api/logos/search`, `/api/logos/image` | Authenticated Logo.dev boundary | Reuse with deterministic adapter fixtures and readiness reporting |
| `/api/stock/search` | Authenticated Pexels/Unsplash search | Reuse with deterministic adapter fixtures |
| `/api/media`, `/api/media/import`, `/api/upload` | Durable media and R2 import | Reuse; preserve provenance and require explicit approval |
| `/api/ai/knowledge` | In-memory simplified snippets | Replace with compatibility adapter to permanent Business Knowledge |
| `/api/ai/generate` | General OpenAI generation | Exclude from onboarding |
| `/api/ai/proposals` | Proposal reads/actions | Reuse with new artifact kinds and durable decisions |
| `/api/preview/card/session`, `/api/preview/card/revoke` | Draft preview sessions | Reuse with business authorization on every mutation |
| `/api/publication` | Snapshot list/restore | Modify later for explicit publish; Slice 1 only tests non-use |
| `/api/devices` | DeviceSlot creation | Defer from Slice 1 |

## 4. Capability-to-code mapping

| Required capability | Existing code to retain | Required change |
| --- | --- | --- |
| Authenticated continuation | `app/auth/continue/page.tsx`, `lib/auth.ts` | Resolve onboarding completion for the selected Business |
| Permanent workspace creation | `app/api/business/route.ts`, `createBusinessWithDefaults` | Accept durable category/outcome; idempotent resume |
| Default location | `Location`, `Main Location` creation | Collect only outcome-relevant fields; no duplicate location form model |
| Living Card | TapConnect Card types and renderer | Add safe provisional/draft assembler and explicit draft label |
| Governed facts | `knowledge-fact.ts` | Persist the contract and replace memory snippets |
| Concise follow-up | outcome assembler/question policy | Generalize to one bounded missing-fact batch |
| Brand discovery | Brand Starter Kit, Logo search, stock search | Persist proposals/decisions; add compare and lock |
| Durable assets | MediaAsset, R2 APIs, shared browser | Preserve rights; never auto-approve by provider |
| Card editing | Card authoring workspace/builder | Load/save `tapCardDraft`; onboarding return path |
| Customer preview | existing Card renderer and preview session | Select draft explicitly; enforce tenant checks |
| Save without publish | BrandKit aggregate | Add `tapCardDraft`; never snapshot/publish on draft save |
| Findings/proposals | AutopilotProposal and approval policy | Add onboarding artifact kinds; deterministic orchestration |
| Readiness | workspace readiness services | Separate draft-ready from publish-ready/live |
| Internal analytics | existing audit/event conventions | Add content-free onboarding lifecycle events |

## 5. Reuse/replacement matrix

The classification applies to the current capability, not merely to a similarly named file.

| # | Audited area | Classification | Evidence and reason |
| --- | --- | --- | --- |
| 1 | Existing onboarding routes, screens, flows | **REPLACE** | Keep `/onboarding`, but the current three-field form ends at dashboard and cannot deliver Card-first value. |
| 2 | Account creation and post-auth continuation | **REUSE WITH MODIFICATION** | Clerk/dev auth and continuation work; completion routing currently treats Business creation as onboarding completion. |
| 3 | Business and location setup | **REUSE WITH MODIFICATION** | Permanent models and transactional defaults exist; category/outcome and useful progressive location capture are missing. |
| 4 | Business Knowledge models, services, UX | **REPLACE** | Preserve the rich `KnowledgeFact` contract, but replace the in-memory snippet store and settings-only UX with one durable system. |
| 5 | Brand discovery, Brand Kit, inheritance, approval, locking | **REUSE WITH MODIFICATION** | BrandKit, Starter Kit, adapters, and inheritance are strong; per-property durable decisions and locks are missing. |
| 6 | Website/domain ingestion and crawling | **MISSING** | Current URL intake is explicitly a local fixture. Implement guarded homepage extraction only; full crawl is deferred. |
| 7 | Uploaded files and source provenance | **REUSE WITH MODIFICATION** | Media provenance is durable; uploaded content is not a knowledge source and PDF extraction is absent. |
| 8 | Logo.dev adapter, API, mock, credentials | **REUSE WITH MODIFICATION** | Server secret isolation and proxy are correct; deterministic mock/readiness and approval semantics need work. |
| 9 | Pexels adapter, attribution, import, credentials | **REUSE WITH MODIFICATION** | Search/import/rights fields exist; deterministic fixtures and resilient fallback UX are needed. |
| 10 | Media library and asset storage | **REUSE AS-IS** | MediaAsset plus R2 import is the permanent store. Use SharedMediaAssetBrowser and fix its approval assumption as a small adjacent change. |
| 11 | Autopilot onboarding/setup flows | **REUSE WITH MODIFICATION** | No complete onboarding orchestrator exists; reuse proposals, deterministic recipes, and approval policy rather than form a new pipeline. |
| 12 | AI modes and deterministic mock paths | **REUSE WITH MODIFICATION** | Existing modes and deterministic outcome recipes are useful; onboarding must not invoke the invention-permitting general AI prompt. |
| 13 | Card draft model and creation APIs | **MISSING** | Card JSON exists, but only as a public-capable `tapCard`; add a draft representation and semantic draft API. |
| 14 | Card templates, recipes, safe defaults | **REUSE WITH MODIFICATION** | Types/recipes are reusable; current generic default contains unverified promotion and actions. |
| 15 | Creative Studio and renderer integration | **REUSE WITH MODIFICATION** | Mature renderer/editor exist; wire them to draft state and onboarding return navigation. |
| 16 | Draft Preview and Live Device Preview | **REUSE WITH MODIFICATION** | Existing renderer/session paths are strong; explicitly choose draft and harden all token mutations. |
| 17 | Tap Point creation/seeded assignment | **DEFER** | Device/TapPoint systems exist, but creating inventory or consuming entitlement is not needed to prove Card-first onboarding. |
| 18 | Publishing/readiness contracts | **REPLACE** | Save snapshots and tap-point-count-derived “published” status conflate saved, published, and live. Add an explicit state contract; no publish in Slice 1. |
| 19 | Analytics/event readiness | **REUSE WITH MODIFICATION** | Audit/event patterns exist; add PII-free onboarding funnel events and no customer-facing event. |
| 20 | Prisma models and migrations | **REUSE WITH MODIFICATION** | Extend permanent aggregates and add governed fact/decision records through one additive migration. |
| 21 | Permissions, entitlements, tenant boundaries | **REUSE WITH MODIFICATION** | Tenant scoping exists; add role-capability enforcement, explicit Business selection, and authenticated preview mutations. |
| 22 | Unit, Fusion, e2e, responsive, a11y tests | **REUSE WITH MODIFICATION** | Strong primitives exist, but onboarding and draft/public invariants need dedicated always-on coverage. |

## 6. Database-model mapping

### No-duplication proof

The mapping below is the one source of truth contract for onboarding and the permanent platform. Onboarding writes through the same repositories and aggregates used after onboarding. It does not copy facts into wizard state and later “promote” them. Client state may hold an unsaved form value or comparison choice only until the corresponding permanent record is written.

| Source of truth | Existing model | Planned mapping |
| --- | --- | --- |
| Workspace identity | `Business` | Extend with category, desired outcome, and completion metadata |
| Place | `Location` | Continue using the default permanent Location; no onboarding copy |
| Business Knowledge | none durable/general | Add `KnowledgeSource` and `KnowledgeFact` based on the existing governed TS contract |
| Visual Brand | `BrandKit` | Continue using BrandKit scalars and links |
| Brand decision/lock | none | Add `BrandPropertyDecision` owned by BrandKit/Business |
| Media | `MediaAsset` | Reuse unchanged core model and provenance fields |
| Card draft | none | Add `BrandKit.tapCardDraft` and draft metadata |
| Published Card | `BrandKit.tapCard` | Preserve as public representation for compatibility |
| Publication history | `PublicationSnapshot` | Create only at explicit publish/restore boundaries, not draft save |
| Tap Point/device | `DeviceSlot`, `DeviceAssignment`, `TapPoint` | Reuse later; no onboarding-only assignment |
| Preview | signed preview session | Reuse the existing preview system; do not persist a second preview record |
| Autopilot finding | `AutopilotProposal` | Add well-known onboarding artifact kinds to its existing JSON envelope |

`Campaign` remains a different public-experience format and is not the first Card draft. No onboarding Campaign is created.

This explicitly rejects another Card model, another Brand system, another media library, another Business Knowledge store, another preview system, another Autopilot pipeline, duplicated onboarding-only facts, and provider-specific core tables. Approval and lock state has one permanent home in `KnowledgeFact` for facts and `BrandPropertyDecision` for visual properties; the Card generation manifest references those records instead of copying their state.

## 7. Business Knowledge provenance model

Add a durable, business-scoped knowledge layer that implements the semantics already established in `lib/fusion/autopilot/knowledge-fact.ts`.

`KnowledgeSource` records:

- `id`, `businessId`, optional `locationId`, optional `mediaAssetId`;
- kind: `OWNER`, `WEBSITE`, `UPLOAD`, `SOCIAL`, `BRAND_ASSET`, or `SYSTEM`;
- normalized URI or internal reference, display label, captured timestamp, content hash;
- ingestion status, rights/usage note, and bounded metadata JSON;
- last verified timestamp and created/updated timestamps.

`KnowledgeFact` records:

- `id`, `businessId`, optional `locationId`, and `sourceId`;
- a stable fact key/type and structured JSON value;
- source scope and evidence class;
- confidence as a bounded numeric value;
- approval state: `SUGGESTED`, `APPROVED`, `REJECTED`, or `STALE`;
- contradiction state and optional contradiction group;
- `lastVerifiedAt`, `version`, optional `supersedesId`;
- `whereUsed` JSON for explainability, plus created/updated timestamps.

Rules:

1. Website, provider, upload, and inferred facts always begin Suggested.
2. Owner-entered facts may begin Approved only after the Owner submits the reviewed step.
3. Low-confidence, stale, rejected, or contradicted facts cannot drive claims or actions.
4. Every generated Card field can report the fact IDs and Brand decisions it used.
5. Editing an approved fact creates a new version and supersedes the old record.
6. Contradictions are shown together; the system does not silently select one.
7. The current `/api/ai/knowledge` interface becomes a compatibility adapter over these models, then can be retired without maintaining a second store.
8. Raw homepage HTML is not stored indefinitely. Retain the normalized source metadata, extraction evidence needed for review, and content hash within explicit size limits.

Slice 1 ingests owner input and a single guarded website homepage. Image/PDF uploads remain durable MediaAssets; document text extraction is deferred.

## 8. Brand Starter Kit architecture

Use the existing BrandKit as the final visual source and the existing Starter Kit/adapters as discovery inputs.

Add durable `BrandPropertyDecision` records with:

- `businessId`, `brandKitId`, property key, candidate JSON value;
- status: `SUGGESTED`, `APPROVED`, `REJECTED`, `IGNORED`, or `REPLACED`;
- `locked` and `lockedAt`;
- scope: `BRAND` or `CARD_ONLY`;
- optional `knowledgeSourceId`, `mediaAssetId`, provider, confidence, rationale, and rights status;
- optional `replacesDecisionId`, plus timestamps and acting user ID.

The onboarding orchestrator gathers candidates from:

1. website metadata and linked imagery;
2. Logo.dev results;
3. existing uploaded/media assets;
4. Pexels imagery when requested;
5. the deterministic Starter Kit as a transparent fallback.

The UI groups candidates into logo, palette, font pairing, and imagery. It never implies that discovery equals approval.

- **Keep** retains the current candidate for comparison without approving it.
- **Replace** opens the existing shared media or visual picker.
- **Compare** presents candidate and current Brand/Card rendering side by side.
- **Edit** invokes existing color/font/asset controls.
- **Approve** writes the permanent decision and, for `BRAND` scope, updates existing BrandKit/Business fields in the same transaction.
- **Lock** prevents Autopilot from proposing or applying a replacement until the Owner unlocks it.

`CARD_ONLY` changes affect only `tapCardDraft`. They do not mutate BrandKit defaults. Existing `Reset to Brand` inheritance remains the escape hatch.

## 9. Logo.dev and Pexels integration approach

### Logo.dev

Keep `/api/logos/search`, `/api/logos/image`, and `lib/services/logo-search.ts` as the server boundary. `LOGO_DEV_TOKEN` remains server-only. Onboarding passes a normalized domain, receives candidates through the authenticated API, and imports the selected asset through `/api/media/import` before use.

Required modifications:

- separate provider response mapping from transport so fixtures can exercise it without network access;
- return explicit provider readiness and partial/fallback status;
- time-bound search and render a manual upload/URL fallback;
- treat every result as Suggested;
- remove any source-based automatic Brand approval;
- retain provider/source URL and import timestamps on MediaAsset.

### Pexels

Keep `/api/stock/search` as the server boundary and `/api/media/import` as the durable import path. `PEXELS_API_KEY` remains server-only. Onboarding requests a small, safe, non-claim-bearing image set derived from approved category/tone terms.

Required modifications:

- expose deterministic Pexels fixtures through dependency injection in tests, never a public production “mock mode”;
- preserve photographer/provider/source/attribution/rights metadata;
- display attribution in selection/review surfaces where the provider terms require it;
- on missing credentials, rate limit, or upstream error, preserve the last good Card and offer upload, URL, or color/gradient fallback;
- never use imagery selection to infer an approved business fact.

Provider credentials are readiness enhancements, not prerequisites for a useful draft.

## 10. Rights and attribution handling

- Every remote asset must become a MediaAsset before it is inserted into the saved Card draft.
- Preserve `source`, `providerId`, `sourceUrl`, `attribution`, `rights`, and `importedAt`.
- Show rights/source detail in the comparison and approval panel.
- A provider source proves origin, not ownership or Brand approval.
- Do not proxy or import hosts outside the existing allowlist without an explicit reviewed adapter.
- Require meaningful alt text before approving draft imagery; seed a suggestion but never use provider description as an unreviewed claim.
- If rights are missing or unclear, allow preview comparison but block approval and draft persistence of that candidate.
- Manual uploads record `OWNER_UPLOAD`; the Owner must attest that the asset may be used.
- PDF upload does not imply permission to extract or publish its contents.

## 11. Autopilot orchestration

Create a deterministic onboarding orchestration module under the existing `lib/fusion/autopilot` domain, for example `card-first-onboarding.ts`. It is an additional recipe/orchestrator in the current pipeline, not a new pipeline.

Inputs:

- authenticated Business and default Location;
- approved and suggested KnowledgeFacts with provenance;
- approved Brand decisions and candidate assets;
- first desired customer outcome;
- current Card draft, if any;
- provider readiness and feature configuration.

Outputs:

- a Business Knowledge summary with missing/contradicted facts;
- one bounded follow-up question batch;
- Brand Starter Kit proposal artifacts;
- a safe `TapConnectCardConfig` draft plus an explanation manifest;
- durable `AutopilotProposal` artifacts in recommend mode.

Execution:

1. Normalize and persist source evidence.
2. Reconcile candidates without treating suggestions as facts.
3. Select the minimum fact requirements for the desired outcome.
4. Ask at most one concise batch, ordered by how much it improves the first Card.
5. Build/update Brand suggestions.
6. Generate a deterministic Card from approved facts and approved Brand decisions.
7. Preserve the last good draft when any optional provider fails.
8. Save only after explicit Owner action or an idempotent step submit.

Onboarding must not call `/api/autopilot/live`, create device assignments, or invoke any auto-apply mode. It may use existing proposals and approval policy in `recommend` mode.

## 12. Deterministic policy boundaries

The Slice 1 generator must work with no OpenAI key and no Logo.dev/Pexels credentials.

It may:

- normalize Owner-provided text and URLs;
- choose layout, ordering, neutral tone, and safe visual defaults;
- surface website-derived candidates with exact provenance;
- derive missing-information questions;
- include approved contact links and approved descriptive facts;
- select among approved assets;
- explain why an item was included or omitted.

It may not:

- invent products, services, prices, discounts, dates, codes, hours, testimonials, locations, certifications, FAQs, or claims;
- activate an action without its authoritative target data;
- convert provider imagery or a domain match into approval;
- choose between contradictory facts silently;
- publish, assign, message, charge, email, or enroll anyone;
- call the invention-permitting `lib/services/ai-generate.ts` prompt;
- use an unapproved model response as a public Card field.

Industry/category defaults may affect layout, section order, icon choice, tone constraints, and question priority only. They cannot create business-specific claims.

## 13. First Card generation rules

Add a pure builder in the existing Card domain, for example `lib/fusion/card/first-card-draft.ts`. It returns the established `TapConnectCardConfig` plus a generation manifest containing used fact IDs, used Brand decision IDs, omissions, and questions.

Rules:

1. Begin with business identity and the selected outcome, then render a clearly labeled provisional Card.
2. Use only Approved, current, non-contradicted facts for claims and actionable URLs.
3. A Suggested item can appear only in the review/comparison UI, not as an authoritative saved action or claim.
4. Disable or omit phone, email, review, booking, map, coupon, and social actions unless approved target data exists.
5. Never copy the promotional defaults from `defaultTapConnectCard`.
6. Use a neutral fallback heading such as the approved Business name; do not claim “best,” “official,” or a specific offer.
7. Prefer existing Brand defaults, then approved Starter Kit choices, then accessible neutral visual tokens.
8. Preserve valid Owner edits on regeneration. Replace only generator-owned fields whose inputs changed.
9. Mark the result `Draft` throughout onboarding, Studio, and preview.
10. Save the draft through the semantic Card draft API, not a generic Brand patch.

## 14. Industry/category defaults

Introduce a controlled `BusinessCategory` enum or catalog key rather than unconstrained AI-inferred industry text. Start with a small cross-product set such as:

- professional services;
- health/wellness;
- food/hospitality;
- retail/e-commerce;
- home/local services;
- real estate;
- nonprofit/community;
- creator/personal Brand;
- other.

Category selection controls:

- recommended first outcome ordering;
- neutral layout recipe;
- imagery search terms presented to the Owner;
- relevant fact questions;
- accessible palette suggestions;
- optional feature readiness hints.

Category selection never asserts licenses, specialties, inventory, service area, prices, availability, or opening hours. `Other` must remain a fully supported safe path.

## 15. Outcome-to-Card recipe mapping

| Desired outcome | Minimum approved facts | Safe first Card behavior | Missing-data behavior |
| --- | --- | --- | --- |
| Help customers contact us | Business name plus one approved contact method | Identity and the valid call/email/site action | Ask for one preferred contact method; show identity-only Card meanwhile |
| Get more reviews | Business name and approved review URL | Review CTA and optional approved contact | Ask for review URL; never guess a platform/profile |
| Promote an offer | Business name plus approved offer terms and destination | Offer section/action with exact supplied terms | Ask for offer name, value/terms, expiry if applicable, and destination; never invent |
| Book appointments | Business name and approved booking URL or phone | Booking/contact action | Ask for authoritative booking target |
| Help people visit/find us | Approved Location/address or map URL | Directions and approved hours only if supplied | Ask for the relevant Location; do not geocode/guess silently |
| Share our essentials | Business name, approved description/contact links | Compact identity, about, and contact Card | Use identity-only draft and ask the highest-value missing facts |
| Build loyalty | Approved program configuration | Show only an existing configured program | Mark as not ready and suggest a general Card; TapLoop setup is deferred |
| Answer common questions | Approved FAQ facts | FAQ section using exact approved answers | Ask for a small set; never generate factual answers |

The initial UI may label these in Owner language rather than internal product names. The mapping is extensible without creating a template per industry.

## 16. Owner approval and lock behavior

Approval is explicit and granular:

- Facts, logo, colors, fonts, imagery, and generated Card draft are reviewed separately.
- “Keep” is a workspace choice, not approval.
- “Approve” writes actor and time and makes the item eligible for deterministic generation.
- “Lock” applies only after approval. Autopilot may explain alternatives but cannot replace a locked value.
- “Edit” creates a new candidate/version; it does not mutate the evidence record in place.
- “Replace” rejects/supersedes the current candidate and opens the existing appropriate picker.
- “Compare” is read-only and places options in the same Card rendering context.
- Reject/Ignore retains audit history and prevents the same exact candidate from being immediately re-proposed.
- Unlock requires an authorized editor and is audited.
- Suggested or low-confidence data is visually and semantically distinct from Approved data; color is not the only distinction.

Onboarding completion does not mean every fact is approved. It means the Owner has a valid saved draft and can see what remains missing.

## 17. Draft and publication-state contract

Use these states consistently:

| State | Meaning | Public effect |
| --- | --- | --- |
| Provisional preview | Unsaved deterministic rendering during onboarding | None |
| Saved draft | `BrandKit.tapCardDraft` is durable | None |
| Published Card | `BrandKit.tapCard` was copied from a validated draft through explicit publish | Eligible for public fallback |
| Assigned/live | A publication is resolved through a DeviceSlot/TapPoint/Campaign contract | Public |

Data contract:

- Add `BrandKit.tapCardDraft`, `tapCardDraftUpdatedAt`, and a draft revision/hash.
- Preserve `BrandKit.tapCard` as the currently published Card for backward compatibility.
- On migration, copy every existing non-null `tapCard` into `tapCardDraft`; treat existing `tapCard` as already published so public behavior does not change.
- Draft save validates and updates only draft fields. It does not create PublicationSnapshot, change `tapCard`, create an assignment, or emit a public event.
- A future explicit publish operation validates the draft, copies draft to `tapCard`, records a PublicationSnapshot, and records actor/time. That operation is outside Slice 1.
- Snapshot restore must eventually distinguish “restore as draft” from “republish”; the current immediate update to `tapCard` is not used by onboarding.
- Tap-point count is not proof of publication. Readiness services must use explicit published data.

Every relevant screen must say exactly **Draft changes not published** near the save state and preview entry.

## 18. Error, loading, empty, and recovery states

- Initial load: server-render the Business/onboarding summary and a Card shell; use bounded skeletons, not a blank editor.
- No Business: render Step 1 and create the permanent workspace idempotently.
- Resume: derive progress from durable Business, facts, Brand decisions, and draft state rather than a fragile step counter.
- Invalid domain: preserve typed input, explain the normalization error, and allow manual facts.
- Website blocked/timed out/unsupported: report the source failure, retain any prior facts, and continue manually.
- Logo.dev/Pexels unavailable: show credential/upstream status, Retry, Upload, URL, or safe neutral fallback.
- Partial provider success: render successful candidates and name the missing source; do not fail the whole step.
- Contradiction: display both sourced values and require an Owner choice.
- Media import failure: keep the candidate in comparison but do not allow approval/save as a durable Card asset.
- Generator validation error: keep the last known-good Card; show a recoverable error and the specific missing/invalid inputs.
- Concurrent update: use draft revision/updatedAt optimistic concurrency and offer Reload or Save as new revision.
- Session expiration: preserve durable progress, redirect through auth, and return to the same onboarding stage.
- Empty Brand discovery: show deterministic accessible tokens and manual controls.
- All state transitions announce concise status through `aria-live`.

## 19. Responsive behavior

- Desktop: guided steps and review controls in the main column; sticky living phone/Card preview in the secondary column.
- Tablet: stacked workspace with a persistent Preview control and no horizontal split that crushes either surface.
- Mobile: one task at a time, with Card preview in a collapsible region or bottom sheet; primary Continue/Save action remains reachable without covering fields.
- Reuse the Adaptive Workspace Shell and the existing responsive Card renderer.
- The Card should be visible from the first screen on common desktop sizes and one tap away on mobile.
- Comparison cards become a horizontally controlled carousel only if keyboard and screen-reader order remain logical; otherwise use stacked comparisons.
- All tap targets are at least 44 by 44 CSS pixels.
- No fixed-width editor controls, clipped dialogs, or horizontal page overflow at supported breakpoints.
- Creative Studio receives `returnTo=/onboarding?...` and preserves the responsive return journey.

## 20. Accessibility behavior

- Use one `main`, one page `h1`, labeled step navigation, and proper form/preview/review landmarks.
- Represent progress as an ordered list with current/completed text, not color alone.
- Give every input a persistent label, help text where needed, and an associated inline error.
- Move focus to the step heading after navigation and to the first error after failed validation.
- Provider search, extraction, save, and generation status use polite live regions; critical failures use an alert.
- Keep/Replace/Compare/Edit/Approve/Lock buttons expose the property and current state in their accessible names.
- Brand swatches expose names/hex values and pass contrast checks in their UI context.
- All images have reviewed alt text; decorative preview art uses empty alt text.
- Dialogs trap/restore focus and work entirely from the keyboard.
- Respect reduced motion and avoid auto-advancing steps.
- Do not make confidence understandable only through a meter; include a text label and source.
- Run automated axe checks plus keyboard, zoom, screen-reader, reduced-motion, and 320px-width manual checks.

## 21. Security and tenant isolation

- Resolve Business identity only on the server from the authenticated membership; never trust a client `businessId`.
- Add a server `requireBusinessCapability()` helper that maps OWNER/MANAGER/MARKETING roles to onboarding edit/approve/lock capabilities. VIEWER and scanner roles are read-only.
- Apply capability checks to Business edits, knowledge mutations, Brand decisions, Card draft saves, provider imports, and preview-session mutations.
- Address multiple memberships explicitly: use the active/selected Business contract rather than silently choosing the first membership.
- Website ingestion must reject non-HTTP(S), credential-bearing URLs, localhost, private/link-local/reserved IP ranges, DNS rebinding, nonstandard redirects, and redirect-to-private targets.
- Re-resolve and validate every redirect hop; cap redirects, response bytes, elapsed time, content types, and parsed nodes.
- Use a clear crawler user agent, honor the selected homepage scope, and record the final URL. A full crawler/robots policy is deferred until crawl scope expands.
- Sanitize extracted text and structured data; never execute scripts or render raw HTML.
- Continue using server-only Logo.dev/Pexels/R2 credentials. Never serialize tokens into client props, logs, source metadata, or error messages.
- Validate remote media hosts, MIME types, magic bytes where available, and size before import.
- Put reasonable per-user/business rate limits on ingestion and provider search.
- Do not log raw contact data, source documents, or generated Card JSON in analytics.
- Sign and expire preview tokens as today, and require authenticated tenant capability for update and revoke. Token possession alone is insufficient for mutation.

## 22. Performance considerations

- Keep the onboarding page a Server Component for initial identity/state loading; isolate the interactive workspace as the smallest practical Client Component.
- Follow the repository's installed Next.js 16.2 route-handler and Server/Client Component guidance: await route params, keep authorization near data access, and do not assume route-handler caching.
- Load Business, default Location, facts, Brand decisions, assets, and draft in parallel where safe.
- Do not run provider search on every keystroke. Normalize/debounce the domain and start explicit, cancellable discovery.
- Give website, Logo.dev, and Pexels independent short timeouts; return partial results.
- Limit initial candidate counts, facts, source excerpts, and Card manifest size.
- Import only the Owner-selected remote asset instead of copying every candidate.
- Avoid shipping provider SDKs or secrets to the browser.
- Cache public provider imagery only through the established authenticated proxy/import contract and provider terms.
- Memoize deterministic Card assembly by input revision; regenerate only affected generator-owned fields.
- Lazy-load compare/media dialogs and full Creative Studio; keep the early living Card renderer lightweight.

## 23. Exact first-slice file changes

Paths may be adjusted only where the existing module boundary requires it; no parallel domain tree should be introduced.

### Create

- `app/api/business/knowledge/route.ts` — list/create/review permanent facts.
- `app/api/business/knowledge/website/route.ts` — guarded single-homepage ingestion.
- `app/api/brand/decisions/route.ts` — durable Brand candidate decisions/locks.
- `app/api/card/draft/route.ts` — read, generate, and save the existing Card aggregate's draft.
- `components/onboarding/card-first-onboarding-workspace.tsx` — responsive guided shell.
- `components/onboarding/business-step.tsx`
- `components/onboarding/knowledge-review-step.tsx`
- `components/onboarding/brand-starter-step.tsx`
- `components/onboarding/first-card-step.tsx`
- `components/onboarding/living-card-preview.tsx`
- `lib/fusion/autopilot/card-first-onboarding.ts` — deterministic orchestration using current proposal policy.
- `lib/fusion/card/first-card-draft.ts` — pure safe Card builder and manifest.
- `lib/fusion/knowledge/repository.ts` — Prisma persistence for the established governed fact contract.
- `lib/fusion/knowledge/website-intake.ts` — guarded homepage fetch/extraction.
- `lib/fusion/brand/property-decisions.ts` — transactional approve/lock behavior.
- `lib/authz/business-capability.ts` — server role/capability enforcement.
- One timestamped Prisma migration for all Slice 1 additive schema changes.
- Focused unit/integration/e2e test files listed in Section 26.

### Modify

- `prisma/schema.prisma`
- `app/onboarding/page.tsx`
- `app/auth/continue/page.tsx`
- `components/onboarding/form.tsx` — retire or reduce to reusable fields; do not keep a second onboarding flow.
- `app/api/business/route.ts`
- `lib/services/campaigns.ts`
- `lib/auth.ts`
- `app/api/brand/route.ts` — separate Brand updates from Card draft/publication.
- `lib/brand/tap-card.ts` — export safe primitives only; do not change legacy public fallback unexpectedly.
- `components/card/tap-card-builder.tsx`
- `components/fusion/card/card-authoring-workspace.tsx`
- `app/dashboard/card/edit/page.tsx`
- `app/dashboard/card/preview/page.tsx`
- `app/api/preview/card/session/route.ts`
- `app/api/preview/card/revoke/route.ts`
- `lib/fusion/creative-studio/preview/tokens.ts`
- `lib/fusion/authoring/brand-starter-kit.ts`
- `components/fusion/brand/brand-kit-workspace.tsx`
- `components/media/shared-media-asset-browser.tsx`
- `lib/services/logo-search.ts`
- `app/api/logos/search/route.ts`
- `app/api/stock/search/route.ts`
- `app/api/ai/knowledge/route.ts` — compatibility adapter, not another store.
- `lib/fusion/readiness/workspace-status.ts`
- `components/dashboard/onboarding-checklist.tsx`
- `lib/fusion/features/registry.ts`

### Do not modify for behavior in Slice 1

- public `/t/[deviceCode]` resolution, except a test seam if required;
- live Autopilot, Campaign send, Email, commerce/payment, loyalty enrollment, DeviceAssignment, or production data paths.

## 24. Exact database changes

Create one additive migration:

1. `Business`
   - `businessCategory` nullable enum/catalog key;
   - `primaryCustomerOutcome` nullable enum/catalog key;
   - `cardFirstOnboardingCompletedAt` nullable timestamp.
2. `BrandKit`
   - `tapCardDraft Json?`;
   - `tapCardDraftUpdatedAt DateTime?`;
   - `tapCardDraftRevision Int @default(0)`;
   - `tapCardPublishedAt DateTime?` for explicit state clarity/backfill.
3. `KnowledgeSource`
   - fields and relations defined in Section 7;
   - indexes on `(businessId, kind)`, `(businessId, normalizedUri)`, and `mediaAssetId`.
4. `KnowledgeFact`
   - fields and self-relation defined in Section 7;
   - indexes on `(businessId, factKey, approvalStatus)`, `sourceId`, `locationId`, and `supersedesId`.
5. `BrandPropertyDecision`
   - fields defined in Section 8;
   - indexes on `(brandKitId, propertyKey, status)`, `mediaAssetId`, `knowledgeSourceId`;
   - enforce one current locked/approved decision per property/scope in transactional service logic, with a database constraint where supported safely.
6. Enums for category, desired outcome, knowledge source/status/evidence, Brand decision status/scope.
7. Extend the accepted Autopilot artifact-kind validation in code; keep `AutopilotProposal` JSON storage rather than adding provider-specific proposal tables.

Backfill:

- copy non-null `BrandKit.tapCard` to `tapCardDraft`;
- set `tapCardPublishedAt` for legacy non-null public Cards using the best existing timestamp and document the approximation;
- leave new category/outcome/completion fields null for existing workspaces;
- do not synthesize approval or provenance records for legacy Brand values. Treat them as legacy current values until the Owner reviews them.

The migration must not delete, rename, or reinterpret existing public Card data.

## 25. Exact API changes

| Method/path | Request | Response/effect |
| --- | --- | --- |
| `POST /api/business` | name, optional website/phone, category, outcome | Idempotently creates permanent Business, membership, BrandKit, default Location |
| `PATCH /api/business` | allowed basics/category/outcome and optimistic version | Updates the authenticated active Business |
| `GET /api/business/knowledge` | filters only | Facts, sources, contradictions, approval/confidence summary |
| `POST /api/business/knowledge` | owner facts/source references | Creates versioned owner/source facts |
| `PATCH /api/business/knowledge` | fact ID, approve/reject/edit | Capability-checked version/approval transition |
| `POST /api/business/knowledge/website` | normalized homepage URL | Guarded fetch; returns/persists Suggested facts and source status |
| `GET /api/brand/decisions` | property filters | Candidates/current/lock status |
| `POST /api/brand/decisions` | candidate/property/source | Creates Suggested decision |
| `PATCH /api/brand/decisions` | keep/replace/approve/lock/unlock/reject | Transactional decision and BrandKit update where applicable |
| `GET /api/card/draft` | none | Draft, revision, generation manifest, published-state summary |
| `POST /api/card/draft` | `action: generate`, expected input revision | Deterministic proposal/draft response; no public mutation |
| `PUT /api/card/draft` | Card JSON, expected draft revision | Validates and saves `tapCardDraft`; never publishes |

Modify existing APIs:

- `/api/logos/search` and `/api/stock/search` return consistent readiness/partial result envelopes and accept injected adapters in tests.
- `/api/media/import` remains the only remote candidate-to-durable-asset transition.
- `/api/brand` no longer accepts onboarding draft saves as `tapCard`; compatibility must be maintained for legacy callers until they migrate.
- `/api/ai/knowledge` delegates to the permanent knowledge repository.
- preview session create/update/revoke resolves the authenticated Business and required capability on every mutation.
- no Slice 1 API endpoint publishes, assigns a Tap Point, sends a Campaign, contacts a customer, sends Email, or charges money.

All mutation APIs use Zod validation, bounded JSON/text, optimistic concurrency where applicable, and the server-derived Business.

## 26. Exact tests

### Unit

- Business Knowledge source normalization, fact versioning, approval eligibility, contradiction, stale/low-confidence exclusion, and tenant predicates.
- Website intake SSRF cases: localhost, IPv4/IPv6 private ranges, DNS rebinding seam, credentials in URL, redirect to private host, timeout, size, MIME, malformed HTML, safe metadata/JSON-LD extraction.
- First Card generator for every desired outcome, no invented claims, disabled missing actions, preservation of Owner edits, locked Brand values, and deterministic output.
- Brand decision state machine: Keep versus Approve, Replace, Reject, Edit/version, Lock/Unlock, CARD_ONLY versus BRAND.
- Logo.dev/Pexels mapping fixtures, unavailable credentials, rate limit, partial failure, rights metadata, and secret non-exposure.
- Draft/public helpers: draft save cannot mutate `tapCard`, snapshot, assignment, or public hash.
- Capability matrix for OWNER/MANAGER/MARKETING/VIEWER/scanner roles.
- Onboarding completion/resume derivation.

### Route/integration

- `/auth/continue` routes a new user, incomplete member, completed member, and admin correctly.
- Business creation remains transactional and creates exactly one Business/OWNER membership/BrandKit/default Location across retries.
- Knowledge and Brand decision APIs reject cross-tenant IDs and insufficient roles.
- Website ingestion rate/size/security boundaries and manual recovery response.
- Card draft GET/generate/PUT optimistic concurrency and schema validation.
- Draft save leaves legacy/public `BrandKit.tapCard` and PublicationSnapshot count unchanged.
- Preview session update/revoke rejects unauthenticated and cross-tenant attempts.
- Logo/Pexels selected asset flows through `/api/media/import` and retains provenance.

### Fusion/component

- Full deterministic path: approved facts + approved Brand decisions → AutopilotProposal → Card draft manifest.
- Living Card improves after fact approval without losing valid Owner edits.
- Suggested, Approved, Locked, Missing, Contradicted, and provider-unavailable UI states.
- Exact wording **Draft changes not published** in onboarding, Studio, and customer preview entry.
- Existing Brand inheritance and Reset to Brand behavior remains intact.

### E2E

- New Owner: auth continuation → business/domain/outcome → guarded fixture/manual facts → one question batch → Brand review/approve/lock → first Card → Creative Studio edit → customer preview → save draft.
- Assert no public endpoint output changes before and after the draft journey.
- Provider credentials absent path completes successfully with deterministic/manual fallback.
- Resume after reload and re-auth at each major stage.
- Existing member with incomplete onboarding resumes; completed member reaches dashboard.
- Keyboard-only complete path and axe checks at each major stage.
- Responsive proof at 320px mobile, tablet, and desktop; no horizontal overflow and living Card reachable.
- Failure recovery for website timeout, provider 429, media import failure, and draft revision conflict.

Keep critical tests always-on in CI. `PROOF_HEADED=1` suites remain useful manual evidence but cannot be the only coverage of the primary path.

Run at minimum:

- targeted Vitest/unit and route tests;
- Prisma validate/generate and migration test against an isolated test database;
- TypeScript and lint checks;
- focused Playwright Chromium onboarding suite;
- existing Card authoring, Brand visual, preview, first-public-tap, responsive, and accessibility regressions.

## 27. Seed/mock-data strategy

- Build deterministic fixtures at the adapter boundary, not production routes controlled by a client “mock” flag.
- Use a fictional business with an owned local HTML fixture, known logo candidates, Pexels-style asset metadata, explicit rights, and a small set of approved/suggested/contradictory facts.
- The homepage test server/fixture must cover normal metadata, JSON-LD, redirects, timeout, over-size response, bad MIME, and private-address rejection.
- Logo.dev and Pexels fixture adapters return the same normalized types as production adapters.
- Use existing seed/demo workspaces only where their contracts are stable; never rely on production customer records.
- R2 tests use an in-memory/test storage adapter and assert provider metadata survival.
- Default new production users receive safe neutral Card tokens when providers are absent. They do not receive a fake logo, invented offer, DeviceSlot, or assignment.
- No secrets are committed. Credential readiness tests use presence/absence injection.

## 28. Rollback strategy

- Gate routing and the new workspace behind `onboarding.card_first`.
- Keep the old minimal onboarding form available as a temporary server-selected fallback during rollout, but do not maintain two writable knowledge/Brand/Card systems.
- The database migration is additive. Turning the flag off leaves knowledge, Brand decisions, and drafts safely stored.
- Existing public Card reads remain on `BrandKit.tapCard`; draft fields have no public effect.
- Do not down-migrate by deleting new records. Roll back application routing and retain data for forward recovery.
- If provider integration is unhealthy, disable only that adapter and keep deterministic/manual paths.
- If draft API rollout fails, Creative Studio can temporarily remain on the legacy path for pre-existing workspaces only; new onboarding must be paused rather than risk publishing a draft.
- Emit operational counts/errors for each stage so rollback can be based on completion and failure signals.

## 29. Owner acceptance walkthrough

1. Sign in as a brand-new Owner and land on **Tell us about your business**, not an empty dashboard or editor.
2. Enter a Business name, optional homepage, category, and first desired customer outcome.
3. See a living, clearly provisional Card immediately.
4. If the homepage is reachable, review extracted facts with source, confidence, and Suggested labels. If it is not, complete the same journey manually.
5. Resolve contradictions and answer one concise batch of high-value missing questions.
6. Reach **We found your Brand** and review logo, colors, fonts, and imagery.
7. Use Keep, Replace, Compare, and Edit; then Approve and Lock selected properties.
8. Confirm that unapproved discoveries do not appear as Card claims or authoritative actions.
9. Reach **Here is your first Card** and see the Card improve from the approved facts and Brand choices.
10. Open the existing Creative Studio directly, edit the draft, and return without losing onboarding progress.
11. Preview as a customer using the existing renderer/preview session.
12. Save and see a durable success state plus the exact message **Draft changes not published**.
13. Reload/re-auth and confirm the draft, decisions, facts, and current stage resume.
14. Open the public Tap Point URL, if the test workspace already has one, and confirm its output did not change.
15. Confirm that no publication, Tap Point assignment, Campaign send, Email, payment, loyalty enrollment, or customer contact occurred.

Acceptance evidence should include desktop/tablet/mobile screenshots, keyboard/a11y results, API/database assertions for draft isolation, and provider-unavailable completion.

## 30. Known risks and unresolved decisions

### Repository risks

- The legacy save path conflates draft and public Card state. It must be migrated before onboarding can safely save.
- General AI generation explicitly permits invention. Accidental reuse is a product-safety risk.
- Fusion memory fallbacks can look functional without durable data. Owner approvals must fail honestly if permanent persistence is unavailable.
- Current role declarations are not consistently enforced in route handlers.
- Preview session mutation authorization is weaker than creation authorization.
- Remote website ingestion introduces SSRF, privacy, rate, and content risks absent from the current fixture.
- Logo.dev/Pexels and R2 availability varies by environment.
- A broad set of e2e proof files are not always-on CI gates.
- Existing multi-membership behavior chooses the first membership rather than an explicit active workspace.

### Owner decisions needed before implementation

1. **Homepage scope:** approve a guarded single-homepage fetch in Slice 1, or keep the first release deterministic/manual only?  
   Recommendation: approve guarded homepage-only extraction with a manual fallback; defer multi-page crawling.
2. **Tap Point:** should onboarding reserve/create a DeviceSlot or Tap Point?  
   Recommendation: no. Show a future distribution-readiness step only; do not consume inventory/entitlement or assign anything in Slice 1.
3. **Legacy Card backfill:** should existing `BrandKit.tapCard` be treated as published and copied to the new draft field?  
   Recommendation: yes; it is the only migration that preserves current public behavior without data loss.
4. **Plan entitlement:** should deterministic Card-first Autopilot be available on BASIC while model-backed/live Autopilot remains gated?  
   Recommendation: yes. The deterministic onboarding assembler is core setup, not paid autonomous execution.
5. **Location timing:** should every Owner complete an address/location step?  
   Recommendation: no. Collect the permanent default Location progressively only when the selected outcome needs directions/local details.
6. **Document extraction:** should uploaded PDF/text extraction enter Slice 1?  
   Recommendation: no. Preserve uploads and provenance now; defer extraction and review policy.
7. **Role policy:** may MARKETING approve/lock Brand and save Card drafts, or only OWNER/MANAGER?  
   Recommendation: allow MARKETING to edit/save drafts and approve non-business facts; reserve workspace identity, lock override, and publication for OWNER/MANAGER.
8. **Onboarding completion:** is a saved draft sufficient, or must the Owner also complete customer preview?  
   Recommendation: saved valid draft is sufficient; preview remains strongly prompted but not a completion blocker.

## 31. Explicitly deferred items

- Any live publication or republish implementation.
- Tap Point/DeviceSlot creation, inventory reservation, assignment, activation, or QR fulfillment.
- Campaign creation, assignment, scheduling, sending, or format migration.
- Customer contact, leads outreach, Email, SMS, notifications, or autoresponders.
- Payment, subscription changes, checkout, commerce, or entitlement purchase.
- Loyalty/TapLoop program setup or enrollment.
- Multi-page website crawling, background recrawl scheduling, robots crawl management, and change detection.
- PDF/document OCR or extraction, social-account connectors, and third-party directory ingestion.
- Autonomous/model auto-apply, `/api/autopilot/live`, and invention-capable general generation.
- A new Card, Brand, media, Business Knowledge, preview, or Autopilot subsystem.
- Provider-specific core database tables.
- Full active-workspace switcher UX, except the server contract needed to avoid first-membership ambiguity.
- Publication-history redesign beyond the draft isolation required for Slice 1.
- Retrofitting every legacy Brand value with fabricated provenance.
- Production deployment, data migration execution, feature enablement, or customer rollout.

## 32. Proposed implementation commit sequence

Each commit must be independently reviewable and must not publish/deploy.

1. **Add draft/public persistence contract**  
   Add schema migration/backfill, draft repository/API, compatibility reads, and invariant tests proving public output is unchanged.
2. **Persist governed Business Knowledge**  
   Add KnowledgeSource/KnowledgeFact, repository, compatibility adapter, capability checks, and unit/API tests.
3. **Add safe homepage intake**  
   Implement guarded homepage-only extraction, provenance, deterministic fixtures, and SSRF/limits tests.
4. **Persist Brand decisions and locks**  
   Add BrandPropertyDecision, approval transactions, SharedMediaAssetBrowser approval fix, and state-machine tests.
5. **Normalize provider discovery**  
   Add Logo.dev/Pexels adapter fixtures, readiness/partial envelopes, rights assertions, and fallback states.
6. **Build deterministic first-Card orchestrator**  
   Add desired outcome/category catalog, safe generator, proposal artifacts, manifest, and no-invention tests.
7. **Build the Card-first onboarding workspace**  
   Replace current screen, add living Card, provenance review, concise question batch, Brand controls, recovery, responsive, and a11y behavior.
8. **Wire Creative Studio and preview to draft**  
   Load/save explicit draft, add return flow and exact not-published wording, harden preview mutation auth.
9. **Complete continuation, readiness, and analytics**  
   Resume incomplete members, update checklist/state labels, emit PII-free internal events, and add route tests.
10. **Close the vertical proof**  
    Add always-on e2e/responsive/a11y/regression tests and complete the Owner acceptance evidence.

After each commit, run its focused tests. Before Owner review, run the complete verification set from Section 26 against an isolated test database.

## 33. Complete Codex implementation prompt for Slice 1

```text
Implement the approved Card-first onboarding Slice 1 in TapMagic/Tap-Connect-Studio.

Repository:
/Users/rcs/Development/tap-connect-studio-fusion

Branch:
tapconnect-card-first-onboarding

Authoritative plan:
docs/fusion/CARD_FIRST_ONBOARDING_IMPLEMENTATION_PLAN.md

Starting implementation checkpoint:
Use the Owner-confirmed plan commit and verify the branch/worktree before changing code.

Read AGENTS.md and the relevant installed Next.js 16.2.10 guides in
node_modules/next/dist/docs before editing routes or Server/Client Components.

Goal:
Deliver the visible journey:
TELL US ABOUT YOUR BUSINESS
→ WE FOUND YOUR BRAND
→ HERE IS YOUR FIRST CARD

The Owner must see a living Card early, review sourced facts and Brand suggestions,
edit through the existing Creative Studio, preview as a customer, and save a
durable draft with the exact message “Draft changes not published.”

Hard boundaries:
- Do not merge, deploy, publish, assign/activate a Tap Point, send a Campaign,
  contact customers, enable Email, charge money, change subscriptions, or alter
  production data.
- Do not commit secrets or force-push.
- Do not call /api/autopilot/live or the invention-permitting general
  lib/services/ai-generate.ts path.
- Do not create another Card model, Brand system, media library, Business
  Knowledge store, preview system, Autopilot pipeline, onboarding-only fact
  store, Campaign-as-Card, or provider-specific core table.
- Provider and website discoveries remain Suggested until explicit Owner approval.
- Never invent claims, services, products, prices, discounts, dates, codes,
  hours, locations, reviews, FAQs, certifications, or action targets.
- Stop before live publication or customer contact.

Implementation order:
1. Add the additive Prisma migration and backfill described in Sections 6, 7, 8,
   17, and 24. Preserve BrandKit.tapCard as the public representation; add
   BrandKit.tapCardDraft and revision metadata. Copy legacy tapCard into the draft
   on migration and preserve current public behavior.
2. Add a capability-checked semantic /api/card/draft API. Draft save must update
   only draft fields and must not change BrandKit.tapCard, create a
   PublicationSnapshot, create an assignment, or emit a public/customer action.
3. Persist the existing governed KnowledgeFact semantics with KnowledgeSource and
   KnowledgeFact. Replace the process-memory /api/ai/knowledge implementation with
   a compatibility adapter to this one permanent repository.
4. Add guarded single-homepage intake with strict SSRF/DNS/redirect/private-IP,
   timeout, MIME, and byte limits. Persist provenance and Suggested facts. Always
   provide manual fallback. Do not implement multi-page crawl or document
   extraction.
5. Add durable BrandPropertyDecision state for Suggested/Approved/Rejected/
   Ignored/Replaced, BRAND/CARD_ONLY scope, and Lock/Unlock. Approving BRAND scope
   updates the existing BrandKit/Business visual field in the same transaction.
   Fix any behavior that treats Logo.dev origin as automatic Brand approval.
6. Reuse /api/logos/search, /api/logos/image, /api/stock/search,
   /api/media/import, MediaAsset, R2, and SharedMediaAssetBrowser. Normalize
   provider envelopes, preserve rights/attribution, add injected deterministic
   fixtures for tests, and retain manual/neutral fallback without credentials.
7. Add a deterministic onboarding recipe under the existing Autopilot domain and
   a pure first Card builder under the existing Card domain. Reuse
   AutopilotProposal and the established TapConnectCardConfig/renderers. Generate
   only from approved, current, non-contradicted facts and approved Brand
   decisions. Return a manifest of used facts/decisions, omissions, and one
   concise question batch.
8. Replace the current /onboarding screen with a responsive, resumable workspace.
   Collect business name, optional homepage, controlled category, first desired
   customer outcome, minimum relevant facts, Brand choices, and Card approval.
   Show source, confidence, missing, contradiction, approval, and lock states.
   Show the living Card from the first step on desktop and one tap away on mobile.
9. Reuse the existing Creative Studio, Card renderer, Brand inheritance,
   Reset-to-Brand behavior, and preview session. Load/save tapCardDraft, preserve
   Owner edits when regenerating generator-owned fields, support a returnTo
   onboarding path, and show “Draft changes not published” in onboarding, Studio,
   and preview entry. Require authenticated Business capability for every preview
   session mutation.
10. Modify /auth/continue and readiness so an existing but incomplete workspace
    resumes onboarding. Completion means a valid saved draft; it does not mean
    published/live.
11. Add PII-free internal onboarding lifecycle events only.
12. Implement all exact tests in Section 26, prioritizing the draft/public
    invariant, no-invention policy, tenant/role isolation, SSRF protection,
    deterministic no-credential completion, resume behavior, responsive layout,
    keyboard use, and accessibility.

Owner decisions:
Before coding, read Section 30 and use only the Owner-confirmed choices. If no
different decisions are supplied, do not silently broaden scope; pause on any
choice that materially changes persistence, public behavior, entitlements,
network crawling, or role authority.

Verification:
- Inspect actual code before each change; do not rely on plan filenames alone.
- Keep Server Components as the default and Client Components limited to
  interaction boundaries.
- Run Prisma validate/generate and migration tests on an isolated test database.
- Run targeted unit/route/Fusion tests, TypeScript/lint, focused Playwright
  Chromium onboarding tests, and existing Card/Brand/preview/public-tap/
  responsive/a11y regressions.
- Prove with database and public-route assertions that saving or previewing the
  draft cannot change the published Card or public Tap Point output.
- Report changed files, migrations, test commands/results, residual risks, and
  the exact implementation commit and remote SHA.

Do not implement deferred Section 31 items. Stop after the verified Slice 1 is
committed and pushed normally for Owner review.
```

---

This plan authorizes no application-code change. Implementation begins only after the Owner resolves or accepts the recommendations in Section 30 and explicitly confirms Slice 1.
