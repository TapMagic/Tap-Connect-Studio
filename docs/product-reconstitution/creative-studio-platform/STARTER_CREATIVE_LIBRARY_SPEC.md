# Starter Creative Library Spec

Status: repair candidate — human verification required.

## Strategy

Modest, polished, structurally varied launch catalog. Not an exhaustive original design system. Versioned preset registry allows future TapConnect design packs without editor architecture changes.

## Universal preset requirements

Every preset must:

- use canonical editable Elements;
- remain fully editable after placement;
- contain no overlap or clipping;
- pass responsive checks;
- use one Undo transaction;
- appear correctly in Layers;
- render cleanly in Preview;
- survive save/reload.

## Minimum catalogs

### Text combinations — 8+

1. Editorial serif  
2. Script plus sans  
3. Bold stacked retail  
4. Outlined sport  
5. Neon  
6. Beveled / dimensional  
7. Luxury minimal  
8. Playful offset composition  

Variation must include hierarchy, pairing, sizing, spacing, effects, shapes, Icons, or Dividers — not only color.

### Buttons — 8+

minimal, outlined, pill, round Icon, glass, high-gloss, metallic, neon

### Badges — 8+

pill, burst, ribbon, seal, shield, neon, metallic, glass

### Coupons — 4 structurally different

1. Clean retail card  
2. Perforated coupon stub  
3. Split-image promotion  
4. QR-first claim card  

### Tickets — 4 genuine ticket layouts

1. Admission stub  
2. VIP pass  
3. Raffle ticket  
4. Wallet-style event pass  

Do not reuse Coupon geometry with different wording.

### Dividers — 4+

### Forms — 4+

### Containers — 4+

## Registry

Presets live in a versioned starter registry (`version: 1`) keyed by family and id, with props/nodes that place through existing insert paths. Future packs append new versions/collections without changing Universal Editor kernels.
