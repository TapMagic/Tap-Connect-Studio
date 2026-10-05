# Studio Composition / Button Foundation Audit

Status: complete before implementation. Scope: the accepted Studio reconstitution branch at Slice 3.

## Governing decision

Standard Button is one rich, directly editable Host primitive. Its Content composition, Action, Appearance, and Placement remain distinct. Appearance is resolved by the shared Material Engine; Standard Button does not create a second fill/depth renderer. Cabinet Noir remains a distinct certified Curated system. Ember remains inactive.

## Authority inventory

| Existing system | Classification | Decision |
| --- | --- | --- |
| `button-composition.ts` canonical label/icon/description model | KEEP | It is the wording/content authority and is already used by the common renderer. |
| `material-engine.ts` + `MaterialSurfaceLayers` | KEEP / MIGRATE INTO | This is the strongest live editable surface authority and the only production-grade basis for Standard materials. |
| Current Standard catalog (`brand-primary`, `full-width-cta`, `icon-label`) | ADAPT | Preserve useful semantic jobs and IDs; expand the family around a single appearance contract. |
| `RichTapButton` and public `tap.css` states | REFERENCE ONLY | Reuse interaction and focus lessons through the common renderer, not a parallel Studio component. |
| Top Shelf Premium Action | REFERENCE ONLY | Good depth/rim lessons; remains a separate curated bridge and is not a Standard authority. |
| Cosmic Glass Signature | REFERENCE ONLY | Useful optical treatment; remains Signature. |
| Arc / Ember PNG master | REFERENCE ONLY | Flattened master artwork cannot become an editable Standard surface; Ember stays inactive. |
| Cabinet Noir asset recipe | KEEP DISTINCT | Certified structural assets and semantics are intentionally separate and unchanged. |
| Visual Parts button depth fragments | DEPRECATE AS AUTHORITY | Current depth parts are thin/forked. They may not displace the shared Material renderer. |

## Ten-question audit

1. **What is the canonical ordinary Button renderer?** `CreativeCompositionCanvas` → `NodeVisual` → shared button content + `MaterialSurfaceLayers`.
2. **What owns wording and icon order?** `button-composition.ts`; Appearance must not rewrite it.
3. **What owns Action?** Existing action fields and action helpers; presets must preserve them.
4. **What owns surface material?** `material-engine.ts` and `material-surface.ts`.
5. **Which prior surface is product-grade and editable?** The shared Material Engine (audit class A), not flattened Signature imagery.
6. **Which prior systems are structurally distinct?** Cabinet Noir, Arc/Ember, Cosmic, and Top Shelf.
7. **Can a preset introduce a parallel renderer?** No. Every Standard preset resolves to editable common props.
8. **How is real depth represented?** Explicit face elevation/side-wall geometry plus shared highlights, inner shadow, edge, and shadow—not a giant shadow alone.
9. **How are interaction states governed?** The common semantic anchor/button owns hover, active, focus-visible, disabled, and reduced-motion behavior.
10. **What must remain invariant during Appearance edits?** Label/content tree, accessible label source, action type/target, identity, and placement.

## Result

The implementation may add semantic Geometry, Edge, Depth, Shadow, Material, and preset controls, but they must compile into the common renderer. There is no authorization to alter Cabinet Noir, activate Ember, or create another media/material library.
