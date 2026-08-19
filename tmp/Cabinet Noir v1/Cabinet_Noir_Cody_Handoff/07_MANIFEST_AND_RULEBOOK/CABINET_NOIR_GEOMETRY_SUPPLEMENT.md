# Cabinet Noir Certified Geometry Supplement

Status: **GEOMETRY PASS — canonical record refresh complete**  
Measurement date: 2026-08-18  
Coordinate convention: half-open rectangles `[left, top, right, bottom)`; normalized coordinates use `x/W` and `y/H`.

This supplement measures the current certified Cabinet Noir production masters without modifying them. Detailed source dimensions, hashes, alpha bounds, per-asset geometry, and normalized values are in `CABINET_NOIR_GEOMETRY_METADATA.json`.

## Certification tolerance

- Structural strides and destination centers are deterministic; no cumulative drift is allowed.
- A 2 source-pixel antialiasing-envelope difference may pass when the runtime deviation is below 0.5 px and produces no visible seam, clipping, or safe-area failure.
- Repeat assets use 0 px preferred overlap. The 1–2 px tests are evidence only and are not compensating layout rules.
- Large compensating overlap is prohibited.
- Furniture-edge masks use `alpha > 32`; full fringe inspection uses `alpha > 0`.

## 1. CN-043 one-paired-level repeat certification

- Source: `CN-043 — TWIN-RAIL REPEATABLE CENTER-SPINE SEGMENT 2.png`
- Dimensions/mode: 1024×1536 RGBA
- Alpha range: 0–254; real transparency present
- SHA-256: `45272b4d5b3e2676eeb4fc28a692771a6dc083527b7f2beb1c29d541d90bbdea`
- Top continuation: present at `y=0`; full fringe X `[473,555)`
- Bottom continuation: present at final row `y=1535`; full fringe X `[463,558)`
- Transparent terminal band: none
- Material centerline: `x=513 px = 0.500976563W`
- Top alpha-weighted center: `513.2513 px`
- Bottom alpha-weighted center: `512.6335 px`
- Center delta: `0.6178 source px`, or `0.1456 px` after runtime scaling
- Material terminal profiles (`alpha > 32`): top `[475,552)`, bottom `[474,553)`; the one-pixel-per-edge difference is within the declared antialiasing tolerance
- Native-to-runtime scale: `362/1536 = 0.235677083333`
- Runtime width: `241.333333 px`; runtime stride: exactly `362 px`
- Required compensating overlap: `0 px`
- Tiling: PASS at 0, 1, and 2 px test overlap; 0 px is authoritative
- CN-042 lockstep: PASS; both components advance exactly 362 px per paired level

Result: **PASS** against the one-paired-level repeat contract.

Proof: [`GEOMETRY_PROOFS/CN-043_REPEAT_CONTRACT.png`](GEOMETRY_PROOFS/CN-043_REPEAT_CONTRACT.png)

## 2. Action semantic sockets and live text — CN-002 through CN-005

All four masters are 2172×724 RGBA. The socket faces were measured as the largest connected Midnight Navy face component. Complete-plug placement was then derived by mapping CN-012's measured face to each action face with uniform contain scaling.

| Asset | Variant | Socket face px | Center px | Complete chassis destination px | Live-text rectangle px | 390 px text area |
|---|---|---|---|---|---|---|
| CN-002 | Hero Right | `[1693,215,1990,510)` | `(1841.5,362.5)` | `[1572.093,99.364,2115.924,624.633)` | `[250,250,1450,400)` | `215.47×26.93` |
| CN-003 | Hero Left | `[156,194,454,506)` | `(305,350)` | `[34.686,85.978,580.348,613.015)` | `[650,245,1850,395)` | `215.47×26.93` |
| CN-004 | Standard Left | `[190,223,434,459)` | `(312,341)` | `[90.669,124.821,537.453,556.355)` | `[600,270,1800,410)` | `215.47×25.14` |
| CN-005 | Standard Right | `[1746,215,2011,471)` | `(1878.5,343)` | `[1638.120,108.215,2123.356,576.889)` | `[350,265,1500,405)` | `206.49×25.14` |

The action faces differ beyond the 2 px source tolerance. Hero and Standard, and their left/right versions, therefore do **not** share one numeric rectangle. They share `semanticPlugSocket@1.0.0` with four explicit placement variants; runtime mirroring is not used.

