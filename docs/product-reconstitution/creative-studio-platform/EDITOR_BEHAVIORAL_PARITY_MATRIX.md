# Editor Behavioral Parity Matrix

Baseline SHA: `854996fbe549722d39d751d9bea6bb5ffd782a49`  
Pass: Owner-experience reconciliation / editor-wide behavioral integrity  
Authority: Editor Constitution Laws 1–30

Status codes:

| Code | Meaning |
| --- | --- |
| SUPPORTED | Canonical path wired end-to-end (UI → mutation → renderer → Preview → persistence → Undo) |
| PARTIAL | Works for some targets/paths; incomplete adapters or UI |
| BROKEN | Enabled control fails product law |
| DUPLICATED | Competing authorities with same concept name |
| LEGACY | Older path still reachable; migrate/remove |
| INCONSISTENT | Same capability differs by arrival path |
| NOT APPLICABLE | Capability does not apply to target (correctly hidden) |

---

## 1. Registered object families

Source: `lib/fusion/creative-studio/capabilities.ts` → `OBJECT_CAPABILITY_REGISTRY`

| Family | Content editor | Child selection | Notes |
| --- | --- | --- | --- |
| card_root | none | no | Selection sentinel, not `objectFamilyForNode` |
| text | text | no | Glyph + Text Box dual targets |
| image | media | no | |
| logo | media | no | |
| icon | icon | no | Artwork vs Backing Surface |
| shape | none | no | |
| divider | none | no | Private appearance form (migrate) |
| badge | component | yes | |
| button | component | yes | Nested label/icon/description |
| coupon | component | yes | contentComposition children |
| ticket | component | yes | |
| map | component | no | |
| gallery | gallery | yes | |
| form | fields | yes | |
| container | component | yes | |
| group | component | yes | peer `groupId` relationship |
| qr | none | no | |
| video | media | no | |
| utility | none | no | |

---

## 2. Shared capability authorities

| Capability | Canonical | Valid adapters | Legacy / duplicate |
| --- | --- | --- | --- |
| Color | `color-palettes.ts` + deep-left solid/photo/brand | Text color / fill / border color targets | Raw `<input type="color">` without hex normalize |
| Gradient | `gradient.ts` + `GradientStudio` | Surface / glyph / text-box / root | Button `gradientStart/End` local surface; coupon insert defaults |
| Material | `material-engine.ts` `MATERIAL_CATALOG` | surface / glyph / icon_artwork / icon_backing / text_box / background | `MATERIAL_PRESETS` + `applyGlyphEffect` in `card-creative-system.ts` |
| Effects | `material-engine.ts` `EFFECT_RECIPES` + `effect-render.ts` | Target-aware CSS | Button/Badge/Icon ad-hoc glow CSS (pre-repair) |
| Border | `border.ts` | Surface families | Scattered border inputs |
| Typography | `fonts/*` | Text / Badge wording / Button label | — |
| Icon | `icon-asset.ts` + Iconify API | Root / Button / Badge / Coupon / Ticket children | `components/design/icon-picker.tsx` (BrandKit) |
| Media | `MediaPicker` | Image / Logo / Video / Gallery / Coupon image | — |
| Group | `composition.ts` + `group-authority.ts` | Fan-out adapters | Primary-node clone fan-out (pre-repair) |
| Appearance IA | `appearance-ia.ts` | Per-family categories | Stale `appearance.ts` |
| Selection | `selection-ref.ts` + `selection-mode.ts` | Parent / content | Remount on `selectionGeneration` (pre-repair) |
| Deep left | `deep-left-editor.ts` | Library \| Edit | Timer ownership thrash (partially fixed) |
| Commands | `editor-command-registry.ts` | Focus map | Missing `arrange.open` / `magicWrite.open` / `ungroup.open` (pre-repair) |

---

## 3. Family × capability matrix

