# TapConnect Platform Control Room Foundation

## Scope and safety boundary

This foundation adds a protected internal control plane at `/control`. It was built and verified only with deterministic local identities, fixture data, and an isolated local PostgreSQL database. It does not merge, deploy, contact customers, send Email or Campaigns, access production data, move money, assign production Tap Points, or publish outside the governed Demo policy.

Production authentication fails closed when Clerk is not configured. Local authentication is available only when `TAPCONNECT_DEV_AUTH=1` and `DATABASE_URL` points to localhost.

## Architecture

- Identity: Clerk is the production authenticator. TapConnect stores immutable `clerkId` bindings and governs authorization independently. The local adapter provides Rich, Daniel, and an unauthorized visitor fixture.
- Authorization: granular role permissions plus direct permissions, with environment, business, start, and expiry scopes. Any applicable `DENY` overrides every `ALLOW`, and the snapshot explains each source.
- Tenancy: businesses explicitly distinguish customer, internal, personal sandbox, Demo, partner, and test-fixture workspaces.
- Entitlements: effective access is `plan entitlements + active add-ons + active administrator overrides - active restrictions`, followed by dependency checks. Every manual layer records source, actor, reason, billing impact, and expiry.
- Support: View as User is read-only and never creates a subject session. Support Sessions retain the administrator actor, require a reason and expiry, show a permanent banner, audit activity, and block sensitive actions.
- Demo: Demo workspaces carry fixture provenance and server-side blocks for sends, payments, refunds, production imports, and production Tap Point assignment. Publications are immutable Card snapshots.
- Public binding: `GET /api/public/demo-card/[slotKey]` returns only the active immutable Demo revision or an explicit unbound fallback, with cache and ETag headers. Private keys are stripped recursively.
- Governance: privileged mutations use same-origin checks, server authorization, reason capture, consequence previews, append-only audit events, and separation-of-duties approvals.

## Role templates

The bootstrap creates Platform Owner, Platform Operator, Administrator Manager, Business Administrator, Billing Administrator, Support Specialist, Demo Manager, Auditor, Read-Only Analyst, and Security Administrator. Platform Owner is protected and cannot be casually retired or assigned through ordinary role workflows.

## Internal fixture topology

- Separate workspaces: TapConnect, The Monkey Cage, and I Promote That.
- Private sandboxes: one each for Rich and Daniel, with ordinary cross-sandbox access denied.
- Shared Demo portfolio: TapConnect Core Demo plus governed private-to-shared promotion.
- Rich: Platform Owner and the expected local internal memberships.
- Daniel: Platform Operator + Demo Manager, scoped memberships, and an explicit direct denial for `entitlements.unlimited_grant`.

## Owner acceptance matrix

Evidence labels: `UI` is the serial Playwright walkthrough, `DOMAIN` is the 22-test Control Room policy suite, `DB` is fresh migration/drift proof, and `BUILD` is TypeScript/lint/production compilation.

