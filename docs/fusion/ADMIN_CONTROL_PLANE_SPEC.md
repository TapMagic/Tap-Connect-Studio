# Admin Control Plane Spec

## Two layers

### 1. Host / Workspace Admin (`Settings`)

Workspace, businesses, locations, members, roles, permissions, brands, plans, usage, enabled features, providers, channels, domains, privacy, retention, API clients, webhooks, import/export, notifications, workspace audits, defaults/overrides, agent permissions, approval policies.

### 2. TapMagic Platform Admin (`/admin/platform`)

All tenants, subscriptions, plans, entitlements, feature flags, providers, device inventory, Tap Points, provisioning, Campaign activity, communications, agents, AI usage, jobs, system health, audits, support access, security incidents, privacy requests, betas, release readiness.

Requires explicit internal roles, least privilege, reasoned access, time-limited support access, complete auditing.

## Feature Registry (authoritative)

Every feature/pillar/connector/pack registers:

stable id · name · description · pillar · domain owner · UX location · implementation status · maturity · default state · required plan · entitlement · dependencies · required providers/credentials/migrations/permissions/data policy · regions/surfaces/devices · rollout · analytics events · readiness/health checks · rollback · owner · docs · audit history

**Do not scatter unrelated booleans.** Use typed, versioned feature + entitlement system (`lib/fusion/features`).

Kill-switch-capable (authoritative set in `lib/fusion/features/kill-switch-matrix.ts`):  
`comms.messaging`, `comms.email`, `comms.inbox`, `wallet.apple_google`, `loyalty.taploop`, `commerce.tapcommerce`, `journey.tapflow`, `canvas.tapcanvas`, `ai.autopilot`, `ai.keywords`, `brand.vocabulary`, `tapcast.omnichannel`, `tapcast.tiktok`, `connectors.productivity`, `integrations.live_execution`.

### Expanded kill-switch coverage (beyond Keywords / TapCanvas / TapFlow)

| Feature id | Primary API probe | Off contract | Proof |
|------------|-------------------|--------------|-------|
| `comms.email` | `POST /api/email/send` | 503 `feature_off` | `P-admin-killswitch-matrix` |
| `comms.inbox` | `GET /api/inbox` (also disable `comms.email`) | 503 | same |
| `comms.messaging` | `GET /api/comms/suppression` (also disable email) | 503 | same |
| `wallet.apple_google` | `GET`/`POST /api/wallet` | 503 | same |
| `loyalty.taploop` | `GET /api/loyalty/programs` (+ award) | 503 | same |
| `commerce.tapcommerce` | `GET /api/commerce` | 503 | same |
| `tapcast.omnichannel` | `GET /api/tapcast?view=registry` | 503 | same |
| `tapcast.tiktok` | `GET /api/tapcast/tiktok` | 503 | same |
| `connectors.productivity` | `GET /api/connectors/productivity` | 503 | same |
| `ai.autopilot` | `GET /api/ai/proposals` | 503 | same |
| `integrations.live_execution` | `POST` connect `preferLive: true` (productivity + TikTok) | 503; mock remains when parent on | same |
| `ai.keywords` / `canvas.tapcanvas` / `journey.tapflow` | Keywords + canvas promote/activate | 503 | `P-keywords-*`, `P-tapcanvas-killswitch` |

Admin API: `POST /api/admin/features` with `{ featureId, enabled, scope: "global", reason }` — reason required; override audited.

### Keywords / Brand Vocabulary kill-switch hooks (for TapCanvas + TapFlow owners)

| Item | Value |
|------|--------|
| Primary runtime gate | `ai.keywords` — `/api/ai/keywords` returns **503** `{ code: "feature_off", feature: "ai.keywords" }` when disabled |
| Durable store feature | `brand.vocabulary` — dependency of `ai.keywords`; keep rows read-only when disabled |
| Admin API | `POST /api/admin/features` with `{ featureId: "ai.keywords", enabled: false\|true, scope: "global", reason }` |
| UI signals | Brand Kit `data-testid="keywords-feature-off-banner"`; panel `data-testid="keywords-panel-readiness"` shows `DISABLED — ai.keywords kill switch` |
| TapCanvas / TapFlow wiring | `bind_keyword_trigger` and KeywordsSuggestPanel use `checkFeatureGate("ai.keywords")` (same gate as Keywords API). Do **not** invent a parallel flag. |
| Proof | `P-keywords-owner-gate-killswitch` + `P-keywords-killswitch` in `e2e/keywords-*.spec.ts` |

## Feature states

Defined · In development · Internal only · Design Lab · QA · Alpha · Private beta · Public beta · GA · Paused · Degraded · Deprecated · Retired

## Activation actions (audited)

enable / disable / schedule / pause / resume / beta grant-remove / plan entitlement / support override / impact preview / rollback

Every change requires: authorization, reason, actor, timestamp, previous/new state, scope, impact estimate, audit record, rollback method. No silent activation.

## Readiness display

Ready · Ready with warning · Missing dependency · Provider disconnected · Credentials missing · Permission/Plan/Region blocked · Certification pending · Security blocked · Temporarily degraded

## Dashboard areas (Platform Admin)

1. Executive overview  
2. Revenue & Billing (Stripe-ready)  
3. Product adoption  
4. Tap Point & device fleet  
5. Campaign & distribution ops  
6. Audience & relationships  
7. Communications  
8. AI & agents  
9. Integrations & providers  
10. Platform operations  
11. Security, privacy, compliance  
12. Customer health & support  

Multi-view: table, list, cards, kanban, timeline, calendar, map, graph, funnel, cohort, dashboard, comparison, audit stream.

## Stripe boundary

Provider-neutral Billing domain + Stripe connector. Missing keys must not block schema, Admin UX, mocks, reconciliation design, entitlements. TapConnect remains authoritative for PlanVersion, entitlements, feature availability, capacity, AI credits. Never store raw card data.
