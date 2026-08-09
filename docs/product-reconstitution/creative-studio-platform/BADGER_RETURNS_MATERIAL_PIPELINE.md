# Badger Returns — Material Pipeline + Product Steward Constitution

**Status:** Engineering + Practical dual-green on Product SHA below.  
**Human Verification:** Required for physical phone Live Device + Owner authoring acceptance.  
**Do not claim BADGER CAPTURED** until Product Owner Human Verification.

## SHAs

| Role | SHA |
|------|-----|
| Starting HEAD | `4b8efc06c4052207c1c219ee722ba05ba1c16d7d` |
| Prior HV candidate (superseded) | `eb1f53f7c91dffa89fff6424c7cd23efb9679936` |
| **Final Product SHA** | `8d49d845f2453b92c8f1b3a4fe7467a7ed79226f` |
| **Final Certification-Jig SHA** | `8d49d845f2453b92c8f1b3a4fe7467a7ed79226f` |
| Documentation closeout | `fc56a583280bdb02aa97053c12b9b18b2d8f8816` |

## Dual green (same Product + Jig SHA)

| Run | Port | Suite | Result |
|-----|------|-------|--------|
| Green #1 | 3071 | 24 tests | **24 passed**, retries 0 |
| Green #2 | 3072 (fresh build/start) | 24 tests | **24 passed**, retries 0 |

Suite: practical-authoring (A–H) + owner-simulation-physical + visual-plane + media-direct + pattern-catalog + google-fonts + providers-visual-plane + chaos-endurance + product-steward-five.

Evidence: `tmp/owner-sim-physical-evidence/_reports/green{1,2}-material-*.json|log`  
Materials: `tmp/owner-sim-physical-evidence/materials/` + `tmp/practical-authoring-evidence/materials/quality-gate.json`  
Steward: `tmp/practical-authoring-evidence/product-steward/steward-walkthrough.json`

## Material pipeline root cause

`applyRecipeFill` stored the full recipe gradient in `gradientFill` **and** extracted only the first two color stops into `gradientStart` / `gradientEnd`. Button rendering rebuilt gradients from `gradientStart`/`gradientEnd` only, discarding multi-stop structure. Highlight layers were ignored on Buttons; `shine` used a generic overlay. `materialPreviewCss` showed the full recipe gradient → **preview better than applied**.

## Canonical architecture

| Piece | Role |
| --- | --- |
| `lib/fusion/creative-studio/material-surface.ts` | Canonical `MaterialSurfaceDescriptor` + resolve from props/recipe |
| `components/.../material-surface-layers.tsx` | Shared highlight + shine overlays |
| Button / Badge / shape consumers | Consume the descriptor |
| Toolbar Material swatches | `MaterialSurfaceSwatch` — same fill + layers |

`gradientFill` is the multi-stop fill authority. `gradientStart`/`gradientEnd` are editor mirrors only.

## Product Steward doctrine

- Entry: `AGENTS.md`
- Durable laws: `PRODUCT_STEWARD_CONSTITUTION.md`
- Catalog overload (report only): `MATERIAL_CATALOG_OVERLOAD_RECOMMENDATIONS.md`

## Live Device honesty

`reachableForPhone` = phone-attempt candidate (non-loopback).  
`candidateKind`: invalid | locally_unreachable | lan_candidate | configured_public_candidate.  
`physicallyVerified` is always false at URL resolution. No remote tunnel probing. Physical phone remains Product Owner HV.

## External blockers

- Writing Assist real inference still requires `OPENAI_API_KEY`.
- Pexels / Logo.dev may run fixture mode without live credentials.
- Physical phone Follow / Freeze / Refresh / Revoke remains Product Owner Human Verification.
