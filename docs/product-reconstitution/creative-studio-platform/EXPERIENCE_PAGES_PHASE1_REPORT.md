# Experience Pages Phase 1 — Architecture and Acceptance Report

Status: implemented for Product Owner review. Contract: `tapExperience@1.0.0`.

## 1. Existing systems reused

Phase 1 is a compatibility layer above the existing canonical Card composition engine. Every Page continues to use the existing Card Surface, root composition, Sections, Containers, Groups, Flow/Layered layouts, Text, Media, Standard Buttons, Curated systems, material rendering, history, draft persistence, Preview, Live Device, and public Card renderer. No second editor, composition engine, persistence endpoint, or artist-specific router was created.

## 2. Canonical Experience/Page schema

`TapExperienceConfig` owns the stable Experience identity, default Page, Page collection, shared navigation presentation, analytics identity, and timestamps. Each `TapExperiencePage` owns a stable `pageId`, immutable internal slug identity, editable title/nav fields, ordering/visibility state, access placeholder, analytics identity, timestamps, and one existing Page composition payload. For multi-page documents, Page composition is persisted only under the Page; a temporary legacy top-level projection is produced only for the existing editor.

## 3. Routing model

`TapConnectExperience` resolves Page IDs/slugs, projects the selected Page through the existing Card renderer, and handles navigation in the browser with `history.pushState`/`popstate`. Direct entry uses `?page=<stable-page-id-or-slug>`. Mutable labels are never routing keys.

## 4. Session/context preservation

Internal navigation is an in-place React state transition. It does not reload the document, replace the Experience, recreate the signed preview session, or require another NFC/QR entry. Existing browser, identity, preview-token, access, and future analytics contexts remain attached to the same document session.

## 5. Navigation component architecture

Persistent bottom navigation is Experience-level furniture rendered once by `TapConnectExperience`, after Page content and Experience-level utilities. It is not copied into Page documents. The shared contract supports 1–5 visible slots, safe-area padding, minimum useful touch height, active state, label/icon or image, and internal destinations.

## 6. Navigation customization model

The Pages manager edits nav label, icon/image reference, order, destination Page, visibility, and shared edge/floating presentation colors. Navigation is artist-neutral; Love & Theft brass/pick treatments are not embedded in the global component.

## 7. Page visibility vs nav visibility

`navVisible` controls only persistent navigation membership. `pageVisible` controls normal Page availability. An off-nav visible Page remains reachable by an INTERNAL PAGE action; a hidden Page is rejected by the shared resolver.

## 8. Locked-behavior model

Locked Pages use a generic policy with `none`, `message`, `cta`, or `hidden` modes. CTA destinations may be internal Page IDs or external destinations. The renderer honestly demonstrates locked presentation without claiming that a real entitlement was evaluated.

## 9. Access-rule placeholder model

Page access stores a generic state and optional `ruleRef`. The reference is intentionally opaque to Studio so a future entitlement authority can own evaluation for registered, paid, collector, event, geographic, or artist-defined access without changing Page identity or composition.

## 10. Stable analytics identity model

Experience, Page, composition component, action, and destination identities remain stable independently of editable labels. Page duplication generates new Page/composition/component/action/analytics identities and removes copied unique access/link ownership references.

## 11. Event metadata contract

`ExperienceAnalyticsEnvelope` defines stable fields for event type/timestamp plus optional Experience, Page, component, action, destination, artist/client, session/fan, access tier, Campaign, collectible, and serial identities. Phase 1 defines the contract only; it does not expose analytics wiring to Hosts or emit a new analytics product.

## 12. Save/history integration

The existing editor receives the active Page as a compatibility projection. Every existing mutation is committed back only to that Page and then stored in the existing history snapshot. Page create, rename, reorder, visibility, navigation, duplication, delete, default selection, Undo/Redo, dirty state, save, reload, recovery, conflict/revision authority, and signed preview use the same canonical Card draft path.

