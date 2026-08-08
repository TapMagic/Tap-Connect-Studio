# Preset Truth and Geometry Audit

## Badge geometry

**Authority:** `lib/fusion/creative-studio/badge-shape.ts`

- Every visible shape has a unique `geometrySignature`
- Burst (8 soft points) ≠ Starburst (12 sharp points)
- Seal uses a scalloped clip — not a pill disc alias
- Library tiles, post-insert Shape picker, and canvas share `BADGE_SHAPE_DEFS`

Audit helper: `auditBadgeGeometryUniqueness()`.

## Button library normalization

Structure / function starters only:

- Primary CTA, Secondary / Outline, Pill, Full width, Icon + Label, Icon only, Compact
- Action starters: Directions, RSVP, Add to Wallet

Material species (Glass, Neon, Metallic, Beveled, Embossed, Raised) removed from insertion library. Appearance remains independently editable after insert.

Thumbnail parity via `buttonPresetThumbnailStyle(props)`.

## Coupon layouts

Four structurally distinct layouts preserved (retail card, perforated stub, split-image, QR-first). Thumbnail parity + real child Elements + shared Appearance. No redemption execution.
