# Badger Returns — Material Consumer Closeout + Live Device Honesty

**Status:** Engineering candidate after systemic Material consumer + Live Device UI closeout.  
**Human Verification:** Required — physical phone Live Device + Owner authoring acceptance.  
**Do not claim BADGER CAPTURED** until Product Owner Human Verification.

## SHAs

| Role | SHA |
|------|-----|
| Starting HEAD (this assignment) | `5b46ce23326a36854af16c7212d14d615a037f13` |
| Prior HV candidate (superseded) | `8d49d845f2453b92c8f1b3a4fe7467a7ed79226f` |
| **Final Product SHA** | _(set at dual-green freeze)_ |
| **Final Certification-Jig SHA** | _(same as Product when jig co-shipped)_ |
| Documentation / remote tip | _(set after push)_ |

## Exposed Material Consumer Inventory

| Host entry point | Target family | Apply authority | Durable state | Edit renderer | Preview/Public renderer | Canonical descriptor / layers | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Appearance → Material (Button) | Button Surface | `applySurfaceMaterial` / `asButtonSurface` | node `materialPreset` + `gradientFill` / fill + layers | `resolveMaterialSurfaceFromProps(button)` + `MaterialSurfaceLayers` | Same via `CreativeCompositionCanvas` | Yes | **PASS** |
| Appearance → Material (Badge) | Badge Surface | `applySurfaceMaterial` | node Material props | Badge path + shared layers | Same canvas | Yes | **PASS** |
| Appearance → Material (Shape) | Shape Surface | `applySurfaceMaterial` | node Material props | Shape fill + shared layers | Same canvas | Yes | **PASS** |
| Appearance → Material (Container) | Container Surface | `applySurfaceMaterial` (clears stale `visualPlane`) | node Material props; Visual Plane only when no Material | Material path when `materialPreset` set; else `readContainerVisualPlane` | Same canvas | Yes (Material path) | **REPAIRED → PASS** |
| Appearance → Material (Coupon) | Coupon Surface | `applySurfaceMaterial` | node Material props | Shared Material fill + layers; content/perforation/QR untouched | Same canvas | Yes | **REPAIRED → PASS** |
| Appearance → Material (Ticket) | Ticket Surface | `applySurfaceMaterial` | node Material props | Shared Material fill + layers; identity/terms/QR untouched | Same canvas | Yes | **REPAIRED → PASS** |
| Icon Appearance → Backing Surface Material | Icon Backing | `applyMaterialRecipe("icon_backing")` | `boxFill` / `boxGradient` + Material layers; artwork independent | `resolveMaterialSurfaceFromProps(icon_backing)` + layers | Same canvas | Yes | **REPAIRED → PASS** |
| Card / Background → Material tiles | Page Background | `compositionBackgroundFromMaterialRecipe` | `rootComposition.background.materialPreset` + kind/pattern/gradient/value + highlight/shine | `materialPropsFromCompositionBackground` → shared resolve + layers | Same canvas | Yes | **REPAIRED → PASS** |
| Group Appearance Material fan-out | Compatible descendants | Group fan-out → `applySurfaceMaterial` / glyph | Per-member props | Per-member consumers above | Same | Inherited | **PASS** (via consumers) |
| Text glyph Material | Text glyphs | `applyGlyphMaterial` | glyph props | Glyph paint (not surface layers) | Same | Glyph path (not surface descriptor) | **PASS** (glyph authority; not surface Material) |
| Text Box Material | Text Box | `applyMaterialRecipe("text_box")` | box* props | Text Box path / icon_backing-like | Same | Partial (`text_box` role) | **PASS** where exposed |

Universal law: Material picker preview and applied result resolve through the same `MaterialSurfaceDescriptor` (+ `MaterialSurfaceLayers` for highlight / shine / texture).

## Canonical architecture after repair

| Piece | Role |
| --- | --- |
| `lib/fusion/creative-studio/material-surface.ts` | Canonical `MaterialSurfaceDescriptor` |
| `components/.../material-surface-layers.tsx` | Shared texture + highlight + shine overlays |
| `compositionBackgroundFromMaterialRecipe` | Page Background adapter into Visual Plane + `materialPreset` |
| `materialPropsFromCompositionBackground` | Rehydrate Material props for page render |
| Button / Badge / Shape / Container / Coupon / Ticket / Icon Backing / Page BG | Consume shared authority (geometry adapters only) |

PAGE BACKGROUND ≠ SURFACE BACKGROUND ≠ CONTAINER BACKGROUND remains enforced: Material on Container never mutates Page Background.

## Live Device UI honesty

API (unchanged laws):

- `candidateKind`: invalid | locally_unreachable | lan_candidate | configured_public_candidate  
- `physicallyVerified: false` at session creation  
- `reachableForPhone` = phone-attempt candidate only  

UI (`LiveDeviceQrPanel`):

- Pending: “Preparing phone preview…” (not default reachable)  
- LAN: “LAN candidate — keep phone on the same Wi-Fi. Phone open has not been verified yet.”  
- Public: “Public preview candidate — phone open has not been verified yet.”  
- Ready QR: “QR ready to scan” (not “Phone preview ready” / not physically verified)  
- Never “LAN reachable”

## Dual green

| Run | Port | Suite | Result |
|-----|------|-------|--------|
| Green #1 | _(fresh ≠ 3072)_ | prior engineering suite + Task I | _(pending)_ |
| Green #2 | _(fresh ≠ 3072)_ | same Product + Jig SHA, retries 0 | _(pending)_ |

Prior Green #2 on **3072 / PID 93101** is left undisturbed and is **not** part of this pair.

## External blockers

- Writing Assist real inference still requires `OPENAI_API_KEY`.
- Pexels / Logo.dev may run fixture mode without live credentials.
- Physical phone Follow / Freeze / Refresh / Revoke remains Product Owner Human Verification.
