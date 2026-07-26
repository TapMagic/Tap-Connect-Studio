# Card Fuse-Box Integration Wave

**Branch:** `tapconnect-v1-v2-fusion`  
**Starting HEAD:** `ae30d3a072576953fa3e025e64aa4b033e5ade44`  
**Date:** 2026-07-26  
**Scope:** Contract matrix · Card Action Registry · Support / Ask a Question · fuse-box honesty · authoring/format contracts · **Retention + Wallet UX correction**.  
**J1:** Remains **VERIFIED**.  
**Protected:** No push / merge / deploy / Railway / production cutover.

**Classification:** **IMPLEMENTED BUT NOT OWNER-READY — MOCK WALLET / MOCK CHANNEL**  
Live messaging / Resend / OpenAI / Apple Wallet signing = **VERIFIED — CREDENTIALS REQUIRED**.

---

## Delivered

| Item | Status |
|------|--------|
| `docs/fusion/CARD_FUSE_BOX_CONTRACT_MATRIX.md` | Done |
| `docs/fusion/AUTHORING_WORKSPACE_AND_FORMAT_CONTRACT.md` | Done |
| Card Action Registry (22 V1 + `support`) | Done |
| Feature `card.fuse.support` | Done |
| Public `/api/public/card/support` | Done |
| In-Card support form + Inbox suggested reply | Done |
| Card fuse-box panel (honest statuses) | Done |
| Authoring workspace shell (begin) | Done |
| **Keep this Card** primary CTA + retention chooser | Done |
| Honest Wallet customer states (Preview only ≠ Installed) | Done |
| MyTap: single Open Card; one Wallet Add/Preview or Manage | Done |
| Retention analytics events | Done |

---

## Not claimed

- Live Apple/Google Wallet signing
- Full multi-pillar fuse (TapFlow / TapLoop / Booking native)
- Live AI TapGuide · durable Brand sync · Pages/Canva full parity
- OWNER-READY / OWNER ACCEPTED

---

## PO walkthrough (local)

1. Public `/t/{device}` → **Keep this Card** → chooser (Preview Wallet first on iPhone demo).  
2. Save via Home Screen / Contact / Email / Copy / Wallet preview.  
3. Confirmation → **Open Card** (saved link).  
4. MyTap: one **Open Card**; Wallet shows Preview only / Manage preview — never false “Issued”.  
5. Ask a Question support path still works.

---

## Files (primary)

- `lib/fusion/card/retention.ts` · `retention-analytics.ts`
- `components/tap/keep-card-cta.tsx` · `retention-chooser.tsx`
- `components/tap/add-to-wallet-mock.tsx` · `wallet-mock-pass-card.tsx`
- `app/mytap/[relationshipId]/page.tsx` · `app/t/[deviceCode]/page.tsx`
- `components/tap/campaign-renderer.tsx`
- `e2e/card-retention-ux.spec.ts`
