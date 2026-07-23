# Product Owner Input Queue

**Branch:** `tapconnect-v1-v2-fusion`  
**Rule:** Only items that genuinely need PO information or authority. Ordinary charter-covered implementation choices are not listed.

---

## 1. Needed now

### PO-NOW-001 — Local Docker / Postgres runtime on this machine

| Field | Content |
|-------|---------|
| **Question** | Can Docker Desktop (or an approved local Postgres 16 on `127.0.0.1:5433` with DB `tapconnect_fusion_dev`) be installed/started on the build machine? |
| **Affected pillar** | Platform / all persistence pillars |
| **Why needed** | Agent shell currently has no `docker` binary; isolated DB cannot be started from this environment. Migrations, seed, and browser E2E persistence proof are blocked without it. |
| **Consequence of delaying** | OWNER-READY runtime verification cannot complete; work continues on code/tests/mocks only. |
| **Recommended answer** | Install Docker Desktop, run `npm run fusion:dev-db`, set `.env.local` `DATABASE_URL=postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev`. |
| **Other work can continue?** | Yes — contracts, UI, unit tests, mock adapters, Admin readiness. |
| **Blocking deadline** | Before any workflow can be classified **VERIFIED** or **OWNER-READY** for persistence. |

---

## 2. Needed before live-provider verification

### PO-LIVE-001 — OpenAI for Automation Team live path

| Field | Content |
|-------|---------|
| **Question** | Confirm OpenAI org/project and monthly budget ceiling for Automation Team (not the secret itself). |
| **Affected pillar** | Autopilot / Automation Team |
| **Why needed** | Live generation path requires `OPENAI_API_KEY`; budget/kill-switch policy for OWNER-READY Autopilot. |
| **Consequence of delaying** | Remains **VERIFIED BUT REQUIRES CREDENTIALS** (mock/proposal lifecycle still works when key present locally). |
| **Recommended answer** | Provide key via secure env store; set Studio+ plan + Admin kill switch; monthly soft cap in Admin. |
| **Other work can continue?** | Yes. |
| **Blocking deadline** | Before live Autopilot certification. |

### PO-LIVE-002 — Resend (or approved email) for live Email

| Field | Content |
|-------|---------|
| **Question** | Approve Resend (or alternate) as production email provider and domain for `RESEND_FROM_EMAIL`. |
| **Affected pillar** | Email / Channel Guardian |
| **Why needed** | Live send vs mock adapter. |
| **Consequence of delaying** | Email stays mock — **VERIFIED BUT REQUIRES CREDENTIALS**. |
| **Recommended answer** | Resend + verified sending domain; webhook secret later. |
| **Other work can continue?** | Yes. |
| **Blocking deadline** | Before live email certification. |

### PO-LIVE-003 — Apple / Google Wallet certification path

| Field | Content |
|-------|---------|
| **Question** | Confirm Apple Pass Type ID / Team ID and Google Wallet issuer account ownership for Tap Connect (not cert PEM contents in chat). |
| **Affected pillar** | Wallet |
| **Why needed** | Live issue/update/revoke. |
| **Consequence of delaying** | Mock lifecycle remains FUNCTIONAL; live = blocked. |
| **Recommended answer** | Supply via secure vault after business entity verification. |
| **Other work can continue?** | Yes. |
| **Blocking deadline** | Before live Wallet certification. |

### PO-LIVE-004 — Stripe billing mode

| Field | Content |
|-------|---------|
| **Question** | Confirm Stripe account mode (test vs live) and which products/prices map to BASIC/STUDIO/ENTERPRISE. |
| **Affected pillar** | Billing / Entitlements |
| **Why needed** | Stripe-ready domain needs product IDs for checkout. |
| **Consequence of delaying** | Billing readiness UI only. |
| **Recommended answer** | Start with Stripe **test** mode products; promote later. |
| **Other work can continue?** | Yes. |
| **Blocking deadline** | Before paid-plan checkout verification. |

---

## 3. Needed before staging

### PO-STG-001 — Staging hostname + Clerk instance

| Field | Content |
|-------|---------|
| **Question** | Staging URL and whether staging uses a separate Clerk application. |
| **Affected pillar** | Platform / Auth |
| **Why needed** | Correct redirect URLs and tenant isolation proof. |
| **Consequence of delaying** | Staging deploy blocked (not in scope until authorized). |
| **Recommended answer** | Separate Clerk staging app; dedicated staging DB (never Railway prod). |
| **Other work can continue?** | Yes. |
| **Blocking deadline** | Before staging environment bring-up. |

---

## 4. Needed before production

### PO-PRD-001 — Production credential vault + legal

| Field | Content |
|-------|---------|
| **Question** | Confirm vault location for all production secrets, privacy policy URL, and terms URL for consent copy. |
| **Affected pillar** | Privacy / Consent / Ops |
| **Why needed** | Channel Guardian + TapSave consent language and secret ops. |
| **Consequence of delaying** | Production cutover blocked. |
| **Recommended answer** | Use existing Tap The Magic legal pages if approved; secrets in Railway/vault only after explicit deploy authorization. |
| **Other work can continue?** | Yes until production authorization. |
| **Blocking deadline** | Before production go-live (explicitly out of scope until authorized). |

---

## 5. Optional commercial or branding decisions

### PO-OPT-001 — Default-on fusion features for new tenants

| Field | Content |
|-------|---------|
| **Question** | Which fusion features should be `defaultEnabled: true` for new Studio tenants at GA (TapSave, TapLoop, Autopilot, Inbox)? |
| **Affected pillar** | Admin / Entitlements |
| **Why needed** | Product packaging; not required for local OWNER-READY of each pillar. |
| **Consequence of delaying** | Defaults remain as registry currently sets; Admin can override. |
| **Recommended answer** | TapSave + Audience on; TapLoop/Inbox/Autopilot on for Studio+; Wallet off until certs. |
| **Other work can continue?** | Yes. |
| **Blocking deadline** | Optional — before GA packaging. |

---

## Consolidated later-supply list (no secret values)

When live verification is authorized, PO must supply via secure channel (never chat):

- OpenAI API key  
- Resend API key + from address + webhook secret  
- Stripe secret/publishable keys + webhook secret + price IDs  
- Apple Wallet: Team ID, Pass Type ID, certs, WWDR  
- Google Wallet: issuer ID, service account JSON  
- Meta / Instagram / WhatsApp / Messenger app IDs, secrets, tokens  
- Telegram bot token  
- monday.com + productivity OAuth client IDs/secrets + redirect URLs + scopes  
- Social publish app credentials (TapCast)  
- DNS records for sending/tracking domains  
- Business verification / app-review assets  
- Test accounts and (separately) production accounts  

---

*Last updated: 2026-07-23 — Docker unavailable on build agent; PO-NOW-001 is the only immediate infrastructure blocker.*