| Family | Color | Gradient | Material | Effects | Border | Type | Icon | Media | Edit Contents | Group ops | Appearance door |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| card_root | SUPPORTED | SUPPORTED | PARTIAL | PARTIAL | N/A | N/A | N/A | SUPPORTED | N/A | N/A | SUPPORTED |
| text | SUPPORTED | SUPPORTED | SUPPORTED | SUPPORTED | text-box PARTIAL | SUPPORTED | N/A | N/A | SUPPORTED | SUPPORTED | SUPPORTED |
| icon | artwork SUPPORTED | via material PARTIAL | SUPPORTED | PARTIAL→SUPPORTED | backing PARTIAL | N/A | SUPPORTED | N/A | Change Icon SUPPORTED | SUPPORTED | Artwork Appearance SUPPORTED |
| badge | SUPPORTED | SUPPORTED | SUPPORTED | PARTIAL→SUPPORTED | SUPPORTED | SUPPORTED | nested PARTIAL | N/A | Wording SUPPORTED | SUPPORTED | DUPLICATED→FIXED (Shape vs Appearance) |
| button | label SUPPORTED | surface PARTIAL | SUPPORTED | PARTIAL→SUPPORTED | SUPPORTED | label SUPPORTED | nested PARTIAL | N/A | SUPPORTED | SUPPORTED | Surface + Appearance clarified |
| coupon | nested PARTIAL | SUPPORTED | PARTIAL | PARTIAL | SUPPORTED | nested PARTIAL | nested PARTIAL | nested SUPPORTED | DUPLICATED→FIXED | SUPPORTED | SUPPORTED |
| ticket | nested PARTIAL | SUPPORTED | PARTIAL | PARTIAL | SUPPORTED | nested PARTIAL | nested PARTIAL | nested PARTIAL | PARTIAL | SUPPORTED | SUPPORTED |
| container | fill SUPPORTED | SUPPORTED | SUPPORTED | PARTIAL | SUPPORTED | N/A | N/A | fill media PARTIAL | SUPPORTED | SUPPORTED | SUPPORTED |
| shape | SUPPORTED | SUPPORTED | SUPPORTED | PARTIAL | SUPPORTED | N/A | N/A | N/A | N/A | SUPPORTED | SUPPORTED |
| divider | SUPPORTED | PARTIAL | N/A | LEGACY private | N/A | N/A | N/A | N/A | N/A | SUPPORTED | INCONSISTENT |
| image/logo/video | N/A | N/A | N/A | frame PARTIAL | frame SUPPORTED | N/A | N/A | SUPPORTED | N/A | SUPPORTED | SUPPORTED |
| map | N/A | N/A | N/A | frame PARTIAL | frame SUPPORTED | N/A | N/A | preview PARTIAL | Setup SUPPORTED | SUPPORTED | SUPPORTED |
| gallery | N/A | N/A | N/A | frame PARTIAL | SUPPORTED | N/A | N/A | SUPPORTED | SUPPORTED | SUPPORTED | SUPPORTED |
| form | labels PARTIAL | N/A | PARTIAL | N/A | PARTIAL | labels PARTIAL | N/A | N/A | fields SUPPORTED | SUPPORTED | PARTIAL |
| group | fan-out PARTIAL→SUPPORTED | fan-out PARTIAL→SUPPORTED | fan-out PARTIAL→SUPPORTED | fan-out PARTIAL→SUPPORTED | fan-out PARTIAL→SUPPORTED | fan-out SUPPORTED | N/A | N/A | PARTIAL→SUPPORTED | Ungroup BROKEN in toolbar→FIXED | SUPPORTED |
| qr | fg/bg PARTIAL | N/A | N/A | N/A | frame PARTIAL | N/A | N/A | N/A | Setup PARTIAL | SUPPORTED | PARTIAL |
| utility | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Setup PARTIAL | N/A | N/A |

---

## 4. Contextual toolbar command audit

| Command id | Visible label | Registry | Mutation / route | Status |
| --- | --- | --- | --- | --- |
| appearance.open | Appearance | yes | effects / Appearance IA overview | SUPPORTED |
| material.open | Material | yes | Appearance materials page | SUPPORTED — must not duplicate Appearance |
| badge.shape | Shape | yes | surface shape | SUPPORTED |
| component.editChildren | Edit contents | yes (+ group) | content | SUPPORTED when real editor exists |
| ungroup.open | Ungroup | added | composition.ungroupNodes | FIXED |
| arrange.open | Arrange | added | more / arrange | PARTIAL (opens More arrange ops) |
| magicWrite.open | Magic Write | added | text Magic Write | PARTIAL (shared surface) |
| color.open | Color | yes | color | SUPPORTED first-use after hex normalize |
| icon.open | Change Icon | yes | icon catalog | SUPPORTED |
| icon.appearance | Appearance | yes | icon Appearance IA | SUPPORTED (distinct target: Icon) |
| divider.appearance | Appearance | yes | divider private form | LEGACY / INCONSISTENT |
| more.open | More | yes | duplicate/delete/lock/hide/arrange | SUPPORTED |

