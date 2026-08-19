# Cody Implementation Handoff — Cabinet Noir

## Assignment

Integrate Cabinet Noir into TapConnect Studio as a **registry-driven Signature family** and use it as the stress test for the reusable editor/component architecture.

This is not permission to redesign the assets.

## Non-negotiable first rule

**Do not rebuild these images in CSS/SVG/Canvas. Do not redraw them. Do not mirror left/right masters. Do not flatten live text into the PNGs.**

Use certified PNG assets as visual furniture and implement live content/behavior using normal accessible DOM/UI layers and canonical action models.

## What is production vs reference

- Folders 01–05 contain deployable/certified furniture or plug assets.
- Folder 06 contains certified visual presets/references. They demonstrate intended assembled appearance; runtime should prefer modular assembly contracts where provided.
- Folder 99 is quarantined. Never register those assets.

## Required implementation sequence

### 1. Asset registry
Register family/component metadata without hardcoding Cabinet Noir throughout the editor.

Minimum contract:

```ts
interface SignatureComponentDefinition {
  familyId: string;
  familyVersion: string;
  componentId: string;
  componentVersion: string;
  role: 'hero'|'standard-action'|'semantic-plug'|'identity-topper'|'bridge'|'rail'|'center-spine'|'bottom-cap'|'finisher'|'preset';
  assetUrl: string;
  socketContract?: 'semanticPlugSocket@1.0.0'|'identityHeaderSocket@1.0.0';
  liveContentContract?: 'informationalLine@1.0.0';
  side?: 'left'|'right'|'none';
  repeatable?: boolean;
  layoutCompatibility: string[];
  finishId: string;
  entitlementKey: string;
  certified: boolean;
  lifecycle: 'production'|'reference'|'superseded'|'duplicate';
  runtimeEligible: boolean;
}
```

Use the repository’s existing registry/domain conventions if an equivalent contract already exists; do not create a parallel system.

### 2. Socket overlays
Implement logical insertion layers for:
- `semanticPlugSocket@1.0.0`
- `identityHeaderSocket@1.0.0`

Socket coordinates/safe areas must be metadata-driven. Do not crop/guess anew at each use site.

### 3. Live action content
Action label, optional Hero subline, destination, accessibility label, analytics binding, state and entitlement remain canonical live data.

Furniture PNGs are presentation only.

### 4. Variable single stack
Implement deterministic composition:

`CN-037 Crown → CN-038 Bridge → action row → repeat (CN-039 + next action row) → CN-040 Bottom Cap → optional CN-041 Decorative Pedestal`

CN-039 is one native Standard Action cadence with a 724 px stride and zero preferred overlap.

Row operations:
- add
- delete
- reorder
- duplicate
- hide/disable where the broader editor supports it

No empty holes. Structure grows/shrinks with the row list.

### 5. Variable Twin-Rail
Implement deterministic composition:

`CN-037 Crown → CN-044 Twin-Rail Crown Bridge → paired action level → repeat (CN-042 + CN-043 + next paired level) → CN-045 Twin-Rail Bottom Cap`

CN-042 is one native paired-level cadence with a 362 px stride and zero preferred overlap.

Locked plug direction:
- left column = LEFT exterior plug
- right column = RIGHT exterior plug

Center seam remains plug-free.

Odd action count uses the certified odd-row strategy, not a fake disabled action: finish complete pairs, terminate the center spine, render the legitimate final action full-width, place non-action CN-010 beneath it, then close with CN-045. CN-010 receives no label, destination, analytics, accessibility action, or interactive state. Three and five actions may proceed toward certification; seven actions remain structural-proof-only.

### 6. Entitlements
Canonical key: `signature.family.cabinet_noir`.

- Admin/internal and seeded demo/test: visible, selectable, publishable.
- Non-entitled: visible but locked; not selectable and not publishable.
- Existing published Cabinet Noir Cards remain live after entitlement loss.
- Existing restricted objects remain visible but read-only.
- New insertion/restricted replacement is blocked after entitlement loss.
- New publication containing restricted Cabinet Noir requires restored entitlement or replacement with an entitled family.
- Public rendering never checks current entitlement; server-side new-publication enforcement is mandatory.

