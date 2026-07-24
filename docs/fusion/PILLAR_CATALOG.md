# Pillar Catalog

Every pillar is designed and wired into the product graph. Activation is Admin/feature-registry controlled.

| Pillar | UX home (Studio IA) | Domain owner | Default maturity |
|--------|---------------------|--------------|------------------|
| V1 Card Builder + blocks | Experiences | Card/Experience | GA (V1) |
| Campaigns / Groups / calendar / resolver | Experiences | Campaign | GA (V1) |
| Devices / Tap Points / Sets / Rotations / Scan | Tap Points | Devices | GA → expand |
| Brand Kit / media / templates / keyword Brand Pack | Assets | Assets | GA → expand (keywords alpha) |
| Contacts / Leads / Consent | Audience | Audience | GA → expand |
| Insights / analytics | Insights | Insights | GA → expand |
| TapSave / MyTap / retention | Audience + Card | Relationships | Defined → build |
| Wallet (Apple/Google) | Audience / Card | Wallet | Defined → provider-gated |
| TapSave Moments | Audience | Relationships | Defined |
| Email marketing | Audience / Experiences | Communications | In development |
| Messaging / ManyChat / Guardian | Audience | Communications | Defined |
| TapInbox / TapCase / TapGuide | Audience / Home | Service | Defined |
| TapCast / social | Experiences (Distribution) | Communications | Defined |
| TapLoop / loyalty / referrals | Audience | Loyalty | Defined |
| Purchase proof / TapCommerce | Experiences / Audience | Commerce | Defined |
| TapFlow / TapTrail / whiteboard | Experiences | Journey | Defined (Cody spine) |
| Autopilot / Automation Team | Home / Experiences | AI | Replace V1 AI |
| TapProof | Insights | Evidence | Defined |
| TapTrust | Tap Points / Admin | Security | Future readiness |
| TapSense | Runtime resolver | Selection | Future readiness |
| TapGraph | Insights / Tap Points | Placement | Future readiness |
| TapReach | Hidden until authorized | Marketplace | Future readiness |
| Pulse | Field PWA | Operations | Defined |
| Integrations / APIs / webhooks | Settings | Integrations | Expand |
| Billing / entitlements / Stripe | Settings + Platform Admin | Billing | Stripe-ready |
| Feature Registry / Admin control plane | Settings + Platform Admin | Platform | In development |
| Localization / collaboration / a11y | Cross-cutting | Platform | Defined |

## Relationship rules (defaults)

- **Campaign** owns the initiative; Distribution is a mode, not a competing browser.
- **Card** is the canonical living mobile channel; MyTap/Wallet are projections.
- **Tap Point address** is permanent and opaque; never rewrite devices for content changes.
- **TapSave** owns relationship; consent is channel-specific.
- **Channel Guardian** is deterministic — never an AI decision.
- New pillars must auto-register in the Feature Registry and gain Admin controls.
