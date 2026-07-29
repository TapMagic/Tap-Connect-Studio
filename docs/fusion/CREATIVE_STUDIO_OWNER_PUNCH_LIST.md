# Creative Studio Rescue — Owner Punch List

**Classification:** `IMPLEMENTATION IN PROGRESS`

| ID | Item | Severity | Status |
|----|------|----------|--------|
| P0 | Fast-forward push rescue branch | Critical | **Closed** |
| P1 | Screenshot/video pack | High | **Closed** |
| P2 | Physical-phone QR scan | Critical | **BLOCKED** — phone cannot reach LAN preview; QR **not** passed |
| P2a | LAN reachability from phone | Critical | **Owner action** — confirm phone on same Wi‑Fi / subnet as Mac `192.168.2.24` |
| P5–P18 | Composition / inspectors / automated Live Device proofs | — | **Closed** (agent) |

## LAN diagnosis (Mac-side, 2026-07-29)

- Wi‑Fi / en0 IP: `192.168.2.24`
- Listen: `*:3010` (all interfaces)
- `http://127.0.0.1:3010/dashboard/card/edit` → **200**
- `http://192.168.2.24:3010/dashboard/card/edit` → **200**
- `NEXT_PUBLIC_PREVIEW_BASE_URL` → `http://192.168.2.24:3010`
- Live Device draft URL refreshed; Mac HTTP **200**, draft banner, no Clerk
- QR test: **not passed**

## Owner steps before re-scan

1. Put the phone on the **same** Wi‑Fi network as the Mac (subnet `192.168.2.x`, router `192.168.2.1`). Turn off cellular data temporarily if needed.
2. In Safari type: `http://192.168.2.24:3010/`
3. If that loads, open the Live Device preview URL from Studio (or scan QR).
4. If step 2 fails, router client-isolation or wrong SSID — Studio cannot fix that in software.
