# Creative Studio Rescue — Owner Punch List

**Classification:** `OWNER-READY CANDIDATE — VERIFICATION PENDING`

| ID | Item | Severity | Status |
|----|------|----------|--------|
| P2 | Physical-phone QR (reachability) | Critical | **PASS** (HTTPS tunnel) — not Verified overall |
| P2v | Visual fidelity Live Device vs Studio | Critical | **Fix shipped — pending Owner re-scan** |
| P2a | Direct LAN phone reachability | Critical | Blocked by AP/client isolation (network) |
| P2b | Temporary HTTPS tunnel | High | Active locally (not committed) |
| Composition / inspectors / automated proofs | — | Closed |

## Fidelity defect (root cause)

Live Device / Preview applied **stack** mobile fallback whenever the composition surface was narrow (`<420px`), while Studio edit always used freeform. Phone layout therefore dropped alignment, layering, and text-over-image.

## Fix

- Shared `CreativeCompositionCanvas` applies stack/hide only when `compositionForceMobile` is explicit
- Default fallback preference: **scale** (matches Studio)
- Live Device route loads `tap.css` + composition font loader
- Regression: `e2e/creative-studio-composition-fidelity.spec.ts`

## Owner re-scan

Use the **new** temporary HTTPS Live Device QR in Studio (Update phone preview first). Do not mark Verified until composition visually matches Studio.
