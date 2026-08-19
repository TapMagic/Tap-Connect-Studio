import { calculateEffectiveEntitlement, type EntitlementLayer } from "@/lib/control/entitlements";
import {
  resolveSignatureAccess,
  type SignatureAccessState,
  type SignatureFamilyDefinition,
} from "@/lib/fusion/creative-studio/signature-assets/types";

export type GovernedEntitlementLayer = EntitlementLayer & {
  id: string;
  status?: string;
  revokedAt?: Date | string | null;
};

export type SignatureEntitlementInspection = {
  businessId: string;
  businessName: string;
  familyId: string;
  familyVersion?: string;
  familyName: string;
  serviceId: string | null;
  entitlementKey: string;
  serviceStatus: string;
  effective: {
    enabled: boolean;
    access: SignatureAccessState;
    explanation: readonly string[];
  };
  sources: {
    serviceDefault: boolean;
    plan: EntitlementLayer | null;
    overrides: readonly GovernedEntitlementLayer[];
    restrictions: readonly GovernedEntitlementLayer[];
  };
  activeOverrideIds: readonly string[];
  activeRestrictionIds: readonly string[];
};

function active(layer: GovernedEntitlementLayer, now: Date) {
  return layer.status !== "REVOKED"
    && !layer.revokedAt
    && (!layer.startsAt || new Date(layer.startsAt) <= now)
    && (!layer.expiresAt || new Date(layer.expiresAt) > now);
}

export function resolveSignatureEntitlementInspection(input: {
  businessId: string;
  businessName: string;
  family: SignatureFamilyDefinition;
  service: { id: string; status: string; defaultEnabled: boolean } | null;
  plan: EntitlementLayer | null;
  overrides?: readonly GovernedEntitlementLayer[];
  restrictions?: readonly GovernedEntitlementLayer[];
  now?: Date;
}): SignatureEntitlementInspection | null {
  if (!input.family.entitlement) return null;
  const now = input.now ?? new Date();
  const overrides = (input.overrides ?? []).filter((layer) => active(layer, now));
  const restrictions = (input.restrictions ?? []).filter((layer) => active(layer, now));
  const plan = input.plan ?? (input.service?.defaultEnabled
    ? { source: "Service default", enabled: true }
    : null);
  const effective = calculateEffectiveEntitlement({
    plan,
    overrides: [...overrides],
    restrictions: [...restrictions],
    now,
  });
  return {
    businessId: input.businessId,
    businessName: input.businessName,
    familyId: input.family.id,
    familyVersion: input.family.version,
    familyName: input.family.label,
    serviceId: input.service?.id ?? null,
    entitlementKey: input.family.entitlement.entitlementKey,
    serviceStatus: input.service?.status ?? "MISSING",
    effective: {
      enabled: effective.enabled,
      access: resolveSignatureAccess(input.family.entitlement, effective.enabled),
      explanation: effective.explanation,
    },
    sources: {
      serviceDefault: input.service?.defaultEnabled ?? false,
      plan,
      overrides,
      restrictions,
    },
    activeOverrideIds: overrides.map((layer) => layer.id),
    activeRestrictionIds: restrictions.map((layer) => layer.id),
  };
}
