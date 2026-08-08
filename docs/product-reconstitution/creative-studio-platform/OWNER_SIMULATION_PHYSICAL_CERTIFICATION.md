# Creative Studio — Owner-Simulation Physical Interaction Certification

**Status:** CREATIVE STUDIO OWNER-SIMULATION PHYSICAL INTERACTION CERTIFICATION CANDIDATE — HUMAN VERIFICATION REQUIRED

## Verified runtime (final evidence)

| Field | Value |
| --- | --- |
| Branch | `tapconnect-operational-spine-restoration` |
| Local SHA | `cf87c1325b73617d9ff58354b6ed79518a71d528` |
| Working tree | Dirty (certification repairs + harness; not clean) |
| Server | `next-server` PID **73445** (parent `next dev` PID **73444**) |
| Port | **3000** (`http://127.0.0.1:3000`) |
| Workspace cwd | `/Users/rcs/Development/tap-connect-studio-fusion` |
| Auth | `TAPCONNECT_DEV_AUTH=1` / `TAPCONNECT_DEV_IDENTITY=rich` |
| Port 3050 | Absent (earlier conflicting instance not present at final cert) |
| Identity stamp | `tmp/owner-sim-physical-evidence/_reports/server-identity.json` |

## How inventory was derived

Live registries — not a human checklist:

- `EDITOR_COMMAND_REGISTRY`
- `OBJECT_CAPABILITY_REGISTRY`
- `appearanceCategoriesForFamily`
- `EFFECT_RECIPES`
- Starter preset packs + `INSERT_SURFACES`

Manifest: `tmp/owner-sim-physical-evidence/_manifest/interaction-manifest.json`

## Physical rules enforced

Ordinary click / fill / pointer drag only. No `force:true` normal path. No DOM overlay deletion. No `page.evaluate` editor mutation. No injected document JSON.

## Physical certification executed (final code)

```text
OWNER_SIM_PHYSICAL_CERT=1 BASE_URL=http://127.0.0.1:3000
npx playwright test e2e/owner-simulation-physical-certification.spec.ts --workers=1
→ 2 passed
→ verdicts: 21 VERIFIED / 0 PARTIAL / 0 BROKEN
```

Harness: `e2e/owner-simulation-physical-certification.spec.ts` + `e2e/owner-sim/*`  
Evidence: `tmp/owner-sim-physical-evidence/`  
Latest run log: `tmp/owner-sim-physical-run14.log`

### Domains VERIFIED

selection-and-scope · physical-transforms (drag+resize+rotate) · appearance · effects (7 distinct glyph signatures) · libraries · nested-editing · groups · preset-truth · drawer-transitions · persistence (preview/live/save/reload) · responsive · accessibility · post-insert Text still canvas-clickable · first-use inserts for text/icon/button/badge/coupon/ticket

### Manual Owner exploration (beyond script)

Against the same verified server: Blank Card → Card Root chrome → Text library open while Root retained. Color first-use and insert stacking also exercised earlier in the same session family. No new systemic control-promise defects found after the placement repair beyond deferred chrome debt below.

## Systemic defects found by certification → repaired → retested

1. View toolbar stole pasteboard clicks → pointer-events ownership
2. Blank Card / Card Root selection races → empty rootComposition + selection ownership
3. Deep-left host close raced sibling opens → host ownership guard
4. Deep-left dismissed on canvas click → correct `data-composition-node` attrs
5. Appearance toggled closed when already nested → force-open
6. Stale Group content notice after Ungroup → clear notify
7. Effect signatures measured wrong painted node → glyph CSS + `data-effect`
8. Large inserts buried earlier Text (canvas click blocked) → shared `findAvailableObjectPlacement` minimize-overlap / open-band placement (`lib/fusion/card/object-kernel.ts`); sibling consumers = all `insertObject` library paths; physical retest → `selection.post-insert-text-reachable` VERIFIED

## Remaining debt (not blocking candidate)

| Item | Status |
| --- | --- |
| Next.js hydration overlay (`components/ui/label.tsx`) in edit | DEFERRED polish |
| Dense variation tab strip in long demo sessions | DEFERRED workspace chrome |
| Exhaustive every-slider / every-preset tile | DEFERRED — representative samples VERIFIED |

## Closeout question

> If I had not written this code, and nobody explained its architecture to me, would the visible interface behave consistently enough that I could trust what each control is going to do?

**Yes enough for candidate status** — core Owner doors behave through ordinary visible interaction on the verified current Studio. Human verification still required.

---

## Final declaration

**CREATIVE STUDIO OWNER-SIMULATION  
PHYSICAL INTERACTION CERTIFICATION CANDIDATE**

**— HUMAN VERIFICATION REQUIRED**
