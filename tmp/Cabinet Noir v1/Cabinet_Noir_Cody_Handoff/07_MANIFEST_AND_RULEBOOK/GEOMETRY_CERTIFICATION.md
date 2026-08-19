# Cabinet Noir Geometry Certification and Runtime Readiness

**Status:** PASS  
**Certification date:** 2026-08-17  
**Scope:** canonical Cabinet Noir Signature family masters and deterministic assembly contracts.

## Certified replacement authorities

| Asset | Source geometry | SHA-256 | Certified runtime contract |
|---|---:|---|---|
| CN-011 | 2172×724 RGBA | `98375c60b7fd240eda469f650bcf0d3bfc8d41df763f01b91d573868a31db990` | Live text `x=326–1846`, `y=284–440`; guarded lane `x=302–1870`, `y=260–464` |
| CN-039 | 2172×724 RGBA | `539f056571632cc93175079b4d96a0f1f2f39ad39663db05fe07b27fd2013c78` | One Standard Action cadence; stride 724 px; overlap 0 |
| CN-042 | 2172×362 RGBA | `39972ed76575213469916dcdc2744ea1367533c0ee1f7d895edecb430c350a08` | One paired-level cadence; stride 362 px; overlap 0 |
| CN-043 | 1024×1536 RGBA | `45272b4d5b3e2676eeb4fc28a692771a6dc083527b7f2beb1c29d541d90bbdea` | Uniform scale `362/1536`; one paired-level cadence; runtime stride 362 px; overlap 0 |

CN-039, CN-042, and CN-043 pass vertical tiling at 0, 1, and 2 px test overlap. Runtime uses 0 overlap. The 1–2 px results are seam-tolerance evidence only and must not become compensating layout offsets.

## Normalized geometry

Coordinates normalize against each asset's native width `W` and height `H`.

### CN-011

- Live-text rectangle: `x=0.150092W–0.849908W`, `y=0.392265H–0.607735H`.
- Guarded center lane: `x=0.139042W–0.860958W`, `y=0.359116H–0.640884H`.
- Recommended live-text width: `0.622468W`.
- Full live-text calm height: 156 source px; approximately 28.01 px at 390 px Card width.

### CN-039

- Left rail centerline: `x=0.055249W`.
- Right rail centerline: `x=0.944751W`.
- Continuations: top `y=0`, bottom `y=1.0H`.
- Row-lock center: `y=0.5H`.
- Repeat stride: `1.0H` = 724 source px.
- Preferred overlap: 0.

### CN-042

- Source aspect ratio: 6:1.
- Continuations: top `y=0`, bottom `y=1.0H`.
- Paired-level junction center: `y=0.5H`.
- Repeat stride: `1.0H` = 362 source px.
- Transparent center corridor and action plug-clearance envelopes remain clear under the certified master.
- Terminal-row pixel difference: 0.
- Preferred overlap: 0.

### CN-043

- Source centerline: `x=0.500976563W`.
- Continuations: top `y=0`, bottom final source row.
- Native-to-runtime scale: `362/1536 = 0.235677083333`.
- Runtime stride: 362 px, in deterministic lockstep with CN-042.
- Preferred overlap: 0; no compensating overlap required.

## Named contracts

- `semanticPlugSocket@1.0.0`: faceted/octagonal action plug; one LEFT or RIGHT socket per action; never mirrored at runtime.
- `identityHeaderSocket@1.0.0`: circular CN-037 identity aperture; shared by base/A1/A2/A3 crown furniture; does not consume an action socket.
- `informationalLine@1.0.0`: CN-011 optional centered one-line live text with no action semantics.
- `singleStackAssembly@1.0.0`: deterministic dynamic Single-Stack recipe.
- `twinRailAssembly@1.0.0`: deterministic paired-level Twin-Rail recipe including the approved odd-action branch.
- `signatureEntitlementResolution@1.0.0`: visibility/selectability/publication resolution for `signature.family.cabinet_noir`.

## Assembly contracts

### `singleStackAssembly@1.0.0`

`CN-037 → CN-038 → action row → (CN-039 + next action row)* → CN-040 → optional CN-041`

- Dynamic rows contain no phantom slots.
- Bound alternating order is LEFT / RIGHT / LEFT / RIGHT.
- CN-039 is repeat-only; CN-040 owns structural termination; CN-041 is non-structural decoration.

### `twinRailAssembly@1.0.0`

`CN-037 → CN-044 → paired action level → (CN-042 + CN-043 + next paired level)* → CN-045`

- Left-column plugs face the left exterior; right-column plugs face the right exterior.
- Center seam remains plug-free.
- CN-042/CN-043 are repeat-only; CN-044 owns top termination; CN-045 owns bottom termination.
- Odd count: complete pairs → stop center spine → full-width legitimate final action → CN-010 non-action transition → CN-045.
- Three and five actions may proceed toward certification. Seven actions are structural-proof-only.

## Runtime registry normalization proposal

Use the existing canonical Signature registry if it can represent this shape; do not create a Cabinet Noir-specific registry.

```ts
type SignatureComponentAuthority = {
  familyId: 'cabinet-noir';
  familyVersion: '1.0.0';
  componentId: string;
  componentVersion: string;
  role: string;
  lifecycle: 'production' | 'reference' | 'superseded' | 'duplicate';
  runtimeEligible: boolean;
  assetPath: string;
  sha256: string;
  sourceSize: { width: number; height: number };
  normalizedGeometry?: Record<string, number | string>;
  socketContract?: 'semanticPlugSocket@1.0.0' | 'identityHeaderSocket@1.0.0';
  liveContentContract?: 'informationalLine@1.0.0';
  side?: 'left' | 'right' | 'none';
  repeat?: { axis: 'y'; nativeStridePx: number; preferredOverlapPx: 0 };
  layoutCompatibility: Array<'single-stack' | 'twin-rail' | 'standalone'>;
  finishId: 'champagne-gold-blackened-gunmetal-v1';
  sourceMode: 'exact-asset';
  entitlementKey: 'signature.family.cabinet_noir';
  certification: { status: 'certified'; geometryVersion: '1.0.0' };
};
```

Only `lifecycle: production` entries under folders 01–05 are runtime-eligible. Folder 06 is reference-only. Folder 99 is never runtime-eligible or addressable from assembly metadata.

## Entitlement resolution

Resolve `visible`, `selectable`, and `publishable` independently. Existing public output remains renderable regardless of current entitlement. Enforcement for new insertion/replacement/publication occurs in the editor and server-side publication path; entitlement loss never breaks an existing public Card.

## Launch source mode

Cabinet Noir launches with `exact-asset` only. `styled-preserve` remains specified but deferred.

## Readiness conclusion

All prior geometry blockers are cleared. No certified repeat asset requires a large or compensating overlap. No quarantined or superseded asset is referenced by runtime metadata. Cabinet Noir is implementation-ready through the family-neutral Signature registry and deterministic assembly engine.
