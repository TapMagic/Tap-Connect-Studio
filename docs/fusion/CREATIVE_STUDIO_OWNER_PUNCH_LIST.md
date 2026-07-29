# Creative Studio Rescue — Owner Punch List

**Classification:** `OWNER-READY CANDIDATE — VERIFICATION PENDING`

| ID | Item | Severity | Status |
|----|------|----------|--------|
| P0 | Fast-forward push rescue branch | Critical | **Closed** |
| P1 | Screenshot/video pack | High | **Closed** |
| P2 | Physical-phone QR scan | Critical | **PENDING** — not passed; LAN blocked by network path |
| P2a | Direct LAN phone reachability | Critical | **Blocked** — Mac self-LAN OK; phone cannot reach `192.168.2.24` (likely AP/client isolation) |
| P2b | Temporary HTTPS tunnel for phone verify | High | **Active (local only)** — Cloudflare quick tunnel; not committed |
| P5–P18 | Composition / inspectors / automated proofs | — | **Closed** (agent) |

## Diagnosis (concise)

- Bind: `*:3010` (all interfaces)
- Mac LAN IP: `192.168.2.24`
- macOS firewall: **disabled** (not the blocker)
- Mac → LAN Studio: **200**
- Phone → LAN: **unreachable** → treat as guest/client isolation or SSID/VLAN split (cannot change router from Studio)
- QR / UI URL match after tunnel retarget; HTTPS preview **200**, Draft / Not Published, no Clerk

## Owner scan now

Use the **tunnel** Live Device QR shown in Studio (or the Safari URL the agent displayed). Do not use the LAN `192.168.2.24` URL for the phone while isolation persists.

Tunnel is temporary — terminate after verification. Do not commit tunnel URLs or `.env.local`.
