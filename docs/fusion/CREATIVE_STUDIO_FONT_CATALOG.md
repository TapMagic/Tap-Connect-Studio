# Font catalog report — Creative Studio Rescue

## Summary

- **Families:** 70+ (see `FONT_CATALOG_SIZE` in `lib/fusion/creative-studio/fonts/catalog.ts`)
- **Source:** Google Fonts CSS2 API
- **Licenses:** SIL Open Font License (OFL) and Apache-2.0 only
- **Loading:** Lazy per family via `ensureFontLoaded` — not eager on first paint
- **Brand preload:** up to 6 brand font ids via `preloadBrandFonts`
- **Recent / favorites:** `localStorage` keys `tc-creative-studio-recent-fonts`, `tc-creative-studio-favorite-fonts`

## Categories

Sans Serif, Serif, Display, Slab Serif, Humanist, Geometric, Handwriting/Script, Monospace, Condensed, Editorial, Friendly/Rounded, High-impact Headline

## Point sizing

- Owner UI: points (`16 pt`)
- CSS: `fontSizePx` with `1pt = 96/72 px`
- Presets remain optional shortcuts; numeric control is primary

## Alternatives considered

- Bundling all woff2 files: rejected (bundle bloat)
- Fake system-font dropdown: rejected (not professional)
- Commercial font CDNs requiring keys: deferred
