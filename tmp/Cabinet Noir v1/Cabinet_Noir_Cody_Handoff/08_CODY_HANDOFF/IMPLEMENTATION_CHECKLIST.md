# Cabinet Noir Integration Checklist

## Before code
- [ ] Read Rule Book
- [ ] Read Geometry Certification and verify packaged checksums
- [ ] Confirm existing component/asset registry location
- [ ] Confirm existing entitlement registry/location
- [ ] Confirm existing approved Cabinet Noir color-token chart
- [ ] Confirm canonical Action model used by Card
- [ ] Confirm media CDN/static asset strategy

## Asset registration
- [ ] Register production furniture only
- [ ] Register semantic plugs
- [ ] Register social/system plugs
- [ ] Register CN-001 as standalone Identity Topper / Brand Crest
- [ ] Register CN-037 variants under `identityHeaderSocket@1.0.0`
- [ ] Register CN-011 under `informationalLine@1.0.0`
- [ ] Register presets as reference/preset, not structural necessity
- [ ] Exclude folder 99

## Editor
- [ ] Live text overlay
- [ ] `semanticPlugSocket@1.0.0` metadata
- [ ] `identityHeaderSocket@1.0.0` metadata
- [ ] add/delete/reorder rows
- [ ] alternating single-stack plug rule option
- [ ] Twin-Rail outside-plug rule
- [ ] approved odd-action recipe: pairs → stop spine → full-width action → CN-010 → CN-045
- [ ] optional decorative pedestal
- [ ] entitlement-driven drawer
- [ ] server-side publish enforcement for `signature.family.cabinet_noir`
- [ ] entitlement-loss read-only/public-render continuity
- [ ] Exact Asset launch mode only; Styled Preserve remains deferred
- [ ] phone preview QA

## Persistence
- [ ] component IDs saved, not filenames only
- [ ] variant IDs saved
- [ ] action destination independent of visual plug
- [ ] state survives reload
- [ ] schema supports future family without new core table

## QA
- [ ] alpha edges clean on dark background
- [ ] alpha edges clean on light background
- [ ] photography background test
- [ ] readable at target phone width
- [ ] tap targets valid
- [ ] keyboard/focus visible
- [ ] screen-reader labels correct
- [ ] no runtime mirroring
- [ ] no CSS hue filters presented as certified finishes
