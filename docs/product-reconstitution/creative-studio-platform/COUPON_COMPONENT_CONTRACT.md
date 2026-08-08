# Coupon Component Contract

**Composition builder:** `lib/fusion/creative-studio/coupon-composition.ts`  
**Starters:** `STARTER_COUPON_LAYOUTS`  
**Renderer:** layout-aware branch in `creative-composition-canvas.tsx`  
**Content editor:** `data-testid="coupon-content-editor"`

## Required layouts

| Geometry | Structure |
| --- | --- |
| `retail_card` | Offer, Headline, Description, Code, Expiration, Terms, CTA |
| `perforated_stub` | Offer region + perforation + stub (code/QR/expiration) |
| `split_image` | Image region + content region |
| `qr_first` | Dominant QR + offer + code + instructions |

Thumbnails use `couponThumbnailSignature` / layout regions so tile ≠ generic identical gradient.

## Appearance

Coupon parent Surface uses shared engines:

- Fill / `gradientFill` / GradientStudio
- Border (`borderWidth` / style / color / None)
- MaterialRecipe via Appearance
- Effects / opacity via `surfaceShadowCss`

Material/gradient/border changes must not reflow child layout geometry.

## Edit Contents

Mutates real `contentComposition` children and parent mirror props (`offerValue`, `headline`, `code`, …). No second hidden copy of coupon copy fields.
