# Object Interaction Behavior Matrix

| Target | Select / move | Resize / rotate | Content | Appearance | Action / Motion | Parent-child behavior |
| --- | --- | --- | --- | --- | --- | --- |
| Card page | Click neutral page; no pasteboard confusion | Bottom handle, exact height, Fit to content; no rotation | Root Elements | Card background/surface | Document behavior only | Root parent; Utility Layer separate |
| Text | Click, Layers, keyboard; free x/y | Reflow by default; rotation supported | Direct inline edit and Text controls | Glyph-first; optional box/frame | Optional Action and Motion | Ordinary Element at root or in Container |
| Image / Logo | Visible hit target; click or Layers | Ratio locked by default; crop is Content | Replace, crop/fit, focal point, adjust | Frame, border, corners, shadow/glow | Optional Action and Motion | Never projected as an unselectable background |
| Icon | Click or Layers | Ratio resize and rotate | Icon/vector choice | Fill, stroke, backing surface, effects | Optional Action and Motion | Ordinary Element; Button icon may inherit parent Action |
| Badge | Parent selects badge; wording selectable in Content mode | Fit content or proportional | Real Text wording and optional Icon | Shape/material/fill/border/shadow/glow | Optional Action and Motion | Editable composition, not flattened artwork |
| Button | Parent selects whole clickable region | Reflow/Fit content; rotation when supported | Content mode exposes label/icon/description | Parent surface and states | Parent owns primary Action; Motion supported | Child Text/Icon use shared capabilities; exit returns parent |
| Coupon / Ticket | Parent selection and direct child selection in Content mode | Reflow default; scale/frame/fit selectable | Text, artwork, QR, terms, Button children | Parent surface/frame; child-relevant controls | Governed parent and deliberate child Actions | Empty media/QR setup is edit-only |
| Gallery | Parent selectable; media children in Content mode | Resize frame or custom responsive | Add/remove/reorder/crop/caption | Frame/background/border/corners/gap/shadow | Image Action only where deliberate | No Text-only effects on parent; no empty Preview slots |
| Map | Parent selectable | Resize frame | Location/setup/fallback | Frame-relevant appearance | Directions or configured Action | No legacy Inspector/setup form |
| Form | Parent selectable | Reflow/custom responsive | Heading, labels, fields, consent, Submit Button | Surface/layout | Submit behavior only if safe backend is wired | No claim of live submission otherwise |
| Container / Section | Select surface or Layers; move as parent | Size, Fit content; no implicit child scaling | Children remain ordinary Elements | Surface, padding, gap, layout | Deliberate parent Action only | Free/Stack/Row/Grid; remove container keeps children |
| Group | Select group; collective move | Proportional resize and rotate | Child identities preserved | Only supported group appearance | One optional parent Action | Ungroup restores children without data loss |

## Universal selection rules

- Hit testing follows visible z-order; transparent parent areas do not shield children.
- Hidden objects never intercept. Locked objects remain discoverable in Layers and behave consistently on canvas.
- Shift-click adds to selection; selection changes create a new generation-safe reference.
- Every selected target presents an accurate boundary, compatible handles, name/type, parent context, and target-relevant toolbar.
- Escape, neutral pasteboard click, selection change, tab change, and Preview close focused panels.

## Control routing rules

- Toolbar Appearance, left-route Appearance, and More → Appearance resolve the same selection and capability mutation.
- Replace opens media choice; Crop/Fit opens crop controls; Adjust opens image adjustments; Appearance opens frame controls.
- No ordinary command opens `CardComposerInspector`, `SelectionPanelStack`, a Button Contents form, or a permanent right-hand inspector.
- The common More menu hides unsupported commands and never falls back to the last selected object.
