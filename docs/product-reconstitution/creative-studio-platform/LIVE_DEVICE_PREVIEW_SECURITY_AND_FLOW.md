# Live Device Preview — Security and Flow

Status: repair candidate — human verification required.

## Flow

Preview draft → Live device → QR → scan from phone → read-only draft preview.

## Local development URL

QR must not contain `localhost`.

Generate a phone-attempt LAN URL using the **actual Studio request port** (never a hardcoded default like 3050):

`http://<local-ip>:<runtime-port>/preview/live/<signed-token>`

Example: if Studio is served on `localhost:3067`, the QR host must be `LAN-IP:3067`.

### Reachability semantics (honest)

| Kind | Meaning |
| --- | --- |
| `locally_unreachable` | Loopback / invalid — do not show a successful phone QR |
| `lan_candidate` | Private IP + correct port — suitable to *attempt* on same Wi-Fi |
| `configured_public_candidate` | Non-loopback configured URL (e.g. tunnel) — candidate only |
| Physical verification | Only after a real phone opens Follow/Freeze/Refresh/Revoke |

`reachableForPhone` means “phone-attempt candidate,” not “tunnel proven alive.” Studio does **not** probe arbitrary remote hosts for liveness. A stale Cloudflare tunnel may still fail on the phone until refreshed — that is fail-soft candidacy honesty, not a closed liveness proof.

## Session controls

- Same Wi-Fi guidance  
- Short-lived signed token  
- Read-only access  
- Expiry  
- Revoke  
- Refresh  
- Copy link  
- Open in new tab  
- Current draft revision  
- Last save time  
- **Follow saved draft** — phone refresh shows latest saved draft  
- **Freeze current revision** — phone stays on selected snapshot after desktop changes  

## Safe vs simulated actions

Safe preview actions may include: URL, Call, SMS, Email, Directions, Save contact.

Simulate or disable: payments, Coupon redemption, Wallet issuance, Ticket validation, Form submission, Campaign execution, automated messaging.

## Security invariants

The token must never grant:

- editor access;
- dashboard access;
- API write;
- database access;
- Operations access.

Signed payload includes workspace/card identity, revision mode (follow|freeze), expiry, and nonce. Revocation invalidates the token immediately. Expiry rejects after deadline.

## Proof

Signed-token unit tests; follow/freeze/revoke/expiry tests; Playwright Live Device drawer; LAN evidence or truthfully documented blocker if no phone/LAN available.