The live-text rectangles are calm, exclude plug furniture by 63–138 source px, and support one DOM-text line at 14–16 px with 18–20 px line-height at 390 px Card width. Two-line action labels are not certified by these rectangles.

Proof: [`GEOMETRY_PROOFS/ACTION_SOCKET_TEXT_GEOMETRY.png`](GEOMETRY_PROOFS/ACTION_SOCKET_TEXT_GEOMETRY.png)

## 3. CN-012 inserted-content contract

CN-012 distinguishes the complete semantic-plug chassis from content inserted inside it.

- Source: 1278×1230 RGBA
- SHA-256: `6030cc1abf6de4ae3c18b90074da48150e647a15a21dc3c1ce1c3bc376ec6ce4`
- Complete chassis bounds: `[96,65,1180,1112)`; normalized `[0.075117,0.052846,0.923318,0.904065)`
- Inserted-content face: `[337,310,929,869)`; normalized `[0.263693,0.252033,0.726917,0.706504)`
- Face center: `(633,589.5)`; normalized `(0.495305,0.479268)`
- Conservative inserted-symbol safe rectangle: `[411,380,855,799)`; normalized `[0.321596,0.308943,0.669014,0.649593)`
- Recommended face inset: 74 px horizontal and approximately 70 px vertical
- Fit: uniform `contain` inside the 444×419 safe rectangle
- Permitted reviewed overflow: from the safe rectangle to the measured face only; no bevel/frame crossing or clipping

Complete stock plugs use the action placement geometry. Newly inserted symbols/logos use the CN-012 internal safe area. These are separate concepts in metadata.

## 4. Identity socket — CN-037 variants

All variants are 1536×1024 RGBA. Inner-ring radii were measured radially from the uninterrupted dark identity face.

| Variant | Socket center px | Radius px | Socket bounds px | Bridge anchor px |
|---|---:|---:|---|---:|
| CN-037 | `(760,470)` | `237` | `[523,233,997,707)` | `(768,841)` |
| ALT-A1 | `(765,465)` | `237` | `[528,228,1002,702)` | `(768,836)` |
| ALT-A2 | `(760,470)` | `256.5` | `[503.5,213.5,1016.5,726.5)` | `(768,889)` |
| ALT-A3 | `(765,480)` | `266.5` | `[498.5,213.5,1031.5,746.5)` | `(768,916)` |

The visible socket envelopes are not pixel-identical, but all contain one conservative shared content-safe circle: center `(763,470)`, radius `190 px`. At 390 px Card width its diameter is approximately `96.48 px`. Thus all four genuinely share `identityHeaderSocket@1.0.0` while retaining asset-specific socket/bridge transforms. Content uses uniform contain scaling; clipping and frame overlap are disallowed.

Proof: [`GEOMETRY_PROOFS/IDENTITY_SOCKET_GEOMETRY.png`](GEOMETRY_PROOFS/IDENTITY_SOCKET_GEOMETRY.png)

## 5. Structural attachment contracts

The assembly coordinate system has logical width 2172 px. Structural furniture maps its measured terminal centers to the certified rail centers rather than assuming equal native widths.

### Single Stack

- Certified rail centers: X `120` and `2052`; normalized `0.055248619W` and `0.944751381W`
- Action/CN-039 cadence: 724 px; row-lock Y `362`; preferred overlap 0
- CN-038 measured outer terminal centers: `231.210` and `1672.361`; map scale `1.340595`, translate X `-189.959`; terminal Y `650` attaches above the first action row
- CN-038 crown socket anchor: `(952.5,357)`
- Action row and CN-039 interval share X center and advance together by 724 px
- CN-040 measured top terminal centers: `120.308` and `1551.125`; map scale `1.350278`, translate X `-42.450`; source attachment Y `136`
- CN-041 is optional, centered, non-structural furniture; source top-material Y `29`
- Z-order: rails/bridges behind action DOM content; plug and live-text layers remain above furniture

### Twin Rail

