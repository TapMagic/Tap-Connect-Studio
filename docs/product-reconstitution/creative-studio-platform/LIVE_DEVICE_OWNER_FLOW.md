# Live Device Owner Flow

Status: assembly candidate — human verification required.  
Starting SHA: `54fada53deb351a8edc7081b3b1ac448bdd378ae`

## Product requirement

Live Device is an ordinary Preview feature — not an optional diagnostic.

Preview header always shows: **Desktop · Tablet · Phone · Live device**

## Owner loop

1. Open Preview.
2. Click Live device.
3. Panel **always** opens.
4. When LAN is reachable, QR is immediately visible.
5. Panel shows: link · LAN status · Same Wi-Fi guidance · Follow saved draft · Freeze revision · Refresh · Revoke · expiry.
6. Owner scans with phone (QR must not contain `localhost` or `127.0.0.1`).
7. Phone opens signed token route `/preview/live/[token]`.
8. Follow / Freeze / Refresh / Revoke work visibly.

## Security

| Rule | Implementation |
| --- | --- |
| Signed token | HMAC session in `lib/fusion/creative-studio/preview/tokens.ts` |
| Expiry | TTL + visible countdown |
| Revoke | Immediate invalidation |
| No silent localhost QR | `preview/url.ts` refuses loopback for QR payload |
| Draft-only | Live Device reads draft / frozen revision — never publishes |

## Automated acceptance (required, not conditional)

Fail when:

- Live Device control absent
- Panel absent after click
- QR absent when LAN reachable
- URL contains localhost / 127.0.0.1
- Token route unreachable
- Follow / Freeze / Revoke / expiry controls absent

**Forbidden:** `if (panel exists) { test it }` — the panel is required.

## Implementation anchors

| Piece | Path |
| --- | --- |
| Entry | `components/fusion/creative-studio/preview-toolbar.tsx` (`preview-live-device`) |
| Panel | `components/fusion/creative-studio/live-device-qr-panel.tsx` |
| Session API | `app/api/preview/card/session/route.ts` |
| Revoke API | `app/api/preview/card/revoke/route.ts` |
| Phone page | `app/preview/live/[token]/page.tsx` |
| Unit tests | `lib/fusion/creative-studio/preview/__tests__/tokens-and-url.test.ts` |
| E2E | `e2e/interaction-providers-starter-live.spec.ts` (must require panel) |

## Phone test disposition

Human verification required for physical scan. Automated suite proves control presence, QR payload shape, token route, and Follow/Freeze/Revoke UI. Physical scan result is reported separately in closeout.

## Prohibited during this pass

Production QR issuance for customer campaigns, Coupon redemption, Ticket validation, Wallet issuance, messaging, payments.
