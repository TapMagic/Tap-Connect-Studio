/**
 * Additive fusion spine models — coexist with V1 DeviceSlot / Campaign.
 * Migration strategy: bridge DeviceSlot.deviceCode ↔ TapPointAddress.code.
 * Do not remove V1 models in this milestone.
 */

// Appended conceptually to prisma/schema.prisma — applied via StrReplace below.
export const FUSION_SCHEMA_NOTES = `
Fusion tables:
- FeatureFlagOverride
- PlatformAuditEvent
- OutboxEvent (fusion)
- IdempotencyRecord (fusion)
- TapPoint (fusion bridge)
- TapPointAddress
- PublicationSnapshot (immutable card/campaign publish)
` as const;
