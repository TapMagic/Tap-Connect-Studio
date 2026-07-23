# Cody V2 Selective Import Guide

**Source:** `/Users/rcs/Development/tap-connect-studio` @ `50f5604` (`tapflow-tapsave-architecture`)  
**Rule:** Import platform spine + schema patterns. Do **not** import Slice 1’s bounded Builder ceiling.

## Import (priority order)

1. Platform: auth context headers, authorize grants, feature flags, idempotency hash, event envelope, outbox, HTTP errors  
2. Schema patterns: Workspace→Business→Location, ExperienceDraft→PublicationVersion→CardRelease/TapPointDeployment, DeviceUnit≠TapPoint  
3. Application command style (`slice1/service.ts` patterns)  
4. Registries + validation + design tokens — **expand** block/action catalogs to V1 parity floor  
5. Thin API handlers under `app/api/v2/` as reference  
6. Governance docs (MASTER spec, parity matrix, acceptance checklist)  
7. Contract/isolation tests  
8. Builder **shell/Attributes/CardSurface patterns only** — grow catalog deliberately  
9. TapFlow/TapSave — vocabulary/docs only until Audience/Journey slices land  

## Do not import as permanent limits

- Four-block Slice 1 catalog / matching `supportedBlocks`  
- Presets-only color UI (parity requires full pickers)  
- V1 renderer / Campaign JSON pipeline  
- Treating progressive disclosure as removal  
- Direct V1 module imports into a parallel V2 package (isolation is good; fusion keeps V1 capability in-tree)

## Fusion status

| Cody system | Fusion landing |
|-------------|----------------|
| Feature flags | `lib/fusion/features/*` + `FeatureFlagOverride` |
| Event/outbox/idempotency | `lib/fusion/publication/events.ts` + Prisma fusion tables |
| TapPoint / publication | Additive Prisma models; DeviceSlot bridge pending |
| Immutable publish chain | `PublicationSnapshot` foundation |
| Tenancy Workspace headers | Pending — keep V1 Business tenancy until Module J |
| Registries | Feature, block, format, connector registries started |
| TapFlow/TapSave runtime | Spec only (aligned with Cody) |

Key Cody paths to consult while porting: `src/v2/platform/**`, `prisma/v2/schema.prisma`, `docs/v2/MASTER_PRODUCT_IMPLEMENTATION_SPEC.md`, `docs/v2/V1_V2_CAPABILITY_PARITY_MATRIX.md`.
