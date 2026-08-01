# Source-of-Truth and Precedence Map

Audited tree: `d67d1399a064834d476a0675642c294cf13478e3`
Normative authority: `TAPCONNECT_PRODUCT_CONSTITUTION.md`

## Current precedence systems

| System | Storage / representation | Intended role | Current competition |
|---|---|---|---|
| V1 direct state | `BrandKit.tapCard`, `Campaign` JSON, `Campaign.formSettings.emailResponse` | Direct persisted object truth | Card editor no longer writes public `tapCard`, but public renderer still reads it. |
| Current Card draft | `BrandKit.tapCardDraft` + revision fields | Mutable saved Card draft | No ordinary canonical draft→public transition. |
| Business defaults | columns on `Business`/`Location` | Business fact authority/fallback | Copied into Card/Brand JSON without durable provenance. |
| Brand defaults | `BrandKit` scalar fields and Brand decisions | Approved reusable visual defaults | Flattened values and editor-local inheritance modes cannot explain linkage after reload. |
| Brand session inheritance | `BrandInheritanceState` | Honest session copy/restore | Uses `linked` vocabulary while explicitly non-durable. |
| Visual property stack | `PropertyStack` with brand/surface/preset/item override | Deterministic current-session visual resolution | Separate from BrandInheritanceState and only partly serialized. |
| Website findings | Knowledge sources/facts | Proposed facts/candidates | Can feed prefill; must never bypass approval or local values. |
| Intelligent prefill | computed proposal/apply result | Fill eligible empty values | Provenance can disappear once values flatten into Card JSON. |
| AI/Ask proposal | Ask preview or `AutopilotProposal` | Non-authoritative proposed mutation | Ask can claim Apply without mutation; two proposal systems exist. |
| Editor transient state | React histories, shell session storage | Immediate preview and Undo/Redo | Multiple histories can diverge; full reload loses session semantics. |
| Fixture/generated defaults | bootstrap, first Card generator, parser fallbacks | Safe initial state only | Parser fallbacks may look like persisted values; fixtures must never override deliberate work. |
| Publication snapshot | `PublicationSnapshot`; Demo `DemoPublication` | Immutable revision/history | Generic Card snapshots are created “pre-save” by legacy `/api/brand`, blurring save versus publish. |
| Landing binding | `LandingDemoBinding` | Pointer to one immutable Demo revision | Legacy `LandingDemoSlot` and `Campaign.isLandingDemo` create parallel landing paths. |

## Property flow map

Abbreviations: **BK** = `BrandKit`; **C** = `Campaign`; **FS** = `Campaign.formSettings`; **PS** = `PropertyStack`.

