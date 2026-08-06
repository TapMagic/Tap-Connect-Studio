# Preset Insertion Quality Matrix

Status: assembly candidate — human verification required.  
Starting SHA: `54fada53deb351a8edc7081b3b1ac448bdd378ae`

## Required geometry declaration (every preset)

| Field | Purpose |
| --- | --- |
| initial parent width / height | Usable first paint |
| min width / height | Resize floor |
| default layout mode | free / stack / row / grid |
| child geometry + min size | Non-overlapping children |
| padding / gap | Intentional spacing |
| layer order | Matches Layers |
| resize policy | reflow / frame / scale / fit-content |
| responsive behavior | Narrow fallback |
| overflow behavior | Clip vs grow |

## Rejection gate (before acceptance)

Reject when any of:

- unintentional child overlap
- Text clips
- Button covers copy
- terms leave bounds
- children overflow parent
- contrast fails
- library thumbnail differs materially from render
- design requires immediate manual repair

Premium means usable immediately.

## Page interaction

- Insert may extend Card page height as **one Undo** with the insert.
- Page extension must **not** scale existing children (`setRootPageHeightPreservingBounds`).
- Page resize must never invoke Container resize policy.

## Starter matrix

### Premium Container presets (`SECTION_PRESET_LIBRARY` → root Containers)

| Preset | Structure expectation | Disposition |
| --- | --- | --- |
| Blank Section | Empty layout surface | Keep |
| Premium Identity | Logo · name · support · badge | Quality-gated |
| Premium Hero | Media · headline · sub · Button | Quality-gated |
| Premium Offer | Badge · value · copy · media · terms · Claim | Quality-gated; may grow page |
| Premium Location | Address · hours · Map · Directions | Quality-gated |
| Premium Contact | Methods · Form · Save contact | Quality-gated |
| Premium Social Proof | Stars · quote · CTA | Quality-gated |
| Premium Product | Image · name · value · Button | Quality-gated |
| Premium Event | Title · date · RSVP · Ticket | Quality-gated |
| Premium Gallery | Gallery · caption | Quality-gated |

### Text combinations (structurally different)

editorial serif · script+sans · bold retail · outlined sport · neon sign · beveled dimensional · luxury minimal · playful offset · curved · retro shadow · wedding · professional · restaurant · event · Brand-derived

### Buttons (thumbnail parity)

minimal · outlined · pill · round icon · soft/hard raised · recessed · beveled · glossy · glass · frosted · metallic · chrome · enamel · neon · embossed · image

### Badges

Shapes: pill · circle · rounded · burst · starburst · ribbon · corner ribbon · seal · shield · tag · ticket · hexagon  
Materials: flat · raised · embossed · enamel · chrome · silver · gold · rose gold · copper · gunmetal · glass · glossy sticker · neon · stamped  
Post-insertion editing of shape/material/wording/icon required in any order.

### Coupons (4 structurally distinct)

| Id | Geometry |
| --- | --- |
| clean_retail_card | Clean retail card |
| perforated_stub | Perforated coupon stub |
| split_image_promo | Split-image promotion |
| qr_first_claim | QR-first claim card |

### Tickets (4 ticket-like, not Coupons)

| Id | Geometry |
| --- | --- |
| admission_stub | Admission stub |
| vip_pass | VIP pass |
| raffle_ticket | Raffle ticket |
| wallet_event_pass | Wallet-style event pass |

## Automated proof

1. Insert preset via visible UI.
2. Assert no unintentional child overlap (1px tolerance).
3. Assert page extend does not rescale prior objects.
4. Assert thumbnail-critical props match rendered Surface (radius, fill/gradient, label).
5. Preview + save/reload.

## Catalog ownership

Templates = complete Card templates + populated Container presets + saved templates.  
Build must not re-list the same preset catalog.
