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
