# Card Authoring Workspace, Preview & Persistent Utility Actions Wave

**Branch:** `tapconnect-v1-v2-fusion`  
**Starting HEAD:** `8c8515fad425dd455a86b6b7e9c69a096e4f1cfd`  
**Date:** 2026-07-26  
**Scope:** Card assembly page · dedicated `/dashboard/card/edit` · preview zoom/scroll · persistent Card utility layer · seeded Ask a Question.  
**J1:** Remains **VERIFIED**.  
**Protected:** No push / merge / deploy / Railway / production cutover. Do not commit until Product Owner asks.

---

## Defects addressed

| # | Defect | Root cause | Fix |
|---|--------|------------|-----|
| 1 | Cropped preview / competing scrolls | Fixed `100dvh` builder host nested in scrolling dashboard main + tall chrome + 3 pane scrolls | Assembly page no longer hosts the builder; edit route uses viewport height + collapsible design chrome + independent phone scroll + zoom |
| 2 | No dedicated full-screen editor | `AuthoringWorkspaceShell` unwired; only `/dashboard/card` with inline builder | `/dashboard/card` = assembly; `/dashboard/card/edit` = shell + workspace-mode builder |
| 3 | Ask a Question missing on seeded Campaign | Support only inside Card blocks; seed Campaign had no Card block / no support section | Persistent utility layer on Campaign pages from Brand Kit `utilityLayer` + registry eligibility |

---

## Delivered

| Item | Status |
|------|--------|
| Card assembly `/dashboard/card` | Done |
| Full-screen editor `/dashboard/card/edit` | Done |
| Preview Fit / 100% / ± zoom · Focus | Done |
| Persistent utility layer (Keep · Ask · Save Contact · optional map/book/shop) | Done |
| Seed `seeddemo01` with tapCard + utilities | Done |
| Unit + headed e2e specs | Done |

---

## Proactive UX classification

| Addition | Class |
|----------|-------|
| Assembly vs Edit split | **Required this wave** |
| Collapsible design chrome | **Required this wave** |
| Preview zoom Fit/100%/± | **Required this wave** |
| Focus mode on Card editor | **Required this wave** |
| Utility presentation modes (sticky/sheet/row/deck) | **Required this wave** |
| Detached “Open full workspace ↗” | **Required this wave** |
| Character/paragraph styles library | Phase 2 candidate |
| Durable Brand Kit field sync | Phase 2 candidate |
| Live Wallet / messaging | Future-ready (credentials) |
| Competing second builder | **Rejected** |
| Raw JSON as primary UX | **Rejected** |

---

## PO walkthrough (local)

1. Open `/dashboard/card` — assembly: preview, connections, Ask a Question status, Edit Card.  
2. Edit Card → style support / utility toggles → Save → Done editing.  
3. Preview public `/t/seeddemo01?public=1` — Campaign active + Keep + Ask a Question.  
4. Submit question → TapInbox → suggested reply → relationship timeline.

---

## Classification

**IMPLEMENTED BUT NOT OWNER-READY** (mock channel / mock wallet).  
Live messaging / Wallet = **VERIFIED — CREDENTIALS REQUIRED**.
