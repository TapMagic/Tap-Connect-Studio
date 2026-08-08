# Completion Pass Audit — Group, Appearance, Icon, Badge, Coupon, Magic Write

**Branch:** `tapconnect-operational-spine-restoration`  
**Starting SHA:** `36c8cee3e6946cea3dfd6147b921dee0e5dc25f1`  
**Date:** 2026-08-07  
**Nature:** Defect audit before completion wiring — not a new editor architecture.

---

## Preserve

- Card root canvas, page geometry isolation, explicit Card Root selection, no-selection state
- SelectionRef, deep-left editor, routeStack, Back, left rail, contextual toolbar
- No permanent right Inspector
- Color / GradientStudio / MaterialRecipe / target adapters / universal Appearance concept
- Text glyph vs Text Box, Aa, Iconify provider, bare SVG Icon, Icon backing surface
- Templates, Brand, Assets, Preview, publication lifecycle, draft/public isolation
- Layers, Actions, Motion, responsive contracts

---

## A — Groups

### Current model

- Groups are a **peer `groupId` relationship** on composition nodes (`composition.ts` `groupNodes` / `ungroupNodes`).
- There is no Layer entity that owns a Group box; `primitive === "group"` exists in unions but is unused by Group/Ungroup.
- `expandSelectionToGroups` correctly expands true-group members and excludes Containers.

### What already works

- Collective **move** when selection is expanded (canvas drag + keyboard nudge).
- Paste remaps `groupId` to new ids.
- Unit coverage for group + expand + translate.

### Defects (human-verified)

| Defect | Root cause |
| --- | --- |
| Child-looking selection chrome | Overlays rendered per selected node id; no union bbox |
| Layers / marquee / Shift select one child | Those paths skip `expandSelectionToGroups` |
| Resize / rotate single child | Canvas resize/rotate use `[target.id]` only |
| Color/font/effects affect one Text | `patchSelection` / toolbar use `elementIds[0]` only |
| No Mixed values | Controls show primary node values |
| No Group Edit contents | Content mode exists for Button/Container only |
| Magic Write ignores group Text | Single-node lookup + single `patchSelection` |
| Duplicate may keep same `groupId` | `duplicateNodes` does not expand / re-key groups |

### Target authority

Keep `groupId` as the canonical membership model. Add:

1. Union bounding box chrome for parent-mode Group selection
2. Group-scale resize + group-rotate around union origin
3. Capability fan-out over compatible descendants
4. Mixed-value UI
5. Group Edit contents (parent subdued, one child active)
6. One Undo per fan-out / transform gesture

Do **not** invent a second Group species or invisible Group Surface.

---

## B — Appearance IA

### Current UI

Deep-left Appearance for many targets is one panel bundling:

- Material category tiles
- Quick Effects (`EFFECT_RECIPES`)
- Advanced (shadow / glow / glow color / opacity)

Documented Universal tree (Fill / Material / Effects / Border / …) is not navigable as distinct mental models.

### Defects

- Effect choice, Quick Effects, and Advanced tuning = three places for one concept
- Glow color and ordinary tuning buried under Advanced
- Overlapping Material neon ids and Effect recipe ids (`soft_glow`, `neon_edge`, …)
- Category count must never be asserted by tests

### Target

Per-target coherent categories (Fill / Material / Effects / Border as appropriate).  
Selected Effect page owns its tuning. Retire duplicate Quick Effects + generic Advanced Effect drawer.

---

## C — Effect rendering

### Current

Named effects mostly share `0 0 Npx color` box/text/drop-shadow with different radius/color/`secondaryGlow`.  
Dimensional materials are more distinct via fill/gradient/inner shadow.

### Defects

- Neon Edge reads as colored fog, not crisp electrical edge
- Soft Glow / Aura / Double Neon / Electric insufficiently distinct
- Text glyph glow sometimes uses fill `color` instead of `glowColor`
- Button surface ignores `secondaryGlow` / `innerShadow`

### Target

Target-aware CSS that makes major treatments distinguishable without labels.

---

## D — Icon library

### Works

- Iconify search API, `IconAsset`, sanitize, replace-preserving identity
- Root Icon library + Change Icon for selected Icon

### Defects

- Browse/explore taxonomy missing (Recommended only when idle)
- Button nested Icon uses `<select>` over `ICON_LIBRARY`
- Badge optional Icon missing
- Coupon/Ticket nested Icon not on shared picker contract

### Target

One picker authority: Search + Browse categories + Collections; same picker for root and nested targets.

---

## E — Button Icon

`card-contextual-object-toolbar.tsx` Button Edit contents uses native `<select>`.  
Must open shared Icon picker; selection writes nested Button Icon via `IconAsset` / `replaceIconContentProps` / button content composition.

---

## F — Badge

### Works

- Insert with wording / shape / starter presets
- Material changes via `applySurfaceMaterial` without wiping wording/shape (post-insert)

### Defects

- **Badge Designs** section embeds material treatments as insertion species
- Drawer flicker: library ↔ edit fight (deep-left mutual exclusion + portal poll + selection reopen)
- Flat `props.text` wording; no nested Wording/Icon children
- Shape + Appearance both open `"surface"`

### Target

Library = shapes + composition starters (not material-as-species).  
Appearance = shared Material/Effects.  
One drawer owner. Nested content where model supports it.

---

## G — Coupon

### Works

- Four starter layout ids in registry (`clean-retail`, `perforated-stub`, `split-image`, `qr-first`)
- `contentComposition` children created on insert

### Defects

- Library thumbnails identical gradient
- Canvas paints one hardcoded coupon face; ignores layout flags and children
- Edit Contents opens inert routing panel
- Gradient / Border / Material engines ignored by renderer
- Parent props vs child text drift

### Target

Canonical child compositions per preset; shared Surface Appearance; functional Content editor; thumbnail/insert/preview parity.

---

## H — Magic Write

### Current

`TextLibrary` Magic Write is a **local regex fixture** — never calls `/api/ai/generate` or Autopilot.

### Real AI infrastructure (reuse)

- `app/api/ai/generate/route.ts` → `runAutopilotGenerate`
- Feature gates, auth, `OPENAI_API_KEY` / `isAiReady()`

### Target

Wire Magic Write to existing AI with Text selection scope (single + multi/group).  
Honest failure states. Apply = one Undo. Do not build a parallel AI platform.

---

## I — Drawer state machine

Authoritative model should be equivalent to:

```
mode: library | edit
libraryTool: …
editTarget: SelectionRef
editRoute: DeepEditorRoute stack
```

Transitions once. No mount-effect reopen after edit owns the drawer. No timer as state authority (retire 32ms portal poll as ownership mechanism).

---

## J — Toolbar cleanup

Remove dead/duplicate paths after rewiring:

- Badge Designs routes
- Button pantry Icon dropdown
- Coupon appearance duplicates
- Redundant Quick Effects / Advanced Effect entries once tuning lives with Effects

Group toolbar: Edit contents, Appearance, Motion, Position, Arrange, More, Magic Write when Text descendants exist.

---

## Implementation order

1. Group transform + fan-out (+ docs)
2. Appearance IA consolidation
3. Effect rendering quality
4. Shared Icon browse + nested contract
5. Button Icon rewire
6. Badge library + drawer ownership
7. Coupon compositions + content + shared appearance
8. Magic Write scope wiring
9. Craftsmanship + acceptance tests + evidence
