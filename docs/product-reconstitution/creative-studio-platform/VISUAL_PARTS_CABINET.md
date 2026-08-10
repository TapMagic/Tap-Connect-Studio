# Visual Parts Cabinet — Architecture Proof

**Status:** Cabinet Integrity held; Visual Grammar foundation in `VISUAL_GRAMMAR.md`.  
**Assignment:** Operation Cabinet Handles + Integrity Closeout + Visual Grammar  
**Not claimed:** Premium Action System complete · library filled · final Signature visual language · tApIt · Campaigns · physical phone HV

## Law

**Visual Parts belong to Studio, not to the first object that uses them.**

Do not encode reusable parts as Button-only assets. Foundation and TapConnect Signature share the same sockets, apply path, persistence, Preview/Public renderer, and drawer-handle contract.

## Hold baseline

This Cabinet mounts **on top of** existing Studio authorities. It does **not** replace:

- Material engine · Text · Icon / Icon Backing · Action · Motion · Divider renderer · Container · Visual Plane · Page Height · Live Device honesty

## Collections

| Collection | Role |
| --- | --- |
| `foundation` | Generic reusable craft parts |
| `tapconnect_signature` | Collection boundary only — same infrastructure |

No Signature renderer, Signature persistence, pricing, or entitlements in this assignment.

## Registry

Canonical module: `lib/fusion/creative-studio/visual-parts/`

| File | Authority |
| --- | --- |
| `types.ts` | Part / socket / target / drawer contracts |
| `registry.ts` | Tiny proof inventory + drawer IA |
| `provenance.ts` | Free/open-source intake readiness + TapConnect-original records |
| `finish-color.ts` | **Finish ≠ Color** lacquer/acrylic derivation |
| `apply.ts` | Apply / replace / remove / curated decomposition |
| `ornaments.ts` | Reusable SVG (Copper Leaves, divider endcaps) + Pounded Copper rim paint |
| `render.ts` | Shared rim/accent descriptors for Edit/Preview/Public |

Durable node state: `props.visualParts` (`VisualPartsState`).

## Socket vocabulary (minimum)

Surface · Frame/Edge · Icon Station · Accents · Divider · Interaction · Action Surface · Body · Finish · Layout · Curated family

A single part (e.g. `rim_pounded_copper`) may list multiple sockets and target families.

## Drawer-handle contract

**Never add a new part until its drawer already has a handle.**

Each drawer must: open from a legitimate selected target · show current applied choice · filter Foundation/Signature · visual previews · apply via shared authority · change/remove · preserve unrelated state · Undo/Redo · Save/Reload · Preview/Public parity · explain incompatibility · responsive survival · selection identity · Curated → Customize revealing the same part IDs.

Drawer IA: Curated · Body · Finish · Color · Frame & Ring · Icon / Image · Accents · Text · Layout · Divider · Surface / Zone · Action · Motion · Advanced

Color / Text / Action / Motion drawers are **handles into existing authorities** (passthrough), not duplicate engines.

UI entry: contextual toolbar → **Visual Parts** → `VisualPartsCabinetPanel` in the deep-left drawer.

## Tiny proof inventory

**Foundation:** Rounded Rectangle, Capsule, Lacquer, Acrylic, Simple Chrome, Round/Faceted Icon Station, Accent None, One/Two Column, Minimal Line Divider, Neutral Action Surface, Quiet/Tactile interaction.

**TapConnect Signature (architecture prototypes, not final visual lock):** Pounded Copper Rim, Copper Leaves, Copper Botanical Divider, Copper Harmonized Surface, curated family Bright Lacquer + Pounded Copper.

## Finish ≠ Color

Never store Black/Red/Green/Blue Lacquer as four finish presets.

- `finishPartId = finish_lacquer | finish_acrylic`
- `baseColor = Host hex`
- `deriveFinishSurface()` supplies perceptual stops / specular / edge depth

Proof colors: black `#0a0a0c` · red `#b10d1a` · green `#16a34a` · blue `#155eef`

## Curated → Customize

Family `family_bright_lacquer_pounded_copper` expands into the same ingredient part IDs the drawers edit. Changing base color must not change finish part id, rim, accent, icon identity, or Action.

**Curated family never mutates Action.** Visual recipes must not set `actionType` / `href` / bind identity. Existing Call, Website, Booking, and tracking-related Action state survive family application. Demo/default Actions belong in starter/insertion authorities only.

**Icon Station hard law:** geometry ≠ backing ≠ rim ≠ content ≠ accent. Foundation Round/Faceted control clip/shape only. Signature-like dark backing + Pounded Copper station rim are separate ingredients (`icon_station_backing_dark`, `rim_pounded_copper` on `iconStation.rim`).

**Rim tile previews** derive from `resolveRimDescriptor` / `partTilePreviewBackground` — Simple Chrome and Pounded Copper must read as distinct parts, not a single copper swatch.

## Cross-object reuse

`rim_pounded_copper` is one registry id applied to Button surface rim **and** Container / Action Surface edge (and compatible image/logo frames).

## Free-only sourcing

TapConnect-original proof parts + Host uploads. Provenance authority is ready for later in-repo free/OSS adaptation. No paid packs. No third-party hotlinks for production parts.

## Bright Lacquer board

`docs/.../visual-targets/bright-lacquer-pounded-copper.html` is an **architecture / mechanical reference**, not the final Signature aesthetic lock. Broader Visual Grammar (Hero, Stages, Bottom Stops, portrait scale, etc.) is **explicitly deferred**.

## Follow-on seams (do not build here)

- Full Visual Grammar + Mobile Composition blueprint  
- Hero / Launch / Bottom Stops  
- Broad Divider families  
- Portrait scale/anchor system  
- Pricing / Signature tier enforcement  
- Filling the library beyond the tiny proof inventory  

## Tests

- Unit: `lib/fusion/creative-studio/__tests__/visual-parts-cabinet.test.ts`  
- Practical: `e2e/visual-parts-cabinet-certification.spec.ts` (`VISUAL_PARTS_CABINET_CERT=1` or `PRACTICAL_AUTHORING_CERT=1`)
