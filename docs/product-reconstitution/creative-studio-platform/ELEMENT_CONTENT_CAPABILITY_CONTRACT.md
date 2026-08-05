# Element, Content, and Capability Contract

## Canonical model

The Card page is the published root coordinate plane. Every ordinary authorable object is one Element shell; Content is data rendered inside that shell. A Container/Section is optional. The pasteboard and Utility Layer are not creative roots.

```text
Pasteboard (editor only)
└── Card page (published root)
    ├── Elements and Components
    ├── optional Containers / Sections
    │   └── Elements and Components
    ├── Groups
    └── governed Utility Layer
```

An Element shell owns identity, parentage, geometry, z-order, visibility, lock state, accessibility, tracking, optional Action, optional Motion, and responsive/resize policy. Content owns wording, media, vector data, crop/focal state, and component child data. Geometry controls must not mutate Content; Content controls must not invent another transform model.

## Capability groups

| Capability | Canonical responsibility |
| --- | --- |
| Content | Text, media reference, vector data, component data, nested children |
| Appearance | Glyph/frame/surface fill, border, corners, shadow, glow, relevant effects, opacity, states |
| Transform | x/y, width/height, rotation, aspect policy, alignment, distribution, layer |
| Layout | Free, Stack, Row, Grid, padding, gap, alignment, distribution |
| Motion | Preset, trigger, speed, intensity, delay, repeat, reduced-motion fallback |
| Action | Type, destination, accessible label, tracking name, open behavior, test/change/remove |
| Responsive | Anchors, constraints, stacking and customer-device behavior |
| Visibility | Hidden state and future governed conditions |
| Accessibility | Alternative text/label, reading and keyboard behavior, contrast warning |
| Tracking | Event name, source metadata, Tap Trace hook |

The capability registry is authoritative. UI entry points may differ, but target resolution and mutation functions may not.

## Resize policies

- `scale_proportionally`: Image, Logo, Icon, QR, Video, decorative Group.
- `reflow_content`: Text, Form, structured Container, default Coupon/Ticket, compatible Button.
- `resize_frame`: Gallery, Map, image frame.
- `fit_content`: Button, Badge, Container, Coupon, Ticket.
- `scale_composition`: Coupon, Ticket, deliberate visual composition.
- `custom_responsive`: complex Components and Forms.

The active policy is persisted and visible under Size/Advanced. Side resizing a Text Element reflows; it does not silently change font size. Component resize code must update parent and children as one transaction according to the selected policy.

## Action ownership

An Action is optional behavior on a compatible Element or Group. Text and Image do not become new object species when made actionable. A Button parent normally owns its Action; label and icon children inherit it. Separate actionable children are allowed only with distinct visible hit regions. Adding one inside an actionable parent requires an explicit warning and must never create an invisible overlapping target.

## Insertion and contrast

Default insertion targets the Card root, cascades visibly without exact overlap, preserves prior objects, selects the new object, and creates one history transaction. Text color is chosen against the Card background. Empty media may use an edit-only placeholder, which is excluded from Preview/Public.

## Persistence

Canonical new writes use the Card root or Container composition arrays. Legacy fields may be adapted on read only. Draft saving preserves identity, page height, parentage, child content, geometry, Actions, styles, and selection-independent data. Published revisions remain immutable.