| # | Acceptance | Result | Evidence |
|---:|---|---|---|
| 1 | Unauthorized `/control` rejection | PASS | UI |
| 2 | Platform Owner entry | PASS | UI |
| 3 | Daniel receives only granted Control Room areas | PASS | UI + DOMAIN |
| 4 | Rich and Daniel individual profiles/fallbacks | PASS | UI |
| 5 | Invitation create, fixture-send, accept, revoke, expire | PASS | UI |
| 6 | Acceptance binds immutable identity | PASS | UI + DB |
| 7 | Optional personal sandbox creation | PASS | UI |
| 8 | Role create, clone, compare, assign, retire, migrate | PASS | UI surfaces + DOMAIN |
| 9 | Permission source explanation | PASS | UI + DOMAIN |
| 10 | Deny overrides allow | PASS | UI + DOMAIN |
| 11 | User directory search/filter | PASS | UI |
| 12 | Session view/revoke | PASS | UI surface + DOMAIN |
| 13 | Sign-in suspend/restore | PASS | UI surface + DOMAIN |
| 14 | User archive/restore | PASS | UI surface + DOMAIN |
| 15 | User deletion schedule/cancel | PASS | UI surface + DOMAIN |
| 16 | Legal hold prevents deletion | PASS | UI surface + DOMAIN |
| 17 | Internal bootstrap is idempotent | PASS | DOMAIN + DB |
| 18 | Three internal businesses remain separate | PASS | UI + DB |
| 19 | Rich/Daniel fixture memberships | PASS | UI + DB |
| 20 | Each administrator has private sandbox | PASS | UI + DB |
| 21 | Cross-sandbox access is not casual | PASS | DOMAIN |
| 22 | Business membership/role changes | PASS | UI surface + DOMAIN |
| 23 | Targeted business capability restriction | PASS | UI surface + DOMAIN |
| 24 | Business suspend/restore | PASS | UI surface + DOMAIN |
| 25 | Business archive/restore | PASS | UI surface + DOMAIN |
| 26 | Governed business deletion workflow | PASS | UI surface + DOMAIN |
| 27 | Service catalog | PASS | UI + DB |
| 28 | Plan catalog | PASS | UI + DB |
| 29 | Effective entitlement calculation visible | PASS | UI + DOMAIN |
| 30 | Temporary capability grant | PASS | UI surface + DOMAIN |
| 31 | Expiring grants surfaced | PASS | UI + DOMAIN |
| 32 | Restrictions override capabilities | PASS | DOMAIN |
| 33 | View as User is read-only | PASS | UI |
| 34 | View as User shows effective access context | PASS | UI |
| 35 | Support reason/expiry required | PASS | UI + DOMAIN |
| 36 | Permanent Support Session banner | PASS | UI |
| 37 | Sensitive actions blocked in support | PASS | UI + DOMAIN |
| 38 | Support expiry/exit | PASS | UI + DOMAIN |
| 39 | Shared Demo Portfolio | PASS | UI |
| 40 | Private Demo submit/promote | PASS | UI |
| 41 | Demo clone | PASS | UI |
| 42 | Demo reset | PASS | UI |
| 43 | Demo send/payment/import policy | PASS | UI + DOMAIN |
| 44 | Demo Card preview/payload inspection | PASS | UI |
| 45 | Demo revision publish | PASS | UI |
| 46 | Demo revision rollback | PASS | UI surface + DOMAIN |
| 47 | Published Demo Card landing binding | PASS | UI |
| 48 | Binding inspect/activate/rollback/remove | PASS | UI |
| 49 | Public payload read-only and safe | PASS | UI + DOMAIN |
| 50 | Overview uses real Control Room state | PASS | UI |
| 51 | Authorized global search | PASS | UI surface + DOMAIN |
| 52 | Palette prepares, never auto-executes danger | PASS | UI + DOMAIN |
| 53 | Privileged actions append audit records | PASS | UI + DB |
| 54 | Approval prevents self-approval | PASS | DOMAIN |
| 55 | Desktop and 390px usability | PASS | UI |
| 56 | Keyboard navigation/focus | PASS | UI |
| 57 | Zero tested axe violations | PASS | UI |
| 58 | No publication outside Demo policy | PASS | audit review + scope |
| 59 | No Email/Campaign/payment/refund/contact/production/merge/deploy | PASS | execution boundary |

## Verification commands

```text
npm run test:control
DATABASE_URL=<isolated-local-db> npm test
npx tsc --noEmit
npx eslint app/api/control app/api/public/demo-card app/control components/control lib/control e2e/control-room.spec.ts proxy.ts next.config.ts
npx prisma format
npx prisma validate
npx prisma generate
DATABASE_URL=<fresh-isolated-local-db> npx prisma migrate deploy
DATABASE_URL=<fresh-isolated-local-db> npx prisma migrate status
DATABASE_URL=<fresh-isolated-local-db> npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
DATABASE_URL=<isolated-local-db> TAPCONNECT_DEV_AUTH=1 NEXT_DIST_DIR=.next-control-build npm run build
BASE_URL=http://127.0.0.1:3011 npm run test:control:e2e
```

## Human verification boundary

The in-app Browser connector reported no available browser instance, so the visible walkthrough used the repository Playwright/Chromium harness and generated screenshots. The Owner must still make the final verification decision. Production Clerk credentials, real administrator invitations, and any staging or production execution remain intentionally unperformed.
