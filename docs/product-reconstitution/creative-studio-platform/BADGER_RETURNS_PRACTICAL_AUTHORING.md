# Badger Returns — Practical Authoring Reconstitution

**Status:** Superseded for HV by Material pipeline repair — see `BADGER_RETURNS_MATERIAL_PIPELINE.md`.  
**Human Verification:** Do not HV this SHA. Prior dual-green on `7b61ce4` did not certify later Product SHAs.

## SHAs (historical — prior pass)

| Role | SHA |
|------|-----|
| Starting HEAD | `cdcabf8a9422a2b6e999d45a4feca584af293da6` |
| Product reconstitution freeze | `7b61ce48bceabb3fdbe41b2cb094c3a837686da9` |
| Prior Active Product SHA (rejected for HV) | `eb1f53f7c91dffa89fff6424c7cd23efb9679936` |
| **Current HV candidate** | `8d49d845f2453b92c8f1b3a4fe7467a7ed79226f` — see Material Pipeline closeout |

## Dual green (historical evidence only)

| Run | Port | Suite | Result |
|-----|------|-------|--------|
| Green #1 | 3066 | 23 tests on `7b61ce4` | **23 passed**, retries 0 |
| Green #2 | 3067 | 23 tests on `7b61ce4` | **23 passed**, retries 0 |
| HEAD re-verify | 3068 | 23 tests on `eb1f53f` | **23 passed**, retries 0 — **not dual-green of eb1f53f** |

Independent review: Material false-green + SHA pairing invalid for HV.

## Canva benchmark review

Compared overlapping workflows: selection toolbar, Border/Corners/Size popovers, Arrange (align/distribute/match/stack), nested Button icon pick, Badge shape stroke, page artboard height, Action test vs Preview.

| Area | Was | Changed |
|------|-----|---------|
| Toolbar | Generic Appearance dump | Target-aware Border / Corners / Size / Arrange |
| Button Iconify | Neon fill + ArrowUpRight fallback | Exact SVG via `applyButtonIconAsset`; canvas paints `iconSvg` |
| Badge border | CSS box border under clip | SVG silhouette stroke for all clipped shapes |
| Badge text | Lines collapsed | `whitespace-pre-wrap` + line height |
| Page height drag | Draft height stretched %-children | Live preview uses same preserving-bounds authority as commit |
| Live Device | Hardcoded preferLanPort 3050 | Port from request origin; fail-closed QR |

Deliberate TapConnect deviations: Card-first phone canvas; Preview as customer mode; Live Device signed draft sessions (Follow/Freeze/Revoke) — not Canva Share.

## Root causes repaired

1. **Button Iconify / neon yellow:** `iconAssetToNodeProps` spread `bareIconDefaults.fill=#b8ff2c` onto Button parent; canvas used `ElementIcon(name)` → ArrowUpRight for Iconify ids.  
2. **Page height “scale”:** During drag, `minHeightPx` grew without rescaling fractions → visual stretch.  
3. **Live Device wrong port:** `preferLanPort: 3050` ignored actual request port.

## Live Device port / reachability proof

- Unit: LAN URL preserves non-default port (`3055` / `3067` path) when no public URL is configured.
- Runtime: `detectLanBaseUrl(3067)` → `http://192.168.1.63:3067`.
- Preview HTML: full Card config session → `GET /preview/live/…` on `:3067` returns **200** with draft content (`HARBOR NIGHTS`).
- Configured `NEXT_PUBLIC_PREVIEW_BASE_URL` (Cloudflare tunnel) takes precedence when set; stale tunnel hosts fail closed for phones until refreshed.
- Physical phone scan of Follow / Freeze / Refresh / Revoke remains Product Owner Human Verification.

## External blockers

- Writing Assist real inference still requires `OPENAI_API_KEY`.
- Pexels / Logo.dev may run fixture mode without live credentials.