Do not fork editor behavior or duplicate family definitions by plan, and do not bind Cabinet Noir to final marketing-plan names.

## Important production decisions

- CN-036 is Google G; source filename was normalized from `CN-36...`.
- CN-037 is the circular Identity Crown family with Base + A1/A2/A3 certified furniture variants.
- Final CN-043 production authority is the certified center-spine file in folder 02 with SHA-256 `45272b4d5b3e2676eeb4fc28a692771a6dc083527b7f2beb1c29d541d90bbdea`. Prior hashes are not runtime-eligible authorities.
- CN-040 duplicate source was byte-identical and is quarantined.
- Current certified material authority is Champagne Gold + blackened gunmetal, Obsidian body, Midnight Navy semantic socket face.
- Additional metal finishes discussed are **not certified by this pack** until visually manufactured/tested.
- Exact approved color token values must come from the existing Studio color chart; do not invent hex values from these rendered PNGs.
- CN-001 is a standalone selectable Identity Topper / Brand Crest. It is not part of the CN-037 dynamic crown assembly.
- CN-011 implements `informationalLine@1.0.0`: optional centered single-line live text (`text: string | null`), no wrapping, plug, destination, or action semantics. Certified live-text bounds are x=326–1846 and y=284–440.
- CN-011, CN-039, CN-042, and CN-043 replacement certification is PASS; canonical hashes and geometry are recorded in `../07_MANIFEST_AND_RULEBOOK/GEOMETRY_CERTIFICATION.md`.

## tApIt contract

tApIt manufactures content **for** a known socket; it does not regenerate furniture.

Custom logo example:
1. Host selects CN-037 topper variant.
2. Studio sends source logo + `identityHeaderSocket` safe-area + production mode + finish/base metadata.
3. At initial launch, tApIt returns Exact Asset identity content. Styled Preserve remains architecturally defined but implementation-deferred.
4. Returned identity content is placed into the existing CN-037 socket.
5. CN-037 PNG is unchanged.

Semantic custom plug follows the same pattern using `semanticPlugSocket` and CN-012 geometry.

## Lighting implementation warning

Do not add runtime neon/LED strips to compensate for seams. The masters already contain material lighting. Any runtime gap/shadow treatment should be subtle and source-coherent; repeated rows must not look like identical illuminated shelf strips.

## Accessibility

- PNG furniture is decorative (`aria-hidden=true`) unless it conveys required state.
- Live labels are actual text.
- Actions are actual buttons/links with canonical accessible names.
- Icon-only semantics must have accessibility labels.
- Focus states must be visible without destroying the family appearance.

## Responsive/phone rules

- Phone preview is the authority for component density.
- Do not scale below practical tap target/readability limits merely to fit a preset.
- Twin-Rail is a density option, not permission for illegible labels.
- Preserve outside breathing room.

## Acceptance criteria for initial integration

1. User can select Cabinet Noir from the appropriate drawer when entitled.
2. Hero Left/Right and Standard Left/Right render from certified assets without mirroring.
3. User can select a stock semantic plug and swap it without changing action destination/text.
4. User can select CN-037 crown variant and insert identity content independently.
5. Single-stack row add/delete/reorder changes rail repetition and bottom-cap position with no phantom gaps.
6. Twin-Rail paired-row add/delete changes CN-042/CN-043 repetition with center seam preserved.
7. Optional CN-041 pedestal toggles without affecting row model.
8. Live labels remain editable and accessible.
9. Save/reload preserves component IDs, variant choice, plugs, row order and destinations.
10. Tier entitlements hide/disallow assets through registry metadata rather than duplicated code.
11. No asset in `99_SUPERSEDED_DO_NOT_DEPLOY` is registered.
12. Visual QA on a phone-sized preview resembles certified presets without requiring a baked full-stack preset.

## Do not do yet

- Do not manufacture new metal finishes from CSS filters.
- Do not create more Cabinet Noir PNGs to cover arbitrary row counts.
- Do not add a Cabinet-Noir-specific editor shell.
- Do not add POS/campaign/referral logic as part of this visual integration slice.

The editor comes next. Cabinet Noir should prove the editor architecture can support premium reusable families without special-case spaghetti.
