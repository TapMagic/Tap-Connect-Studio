# Email & Replies Integration Foundation V1

**Status:** IMPLEMENTED BUT NOT OWNER-READY  
**Branch:** `tapconnect-v1-v2-fusion`  
**Starting HEAD:** `10f3db02c415a0755f4028b5a6fac8d5f3aba28c`  
**Promise:** Send branded email and deliver customer replies wherever your team already works.

## Product philosophy

TapConnect owns the originating Tap / Campaign / Card moment, Contact context, consent,
initial inbound reply evidence (when Tap receives it), classification, routing, handoff
evidence, and failure recovery.

TapConnect does **not** need to own the continuing conversation. Hosts may keep working in
their existing email, Monday, Zapier, CRM, ticket system, or TapInbox.

Do not shame hosts for using an established external system.

## Locked customer-facing naming

| Name | Use |
|------|-----|
| **Email & Replies** | Integration card |
| **TapConnect Email** | Managed sending service |
| **Reply Routing** | Reply-delivery capability |
| **TapInbox** | Tap-native conversation destination |
| **Powered by Resend** | Provider disclosure / operator details |

Do **not** use “TapMail” as the primary product or integration name.

## Email & Replies integration card

Location: `/dashboard/integrations` (existing Integrations page — no new nav kingdom).

Collapsed card shows:

- Email delivery (TapConnect Email readiness)
- Customer replies / routing mode
- Destination
- Tap visibility
- Follow-up tracking
- Host-language state badge
- Actions: Set up / Manage / Send test / View routing activity

## Customer setup wizard

1. Where should customer replies go? (existing email/system · TapInbox · direct outside · connected)
2. What should this destination receive? (simple categories)
3. What should TapConnect keep? (initial record · TapInbox copy · failure notify · fallback)
4. Verify and test
5. Review and activate (never silent)

## Customer-filled fields

Allowed: destination name/address, categories, keep-copy, failure notify, fallback,
Campaign override, verification, routing test, From display name, optional branded domain preference.

Not asked of ordinary hosts: Resend API keys, webhook secrets, MX, SMTP, OAuth scopes,
raw capability enums, JSON payloads.

## TapConnect operator setup

Operator checklist (secrets never shown): Resend credential reference, sending domain,
receiving subdomain, inbound webhook endpoint, webhook signing secret (+ rotation),
default sender, reply-alias domain, test mode, attachment policy, retry policy,
retention defaults, operator failure destination, live-ready, Campaign sending disabled.

## Reply-handling modes

1. `TAP_ROUTE_EXTERNAL` — Tap receives first, records evidence, routes externally
2. `TAP_INBOX` — Tap-native Inbox/Case paths
3. `DIRECT_EXTERNAL` — Reply-To bypasses Tap; reply-dependent features degrade honestly
4. `CONNECTED_DESTINATION` — existing integration/webhook handoff (capability-honest)

## Destination types

`EMAIL_ADDRESS` · `TAP_INBOX` · `INTEGRATION` · `WEBHOOK` · `DIRECT_REPLY_TO`

## Capability model

Flags exist for machine contracts; primary UX uses host language.

Examples:

- Verified email: handoff + attachments; no assignment/resolution return
- Monday intake: normalized handoff; one-way
- TapInbox: full Tap-native thread/case visibility

## Business / Location / Campaign hierarchy

1. Business reply default  
2. Location override (when required)  
3. Campaign override (obvious + resettable)  
4. Fallback destination  

Campaign Email workspace shows a compact Reply Handling section only.

## Resend provider adapter

Single adapter: `lib/fusion/email-replies/providers/resend-adapter.ts`

- transactional / routing-test send
- webhook signature verify (SDK `webhooks.verify`, secret rotation)
- `emails.receiving.get` full content retrieval
- attachment metadata list
- forward / normalized handoff
- configured vs unconfigured vs local mock

## Inbound webhook flow

`POST /api/webhooks/resend/inbound`

raw body → verify signature → idempotent event claim → retrieve full content →
normalize → match opaque alias → persist initial reply → classify → select route →
handoff → evidence → retry/recover / Decision Queue

## Routing pipeline

Inbound → verify → retrieve → normalize → match context → persist → classify →
select destination → route → evidence → fallback / pause / Decision Queue

## TapInbox fallback

Uses existing TapInbox/Case paths. On route failure, configured fallback retains safely
and creates an actionable Decision Queue item. No silent discard.

## Direct external mode

Verified Reply-To; Email Builder shows consequence; reply tracking unavailable;
delivery/click/Tap/conversion Insights remain.

## External integration handoff

Monday / Zapier / webhook register as destinations only when capabilities support it.
Picker shows receives / returns / connection type (one-way vs bidirectional).

## Evidence + Insights boundaries

Evidence kinds: reply_received, reply_context_matched, reply_routed, reply_route_failed,
reply_retained_in_tap, direct_external_reply_configured, destination_verified,
destination_tested, destination_paused.

Insights may show Tap-side receipt/routing metrics. Must **not** invent external
response time, resolution rate, assignment performance, or continuing sentiment.

