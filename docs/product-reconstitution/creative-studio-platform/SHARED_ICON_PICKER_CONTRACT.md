# Shared Icon Picker Contract

**Browse taxonomy:** `lib/fusion/creative-studio/icon-browse.ts`  
**Provider:** `lib/fusion/creative-studio/providers/iconify.ts`  
**API:** `GET /api/creative/icons` — `q`, `category`, `collection`, `meta=1`  
**Asset model:** `IconAsset` / `createIconAsset` / `iconAssetToNodeProps` / `replaceIconContentProps`

## Modes

- **Search** — Iconify query (≥2 chars)
- **Browse** — semantic categories (Actions, Communication, Commerce, …) that issue real provider queries
- **Collections** — Lucide, Tabler, Phosphor, Remix, Material Symbols

## Targets

Same picker surface serves:

- root Icon
- Button › Add / Change Icon (`data-testid="shared-icon-picker"`)
- Badge / Coupon / Ticket nested Icon (when present)

Parent-specific pantry dropdowns are retired as the primary path.