---

## 5. Systemic defect classes (discovered)

1. **Primary-node fan-out** — Group patches cloned primary adapter onto all members.
2. **Renderer fork** — Named effect recipes written to props; Button/Badge/Icon painted with fog glow.
3. **Toolbar door fragmentation** — Badge Appearance ≡ Shape; Button Surface vs Material vs Appearance confusion.
4. **Missing common ops in expected place** — Ungroup absent from Group toolbar.
5. **Drawer ownership tied to remount key** — `selectionGeneration` remounted toolbar.
6. **Edit Contents dual surfaces** — Coupon routing stub + real editor both mounted.
7. **Incomplete fan-out matrix** — fill/gradient/border/opacity not in FanOutCapability.
8. **Legacy dual taxonomies** — `appearance.ts` vs `appearance-ia.ts`; `MATERIAL_PRESETS` vs catalog.
9. **Color input coercion** — non-hex values sliced into invalid `#xxxxxx` then written on first interaction.
10. **Command registry drift** — capability toolbarCommands listed unregistered ids.

---

## 6. Repair disposition

| Defect class | Shared authority repaired | Consumers migrated |
| --- | --- | --- |
| Fan-out | `group-authority.ts` per-descendant adapters + fill/gradient/border | Toolbar `patchProps` / Appearance apply |
| Effects paint | `effect-render.ts` / `surfaceShadowCss` | Canvas Button, Badge, Icon, text-box, curve |
| Toolbar doors | Appearance IA + registry labels | Badge Shape vs Appearance; Button Surface vs Appearance |
| Ungroup | `composition.ungroupNodes` | Group contextual toolbar |
| Drawer ownership | Toolbar key without selectionGeneration | `card-authoring-workspace.tsx` |
| Coupon content | Single `coupon-content-editor` | Exclude coupon from routing stub |
| Commands | Registry complete vs capability list | arrange / magicWrite / ungroup / group editChildren |
| Color first-use | `toColorInputValue` display-only coerce | Color / fill inputs |

---

## 7. Test evidence map

| Area | Unit | E2E / crawler |
| --- | --- | --- |
| Registry | `editor-command-registry.test.ts` | editor integrity crawler |
| Group / fan-out / mixed | `group-authority.test.ts` | `group-appearance-shared-libraries.spec.ts` |
| Appearance IA | `universal-appearance.test.ts` | `universal-appearance-materials.spec.ts` |
| Effects distinct | `group-authority.test.ts` + effect identity | visual evidence sheet |
| Selection / nested | `selection-nested-content.test.ts` | `selection-nested-content-parity.spec.ts` |
| Icons | `icon-asset-pipeline.test.ts` | `icon-artwork-text-gradient-iconify.spec.ts` |
| Deep left | `deep-left-editor.test.ts` | `deep-editor-route-and-materials.spec.ts` |
| Order independence | integrity crawler Phase E | exploratory pass |

---

## 8. Remaining classifications

| Item | Class | Reason |
| --- | --- | --- |
| Divider Appearance private form | LEGACY | Still works; migrate to Appearance IA in follow-up |
| `appearance.ts` APPEARANCE_GROUPS | LEGACY | Tests still cover; not live UI |
| Button Surface local gradient fields | PARTIAL | GradientStudio available via Appearance; Surface quick path retained as adapter |
| Form appearance depth | PARTIAL | Fields/states present; material parity thinner |
| QR operations | NOT APPLICABLE | Artwork/setup only by product scope |
| BrandKit design IconPicker | VALID ADAPTER | Different product surface (BrandKit), not Studio nested consumer |
| Arrange deep panel | PARTIAL | Common arrange ops in More; dedicated Arrange drawer deferred |

This matrix is the living audit artifact for the integrity pass. Implementation must keep rows moving toward SUPPORTED or honest NOT APPLICABLE — never decorative BROKEN controls.
