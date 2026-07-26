# Authoring Workspace & Format / Effects Contract

**Wave:** Card Fuse-Box Integration  
**Date:** 2026-07-26  
**Status:** Contract defined · shared shell begun · full Pages/Canva parity **not** claimed

## Full-screen authoring workspace

Studio manages relationships and final objects. Serious editing opens a dedicated workspace (in-app full-screen by default; optional detached tab for power users).

### Shared regions

| Region | Purpose |
|--------|---------|
| Outline / objects / layers | Structure of the current object |
| Main canvas / customer preview | Primary WYSIWYG or graph |
| Contextual Format / inspector | Selection-driven controls |
| Responsive preview | Phone / tablet / desktop |
| Validation / readiness / test | Honest gates |
| Publish / deploy | Object lifecycle — not Railway cutover |

Panels collapse independently; focus mode and remembered safe preferences are required.

### Object workspaces (routes)

| Object | Workspace |
|--------|-----------|
| Card | `/dashboard/card` (evolving toward fuse-box assembly + editor) |
| Email | Campaign email editor |
| Offer | Campaign / Card special_offer |
| Wallet | Audience wallet (mock) |
| Journey | `/dashboard/experiences/journeys` |
| Form | Campaign capture blocks |
| Loyalty | Audience TapLoop |

**Done editing** returns to the Card fuse-box assembly view with context preserved. No competing builder architecture.

## Format + effects (by medium)

Contextual areas: Text · Style · Layout · Effects · Arrange · Responsive · Accessibility · Brand · Advanced

### Classification

| Class | Meaning |
|-------|---------|
| **Native** | Output medium supports control as real content |
| **Rendered safely** | May rasterize / image-fallback while keeping essential text accessible |
| **Unsupported** | Hidden or disabled with honesty |
| **Preview only** | Studio preview; not published as-is |

### Medium rules (honest)

| Medium | Notes |
|--------|-------|
| **Card / public web** | Richer finishes (metallic, neon, glow) already used; accessibility still required |
| **Email** | Essential content = real text; unsafe effects → image regions + email-safe fallbacks |
| **Wallet** | Apple/Google pass constraints — canonical Card projection, not freeform |
| **Coupon / Offer / Social** | Richer effects where output permits; never claim unlimited freeform |

### Existing implementation

- `components/design/format-workspace.tsx` — Format workspace tabs
- `components/design/expanded-text-field.tsx` — expanded authoring text
- Card builder Format inspector — preserve quick controls
- Brand inheritance bar — **copy/restore only** (durable link = Phase 2)

### Explicitly not claimed this wave

- Full Apple Pages / Canva parity
- Curved text, extrusion/3D, reflection as email-native
- Durable Brand Kit field sync

## Phase 2 format candidates

- Character styles / paragraph styles library
- Drop caps / columns for long Card text blocks
- Email-safe effect raster pipeline
- Wallet layout constraint visualizer
