# Badger Returns — Practical Authoring Reconstitution

**Status:** Engineering + Practical automated gates dual-green on Product SHA below.  
**Human Verification:** Required for physical phone Live Device + Owner authoring acceptance.

## SHAs

| Role | SHA |
|------|-----|
| Starting HEAD | `cdcabf8a9422a2b6e999d45a4feca584af293da6` |
| Prior Product Certification (evidence only) | `fdd7473db809b668cae1621f7273fc1f14dfdead` |
| **New Product SHA** | `7b61ce48bceabb3fdbe41b2cb094c3a837686da9` |
| Certification jig (practical + unit gates in same freeze) | `7b61ce48bceabb3fdbe41b2cb094c3a837686da9` |
| Documentation | _(this commit)_ |

## Dual green

| Run | Port | Suite | Result |
|-----|------|-------|--------|
| Green #1 | 3066 | 23 tests (practical + owner-sim + chaos + planes + media + fonts + steward) | **23 passed**, retries 0 |
| Green #2 | 3067 (fresh build/start) | same | **23 passed**, retries 0 |

Evidence: `tmp/owner-sim-physical-evidence/_reports/green{1,2}-*.json|log`  
Practical evidence: `tmp/practical-authoring-evidence/`  
Steward: `tmp/practical-authoring-evidence/product-steward/`

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
