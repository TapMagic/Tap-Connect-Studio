# Material catalog overload — recommendations (report only)

**Status:** Advisory. No catalog deletions performed in the Material pipeline repair assignment.

## Near-duplicate clusters (review later)

| Cluster | IDs | Notes |
| --- | --- | --- |
| Gloss family | `glossy`, `gloss_lacquer`, `high_gloss`, `enamel` | Overlapping red/orange gloss recipes; lacquer is the strongest multi-stop + highlight reference |
| Glass family | `glass`, `frosted_glass`, `clear_glass`, `smoked_glass`, `tinted_glass`, `acrylic` | Acrylic is distinct (multi-stop + specular); others are opacity/tint variants |
| Soft basics | `soft`, `soft_touch`, `matte`, `flat` | Soft vs soft_touch are close; soft_touch carries a highlight |
| Silver/metal | `chrome`, `brushed_silver`, `polished_silver`, `polished_metal`, `brushed_metal`, `gunmetal` | Polished metal/silver are the multi-stop reflection floor |
| Noise texture | `soft_noise`, `subtle_texture`, `grain` | Very similar noise fills |

## Recommendation

Prefer richer rendering of a smaller “hero” set over expanding names. When pruning, keep at least one clear representative per tactile class: flat, soft-touch, raised resin/enamel, gloss lacquer, acrylic/glass, polished metal.