| Property category | Created / stored | Read and transformed | Save / possible overwrite | Preview → Public / downstream |
|---|---|---|---|---|
| Business name | Owner/onboarding/Control Room → `Business.name`; proposed web facts may exist in `KnowledgeFact` | `parseTapConnectCard`, first-draft generator, Brand snapshot builders, Email/Campaign render context | Business API/Control mutations update column; Card may also flatten name into section text. Parser fallback can repopulate absent Card text | Card Preview reads current draft sections/fallback; public reads `tapCard`; Campaign/Email receive copied business name; Demo snapshot contains resolved Card JSON |
| Business description | `Business.description`; Knowledge facts; Card text sections | onboarding/prefill and Card generator transform into draft copy | Business/Knowledge approval or local Card edit; later prefill must only fill eligible empty field | Draft Preview → published Card snapshot; may be copied into Campaign/Email but no live propagation |
| Contact details | `Business` phone/email/website, `Location`, `BrandKit.socialLinks`, approved Knowledge | `parseBrandContactProfile` merges profile with Business fallbacks; Card actions copy values | `/api/business`, `/api/brand`, Card draft Save; multiple duplicate storage locations can disagree | Card draft/public action links; Campaign digital-card blocks and Email footer may copy; vCard routes read business/profile |
| Logo | `Business.logoUrl`; approved `MediaAsset`; Brand decision | Brand adapter and Card/Campaign/Email resolvers select role/default | `/api/brand` requires tenant-owned approved asset for new logo; local document can store its own URL/asset reference | Preview resolves local→surface→Brand; public uses flattened Card/Campaign/Email value; Demo snapshot freezes result |
| Brand colors | BK primary/secondary/accent/background/text; Brand decisions | `build*VisualModel` creates PS layers; session inheritance snapshot | `/api/brand` updates BK; Card draft, Campaign theme, Email doc flatten local resolved values. Session `syncFromBrandKit` may alter non-custom fields | Draft previews use current models; public uses saved flattened JSON; existing saved/public objects do not auto-update, per `visual-property.ts` impact copy |
| Fonts | BK `fontStyle` plus newer visual fields/resources | Brand adapter/font catalog/visual resolver | Brand save or local theme/document save | Same flattened Preview/Public behavior; composition font loader affects rendering only |
| Card background | generated/Card JSON + PS surface/item overrides | `buildCardVisualModel`, creative composition/background controls | Card draft PUT writes whole config; local changes can be regenerated only by explicit state update, but linkage metadata is not durably complete | Embedded Preview immediate; view-only Preview saved draft; public `tapCard`; Demo publish copies draft into immutable manifest |
| Card typography | Card config/sections + composition nodes; Brand defaults | professional typography panels and composition renderer | whole Card draft Save; multiple text and composition histories | shared Card renderer in edit/preview/public, subject to draft/public state distinction |
| Card action styles | Card action section `style`; PS item overrides; Brand button defaults | `buildActionPropertyMap`, `overrideCardItemProperty`, `applyResolvedToSectionStyle` | whole Card draft Save; reset helpers re-resolve Brand | shared Card renderer; Campaign/Email are separate document copies, not linked |
| Card sections and action order | Card config `sections[]` with `id`, `type`, `order` | builder sorts; outline/reorder helpers; normalizer/parser | PUT `/api/card/draft`; old `/api/brand` public path; duplicate/reorder/hide changes whole JSON | current in-memory Preview; saved draft Preview; public/landing only after explicit public transition |
| Visibility | section `visible`/`enabled` semantics, sometimes resolver defaults | builder toggle; public renderer filters | whole document Save; missing value may default enabled in normalizers | Preview/Public share render filtering but old/legacy shapes may normalize differently |
| Lock state | Card section `locked`; Brand decision locks; composition locks | outline/inspector guards and Brand policy | Card draft Save for section lock; Brand decision API for Brand lock | affects authoring; public output generally contains result, not policy explanation |
| Asset selection | `MediaAsset`/`CreativeResource` ID plus copied URL/metadata inside document | shared browser resolves candidate/import/approval and projects reference | media APIs own Asset; Card/Campaign/Email Save records usage and embeds reference/copy | Preview loads selected asset; public loads embedded/stored URL; Demo snapshot strips private keys but must retain safe public media |
| Campaign content | template/default generator → `Campaign.contentBlocks` | editor histories, normalizer, creative renderer | PATCH `/api/campaigns/assign`; AI panel can replace title/blocks/theme after Owner action | Campaign phone Preview → public resolver/renderer when eligible; Card Spotlight may project approved Offer facts; Email may read Campaign context |
| Campaign theme | template copies BK → `Campaign.themeOverrides`; PS layers | `buildCampaignVisualModel` then `applyResolvedToCampaignTheme` | PATCH `/api/campaigns/assign`; local overrides flatten; Brand reset re-copies | editor Preview and public Campaign renderer; publication snapshot freezes theme |
| Campaign schedule | Campaign dates; `ScheduleRule`; `CampaignGroupSlot` | `resolveScheduledCampaign` and `resolveGroupCampaign` evaluate date/day/time/timezone/status | Campaign save plus `/api/schedule` or group APIs | time-travel/public resolver; Card/Tap Point context chooses winning Campaign; Email schedule is not represented here |
| Campaign status | `Campaign.status`; assignment service may set `LIVE` | lists/actions/resolver; playable status helper | `/api/campaigns/actions`, PATCH assign, assign-to-device transaction | determines inspectable state and public eligibility, but current resolver includes `DRAFT` as playable |
| Email content | legacy/default Email response → `FS.emailResponse` document | `parseEmailDocument`, authoring history, HTML/plain render | PATCH `/api/campaigns/assign`; usage/audit hooks detect `emailResponse` | live desktop/mobile/dark Preview; `/api/email/send` renders/sends payload. No immutable Email publication/delivery record |
| Email theme | BK defaults + document `visualTheme`/item overrides | `buildEmailVisualModel` and apply-to-document helpers | same FS save; Brand reset copies current values | Preview/rendered HTML; no live linkage to later Brand changes |
| Email schedule | no canonical Email schedule model | Campaign dates do not reliably mean Email delivery schedule | no complete save path found | **Unknown/absent:** governed scheduled Email workflow must be designed without reusing Campaign availability ambiguously |
| Tap Trace records | public route `logTapEvent`; click API; lead/keep actions | analytics/Insights aggregate, join Campaign/Device/Business IDs | append-only event writes; Campaign deletion currently nulls some foreign keys | displayed in Analytics/Insights, but no canonical Tap Trace history route; downstream attribution may lose context after deletion |
| Publication revision | Campaign snapshot or generic Card snapshot; Demo publication | snapshot manifests/hash/version; Demo readiness/sanitization | Campaign save/publish hooks; legacy Brand pre-save snapshot; Control Room Demo publish | Campaign rollback; Card legacy rollback mutates `tapCard`; Demo public endpoint reads immutable manifest |
| Demo revision | current saved BK `tapCardDraft` → `DemoPublication.manifest` and BK public copy | Control Room readiness, recursive private-key stripping, version calculation | `demo.publish` only, audited and permissioned | eligible for landing binding; draft changes do not alter prior revision |
| Landing binding | Control Room selects one published Demo revision → `LandingDemoBinding` | public slot API looks up active binding and manifest | `demo.binding.activate/rollback/unbind`, sometimes approval required | public landing fetches immutable payload with cache/ETag; legacy slot APIs remain competing callers |

