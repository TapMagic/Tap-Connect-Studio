# Live Device Preview — Security and Flow

Status: repair candidate — human verification required.

## Flow

Preview draft → Live device → QR → scan from phone → read-only draft preview.

## Local development URL

QR must not contain `localhost`.

Generate a reachable LAN URL:

`http://<local-ip>:3050/preview/live/<signed-token>`

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
