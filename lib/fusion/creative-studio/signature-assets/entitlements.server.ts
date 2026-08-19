import "server-only";

import { calculateEffectiveEntitlement } from "@/lib/control/entitlements";
import { prisma } from "@/lib/db";
import { SIGNATURE_FAMILIES } from "./registry";
import type { SignatureEntitlementKey } from "./types";

export function registeredSignatureEntitlementKeys(): readonly SignatureEntitlementKey[] {
  return SIGNATURE_FAMILIES.flatMap((family) => family.entitlement ? [family.entitlement.entitlementKey] : []);
}

export async function resolveBusinessSignatureEntitlements(input: {
  businessId: string;
  planDefinitionId?: string | null;
  privileged?: boolean;
}): Promise<readonly SignatureEntitlementKey[]> {
  const keys = registeredSignatureEntitlementKeys();
  if (input.privileged) return keys;
  const services = await prisma.serviceDefinition.findMany({
    where: { key: { in: [...keys] }, status: "ACTIVE" },
    include: {
      planEntitlements: { where: { planId: input.planDefinitionId ?? "__none__" } },
      overrides: { where: { businessId: input.businessId, status: "ACTIVE", revokedAt: null } },
      restrictions: { where: { businessId: input.businessId, revokedAt: null } },
    },
  });
  return services.filter((service) => calculateEffectiveEntitlement({
    plan: service.planEntitlements[0]
      ? { source: "plan entitlement", enabled: service.planEntitlements[0].enabled, allowance: service.planEntitlements[0].allowance }
      : service.defaultEnabled
        ? { source: "service default", enabled: true }
        : null,
    overrides: service.overrides.map((override) => ({ source: `business override ${override.id}`, enabled: override.enabled, allowance: override.allowance, startsAt: override.startsAt, expiresAt: override.expiresAt })),
    restrictions: service.restrictions.map((restriction) => ({ source: `account restriction ${restriction.id}`, enabled: false, startsAt: restriction.startsAt, expiresAt: restriction.expiresAt })),
  }).enabled).map((service) => service.key as SignatureEntitlementKey);
}