- Outer rail centers: X `120` and `2052`; center spine: X `1086`
- Each action master scales to `0.5` in paired layout, making a 1086×362 half-row
- Paired action, CN-042, and CN-043 all advance by 362 px
- CN-044 outer terminal centers: `85.178` and `1688.279`; center terminal `885.392`; map scale `1.205164`, translate X `17.347`; source attachment Y `760`
- CN-044 crown socket anchor: `(887,135)`
- CN-045 top terminal centers: `116.337`, `1085.518`, `2054.740`; deviations at phone scale remain below 0.7 px and are resolved by the declared attachment transform
- Odd layout: stop CN-043 after the final complete pair, render the legitimate full-width action, attach CN-010 as non-action furniture, then CN-045

Proof: [`GEOMETRY_PROOFS/STRUCTURAL_ATTACHMENT_ANCHORS.png`](GEOMETRY_PROOFS/STRUCTURAL_ATTACHMENT_ANCHORS.png)

## 6. Final CN-042 registry-ready contract

- Source: 2172×362 RGBA
- SHA-256: `39972ed76575213469916dcdc2744ea1367533c0ee1f7d895edecb430c350a08`
- Left/right rail centerlines: `120 / 2052 px`; normalized `0.055248619 / 0.944751381`
- Top continuation points: `(120,0)`, `(2052,0)`
- Bottom continuation points: `(120,362)`, `(2052,362)`
- Paired-level junction center: `y=181 = 0.5H`
- Material-clear center corridor (`alpha > 8`): X `[181,1989)`; normalized `[0.083333333,0.915745856)`
- Left plug-clearance envelope after reserving the CN-043 canvas: `[181,0,965.078,362)`
- Right plug-clearance envelope: `[1206.411,0,1989,362)`
- Runtime stride: 362 px; preferred overlap 0
- Terminal rows are congruent and tile at 0–2 px test overlap

## 7. Stock plug fit — CN-013 through CN-036

All 24 production plugs pass one shared `cabinetNoirStockPlugFit@1.0.0` algorithm:

1. measure the source's exterior chassis bounds;
2. uniformly contain-fit those bounds to the destination action chassis rectangle;
3. align the measured chassis centers;
4. allow only low-alpha glow outside the chassis destination; and
5. clip nothing structural and intrude into no certified action text rectangle.

Nineteen assets use a 1254×1254 source. Dimension exceptions are CN-016 `1312×1199`, CN-024 `1278×1230`, CN-027 `1276×1233`, CN-031 `1271×1238`, and CN-033 `1262×1246`. These source differences are handled by measured chassis normalization, not bespoke runtime contracts. Exact alpha/chassis bounds and hashes for every plug are recorded in the JSON metadata.

Proof: [`GEOMETRY_PROOFS/STOCK_PLUG_FIT_GEOMETRY.png`](GEOMETRY_PROOFS/STOCK_PLUG_FIT_GEOMETRY.png)

## 8. Phone-scale validation at 390 px Card width

- Logical 2172 px scale: `0.179558011`
- Hero live-text areas: `215.47×26.93 px`
- Standard live-text areas: `206.49–215.47×25.14 px`
- Complete semantic plug chassis: approximately `80.22–97.98 px` wide and `77.49–94.63 px` high
- CN-037 common identity safe diameter: `96.48 px`
- CN-011 informational calm height: `28.01 px`; its existing 14–16 px / 18–20 px single-line certification remains valid
- Single-Stack outer rail centers: `21.55 px` and `368.45 px`
- Twin-Rail CN-043 visible material width: approximately `4.15 px`; its full transparent placement canvas reserves `43.33 px`
- Single-Stack and Twin-Rail structural centers remain aligned within the phone-scale 0.5 px visibility tolerance

Result: **PASS** for the requested representative phone-scale geometry.

## 9. Exceptions and record refresh

- Action masters require four numeric placement variants; no runtime mirroring is allowed.
- CN-037 variants have different measured inner-ring radii and bridge-anchor Y positions but share the conservative common safe circle.
- Stock plugs have five source-dimension exceptions; one chassis-normalization algorithm remains sufficient.
- No new visual asset defect was found.
- The packaged handoff CN-043, SHA list, manifest, audit, geometry certification, and implementation handoff now reference the certified `45272b4d...bbdea` authority. The failed `598d9800...7046b` candidate is not runtime-eligible authority.

## Final decision

Family-wide measured geometry: **PASS**. The geometry metadata is suitable for the family-neutral registry. The canonical CN-043 record refresh is complete.

**CABINET NOIR SLICE 2 METADATA GATE CLEARED**
