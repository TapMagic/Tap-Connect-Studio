# Provider Certification Checklist

A provider is **certified** only when all applicable boxes pass.

## Shared checklist

- [ ] OAuth/API app created (sandbox + prod plan)
- [ ] Redirect URIs documented
- [ ] Scopes least-privilege documented
- [ ] Webhook signature verification implemented
- [ ] Idempotent event handling
- [ ] Rate-limit + retry + dead-letter behavior
- [ ] Disconnect + credential revocation path
- [ ] Data deletion / retention policy mapped
- [ ] Admin connection UX + readiness states
- [ ] Feature Registry dependencies declared
- [ ] Audit events emitted
- [ ] Local mock/sandbox test evidence
- [ ] Security review notes (no secrets in logs)
- [ ] PO / Platform Admin certification recorded

## Fusion implementation status (2026-07)

| Domain | Contract | Admin UX | Mock when uncertified |
|--------|----------|----------|------------------------|
| Billing / Stripe | `lib/fusion/billing/*` | `/admin/platform` → Billing readiness | Mock checkout URL |
| Automation Team | `lib/fusion/autopilot/*` | Kill switch panel | Feature off + placeholder |
| Messaging | `lib/fusion/comms/*` | Channel Guardian tab | Guardian blocks send |
| Wallet | `lib/fusion/wallet/*` | Wallet blockers panel | Mock install URL |
| TapFlow | `lib/fusion/journey/*` | Journey editor | Draft-only save |
| Connectors | `lib/fusion/connectors/registry.ts` | Connectors tab | `connectorReady()` false |

## Per-provider rows

| Provider | Sandbox | Prod keys | Webhooks | Admin path | Feature id | Certified? | PO action |
|----------|---------|-----------|----------|------------|------------|------------|-----------|
| Clerk | ☐ | ☐ | ☐ | Settings → Integrations | — | ☐ | Prod keys + allowed origins |
| R2 | ☐ | ☐ | — | Integrations | — | ☐ | Bucket + public URL |
| Resend | ☐ | ☐ | ☐ | Integrations | `comms.email` | ☐ | Domain verify + from address |
| OpenAI | ☐ | ☐ | — | Platform → Automation Team | `ai.autopilot` | ☐ | Key + spend cap; enable feature |
| Stripe | ☐ | ☐ | ☐ | Platform → Billing readiness | `billing.stripe` | ☐ Architecture wired — needs keys + PO sign-off |
| Apple Wallet | ☐ | ☐ | ☐ | Platform → Wallet blockers | `wallet.apple_google` | ☐ | Pass certs in secure store |
| Google Wallet | ☐ | ☐ | ☐ | Platform → Wallet blockers | `wallet.apple_google` | ☐ | Issuer + service account |
| Meta Messenger | ☐ | ☐ | ☐ | Platform → Channel Guardian | `comms.messaging` | ☐ | App review + Page token |
| Instagram DM | ☐ | ☐ | ☐ | Platform → Channel Guardian | `comms.messaging` | ☐ | IG business account id |
| WhatsApp | ☐ | ☐ | ☐ | Platform → Channel Guardian | `comms.messaging` | ☐ | Cloud API + templates |
| Telegram | ☐ | ☐ | ☐ | Platform → Channel Guardian | `comms.messaging` | ☐ | BotFather + webhook |
| ManyChat | ☐ | ☐ | optional | Platform → Channel Guardian | `comms.messaging` | ☐ | Managed adapter API key |
| monday.com | ☐ | ☐ | ☐ | Platform → Connectors | `connectors.monday` | ☐ | OAuth app |
| Slack | ☐ | ☐ | ☐ | Platform → Connectors | — | ☐ | OAuth + bot scopes |
| GitHub | ☐ | ☐ | ☐ | Platform → Connectors | — | ☐ | OAuth app |
| Asana / ClickUp / Jira / Trello / Notion / MS Graph | ☐ | ☐ | varies | Platform → Connectors | — | ☐ | Per PO priority |

## PO certification sign-off template

```
Provider: _______________
Environment: sandbox | production
Certified by: _______________  Date: _______________
Evidence: (link to test run / screenshot / audit id)
Feature Registry toggles enabled: _______________
Rollback verified: yes / no
Notes:
```

Extend rows as adapters land. Stripe row moves to **Certified** only after: webhook map exercised in sandbox, no PAN storage confirmed, and `billing.stripe` enabled with audit reason.