## How values reach each surface

| Surface | Current source | Consequence |
|---|---|---|
| Card editor Preview | in-memory `TapCardBuilder` config | Immediate and generally trustworthy for the current session. |
| Card view-only Preview | saved `tapCardDraft` | Trustworthy for last Save, not unsaved editor state. |
| Public Card | `BrandKit.tapCard` through resolver | Can lag the saved draft indefinitely because normal Studio lacks publish. |
| Campaign Preview/Public | same Campaign blocks/theme renderer, saved to Campaign row | Stronger parity, though status/assignment/schedule semantics can select unexpected content. |
| Email Preview/Send | `FS.emailResponse` document; send route input/provider | Preview and saved draft are coherent; scheduled/delivery-state authority incomplete. |
| Demo public payload | immutable `DemoPublication.manifest` selected by binding | Correct draft/public isolation once Control Room publication occurs. |
| Landing Card | new bound Demo endpoint or older landing-demo path depending consumer | Parallel systems create ambiguity until legacy path is removed. |

## Confirmed authority conflicts

1. **Card draft versus Card public:** Save writes `tapCardDraft`; public reads `tapCard`; no ordinary Studio publish transition exists.
2. **Brand linkage vocabulary versus persistence:** session state says `linked` but admits it is copied/not durable; visual stacks use a second source model; saved JSON does not retain one complete state contract.
3. **Card publication versus history:** legacy `/api/brand` calls a “pre-save” `PublicationSnapshot`, while Demo publication creates a true immutable public revision.
4. **Landing Demo authority:** `LandingDemoSlot`/legacy APIs, `Campaign.isLandingDemo`, and new `DemoPublication`/`LandingDemoBinding` coexist.
5. **Campaign scheduling:** Campaign date fields, per-device `ScheduleRule`, and group slots overlap; resolver priority is technical rather than one visible Owner contract.
6. **Email identity:** an entire Email document lives in Campaign `formSettings`; Email schedule and delivery state have no first-class authority.
7. **Tap Trace naming/retention:** tap/click facts exist, but no canonical history surface; deletion code can null Campaign linkage.
8. **AI proposal authority:** Ask preview and Autopilot proposal are separate; Ask Apply may be a no-op while claiming success.
9. **Audience person authority:** Lead, Contact, and CustomerRelationship coexist without a universally enforced reconciliation contract.
10. **Tap Point identity:** DeviceSlot remains operational while TapPoint/TapPointAddress are bridged.

## Canonical resolution contract (recommendation; do not implement in this pass)

Every editable property persists and exposes:

```text
value
source = BRAND | BUSINESS | LOCATION | WEBSITE_PROPOSAL | AI_PROPOSAL | DEFAULT | CUSTOM
linkage = LINKED | CUSTOM
sourceRef
locked = true|false plus lock scope/reason
saveState = UNSAVED | SAVING | SAVED | FAILED | CONFLICT
updatedAt / updatedBy
```

Resolution order:

1. a valid visible policy lock;
2. local `CUSTOM` value;
3. current approved `LINKED` source;
4. explicitly accepted one-time proposal/prefill;
5. safe generated default.

Rules:

- Custom wins until explicit Reset to source.
- Source changes update only `LINKED` properties.
- Website/AI remain proposal sources until explicit acceptance.
- Prefill writes only an eligible empty/unlocked field and records provenance.
- Save persists draft and authority metadata atomically.
- Preview resolves the current draft with the same renderer as the intended public revision.
- Publish validates and snapshots a saved draft into a new immutable revision.
- Public and landing bindings reference revisions, never mutable drafts.
- Campaign, Email, and Offer projections carry references to their canonical facts; medium-specific presentation may remain local.

## Migration implications for a later implementation pass

- Introduce the contract additively; do not reinterpret all existing JSON as linked.
- Conservatively classify existing explicit document values as `CUSTOM` unless provenance proves otherwise.
- Preserve `tapCard` as current public revision during migration; initialize draft separately.
- Unify BrandInheritanceState and PropertyStack before adding live linkage.
- Map legacy landing bindings to immutable Demo revisions before removing legacy APIs.
- Preserve event attribution with tombstone/snapshot labels rather than nulling all context on content deletion.
- Add first-class Email identity/schedule/delivery only after backward-compatible projection from `formSettings.emailResponse` is proven.