## 13. Preview integration

Both in-Studio Preview and the dedicated `/dashboard/card/preview` surface use `TapConnectExperience`. They render the active Page, persistent navigation, INTERNAL PAGE transitions, locked states, and existing persistent Card utilities through the same Page model.

## 14. Live Device integration

Signed Live Device renders the canonical Experience through `TapConnectExperience`, preserves the signed preview session during Page changes, supports browser history/direct Page entry, and retains the existing full-bleed Card Surface behavior at 390px.

## 15. Public renderer integration

The public Card-first renderer uses the same Experience component, Page projection, internal action routing, persistent navigation, utilities, and full-bleed backdrop. A legacy single-page Card still renders directly when no Experience exists.

## 16. Files changed

Core schema/authority: `lib/brand/tap-card.ts`, `lib/fusion/card/experience-pages.ts`, `lib/fusion/card/action-intent-presentation.ts`, `lib/fusion/card/draft.ts`, and `lib/fusion/card/signature-publication-validation.ts`.

Shared runtime: `components/tap/tap-connect-experience.tsx`, `components/tap/tap-connect-card.tsx`, `components/tap/tap-connect-card-public.tsx`, `components/tap/card-surface-viewport-backdrop.tsx`, `components/fusion/card/card-preview-workspace.tsx`, `components/fusion/creative-studio/live-device-preview-page.tsx`, and `components/fusion/creative-studio/composition-font-loader.tsx`.

Studio/history: `components/card/tap-card-builder.tsx`, `components/fusion/card/card-editor-live.ts`, `components/fusion/card/reconstitution/card-studio-reconstitution-workspace.tsx`, `components/fusion/card/reconstitution/studio-pages-manager.tsx`, and `components/fusion/card/reconstitution/studio-selection-inspector.tsx`.

Fixture/tests: `lib/fusion/card/review-composition-fixture.ts`, `lib/fusion/card/__tests__/experience-pages.test.ts`, compatibility unit tests, `e2e/experience-pages-phase1.spec.ts`, and compatibility updates to the existing composition/Love & Theft journeys.

## 17. Tests

- Full unit suite: 1,433 passed, 0 failed.
- Experience Page authority: 6 passed.
- Phase 1 Experience browser acceptance: 1 passed.
- Love & Theft Preview/390px Live Device regression: 1 passed.
- Composition Parent/Preview regression: 1 passed.
- Layered/Groups/nested Containers/authoring/Preview/Live Device regressions: 3 passed.

## 18. TypeScript

`tsc --noEmit` passes.

## 19. ESLint

Focused ESLint across every Phase 1 production file and affected acceptance/unit test passes with no errors.

## 20. Deterministic review URL

`http://127.0.0.1:3050/review/studio`

The local server remains on port 3050 with the deterministic local database configuration. The review fixture creates Home, Music, Live, Exclusives, Profile, and an off-nav Afterparty Page solely as generic architecture proof.

## 21. 390px proofs

The evidence directory contains:

- `A-home-five-slot-nav-390.png`
- `B-music-internal-nav-390.png`
- `C-off-nav-page-via-internal-action-390.png`
- `D-configurable-locked-page-390.png`
- `E-pages-manager-hidden-reordered.png`
- `F-signed-live-device-active-page-390.png`
- `acceptance.json`

Location: `docs/product-reconstitution/creative-studio-platform/proofs/experience-pages-phase1/`.

## 22. Explicit deferred work

Deferred to later phases: Pick/Plug Tile; the full polished Love & Theft five-Page sales demo; fan authentication/account management; real entitlement evaluation; NFC collectible claiming; Wallet backend; payments/subscriptions; loyalty; Campaigns; polls; provenance/transfer; analytics collection/reporting; and additional persistent Experience furniture. Phase 1 does not activate Ember or touch production/Railway.

Product Owner visual and interaction acceptance remains the next gate.
