# Environment Readiness Matrix

| Area | Ready without secrets? | Needs live credentials? | Live classification | Admin gate |
|------|------------------------|-------------------------|---------------------|------------|
| Feature Registry | Yes | No | — | Platform + Workspace |
| Attribute contracts / Format UI | Yes | No | — | — |
| Block library | Yes | No | — | Per-pack entitlements later |
| R2 media upload | Contracts yes | Yes for live upload | VERIFIED — CREDENTIALS REQUIRED | Integrations |
| Stock (Pexels/Unsplash) | Mocks yes | Yes | VERIFIED — CREDENTIALS REQUIRED | Integrations |
| Logo.dev | Fallback search yes | Token for enhancement | VERIFIED — CREDENTIALS REQUIRED | Integrations |
| Clerk auth | Dev bypass exists | Yes for real users | — | — |
| OpenAI / Autopilot / Keywords enhance | Local grounded / mocks yes | Yes | **VERIFIED — CREDENTIALS REQUIRED** | Feature + budget |
| Trend enrichment | Grounded only (no trend claims) | Yes — approved provider TBD | **VERIFIED — CREDENTIALS REQUIRED** | Keywords |
| TapCast mock ladder | Yes | No for mock | Mock ≠ live OWNER-READY | TapCast hub |
| TapCast live publish (per channel) | Registry yes | Yes — see `PROVIDER_READINESS.md` | **VERIFIED — CREDENTIALS REQUIRED** | TapCast + Integrations |
| Snapchat organic | Package/checklist yes | N/A organic | **MOCK ONLY / NO LIVE PUBLISH** | TapCast |
| Resend email | Mock yes | Yes + domain | **VERIFIED — CREDENTIALS REQUIRED** | Communications |
| Stripe billing | Domain + UI yes | Yes for charges | **VERIFIED — CREDENTIALS REQUIRED** | Billing |
| Wallet | Schema/UX yes | Apple/Google certs | **VERIFIED — CREDENTIALS REQUIRED** | Wallet feature |
| Meta messaging | Adapter stubs yes | App review + tokens + webhooks | **VERIFIED — CREDENTIALS REQUIRED** | Guardian + feature |
| monday.com etc. | Contracts yes | OAuth apps | **VERIFIED — CREDENTIALS REQUIRED** | Connector certification |

Never commit real secrets. Use `.env.local` only. Detail: `PROVIDER_READINESS.md`.
