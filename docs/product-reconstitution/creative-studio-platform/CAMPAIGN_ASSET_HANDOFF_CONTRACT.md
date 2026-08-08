# Campaign Asset Handoff Contract

**Status:** Documentation only — Campaign Manager is not implemented in this pass.

## Journey pattern

Many campaigns need **two** customer-facing creatives:

```
ENTRY CREATIVE
  → contact collection / CTA
  → DELIVERED COUPON / RETURN ASSET
```

These are often two assets in one Campaign journey — not one Coupon object forced to represent both states.

## Campaign Step Pair

```
Campaign Step Pair
├── Entry asset     (capture / CTA creative)
└── Delivered / response asset  (coupon, ticket, wallet pass, thank-you)
```

## Future Campaign Studio handoff

- Campaign Manager / Journey Builder opens the **same Creative Studio** for each asset
- Assets may appear as linked tabs or side-by-side editors
- Coupon editor remains a creative Surface editor — not Campaign Builder
- No redemption, issuance, or validation execution inside Creative Studio

## Boundary

Creative Studio owns: composition, Appearance, Edit Contents, preview fidelity.  
Campaign Manager owns: pairing, delivery rules, attribution, redemption lifecycle.
