# Environment Readiness Matrix

| Area | Ready without secrets? | Needs live credentials? | Admin gate |
|------|------------------------|-------------------------|------------|
| Feature Registry | Yes | No | Platform + Workspace |
| Attribute contracts / Format UI | Yes | No | — |
| Block library | Yes | No | Per-pack entitlements later |
| R2 media upload | Contracts yes | Yes for live upload | Integrations |
| Stock (Pexels/Unsplash) | Mocks yes | Yes | Integrations |
| Logo.dev | Fallback search yes | Token for enhancement | Integrations |
| Clerk auth | Dev bypass exists | Yes for real users | — |
| OpenAI / Autopilot | Mock recipes yes | Yes | Feature + budget |
| Resend email | Mock yes | Yes + domain | Communications |
| Stripe billing | Domain + UI yes | Yes for charges | Billing |
| Wallet | Schema/UX yes | Apple/Google certs | Wallet feature |
| Meta messaging | Adapter stubs yes | App review + tokens | Guardian + feature |
| monday.com etc. | Contracts yes | OAuth apps | Connector certification |

Never commit real secrets. Use `.env.local` only.
