# Creative Studio Rescue — Owner Punch List

**Classification:** `IMPLEMENTATION IN PROGRESS`

| ID | Item | Severity | Status |
|----|------|----------|--------|
| P2 | Physical-phone QR (reachability) | Critical | **PASS** (HTTPS tunnel) — not Verified overall |
| P2v | Visual fidelity Live Device vs Studio | Critical | **Fix shipped — pending Owner re-scan** |
| P2i | Desktop Contextual Inspector sliding stack | Critical | **Fix shipped on `/dashboard/card/edit` — pending Owner review** |
| P2a | Direct LAN phone reachability | Critical | Blocked by AP/client isolation (network) |
| P2b | Temporary HTTPS tunnel | High | Active locally (not committed) |
| Composition / inspectors / automated proofs | — | Closed |

## Capability-completeness pass

Closed in code and initial route proof: shared media browser, provider token isolation/import contract, typed gradients, image backgrounds, patterns/textures, mask-path outlines, scale/exact stroke, expanded masks, image adjustments, divider completion, typography render parity, font parity, and smart guides.

Open: structured flow wrapping, full Shape Studio, durable Layers completion, saved styles/compositions, editable templates, final responsive/accessibility/performance matrix, complete Owner walkthrough evidence, and physical-phone fidelity re-scan.

## Desktop inspector (root cause)

Owner route mounted Adaptive Workspace + NestedPanelShell stacks, but panels swapped in place (no horizontal slide) and shallow Colors/Brand/Layout panes stayed as fragmented static drawers.

## Desktop inspector fix

- `NestedPanelShell` horizontal Sliding Panel Stack (`data-sliding-panel-stack`, depth motion)
- Appearance hub consolidates Colors / Brand / Layout
- Inspector Selection Hub for Content
- Close collapses drawer; Back reverses slide
- Route tests: `e2e/creative-studio-sliding-inspector.spec.ts`
- Evidence video: `tmp/creative-studio-rescue/evidence/inspector/after-fix-sliding-inspector.webm`

## Fidelity defect (root cause)

Live Device / Preview applied **stack** mobile fallback whenever the composition surface was narrow (`<420px`), while Studio edit always used freeform. Phone layout therefore dropped alignment, layering, and text-over-image.

## Fix

- Shared `CreativeCompositionCanvas` applies stack/hide only when `compositionForceMobile` is explicit
- Default fallback preference: **scale** (matches Studio)
- Live Device route loads `tap.css` + composition font loader
- Regression: `e2e/creative-studio-composition-fidelity.spec.ts`

## Owner re-scan

Use the **new** temporary HTTPS Live Device QR in Studio (Update phone preview first). Do not mark Verified until composition visually matches Studio.