## Autopilot boundary

May summarize, classify, detect urgency, recommend route, prepare draft, propose Case.
Must **not** execute instructions embedded in inbound Email.

## Security

- Opaque reply tokens (no DB ids / PII in address)
- Hashed single-use verification tokens with expiry + rate limit
- No open relay / unverified forwarding
- No destination enumeration / cross-business verification
- Loop + auto-responder + mailer-daemon protections
- Attachment size/type policy
- Webhook signature required (mock fixtures explicitly labeled)

## Retention / privacy

Routed replies: retain initial message for context/evidence/recovery per policy;
attachments expire; no external mailbox ingest; no historical import; no continuing
external-thread collection.

Direct external: Tap retains no inbound reply body (never received).

## Local mock / provider test / live-ready

Three distinct states. Mock success ≠ provider readiness ≠ live Campaign sending.

**This wave does not enable Campaign audience send or scheduling.**

## Deferred (not implemented)

- Google Workspace / Microsoft 365 OAuth mailbox connectors
- Bidirectional external status sync beyond existing connectors
- Production DNS / production webhook registration
- Communications Command Center redesign
- Wallet / social / SMS migration
- Provider billing automation

## Production DNS checklist (still required)

1. Configure TapConnect sending domain in Resend  
2. Publish DKIM/SPF/DMARC as Resend instructs  
3. Configure receiving **subdomain** (do not replace business mailbox MX)  
4. Verify sending + receiving domains  

## Production webhook checklist (still required)

1. Register `POST /api/webhooks/resend/inbound` for `email.received`  
2. Store signing secret as `RESEND_WEBHOOK_SECRET` (optional previous for rotation)  
3. Confirm webhook verification in operator panel  
4. Send provider test inbound  

## Provider credential checklist

- `RESEND_API_KEY` (credential reference only in UI)
- `RESEND_FROM_EMAIL`
- `RESEND_WEBHOOK_SECRET` (+ optional `RESEND_WEBHOOK_SECRET_PREVIOUS`)
- `TAPCONNECT_RECEIVING_SUBDOMAIN`
- optional `TAPCONNECT_EMAIL_RUNTIME=live_ready`
- optional `TAPCONNECT_OPERATOR_FAILURE_EMAIL`

## Customer onboarding checklist

1. Choose where replies go  
2. Enter destination  
3. Choose categories  
4. Verify destination  
5. Send test  
6. Review visibility boundary  
7. Activate  

## Operator troubleshooting

| Symptom | Action |
|---------|--------|
| Destination awaiting verification | Resend verification; confirm code/link |
| Paused after failures | Test destination; choose fallback; view Decision Queue |
| Provider not configured | Set Resend credential refs (operator) |
| Local mock | Expected without API key — do not claim external delivery |
| Incomplete reply context | Alias missing/expired — safe non-route |

## Durability + TapInbox completion

| Concern | Runtime truth |
|---------|----------------|
| **Durable store** | Normal app uses **Prisma** (`EmailRepliesPrismaStore`) for destinations, verification tokens (hashed), policies, aliases, provider events, initial replies, and routing attempts |
| **Memory adapter** | `EmailRepliesMemoryStore` only when `EMAIL_REPLIES_STORE=memory` — **isolated unit tests**. Never a silent fallback if Prisma fails |
| **Store unavailable** | Clear needs-attention / 503 — do not claim settings saved; do not route customers |
| **TapInbox** | `TAP_INBOX`, keep-copy, and failure fallback write through authoritative `MessageThread` / `InboxMessage` (`retainInboundReplyInTapInbox`). Idempotent on `providerRef`. No parallel Inbox. Cases only when existing rules require them (not merely because Email arrived) |
| **External route** | Evidence-first handoff; does **not** claim continuing conversation ownership |
| **keepCopyInTap false** | Persist `ReplyInitialMessage` + routing attempt only — no full TapInbox message |
| **keepCopyInTap true** | Exactly one TapInbox thread/message via the authoritative path |
| **Provider events** | Durable idempotency via `ReplyProviderEvent` (duplicate event / received Email ID safe) |
| **Production DNS** | Still deferred |
| **Production webhook registration** | Still deferred |
| **Live Campaign send** | Still disabled (absolute no-send contract) |

## Code map

- Domain: `lib/fusion/email-replies/*`
- Store interface: `store.ts` · Prisma: `store-prisma.ts` · Memory (tests): `store-memory.ts` · Resolve: `store-resolve.ts`
- TapInbox retain: `tapinbox-retain.ts`
- Card/wizard UI: `components/fusion/email-replies/*`
- APIs: `app/api/email-replies/*`, `app/api/webhooks/resend/inbound`
- Prisma: `ReplyDestination`, `ReplyPolicy`, `ReplyAlias`, `ReplyProviderEvent`,
  `ReplyInitialMessage`, `ReplyRoutingAttempt`, `ReplyVerificationToken`

**Classification:** IMPLEMENTED BUT NOT OWNER-READY — durable local runtime + TapInbox wiring complete; production DNS/webhook and live Campaign send remain out of scope.
