# Reconstitution Matrix

Governing rule: apply the [V2 Extension Law](TAPCONNECT_PRODUCT_CONSTITUTION.md#v2-extension-law) before every disposition below. `KEEP` never authorizes a standalone island or parallel V1 authority; it means preserve the additional value inside the named parent workflow and boundary recorded in [V2_EXTENSION_MAP.md](V2_EXTENSION_MAP.md).

Audited tree: `d67d1399a064834d476a0675642c294cf13478e3`

Classification: `KEEP`, `REWIRE`, `MERGE`, `RETIRE`, `REPLACE`, `UNKNOWN`. Rows split product areas where their parts need different decisions. “Authority” is current → correct. Waves refer to `TAPCONNECT_RESCUE_PLAN.md`.

| Component/system and code | V1 relationship / current→intended authority | User impact and reason | Class | Dependencies / risk / wave |
|---|---|---|---|---|
| Public resolver `/t/[deviceCode]`, `lib/services/tap-resolve.ts` | V1 spine; assignment/schedule/BrandKit → published revision + governed activation | Stable URL and customer result are essential; retain while tightening eligibility | KEEP/REWIRE | Tap Points, Campaign schedule, Card publish; high; W1/W7 |
| Shared Card renderer `components/tap/tap-connect-card*.tsx` | V1 renderer extended; document config → canonical resolved revision | Strong Preview/Public parity asset | KEEP | Card authority, Assets; high; W1/W4 |
| V1 host `components/card/tap-card-builder.tsx` | V1 direct editor expanded; local config → canonical draft transaction | Proven controls remain valuable; current host carries too many adapters/states | REWIRE | draft API, shell, visual resolver; high; W1/W4 |
| Card assembly `/dashboard/card`, `CardAssemblyWorkspace` | post-V1 hub; status aggregation → Card command center | Card-centered IA is right, but publish claim lacks action | REWIRE | publish lifecycle, Tap Points; high; W1/W2 |
| Card draft service/API `lib/fusion/card/draft.ts`, `/api/card/draft` | replaces V1 direct public save; draft row → canonical mutable draft | Revision conflict detection and separation are strong | KEEP | BrandKit compatibility; high; W1 |
| Ordinary Card publication | V1 Save/public coupling replaced by absence; no authority → immutable published Card revision | Saved work cannot reach customer through ordinary Studio | REPLACE | draft, renderer, snapshot migration; critical; W1 |
| Generic Card `PublicationSnapshot` | post-V1 history; pre-save history → published-revision/rollback support | “Pre-save” snapshots can masquerade as publications | REWIRE | canonical publish; high; W1/W7 |
| View-only Card Preview | post-V1; saved draft → saved-draft Preview | Clear and useful | KEEP | draft service, renderer; medium; W1 |
| Embedded Card Preview | post-V1; in-memory config → working-draft Preview | Immediate cause/effect is correct | KEEP | builder transaction; medium; W4 |
| Signed Live Device Preview | post-V1; preview token payload → safe temporary draft projection | High-value extension, separate from public | KEEP | tokens/security/provider base URL; medium; W4 |
| Adaptive Card authoring shell | post-V1; shell session + builder → one task shell around canonical draft | Strong focus/Preview UX; state duplication needs reduction | REWIRE | builder API bridge, return context; high; W2/W4 |
| Card outline reorder/visibility/lock | extends V1; Card JSON → canonical property/object state | Direct manipulation supports preservation law | KEEP/REWIRE | authority metadata; medium; W4 |
| Nested inspector panel stacks | post-V1; panel-local organization → consolidated contextual groups | Ordinary controls require unnecessary depth | MERGE | selected-object contract; medium; W4 |
| Creative composition canvas/renderer | post-V1; composition block → shared creative document node | Valuable advanced capability when it does not replace direct editing | KEEP | Assets, history, shared renderer; medium; W4/W6 |
| Undo/Redo hooks and labels | post-V1; session histories → one transaction history per document | Valuable, but multiple independent histories can diverge | MERGE | document state; high; W3/W4 |
| `BrandKit` core | V1 Brand defaults extended; BrandKit → approved reusable defaults | Correct canonical Brand store | KEEP | Business Knowledge, Assets; high; W3 |
| `BrandPropertyDecision`/locks | post-V1; approval model → Brand governance/provenance | Valuable approval/lock extension | KEEP/REWIRE | property contract; medium; W3 |
| `BrandInheritanceState` | post-V1; session copy labeled linked → adapter into canonical property contract | Honest comments but misleading mode name and nondurable behavior | MERGE | PS, persistence; critical; W3 |
| `PropertyStack` visual resolver | post-V1; layered transient state → canonical resolver engine | Deterministic resolver is worth preserving | REWIRE | serialized provenance; critical; W3 |
| Brand inheritance bar | post-V1; session explanations → current value/source/link/lock/save UI | Useful UI foundation; copy must not look like durable link | REWIRE | unified contract; high; W3 |
| Business direct fields | V1 fact source → canonical approved Business/Location facts | Remain necessary truth/fallback | KEEP | Knowledge reconciliation; high; W3 |
| Business Knowledge models/services | post-V1; proposals/approval → canonical fact provenance | High-value extension | KEEP | onboarding/prefill; medium; W3 |
| Website discovery | post-V1; candidate facts → proposal-only source | Correct when never authoritative | KEEP | Knowledge approval; medium; W3 |
| Intelligent prefill | post-V1; eligible empty field → proposal/copy with durable provenance | Useful but loses source after flattening | REWIRE | property contract; high; W3 |
| MediaAsset/shared browser | replaces V1 per-editor convenience; media row → durable Asset truth | Strong cross-surface source of truth | KEEP | storage/providers/rights; high; W6 |
| Legacy MediaPicker/local convenience state | V1 path retained; editor local → shared Asset browser adapter | Duplicates durable media authority | MERGE | Asset browser callers; medium; W6 |
| CreativeResource/reusable designs | post-V1; reusable visual revisions → reusable-design truth distinct from media | Valid if boundary remains clear | KEEP/REWIRE | MediaAsset, composition; medium; W6 |
| Campaign template/create service | V1 spine; template → Campaign DRAFT | Proven direct workflow | KEEP | limits/Brand copy; critical; W1 |
| CampaignEditor block/content path | V1 spine expanded; local blocks → Campaign row | Proven behavior plus shared authoring | KEEP/REWIRE | save endpoint/history; critical; W1/W6 |
| Campaign visual resolver/drawer | post-V1; PS layers → flattened Campaign theme | Valuable, same authority gap as Card | REWIRE | property contract; high; W3/W6 |
| `/api/campaigns/assign` content save | V1 endpoint overloaded; Campaign row → canonical Campaign command API | Works but hides save/assign/email responsibilities | REWIRE | compatibility clients; high; W1/W6 |
| Campaign lifecycle/actions | V1 spine; status row → explicit lifecycle service | Retain, clarify transition policy | KEEP/REWIRE | assignment/schedule/publication; critical; W1 |
| Device `ScheduleRule` | V1 scheduled Campaign path; rule → unified schedule projection | Proven for one Tap Point but overlaps groups/dates | MERGE | group slots/dates; critical; W1 |
| Campaign Groups/slots | V1 scheduled Campaign path; group slots → unified schedule projection | Valuable reuse/rotation | KEEP/REWIRE | resolver/status; critical; W1 |
| Campaign date fields | V1 path; dates → availability window in unified lifecycle | Useful if not mistaken for Email send schedule | KEEP/REWIRE | status/resolver; high; W1 |
| Resolver playable `DRAFT` | V1 legacy policy; status helper → published/approved eligible states only | Draft content may surface publicly | REPLACE policy | resolver migration/fixtures; critical; W1 |
| Email Authoring Workspace | V1 Email builder expanded; document history → first-class Email draft | Strong creative/Preview capability | KEEP/REWIRE | Email identity/property contract; high; W1/W6 |
| `Campaign.formSettings.emailResponse` | V1 storage; Campaign JSON → compatibility projection from Email entity | Overloads Campaign and blocks lifecycle growth | REWIRE | additive schema migration later; high; W6 |
| `/api/email/send` + provider gates | V1 explicit send extended; request/provider → governed Email delivery command | Valuable explicit gate; lacks durable delivery record | KEEP/REWIRE | consent/Demo/outbox; critical; W1/W6 |
| Email schedule/delivery history | missing → first-class governed lifecycle | Required V1 baseline claim is currently incomplete | REPLACE/CREATE LATER | data model approval; critical; W1/W6 |
| Reply routing/inbound Email | post-V1; reply models → governed communications extension | Valuable and independent of core draft rescue | KEEP | providers/consent; medium; W6 |
| DeviceSlot operational model | V1 Tap Point authority → compatibility projection | Proven but legacy naming/model | REWIRE | TapPoint migration; high; W1/W2 |
| TapPoint/TapPointAddress | post-V1; bridge fallback → canonical entry-point identity/address | Intended authority | KEEP/REWIRE | resolver/assignment migration; high; W2 |
| TapEvent/ClickEvent recording | V1 Tap Trace function → immutable trace facts with revision context | Proven operational evidence | KEEP/REWIRE | deletion/attribution; critical; W1 |
| Legacy Analytics route | V1 display → Tap Trace history/compatibility alias | Valuable metrics but wrong final IA | MERGE | Insights; medium; W1 |
| Insights/TapProof | post-V1 analysis → derived analysis over Tap Trace | Strong evidence/provenance extension | KEEP | trace source; medium; W1/W6 |
| Lead model/list | V1 capture → event/compatibility projection into Contact | Proven capture, not correct person authority | REWIRE | Audience migration; high; W6 |
| Contact/Relationship/Consent | post-V1 → canonical Audience authority | Valuable normalized core | KEEP | reconciliation; high; W6 |
| TapSave/MyTap | post-V1 retention around Card | High-value product extension | KEEP | Audience/Card; medium; W6 |
| Mock Wallet adapter | post-V1; fixture preview → explicit mock-only retention option | Useful for Demo if unmistakable | KEEP/INTERNAL ONLY | live wallet later; low; W6 |
| Offer Campaign authority + Card projection | post-V1; Campaign facts/Card presentation → same intended contract | Sound fuse pattern when enforced | KEEP/REWIRE | publication/projection freshness; high; W6 |
| Journey runtime | post-V1; Journey models → multi-step Experience authority | Valuable, must not replace Card/Campaign | KEEP | effects/policy; medium; W6 |
| TapCanvas | post-V1; Canvas graph → planning authority with explicit promotion | Valuable but broad | KEEP/REWIRE | Journey/Campaign projections; medium; W6 |
| TapCast/TikTok | post-V1 distribution → channel variants under governed Campaign/Experience | Useful later, not core rescue | UNKNOWN | product naming/provider readiness; medium; after W6 |
| Ask safety policy | post-V1 AI replacement; deterministic guard → shared proposal policy | Correct foundation | KEEP | proposal contract; high; W5 |
| Ask global UI | post-V1; local preview/no host → interactive proposal client | Success copy without action | REPLACE | shared proposal/mutation API; critical; W5 |
| Ask Card host empty Apply | post-V1; no-op → exact Card draft mutation | Misleading and potentially undoes unrelated edits | REPLACE | Card transaction/Undo; critical; W5 |
| Autopilot proposal/governance | post-V1 AI replacement; proposal row → background proposal authority | Valuable governed extension | KEEP/REWIRE | shared proposal vocabulary; high; W5 |
| Workspace context/menu | post-V1 governance; selected Business → canonical Studio context | Correct foundation | KEEP | return context; high; W2 |
| Control Room identity/permissions | post-V1 → platform governance authority | Strong and correctly separated | KEEP | auth/Clerk; critical; W0/W2 |
| View as User | post-V1 → read-only diagnosis | Correct law-aligned behavior | KEEP | mutation blocking; high; W2 |
| Support Session | post-V1 → governed exceptional impersonation | Correct law-aligned safety | KEEP | audit/expiry; high; W2 |
| OpenWorkspaceInStudio | post-V1; Workspace switch + safe section return → as-self operation plus exact allowlisted record/task return | Entry and section return work; exact Demo record/task does not | REWIRE | Studio shell/Control route; high; W2 |
| Demo safety/readiness | post-V1 → server-enforced Demo policy | Strong governance | KEEP | fixtures/providers; critical; W7 |
| DemoPublication immutable manifest | post-V1 → canonical Demo revision | Correct lifecycle | KEEP | Card publish/sanitization; critical; W7 |
| LandingDemoBinding | post-V1 → canonical landing pointer | Correct immutable binding/rollback | KEEP | public endpoint/approval; critical; W7 |
| Legacy LandingDemoSlot/services | V1/older marketing path → compatibility only then removal | Competes with canonical binding | RETIRE | migrate public landing consumers; high; W7 |
| `Campaign.isLandingDemo` publication path | V1/older mutable Demo → none after migration | Confuses Campaign and Demo Card authority | RETIRE | editor controls/landing APIs; high; W7 |
| Platform audit/approvals | post-V1 → consequential governance | High-value safety | KEEP | action coverage; high; W0/W7 |
| Studio authoring audit coverage | partial → revision/event record at save/publish/apply | Inconsistent evidence across surfaces | REWIRE | canonical commands; medium; W1/W5/W6 |
| Feature flags/entitlements/permissions/restrictions | post-V1 layered controls → one explained effective decision | Layers valid, composition/copy fragmented | MERGE presentation/decision facade | Control + Studio authz; high; W2 |
| Public landing V2 components | post-V1 marketing → consume canonical bound real Card | Valuable presentation, premature before loops work | REWIRE | Demo binding/core proof; medium; W8 |

## Highest-risk decisions

1. Do not remove `BrandKit.tapCard` until a revision-backed public Card resolver is live and backward compatible.
2. Do not collapse Campaign scheduling by deleting either rules or groups before fixture replay identifies every active use.
3. Treat existing local document values as Custom during linkage migration unless provenance proves Linked.
4. Disable misleading Ask Apply before exposing a new proposal engine; do not preserve success theater for compatibility.
5. Retire legacy landing Demo paths only after every landing consumer reads `LandingDemoBinding` and rollback is proven.
6. Add Email lifecycle authority additively; never discard `formSettings.emailResponse` until compatibility projection is verified.

## Runtime disposition adjustments

The isolated certification changes confidence, not the implementation dispositions:

- V1 Card, Campaign, scheduled Campaign, Tap Trace, and Email rows are runtime-proven and remain the mandatory parent workflows.
- Current Campaign/Group scheduling and Email provider blocking are runtime-equivalent or safer; keep their extension value.
- Current Card draft durability is runtime-proven, but `tapCardDraft` → ordinary published Card is still missing. `Ordinary Card publication` therefore remains **REPLACE / critical / W1**.
- Current full suite is 909/909, including 9/9 database durability subtests. This does not convert unit/integration coverage into missing Owner publication behavior.
- Screenshot/recording proof is blocked; matrix classifications requiring visual interaction remain conditional.
