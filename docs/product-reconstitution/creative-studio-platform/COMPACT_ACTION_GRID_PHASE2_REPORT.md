# Phase 2 — Compact Action Tile / Grid handoff

Status: implemented for deterministic Product Owner review. Product Owner visual acceptance remains pending.

## 1. Component architecture

`CompactActionGrid` is one authored composition module containing ordered `CompactActionTile` records. The grid owns responsive columns, gaps, density, typography, and presentation selection. Each tile owns content, IconAsset, canonical action, state, and identity. The runtime renderer is shared by Edit, Preview, signed Live Device, and the public Card renderer.

## 2. Existing authorities reused

- ordinary composition modules and the existing Add / Discover path
- canonical action intent and destination references
- Phase 1 Experience Page IDs, internal routing, persistent navigation, lock policy, and signed preview
- canonical IconAsset discovery
- existing selection, flow/layered positioning, resize, save, and draft authorities
- existing approved EverEncore / Love & Theft mastered guitar-pick sources

## 3. Generic Tile contract

`compactActionTile@1.0.0` contains no guitar-pick assumption. It supports a visual/icon reference, editable primary and optional secondary labels, one canonical action, NEW/active/hidden/locked state, locked-policy configuration, and stable component/action/analytics identities. The simple `neutral-icon` presentation proves artist-family independence.

## 4. Love & Theft presentation adapter

`everencore-love-and-theft-pick` is a presentation adapter over the generic Tile contract. It reuses the mastered pick assets where available and the governed blank master with a live semantic engraving for other canonical icons. The pick is the visual object; no circular badge or phantom chassis is introduced.

Persistent navigation continues to use the Phase 1 navigation contract. Its `everencore-love-and-theft-mini-pick` adapter provides smaller family-matched hardware, count-responsive sizing, restrained active treatment, and selectable smoky-glass/solid/transparent navigation surfaces.

## 5. Grid model

`compactActionGrid@1.0.0` supports only the governed 2, 3, and 4-column Phase 2 presets, configurable row/column gaps, Dense/Standard/Airy density, responsive reflow, ordered tile records, and shared group positioning/resizing. Tile visual overflow remains separate from the minimum 44px interaction target so rims, shadows, and engraving are not clipped.

## 6. Action / destination integration

Tiles use existing canonical action types and destination references. Nested internal-page destinations are intercepted by the shared Experience renderer before external action execution, so Page changes are instant and preserve the current session. Page-reference discovery and clearing include nested tile and locked-CTA destinations.

## 7. Lock / state integration

Tiles support visible/no-action, message, CTA, hidden, and future-entitlement lock modes through the Phase 1 policy shape. NEW and optional active treatments are independent, restrained visual states. This phase does not evaluate real entitlements.

## 8. Analytics identity integration

Each tile preserves `pageId` from its owning Experience Page plus stable `componentId`, `actionId`, `analyticsId`, `destinationType`, and `destinationRef`. Page duplication regenerates component/action/analytics identities while retaining intended destination references. No manual tracking setup or analytics reporting was added.

## 9. Principal files changed

- `lib/fusion/creative-studio/platform/compact-action-grid.ts`
- `components/tap/compact-action-grid.tsx`
- `components/fusion/card/reconstitution/studio-compact-action-grid-inspector.tsx`
- `components/fusion/card/reconstitution/studio-discovery-drawer.tsx`
- `components/fusion/card/reconstitution/card-studio-reconstitution-workspace.tsx`
- `components/fusion/creative-studio/creative-composition-canvas.tsx`
- `lib/fusion/creative-studio/signature-assets/everencore-love-and-theft.ts`
- `lib/brand/tap-card.ts`
- `components/tap/tap-connect-experience.tsx`
- `components/fusion/card/reconstitution/studio-pages-manager.tsx`
- `components/tap/tap-connect-card.tsx`
- `lib/fusion/card/experience-pages.ts`
- `lib/fusion/card/review-composition-fixture.ts`
- `lib/fusion/creative-studio/__tests__/compact-action-grid.test.ts`
- `lib/fusion/card/__tests__/experience-pages.test.ts`
- `e2e/compact-action-grid-phase2.spec.ts`

The working tree already contains earlier accepted Studio and Love & Theft work. It was preserved rather than reset, reverted, or committed.

## 10. Tests

- compact grid contract parsing, normalization, identity, and serialization
- nested Experience Page references and duplicate identity regeneration
- Add / Discover placement and inspector opening
- 2/3/4 columns, social/music/locked/NEW variants, move/resize, internal routing, Preview, navigation authoring, and signed Live Device at 390px
- Phase 1 Experience Page regression against the new Music Page proof
- complete repository test suite

## 11. TypeScript

`npx tsc --noEmit` passes.

## 12. ESLint

`npm run lint` passes with no new errors. Existing repository warnings remain outside this phase.

## 13. Deterministic review URL

`http://127.0.0.1:3050/review/studio`

Select the Music Page to review the Phase 2 proof fixture. The deterministic fixture includes social, song/music, locked/internal, NEW, and 4-column compact grids over the accepted full-bleed Love & Theft surface, with the five-slot mini-pick navigation visible.

## 14. 390px proof directory

`docs/product-reconstitution/creative-studio-platform/proofs/compact-action-grid-phase2/`

The directory includes all 13 required tile/grid proofs, separate 3/4/5-slot navigation evidence, a signed Live Device capture, and machine-readable `acceptance.json`.

## 15. Explicitly deferred work

- full Love & Theft multi-page demo and public sales-demo publishing
- real entitlements, identity/accounts, NFC claiming, Wallet, payments, campaigns, loyalty, and fan profiles
- analytics collection/reporting beyond stable metadata readiness
- five-across content grids
- new Love & Theft horizontal masters or Cabinet Noir changes
- Ember activation and all production/Railway work

Phase 2 stops here for Product Owner review.
