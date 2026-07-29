# Creative Studio Rescue — Owner Punch List

**Classification:** `OWNER-READY CANDIDATE — VERIFICATION PENDING`

| ID | Item | Severity | Status |
|----|------|----------|--------|
| P0 | Fast-forward push rescue branch | Critical | **Closed** |
| P1 | Screenshot/video pack | High | **Closed** |
| P2 | Physical-phone QR scan | Critical | **Owner action** — scan Live Device QR / `tmp/.../live-device/studio-ui-qr.png` on same Wi‑Fi |
| P5 | Related e2e | Critical | **Closed** |
| P13 | Interactive Composition Block | High | **Closed** |
| P14 | Frame / border / group inspectors | Medium | **Closed** |
| P15 | Draft update / expire / revoke | High | **Closed** |
| P16 | Extensible mask catalog | Medium | **Closed** |
| P17 | Group move-as-unit + anchors | High | **Closed** |
| P18 | Composition typography / background / Image Media stack | Medium | **Closed** |

## Owner verification gate

1. Open Studio Card edit on LAN `:3010`.
2. Walk composition: add block → frame/mask → text over image → layer → group → resize/move.
3. Open Live Device; confirm auto QR (no Generate ritual).
4. Scan QR on a physical phone (same Wi‑Fi); confirm draft / Not Published preview.
5. Update phone preview, then Revoke; return to edit with selection restored.

After those steps pass, classification may move to `OWNER-READY — VERIFIED`.
